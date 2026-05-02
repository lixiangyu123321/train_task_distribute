"""GPU Worker — REST API 路由"""
from __future__ import annotations
from fastapi import APIRouter, BackgroundTasks, UploadFile, File, Form, Query, HTTPException
from fastapi.responses import StreamingResponse, FileResponse
import io
import json
import os
import uuid
import zipfile
import config

router = APIRouter()


@router.get("/health")
async def health():
    from monitor.gpu_monitor import collect_gpu_resources
    gpu = collect_gpu_resources()
    return {"status": "ok", "worker": config.WORKER_NAME, "gpu": gpu}


@router.get("/status")
async def worker_status():
    """单一轮询端点 — 调度器定时拉取 worker 全部状态"""
    from engine.executor import task_states
    from monitor.gpu_monitor import collect_gpu_resources
    return {
        "worker": config.WORKER_NAME,
        "gpu": collect_gpu_resources(),
        "tasks": task_states,
    }


@router.post("/transfer/receive")
async def receive_transfer(
    background_tasks: BackgroundTasks,
    taskId: str = Form(...),
    type: str = Form("TRAIN"),
    params: str = Form("{}"),
    file: UploadFile = File(...),
):
    """接收调度器推送的 ZIP 任务包（multipart），解压后执行"""
    from transfer.receiver import extract_from_bytes
    from engine.executor import run_task
    from monitor.gpu_monitor import collect_gpu_resources

    # VRAM pre-check: reject task if GPU memory nearly full
    resources = collect_gpu_resources()
    if resources.get("gpuAvailable") and resources.get("vramTotalMb", 0) > 0:
        usage_ratio = resources.get("vramUsedMb", 0) / resources["vramTotalMb"]
        if usage_ratio > 0.9:
            raise HTTPException(status_code=503, detail="GPU VRAM nearly full (>90% used)")

    task_type = type
    try:
        task_params = json.loads(params)
    except json.JSONDecodeError:
        task_params = {}

    zip_bytes = await file.read()

    async def _pipeline():
        try:
            workspace = await extract_from_bytes(zip_bytes, taskId)
            await run_task(taskId, task_type, workspace, task_params)
        except Exception as e:
            import logging
            logging.getLogger(__name__).error(f"Pipeline failed: {e}")

    background_tasks.add_task(_pipeline)
    return {"status": "accepted", "taskId": taskId}


@router.delete("/tasks/{task_id}")
async def cancel_task(task_id: str):
    from engine.executor import task_states
    if task_id in task_states:
        state = task_states[task_id]
        state["status"] = "CANCELLED"

        # Kill the running subprocess if present
        proc = state.get("_process")
        if proc and proc.returncode is None:
            try:
                proc.terminate()
                # asyncio subprocess: use asyncio.wait_for for async wait
                import asyncio
                try:
                    await asyncio.wait_for(proc.wait(), timeout=5)
                except asyncio.TimeoutError:
                    proc.kill()
            except Exception:
                pass  # Process may have already exited

        return {"status": "cancelled", "taskId": task_id}
    return {"status": "not_found", "taskId": task_id}


def _workspace(task_id: str) -> str:
    p = os.path.join(config.WORKSPACE_DIR, task_id)
    if not os.path.isdir(p):
        raise HTTPException(404, f"Workspace not found: {task_id}")
    return p


@router.get("/tasks/{task_id}/logs")
async def task_logs(task_id: str):
    ws = _workspace(task_id)
    log_path = os.path.join(ws, "output", "logs", "training.log")
    if not os.path.exists(log_path):
        return {"taskId": task_id, "logs": ""}
    with open(log_path, "r", errors="replace") as f:
        return {"taskId": task_id, "logs": f.read()}


@router.get("/tasks/{task_id}/logs/tail")
async def task_logs_tail(task_id: str, lines: int = Query(100)):
    ws = _workspace(task_id)
    log_path = os.path.join(ws, "output", "logs", "training.log")
    if not os.path.exists(log_path):
        return {"taskId": task_id, "logs": "", "lines": 0}
    from collections import deque
    with open(log_path, "r", errors="replace") as f:
        tail = deque(f, maxlen=lines)
    text = "".join(tail)
    return {"taskId": task_id, "logs": text, "lines": len(tail)}


@router.get("/tasks/{task_id}/metrics")
async def task_metrics(task_id: str):
    ws = _workspace(task_id)
    metrics_path = os.path.join(ws, "output", "results", "metrics.jsonl")
    if not os.path.exists(metrics_path):
        return {"taskId": task_id, "history": []}
    history = []
    with open(metrics_path, "r", errors="replace") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                history.append(json.loads(line))
            except json.JSONDecodeError:
                pass
    return {"taskId": task_id, "history": history}


@router.get("/tasks/{task_id}/artifacts/download")
async def download_artifacts(task_id: str):
    import tempfile
    ws = _workspace(task_id)
    output_dir = os.path.join(ws, "output")
    if not os.path.isdir(output_dir):
        raise HTTPException(404, "No output directory")
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".zip")
    try:
        with zipfile.ZipFile(tmp, "w", zipfile.ZIP_DEFLATED) as zf:
            for root, _dirs, files in os.walk(output_dir):
                for fname in files:
                    full = os.path.join(root, fname)
                    arcname = os.path.relpath(full, output_dir)
                    zf.write(full, arcname)
        tmp.close()
        tmp_path = tmp.name

        def iterfile():
            with open(tmp_path, "rb") as f:
                while chunk := f.read(8 * 1024 * 1024):
                    yield chunk
            os.unlink(tmp_path)

        return StreamingResponse(
            iterfile(),
            media_type="application/zip",
            headers={"Content-Disposition": f'attachment; filename="{task_id}-artifacts.zip"'},
        )
    except Exception:
        tmp.close()
        os.unlink(tmp.name)
        raise


@router.get("/tasks/{task_id}/artifacts/list")
async def list_artifacts(task_id: str):
    ws = _workspace(task_id)
    output_dir = os.path.join(ws, "output")
    if not os.path.isdir(output_dir):
        return {"taskId": task_id, "files": []}
    files = []
    for root, _dirs, fnames in os.walk(output_dir):
        for fname in fnames:
            full = os.path.join(root, fname)
            rel = os.path.relpath(full, output_dir).replace("\\", "/")
            parts = rel.split("/")
            files.append({
                "path": rel,
                "name": fname,
                "size": os.path.getsize(full),
                "dir": parts[0] if len(parts) > 1 else "",
            })
    files.sort(key=lambda f: f["path"])
    return {"taskId": task_id, "files": files}


@router.get("/tasks/{task_id}/artifacts/file")
async def download_artifact_file(task_id: str, path: str = Query(...)):
    ws = _workspace(task_id)
    output_dir = os.path.normpath(os.path.join(ws, "output"))
    full = os.path.normpath(os.path.join(output_dir, path))
    if not full.startswith(output_dir + os.sep) and full != output_dir:
        raise HTTPException(400, "Invalid path")
    if not os.path.isfile(full):
        raise HTTPException(404, "File not found")
    basename = os.path.basename(full)
    media = "text/plain" if basename.endswith((".log", ".txt")) else "application/octet-stream"

    def iterfile():
        with open(full, "rb") as f:
            while chunk := f.read(8 * 1024 * 1024):
                yield chunk

    return StreamingResponse(
        iterfile(),
        media_type=media,
        headers={"Content-Disposition": f'attachment; filename="{basename}"'},
    )
