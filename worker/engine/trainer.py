"""Worker — 全量训练执行（TRAIN 类型任务专用引擎）"""
import os
import glob
import logging

logger = logging.getLogger(__name__)


async def run_train(task_id: str, workspace: str, params: dict):
    """TRAIN 任务执行：数据集检测、多GPU分布式、断点续训、脚本查找并运行"""
    from .executor import _run_subprocess, task_states

    input_dir = os.path.join(workspace, "input")
    output_dir = os.path.join(workspace, "output")

    # 1. Dataset format detection
    dataset_format = _detect_dataset_format(input_dir)
    if dataset_format:
        params.setdefault("dataset_format", dataset_format)
        logger.info(f"Task {task_id}: detected dataset format '{dataset_format}'")

    # 2. Distributed training params
    gpu_count = _detect_gpu_count()
    if gpu_count > 1:
        params["nproc_per_node"] = str(gpu_count)
        logger.info(f"Task {task_id}: detected {gpu_count} GPUs, enabling distributed training")

    # 3. Checkpoint resume
    ckpt_dir = os.path.join(output_dir, "checkpoints")
    latest_ckpt = _find_latest_checkpoint(ckpt_dir)
    if latest_ckpt:
        params["resume_from_checkpoint"] = latest_ckpt
        logger.info(f"Task {task_id}: resuming from checkpoint {latest_ckpt}")

    # 4. Find training script
    script = _find_script(input_dir)
    if not script:
        task_states[task_id]["status"] = "FAILED"
        task_states[task_id]["errorMsg"] = "No training script found"
        return

    logger.info(f"Task {task_id}: using script {script}")

    # 5. Install requirements if present
    req_file = os.path.join(input_dir, "requirements.txt")
    if os.path.exists(req_file):
        import asyncio
        logger.info(f"Task {task_id}: installing requirements from {req_file}")
        proc = await asyncio.create_subprocess_exec(
            "/opt/aisched-worker/venv/bin/python", "-m", "pip", "install", "-r", req_file, "-q",
            stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.STDOUT
        )
        await proc.wait()

    # 6. Build command and run
    cmd = _build_train_command(script, params, gpu_count)
    await _run_subprocess(task_id, cmd, workspace, {})


def _detect_dataset_format(input_dir: str) -> str | None:
    """检测 input/ 目录下的数据集格式"""
    for ext, fmt in [(".csv", "csv"), (".jsonl", "jsonl"), (".parquet", "parquet"), (".json", "json")]:
        if glob.glob(os.path.join(input_dir, "**", f"*{ext}"), recursive=True):
            return fmt
    return None


def _detect_gpu_count() -> int:
    """检测可用 GPU 数量"""
    try:
        import pynvml
        pynvml.nvmlInit()
        count = pynvml.nvmlDeviceGetCount()
        pynvml.nvmlShutdown()
        return count
    except Exception:
        return 1


def _find_latest_checkpoint(ckpt_dir: str) -> str | None:
    """查找最新的 checkpoint 文件"""
    if not os.path.isdir(ckpt_dir):
        return None
    ckpts = sorted(
        glob.glob(os.path.join(ckpt_dir, "*.pt")) + glob.glob(os.path.join(ckpt_dir, "*.pth")),
        key=os.path.getmtime
    )
    return ckpts[-1] if ckpts else None


def _find_script(input_dir: str) -> str | None:
    """在 input/ 中查找训练入口脚本"""
    for name in ["train.py", "run.py", "main.py"]:
        p = os.path.join(input_dir, name)
        if os.path.isfile(p):
            return p
    # Fallback: any .py starting with train
    for f in glob.glob(os.path.join(input_dir, "train*.py")):
        return f
    return None


def _build_train_command(script: str, params: dict, gpu_count: int) -> list[str]:
    """构建训练命令（支持单卡/多卡分布式）"""
    python = "/opt/aisched-worker/venv/bin/python"
    if gpu_count > 1 and "nproc_per_node" in params:
        cmd = [python, "-m", "torch.distributed.launch",
               "--nproc_per_node", str(params.pop("nproc_per_node")), script]
    else:
        cmd = [python, script]
    for k, v in params.items():
        if not k.startswith("_"):
            cmd.extend([f"--{k}", str(v)])
    return cmd
