"""Worker — 注册到调度器（自动检测本机硬件）"""
import httpx
import logging
import config
from monitor.gpu_monitor import detect_gpu_model, detect_gpu_count, detect_vram_total_mb

logger = logging.getLogger(__name__)


def register_node() -> str:
    """向调度器注册当前 Worker 节点，自动检测硬件配置"""
    gpu_model = detect_gpu_model()
    gpu_count = detect_gpu_count()
    vram_total = detect_vram_total_mb()

    logger.info(f"Detected hardware: GPU={gpu_model}, count={gpu_count}, VRAM={vram_total}MB")

    payload = {
        "name": config.WORKER_NAME,
        "publicIp": _get_public_ip(),
        "apiPort": config.API_PORT,
        "gpuModel": gpu_model,
        "gpuCount": gpu_count,
        "vramTotalMb": vram_total
    }
    try:
        resp = httpx.post(config.SCHEDULER_REGISTER_URL, json=payload)
        resp.raise_for_status()
        data = resp.json()
        node_id = data.get("data", {}).get("nodeId", "")
        logger.info(f"Worker registered as nodeId={node_id}")

        from main import heartbeat_reporter
        heartbeat_reporter.set_node_id(node_id)
        return node_id
    except Exception as e:
        logger.error(f"Failed to register worker: {e}")
        raise


def _get_public_ip() -> str:
    """获取本机对外 IP"""
    import os
    import socket
    env_ip = os.getenv("WORKER_PUBLIC_IP")
    if env_ip:
        return env_ip
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        # 尝试获取公网出口 IP
        try:
            resp = httpx.get("https://api.ipify.org", timeout=5)
            return resp.text.strip()
        except Exception:
            return "127.0.0.1"
