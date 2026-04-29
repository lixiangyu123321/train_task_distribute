"""GPU Worker — REST API 路由"""
from fastapi import APIRouter, BackgroundTasks
import uuid
import config

router = APIRouter()

_active_tasks: dict[str, str] = {}


@router.get("/health")
async def health():
    return {"status": "ok", "worker": config.WORKER_NAME}


@router.post("/transfer/receive")
async def receive_transfer(payload: dict, background_tasks: BackgroundTasks):
    """接收 Scheduler 下发的任务包下载地址，下载 ZIP → 解压 → 执行"""
    from transfer.receiver import download_and_extract
    from engine.executor import run_task

    task_id = payload.get("taskId", str(uuid.uuid4()))
    task_type = payload.get("type", "TRAIN")
    download_url = payload.get("downloadUrl", "")
    package_id = payload.get("packageId", "")
    params = payload.get("params", {})

    if not download_url:
        return {"status": "error", "message": "downloadUrl is required"}

    # 异步：下载 + 解压 + 执行
    async def _pipeline():
        try:
            workspace = await download_and_extract(download_url, task_id)
            await run_task(task_id, task_type, download_url, workspace, params)
        except Exception as e:
            import logging
            logging.getLogger(__name__).error(f"Pipeline failed: {e}")

    background_tasks.add_task(_pipeline)
    _active_tasks[task_id] = "running"
    return {"status": "accepted", "taskId": task_id, "packageId": package_id}


@router.delete("/tasks/{task_id}")
async def cancel_task(task_id: str):
    if task_id in _active_tasks:
        _active_tasks[task_id] = "cancelled"
        return {"status": "cancelled", "taskId": task_id}
    return {"status": "not_found", "taskId": task_id}
