"""Worker — 任务执行引擎（标准化workspace + subprocess + 结构化日志）"""
import asyncio
import json
import os
import re
import time
import httpx
import yaml
import config
import logging

logger = logging.getLogger(__name__)

PROGRESS_PATTERN = re.compile(r"PROGRESS:\s*step=(\d+)/(\d+)\s+loss=([\d.]+)")
METRICS_PATTERN = re.compile(r"METRICS:\s*(\{.+\})")


async def run_task(task_id: str, task_type: str, download_url: str, workspace: str, params: dict):
    """在标准化 workspace 中执行训练脚本，收集结构化输出"""
    base = workspace
    input_dir = os.path.join(base, "input")
    log_file = os.path.join(base, "output", "logs", "training.log")
    metrics_file = os.path.join(base, "output", "results", "metrics.jsonl")
    meta_file = os.path.join(base, "meta.json")

    logger.info(f"Task {task_id} type={task_type} workspace={base}")
    start_time = time.time()

    # 写 meta.json 初始状态
    _write_meta(meta_file, task_id, task_type, "RUNNING", start_time, {})

    await _update_task_status(task_id, "RUNNING")

    try:
        # 在 input/ 中找 entry_point
        script_path = _find_script(input_dir)
        if not script_path:
            raise FileNotFoundError(f"No train*.py found in {input_dir}")

        # 安装依赖 — 使用 venv 中的 pip 确保安装到正确位置
        req_file = os.path.join(input_dir, "requirements.txt")
        if os.path.exists(req_file):
            logger.info(f"Installing requirements from {req_file}")
            proc = await asyncio.create_subprocess_exec(
                "/opt/aisched-worker/venv/bin/python", "-m", "pip", "install", "-r", req_file, "-q",
                stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.STDOUT
            )
            await proc.wait()

        # params 可能是 dict 或 JSON string
        if isinstance(params, str):
            try:
                params = json.loads(params)
            except json.JSONDecodeError:
                params = {}

        cmd = ["/opt/aisched-worker/venv/bin/python", script_path]
        if params:
            for k, v in params.items():
                cmd.append(f"--{k}")
                cmd.append(str(v))

        logger.info(f"Launching: {' '.join(cmd)}")

        with open(log_file, "w") as lf:
            lf.write(f"# Task: {task_id}  Type: {task_type}\n")
            lf.write(f"# Command: {' '.join(cmd)}\n")
            lf.write(f"# Started: {time.strftime('%Y-%m-%d %H:%M:%S')}\n")
            lf.write(f"{'='*60}\n\n")

            process = await asyncio.create_subprocess_exec(
                *cmd,
                cwd=input_dir,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.STDOUT,
            )

            current_step = 0
            total_steps = 1000

            async for line in process.stdout:
                text = line.decode("utf-8", errors="replace").rstrip()
                lf.write(text + "\n")
                lf.flush()

                # PROGRESS: step=N/TOTAL loss=X
                m = PROGRESS_PATTERN.search(text)
                if m:
                    current_step = int(m.group(1))
                    total_steps = int(m.group(2))
                    percent = round(current_step / total_steps * 100, 1) if total_steps > 0 else 0
                    await _report_progress(task_id, percent, current_step, total_steps)

                # METRICS: {...}
                m = METRICS_PATTERN.search(text)
                if m:
                    try:
                        metrics = json.loads(m.group(1))
                        metrics["timestamp"] = time.time()
                        with open(metrics_file, "a") as mf:
                            mf.write(json.dumps(metrics, ensure_ascii=False) + "\n")
                        await _report_metrics(task_id, metrics)
                    except json.JSONDecodeError:
                        pass

            await process.wait()

            exit_code = process.returncode
            elapsed = round(time.time() - start_time, 1)
            lf.write(f"\n{'='*60}\n")
            lf.write(f"# Exit code: {exit_code}  Elapsed: {elapsed}s\n")

            if exit_code != 0:
                raise RuntimeError(f"Process exited with code {exit_code}")

        elapsed = round(time.time() - start_time, 1)
        _write_meta(meta_file, task_id, task_type, "COMPLETED", start_time,
                     {"exit_code": exit_code, "elapsed_s": elapsed, "log_file": log_file})
        await _update_task_status(task_id, "COMPLETED")
        logger.info(f"Task {task_id} completed in {elapsed}s")

    except Exception as e:
        elapsed = round(time.time() - start_time, 1)
        _write_meta(meta_file, task_id, task_type, "FAILED", start_time,
                     {"error": str(e), "elapsed_s": elapsed})
        logger.error(f"Task {task_id} failed ({elapsed}s): {e}")
        await _update_task_status(task_id, "FAILED", error_msg=str(e))


def _find_script(input_dir: str) -> str | None:
    """在 input/ 中查找入口脚本"""
    for name in ("train.py", "finetune.py", "train.sh", "run.py", "main.py"):
        path = os.path.join(input_dir, name)
        if os.path.exists(path):
            return path
    # 搜索子目录
    for root, dirs, files in os.walk(input_dir):
        for f in files:
            if f.endswith(".py") and f.startswith(("train", "finetune", "run", "main")):
                return os.path.join(root, f)
    return None


def _write_meta(path: str, task_id: str, task_type: str, status: str, start_time: float, extra: dict):
    """写/更新 meta.json"""
    meta = {
        "task_id": task_id,
        "type": task_type,
        "status": status,
        "started_at": time.strftime("%Y-%m-%dT%H:%M:%S", time.localtime(start_time)),
        "elapsed_s": round(time.time() - start_time, 1),
        **extra
    }
    with open(path, "w") as f:
        json.dump(meta, f, indent=2, ensure_ascii=False)


async def _update_task_status(task_id: str, status: str, error_msg: str = None):
    try:
        payload = {"status": status}
        if error_msg:
            payload["errorMsg"] = error_msg
        async with httpx.AsyncClient() as client:
            await client.post(f"{config.SCHEDULER_URL}/api/v1/tasks/{task_id}/status", json=payload)
    except Exception as e:
        logger.warning(f"Failed to update task status: {e}")


async def _report_progress(task_id: str, percent: float, current_step: int, total_steps: int):
    try:
        async with httpx.AsyncClient() as client:
            await client.post(f"{config.SCHEDULER_URL}/api/v1/tasks/{task_id}/progress", json={
                "percent": percent, "currentStep": current_step, "totalSteps": total_steps
            })
    except Exception as e:
        logger.warning(f"Failed to report progress: {e}")


async def _report_metrics(task_id: str, metrics: dict):
    try:
        async with httpx.AsyncClient() as client:
            await client.post(f"{config.SCHEDULER_URL}/api/v1/tasks/{task_id}/metrics", json={
                "metrics": metrics
            })
    except Exception as e:
        logger.warning(f"Failed to report metrics: {e}")
