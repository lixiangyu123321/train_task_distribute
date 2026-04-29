"""Worker — 从 Scheduler 下载 ZIP 包并解压"""
import os
import zipfile
import logging
import httpx
import config

logger = logging.getLogger(__name__)


async def download_and_extract(download_url: str, task_id: str) -> str:
    """
    从 Scheduler 下载 ZIP 包，解压到工作目录，返回解压后的目录路径。
    """
    workspace = os.path.join(os.getenv("WORKSPACE_DIR", "/workspace"), task_id)
    os.makedirs(workspace, exist_ok=True)

    zip_path = os.path.join(workspace, "task-package.zip")
    logger.info(f"Downloading package from {download_url}")

    async with httpx.AsyncClient(timeout=300) as client:
        resp = await client.get(download_url)
        resp.raise_for_status()
        with open(zip_path, "wb") as f:
            f.write(resp.content)

    logger.info(f"Downloaded {len(resp.content)} bytes, extracting to {workspace}")
    with zipfile.ZipFile(zip_path, "r") as zf:
        zf.extractall(workspace)

    os.remove(zip_path)  # 清理 ZIP 文件
    logger.info(f"Package extracted to {workspace}")
    return workspace
