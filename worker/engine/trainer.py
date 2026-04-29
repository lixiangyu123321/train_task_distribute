"""Worker — 全量训练执行（subprocess 方式，由 executor 调用）"""


async def run_train(task_id: str, model_name: str, dataset_path: str, params: dict):
    """实际训练逻辑由 executor.run_task 通过 subprocess 调用训练脚本完成。
    此文件作为占位保留，后续可按需扩展预训练流程。"""
    pass
