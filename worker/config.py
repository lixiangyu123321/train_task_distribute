"""Worker — 配置管理（硬件信息由 monitor 模块自动检测）"""
import os

SCHEDULER_URL = os.getenv("SCHEDULER_URL", "http://127.0.0.1:8080")
WORKER_NAME = os.getenv("WORKER_NAME", "gpu-worker")
API_PORT = int(os.getenv("GPU_API_PORT", "9000"))
HEARTBEAT_INTERVAL_SEC = int(os.getenv("HEARTBEAT_INTERVAL_SEC", "5"))

# 调度器 API 路径
SCHEDULER_REGISTER_URL = f"{SCHEDULER_URL}/api/v1/nodes/register"
SCHEDULER_HEARTBEAT_URL = f"{SCHEDULER_URL}/api/v1/nodes/heartbeat"
