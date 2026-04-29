"""Worker — 任务执行引擎（subprocess + 进度解析）"""
import asyncio
import json
import os
import re
import httpx
import yaml
import config
import logging

logger = logging.getLogger(__name__)

PROGRESS_PATTERN = re.compile(r"PROGRESS:\s*step=(\d+)/(\d+)\s+loss=([\d.]+)")
METRICS_PATTERN = re.compile(r"METRICS:\s*(\{.+\})")


async def run_task(task_id: str, task_type: str, download_url: str, workspace: str, params: dict):
    """从 workspace 中找到 entry_point，通过 subprocess 执行并上报进度"""
    logger.info(f"Starting task {task_id} type={task_type} workspace={workspace}")

    await _update_task_status(task_id, "RUNNING")

    try:
        # 读取 task.yaml 获取 entry_point
        yaml_path = os.path.join(workspace, "task.yaml")
        entry_point = "train.py"
        if os.path.exists(yaml_path):
            with open(yaml_path, "r") as f:
                yaml_data = yaml.safe_load(f) or {}
            entry_point = yaml_data.get("entry_point", "train.py")

        script_path = os.path.join(workspace, entry_point)
        if not os.path.exists(script_path):
            raise FileNotFoundError(f"Entry point not found: {script_path}")

        # 安装额外依赖
        req_file = os.path.join(workspace, "requirements.txt")
        if os.path.exists(req_file):
            logger.info(f"Installing requirements from {req_file}")
            proc = await asyncio.create_subprocess_exec(
                "pip", "install", "-r", req_file, "-q",
                stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.STDOUT
            )
            await proc.wait()

        # 构建命令行参数（params 可能是 dict 或 JSON string）
        if isinstance(params, str):
            try:
                params = json.loads(params)
            except json.JSONDecodeError:
                params = {}
        cmd = ["python", script_path]
        if params:
            for k, v in params.items():
                cmd.append(f"--{k}")
                cmd.append(str(v))

        logger.info(f"Launching: {' '.join(cmd)}")

        process = await asyncio.create_subprocess_exec(
            *cmd,
            cwd=workspace,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT,
        )

        current_step = 0
        total_steps = 1000

        async for line in process.stdout:
            text = line.decode("utf-8", errors="replace").strip()
            logger.info(f"[{task_id}] {text}")

            # 解析进度行: PROGRESS: step=N/TOTAL loss=X.XX
            m = PROGRESS_PATTERN.search(text)
            if m:
                current_step = int(m.group(1))
                total_steps = int(m.group(2))
                loss_val = float(m.group(3))
                percent = round(current_step / total_steps * 100, 1) if total_steps > 0 else 0
                await _report_progress(task_id, percent, current_step, total_steps)

            # 解析指标行: METRICS: {...}
            m = METRICS_PATTERN.search(text)
            if m:
                try:
                    metrics = json.loads(m.group(1))
                    await _report_metrics(task_id, metrics)
                except json.JSONDecodeError:
                    pass

        await process.wait()

        if process.returncode != 0:
            raise RuntimeError(f"Process exited with code {process.returncode}")

        await _update_task_status(task_id, "COMPLETED")
        logger.info(f"Task {task_id} completed")
    except Exception as e:
        logger.error(f"Task {task_id} failed: {e}")
        await _update_task_status(task_id, "FAILED", error_msg=str(e))


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
