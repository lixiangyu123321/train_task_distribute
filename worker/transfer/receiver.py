"""Worker — 从 Scheduler 下载 ZIP 并组织标准化workspace目录"""
import os
import zipfile
import logging
import httpx
import yaml
import shutil
import config

logger = logging.getLogger(__name__)

WORKSPACE_LAYOUT = ["input", "output/checkpoints", "output/logs", "output/results"]


async def download_and_extract(download_url: str, task_id: str) -> str:
    """下载ZIP，解压到 input/，创建标准化目录结构，返回 input/ 路径"""
    base = os.path.join(os.getenv("WORKSPACE_DIR", "/workspace"), task_id)
    input_dir = os.path.join(base, "input")

    for d in [os.path.join(base, p) for p in WORKSPACE_LAYOUT]:
        os.makedirs(d, exist_ok=True)

    zip_path = os.path.join(base, "input", "task-package.zip")
    logger.info(f"Downloading package from {download_url}")

    async with httpx.AsyncClient(timeout=300) as client:
        resp = await client.get(download_url)
        resp.raise_for_status()
        with open(zip_path, "wb") as f:
            f.write(resp.content)

    logger.info(f"Downloaded {len(resp.content)} bytes, extracting to {input_dir}")
    with zipfile.ZipFile(zip_path, "r") as zf:
        zf.extractall(input_dir)
    os.remove(zip_path)

    # 确保 task.yaml 在 input/ 根目录可被 executor 找到
    _ensure_task_yaml_visible(base, input_dir)

    logger.info(f"Workspace ready: {base}")
    return base


def _ensure_task_yaml_visible(base: str, input_dir: str):
    """如果 task.yaml 在 input/ 子目录中，复制到 input/ 根以便 executor 查找"""
    # 已经在根目录
    if os.path.exists(os.path.join(input_dir, "task.yaml")):
        return

    # 搜索子目录
    for root, dirs, files in os.walk(input_dir):
        if "task.yaml" in files:
            src = os.path.join(root, "task.yaml")
            shutil.copy(src, os.path.join(input_dir, "task.yaml"))
            logger.info(f"Copied task.yaml from {src} to input/")
            return
