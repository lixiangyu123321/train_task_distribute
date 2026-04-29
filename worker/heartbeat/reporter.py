"""Worker — 心跳+资源上报（周期性异步任务）"""
import asyncio
import httpx
import logging
import config
from monitor.gpu_monitor import collect_gpu_resources

logger = logging.getLogger(__name__)


class HeartbeatReporter:
    def __init__(self):
        self._running = False
        self._task = None
        self._node_id = None
        self.active_tasks = 0

    def set_node_id(self, node_id: str):
        self._node_id = node_id

    async def start(self):
        self._running = True
        self._task = asyncio.create_task(self._loop())
        logger.info("Heartbeat reporter started")

    async def stop(self):
        self._running = False
        if self._task:
            self._task.cancel()

    async def _loop(self):
        while self._running:
            try:
                await self._send_heartbeat()
            except Exception as e:
                logger.warning(f"Heartbeat failed: {e}")
            await asyncio.sleep(config.HEARTBEAT_INTERVAL_SEC)

    async def _send_heartbeat(self):
        if not self._node_id:
            return
        resources = collect_gpu_resources()
        resources["activeTasks"] = self.active_tasks
        resources["memoryUtilization"] = _get_system_mem_util()

        payload = {
            "nodeId": self._node_id,
            "resources": resources
        }
        async with httpx.AsyncClient() as client:
            await client.post(config.SCHEDULER_HEARTBEAT_URL, json=payload)
        gpu_str = f"GPU={resources.get('gpuUtilization')}%" if resources.get('gpuAvailable') else "GPU=UNAVAILABLE"
        logger.debug(f"Heartbeat sent: {gpu_str}")


def _get_system_mem_util() -> float:
    """获取系统内存利用率"""
    try:
        import psutil
        return round(psutil.virtual_memory().percent, 1)
    except Exception:
        return 0.0
