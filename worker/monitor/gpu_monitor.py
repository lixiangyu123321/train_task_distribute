"""Worker — GPU 资源监控（基于 pynvml/nvidia-ml-py）"""
import logging
import subprocess
import re

logger = logging.getLogger(__name__)


def collect_gpu_resources() -> dict:
    """采集 GPU 资源信息。失败则明确标记 GPU 不可用。"""
    try:
        import pynvml
        pynvml.nvmlInit()
        device_count = pynvml.nvmlDeviceGetCount()
        if device_count == 0:
            pynvml.nvmlShutdown()
            return _no_gpu()

        total_util = 0
        total_mem_used = 0
        total_mem_total = 0
        max_temp = 0

        for i in range(device_count):
            handle = pynvml.nvmlDeviceGetHandleByIndex(i)
            util = pynvml.nvmlDeviceGetUtilizationRates(handle)
            mem = pynvml.nvmlDeviceGetMemoryInfo(handle)
            try:
                temp = pynvml.nvmlDeviceGetTemperature(handle, pynvml.NVML_TEMPERATURE_GPU)
            except Exception:
                temp = 0

            total_util += util.gpu
            total_mem_used += mem.used
            total_mem_total += mem.total
            max_temp = max(max_temp, temp)

        pynvml.nvmlShutdown()
        avg_util = total_util / device_count

        return {
            "gpuUtilization": round(avg_util, 1),
            "vramUsedMb": total_mem_used // (1024 * 1024),
            "vramTotalMb": total_mem_total // (1024 * 1024),
            "gpuTemp": float(max_temp),
            "gpuCount": device_count,
            "gpuAvailable": True
        }
    except Exception as e:
        logger.warning(f"pynvml unavailable: {e}")
        return _no_gpu()


def _no_gpu() -> dict:
    """GPU 不可用时的明确标记"""
    return {
        "gpuUtilization": 0.0,
        "vramUsedMb": 0,
        "vramTotalMb": 0,
        "gpuTemp": 0.0,
        "gpuCount": 0,
        "gpuAvailable": False
    }


def detect_gpu_model() -> str:
    """从 nvidia-smi 检测 GPU 型号，失败则返回明确原因"""
    try:
        result = subprocess.run(
            ["nvidia-smi", "--query-gpu=name", "--format=csv,noheader"],
            capture_output=True, text=True, timeout=10
        )
        if result.returncode == 0 and result.stdout.strip():
            return result.stdout.strip().split("\n")[0]
        return "GPU_DRIVER_NOT_WORKING"
    except FileNotFoundError:
        return "NVIDIA_SMI_NOT_FOUND"
    except Exception as e:
        return f"GPU_DETECT_FAILED: {e}"


def detect_gpu_count() -> int:
    """检测可用 GPU 数量"""
    try:
        result = subprocess.run(
            ["nvidia-smi", "--query-gpu=count", "--format=csv,noheader"],
            capture_output=True, text=True, timeout=10
        )
        if result.returncode == 0:
            return int(result.stdout.strip())
    except Exception:
        pass
    return 0


def detect_vram_total_mb() -> int:
    """检测总显存（MB）"""
    try:
        result = subprocess.run(
            ["nvidia-smi", "--query-gpu=memory.total", "--format=csv,noheader,nounits"],
            capture_output=True, text=True, timeout=10
        )
        if result.returncode == 0:
            match = re.search(r"(\d+)", result.stdout)
            if match:
                return int(match.group(1))
    except Exception:
        pass
    return 0
