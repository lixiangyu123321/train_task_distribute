"""CLI — 将项目目录打包为标准 task-package.zip"""
import click
import os
import zipfile
import yaml


@click.command()
@click.option("--dir", "-d", "project_dir", required=True, help="项目目录路径")
@click.option("--output", "-o", default="task-package.zip", help="输出 ZIP 文件名")
@click.option("--name", "-n", help="任务名称（写入 task.yaml）")
@click.option("--type", "-t", "task_type", type=click.Choice(["TRAIN", "FINETUNE", "EVAL"]),
              help="任务类型（不指定则自动检测）")
def pack(project_dir, output, name, task_type):
    """将本地项目目录打包为 task-package.zip"""
    if not os.path.isdir(project_dir):
        click.echo(f"错误: 目录不存在: {project_dir}", err=True)
        return

    # 自动检测类型
    if task_type is None:
        files = os.listdir(project_dir)
        has_train = any(f in files for f in ("train.py", "train.sh"))
        has_finetune = any(f in files for f in ("finetune.py", "lora.py", "finetune.sh"))
        has_eval = any(f in files for f in ("eval.py", "evaluate.py", "eval.sh"))
        count = sum([has_train, has_finetune, has_eval])
        if count > 1:
            task_type = "FULL"
        elif has_train:
            task_type = "TRAIN"
        elif has_finetune:
            task_type = "FINETUNE"
        elif has_eval:
            task_type = "EVAL"
        else:
            task_type = "TRAIN"
        click.echo(f"自动检测类型: {task_type} (train={has_train} finetune={has_finetune} eval={has_eval})")

    # 如果不存在 task.yaml，自动生成
    yaml_path = os.path.join(project_dir, "task.yaml")
    if not os.path.exists(yaml_path):
        task_name = name or os.path.basename(os.path.abspath(project_dir))
        entry_point = "train.py"
        for candidate in ("finetune.py", "train.py", "eval.py"):
            if os.path.exists(os.path.join(project_dir, candidate)):
                entry_point = candidate
                break
        yaml_data = {
            "name": task_name,
            "type": task_type,
            "entry_point": entry_point,
            "params": {}
        }
        with open(yaml_path, "w") as f:
            yaml.dump(yaml_data, f, allow_unicode=True, default_flow_style=False)
        click.echo(f"已自动生成 task.yaml: name={task_name}, entry={entry_point}")

    # 打包
    with zipfile.ZipFile(output, "w", zipfile.ZIP_DEFLATED) as zf:
        for root, dirs, files in os.walk(project_dir):
            for fn in files:
                filepath = os.path.join(root, fn)
                arcname = os.path.relpath(filepath, project_dir)
                zf.write(filepath, arcname)

    size_mb = os.path.getsize(output) / (1024 * 1024)
    click.echo(f"打包完成: {output} ({size_mb:.1f} MB)")
