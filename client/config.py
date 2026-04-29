"""CLI 客户端 — 调度器地址配置"""
import os

SCHEDULER_URL = os.getenv("SCHEDULER_URL", "http://127.0.0.1:8080")
API_BASE = f"{SCHEDULER_URL}/api/v1"
