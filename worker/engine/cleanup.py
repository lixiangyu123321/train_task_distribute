"""Worker — 定时清理过期的训练 workspace"""
from __future__ import annotations
import json
import logging
import os
import shutil
import time
import config

logger = logging.getLogger(__name__)


async def cleanup_old_outputs():
    retention_sec = config.OUTPUT_RETENTION_DAYS * 86400
    now = time.time()
    removed = 0

    if not os.path.isdir(config.WORKSPACE_DIR):
        return

    for name in os.listdir(config.WORKSPACE_DIR):
        ws = os.path.join(config.WORKSPACE_DIR, name)
        if not os.path.isdir(ws):
            continue
        meta_path = os.path.join(ws, "meta.json")
        if not os.path.exists(meta_path):
            continue
        try:
            with open(meta_path, "r") as f:
                meta = json.load(f)
        except (json.JSONDecodeError, OSError):
            continue

        status = meta.get("status", "")
        if status not in ("COMPLETED", "FAILED"):
            continue

        elapsed = meta.get("elapsed_s", 0)
        started_at = meta.get("started_at", "")
        try:
            start_ts = time.mktime(time.strptime(started_at, "%Y-%m-%dT%H:%M:%S"))
            finished_ts = start_ts + elapsed
        except (ValueError, OverflowError):
            finished_ts = os.path.getmtime(meta_path)

        if now - finished_ts > retention_sec:
            shutil.rmtree(ws, ignore_errors=True)
            removed += 1
            logger.info(f"Cleaned up expired workspace: {name}")

    if removed:
        logger.info(f"Cleanup done: removed {removed} workspace(s)")
