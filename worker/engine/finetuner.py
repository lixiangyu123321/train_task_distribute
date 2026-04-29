"""Worker — 微调执行（subprocess 方式，由 executor 调用）"""


async def run_finetune(task_id: str, model_name: str, dataset_path: str, params: dict):
    """实际微调逻辑由 executor.run_task 通过 subprocess 调用训练脚本完成。
    此文件作为占位保留，后续可按需扩展 LoRA/QLoRA 流程。"""
    pass
