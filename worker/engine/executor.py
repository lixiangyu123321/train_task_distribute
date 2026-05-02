"""Worker — 任务执行引擎（标准化workspace + subprocess + 结构化日志）"""
from __future__ import annotations
import asyncio
import json
import os
import re
import shutil
import time
import yaml
import config
import logging

logger = logging.getLogger(__name__)

PROGRESS_PATTERN = re.compile(r"PROGRESS:\s*step=(\d+)/(\d+)\s+loss=([\d.]+)")
METRICS_PATTERN = re.compile(r"METRICS:\s*(\{.+\})")

task_states: dict[str, dict] = {}


async def run_task(task_id: str, task_type: str, workspace: str, params: dict):
    """在标准化 workspace 中执行训练脚本，收集结构化输出。
    根据 task_type 路由到专用引擎或通用执行器。"""
    base = workspace
    meta_file = os.path.join(base, "meta.json")

    logger.info(f"Task {task_id} type={task_type} workspace={base}")
    start_time = time.time()

    task_states[task_id] = {
        "status": "RUNNING",
        "progress": {"percent": 0, "currentStep": 0, "totalSteps": 0},
        "metrics": {},
        "startedAt": time.strftime("%Y-%m-%dT%H:%M:%S", time.localtime(start_time)),
        "elapsedSec": 0,
        "errorMsg": None,
    }

    _write_meta(meta_file, task_id, task_type, "RUNNING", start_time, {})

    try:
        if isinstance(params, str):
            try:
                params = json.loads(params)
            except json.JSONDecodeError:
                params = {}

        if task_type == "TRAIN":
            from .trainer import run_train
            await run_train(task_id, workspace, params)
        elif task_type == "FINETUNE":
            from .finetuner import run_finetune
            await run_finetune(task_id, workspace, params)
        else:
            await _run_generic(task_id, task_type, workspace, params)

        # If the engine module set status to FAILED, propagate that
        if task_states[task_id]["status"] == "FAILED":
            error = task_states[task_id].get("errorMsg") or task_states[task_id].get("error") or "Task failed"
            elapsed = round(time.time() - start_time, 1)
            _write_meta(meta_file, task_id, task_type, "FAILED", start_time,
                        {"error": error, "elapsed_s": elapsed})
            task_states[task_id]["elapsedSec"] = elapsed
            logger.error(f"Task {task_id} failed ({elapsed}s): {error}")
            return

        elapsed = round(time.time() - start_time, 1)
        _write_meta(meta_file, task_id, task_type, "COMPLETED", start_time,
                     {"elapsed_s": elapsed})
        task_states[task_id]["status"] = "COMPLETED"
        task_states[task_id]["elapsedSec"] = elapsed
        progress = task_states[task_id].get("progress", {})
        total_steps = progress.get("totalSteps", 0)
        current_step = progress.get("currentStep", 0)
        task_states[task_id]["progress"] = {
            "percent": 100.0,
            "currentStep": total_steps if total_steps > 0 else current_step,
            "totalSteps": total_steps if total_steps > 0 else current_step,
        }
        logger.info(f"Task {task_id} completed in {elapsed}s")

        input_dir = os.path.join(base, "input")
        shutil.rmtree(input_dir, ignore_errors=True)
        logger.info(f"Cleaned up input/ for task {task_id}")

    except Exception as e:
        elapsed = round(time.time() - start_time, 1)
        _write_meta(meta_file, task_id, task_type, "FAILED", start_time,
                     {"error": str(e), "elapsed_s": elapsed})
        task_states[task_id]["status"] = "FAILED"
        task_states[task_id]["errorMsg"] = str(e)
        task_states[task_id]["elapsedSec"] = elapsed
        logger.error(f"Task {task_id} failed ({elapsed}s): {e}")


async def _run_generic(task_id: str, task_type: str, workspace: str, params: dict):
    """通用执行器 — 查找脚本、安装依赖、subprocess 执行"""
    input_dir = os.path.join(workspace, "input")

    script_path = _find_script(input_dir)
    if not script_path:
        raise FileNotFoundError(f"No train*.py found in {input_dir}")

    req_file = os.path.join(input_dir, "requirements.txt")
    if os.path.exists(req_file):
        logger.info(f"Installing requirements from {req_file}")
        proc = await asyncio.create_subprocess_exec(
            "/opt/aisched-worker/venv/bin/python", "-m", "pip", "install", "-r", req_file, "-q",
            stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.STDOUT
        )
        await proc.wait()

    cmd = ["/opt/aisched-worker/venv/bin/python", script_path]
    if params:
        for k, v in params.items():
            cmd.append(f"--{k}")
            cmd.append(str(v))

    await _run_subprocess(task_id, cmd, workspace, {})


async def _run_subprocess(task_id: str, cmd: list[str], workspace: str, env: dict):
    """共享的 subprocess 执行器 — stdout 解析（PROGRESS/METRICS）、进程跟踪、日志记录。
    可由 _run_generic、trainer、finetuner 等模块调用。"""
    input_dir = os.path.join(workspace, "input")
    log_file = os.path.join(workspace, "output", "logs", "training.log")
    metrics_file = os.path.join(workspace, "output", "results", "metrics.jsonl")

    start_time = time.time()
    task_type = task_states[task_id].get("_task_type", "UNKNOWN")

    logger.info(f"Launching: {' '.join(cmd)}")

    # Merge environment variables
    proc_env = None
    if env:
        proc_env = os.environ.copy()
        proc_env.update(env)

    with open(log_file, "w") as lf:
        lf.write(f"# Task: {task_id}\n")
        lf.write(f"# Command: {' '.join(cmd)}\n")
        lf.write(f"# Started: {time.strftime('%Y-%m-%d %H:%M:%S')}\n")
        lf.write(f"{'='*60}\n\n")

        process = await asyncio.create_subprocess_exec(
            *cmd,
            cwd=input_dir,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT,
            env=proc_env,
        )

        # Store process handle for cancellation support
        task_states[task_id]["_process"] = process

        current_step = 0
        total_steps = 1000

        async for line in process.stdout:
            # Check if task was cancelled
            if task_states.get(task_id, {}).get("status") == "CANCELLED":
                process.terminate()
                try:
                    await asyncio.wait_for(process.wait(), timeout=5)
                except asyncio.TimeoutError:
                    process.kill()
                lf.write(f"\n{'='*60}\n")
                lf.write(f"# Cancelled by user\n")
                return

            text = line.decode("utf-8", errors="replace").rstrip()
            lf.write(text + "\n")
            lf.flush()

            m = PROGRESS_PATTERN.search(text)
            if m:
                current_step = int(m.group(1))
                total_steps = int(m.group(2))
                percent = round(current_step / total_steps * 100, 1) if total_steps > 0 else 0
                task_states[task_id]["progress"] = {
                    "percent": percent,
                    "currentStep": current_step,
                    "totalSteps": total_steps,
                }
                task_states[task_id]["elapsedSec"] = round(time.time() - start_time, 1)

            m = METRICS_PATTERN.search(text)
            if m:
                try:
                    metrics = json.loads(m.group(1))
                    metrics["timestamp"] = time.time()
                    with open(metrics_file, "a") as mf:
                        mf.write(json.dumps(metrics, ensure_ascii=False) + "\n")
                    task_states[task_id]["metrics"] = metrics
                except json.JSONDecodeError:
                    pass

        await process.wait()

        exit_code = process.returncode
        elapsed = round(time.time() - start_time, 1)
        lf.write(f"\n{'='*60}\n")
        lf.write(f"# Exit code: {exit_code}  Elapsed: {elapsed}s\n")

        if exit_code != 0:
            raise RuntimeError(f"Process exited with code {exit_code}")


def _find_script(input_dir: str) -> str | None:
    """在 input/ 中查找入口脚本"""
    for name in ("train.py", "finetune.py", "train.sh", "run.py", "main.py"):
        path = os.path.join(input_dir, name)
        if os.path.exists(path):
            return path
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
