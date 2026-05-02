"""Worker — 微调执行（FINETUNE 类型任务专用引擎，支持 LoRA/QLoRA 参数注入）"""
import os
import glob
import logging

logger = logging.getLogger(__name__)


async def run_finetune(task_id: str, workspace: str, params: dict):
    """FINETUNE 任务执行：LoRA 参数注入、脚本查找并运行"""
    from .executor import _run_subprocess, task_states

    input_dir = os.path.join(workspace, "input")

    # 1. LoRA params injection — normalize camelCase to snake_case
    lora_rank = params.get("loraRank") or params.get("lora_rank")
    lora_alpha = params.get("loraAlpha") or params.get("lora_alpha")
    if lora_rank:
        params["use_lora"] = "true"
        params["lora_rank"] = str(lora_rank)
        logger.info(f"Task {task_id}: LoRA enabled with rank={lora_rank}")
    if lora_alpha:
        params["lora_alpha"] = str(lora_alpha)
        logger.info(f"Task {task_id}: LoRA alpha={lora_alpha}")

    # Remove camelCase duplicates to avoid passing both forms
    params.pop("loraRank", None)
    params.pop("loraAlpha", None)

    # 2. Find finetune script
    script = _find_finetune_script(input_dir)
    if not script:
        task_states[task_id]["status"] = "FAILED"
        task_states[task_id]["errorMsg"] = "No finetune script found"
        return

    logger.info(f"Task {task_id}: using script {script}")

    # 3. Install requirements if present
    req_file = os.path.join(input_dir, "requirements.txt")
    if os.path.exists(req_file):
        import asyncio
        logger.info(f"Task {task_id}: installing requirements from {req_file}")
        proc = await asyncio.create_subprocess_exec(
            "/opt/aisched-worker/venv/bin/python", "-m", "pip", "install", "-r", req_file, "-q",
            stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.STDOUT
        )
        await proc.wait()

    # 4. Build command and run
    python = "/opt/aisched-worker/venv/bin/python"
    cmd = [python, script]
    for k, v in params.items():
        if not k.startswith("_"):
            cmd.extend([f"--{k}", str(v)])

    await _run_subprocess(task_id, cmd, workspace, {})


def _find_finetune_script(input_dir: str) -> str | None:
    """在 input/ 中查找微调入口脚本"""
    for name in ["finetune.py", "fine_tune.py", "train.py", "run.py", "main.py"]:
        p = os.path.join(input_dir, name)
        if os.path.isfile(p):
            return p
    for f in glob.glob(os.path.join(input_dir, "finetune*.py")) + glob.glob(os.path.join(input_dir, "fine_tune*.py")):
        return f
    return None
