"""Worker — 配置管理"""
from __future__ import annotations
import os

WORKER_NAME = os.getenv("WORKER_NAME", "gpu-worker")
API_PORT = int(os.getenv("GPU_API_PORT", "9000"))
WORKER_PUBLIC_IP = os.getenv("WORKER_PUBLIC_IP", "127.0.0.1")
WORKSPACE_DIR = os.getenv("WORKSPACE_DIR", "/workspace")
OUTPUT_RETENTION_DAYS = int(os.getenv("OUTPUT_RETENTION_DAYS", "7"))
