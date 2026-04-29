"""CLI — 提交任务（支持 JSON 和 ZIP 文件上传）"""
import click
import requests
import json
import config


@click.command()
@click.option("--name", "-n", help="任务名称")
@click.option("--type", "-t", "task_type",
              type=click.Choice(["TRAIN", "FINETUNE", "EVAL"]), help="任务类型")
@click.option("--model", "-m", help="模型名称/HuggingFace ID")
@click.option("--dataset", "-d", help="数据集路径")
@click.option("--params", "-p", help="训练参数 (JSON 字符串)")
@click.option("--priority", default=0, help="优先级 (越大越高)")
@click.option("--file", "-f", "zip_path", help="上传 ZIP 包文件路径")
def submit(name, task_type, model, dataset, params, priority, zip_path):
    """提交训练/微调任务到调度系统

    方式一 (ZIP包): python cli.py submit --file ./task-package.zip
    方式二 (JSON):  python cli.py submit -n my-task -t FINETUNE -m model -d /data
    """
    try:
        if zip_path:
            # 方式1: ZIP 文件上传
            _submit_zip(zip_path, name, priority)
        else:
            # 方式2: JSON 提交（兼容旧方式）
            _submit_json(name, task_type, model, dataset, params, priority)
    except requests.RequestException as e:
        click.echo(f"连接调度器失败: {e}", err=True)


def _submit_zip(zip_path, name, priority):
    """上传 ZIP 包并创建任务"""
    # Step 1: 上传文件
    with open(zip_path, "rb") as f:
        resp = requests.post(f"{config.API_BASE}/transfer/upload",
                             files={"file": (zip_path, f, "application/zip")})
    if resp.status_code not in (200, 201):
        click.echo(f"上传失败: {resp.json().get('message')}", err=True)
        return
    upload_result = resp.json().get("data", {})
    package_id = upload_result.get("packageId")
    detected_type = upload_result.get("detectedType", "TRAIN")
    click.echo(f"文件上传成功: {package_id} (类型: {detected_type})")

    # Step 2: 创建任务
    task_name = name or upload_result.get("yamlData", {}).get("name", "task-from-zip")
    resp = requests.post(f"{config.API_BASE}/tasks/submit-package", json={
        "packageId": package_id,
        "name": task_name,
        "priority": priority or 0
    })
    if resp.status_code in (200, 201):
        task = resp.json().get("data", {})
        click.echo(f"任务已提交: {task.get('taskId')} [{task.get('type')}] [{task.get('status')}]")
    else:
        click.echo(f"创建任务失败: {resp.json().get('message')}", err=True)


def _submit_json(name, task_type, model, dataset, params, priority):
    """JSON 方式提交（兼容旧方式）"""
    if not name or not task_type:
        click.echo("错误: 请指定 --name 和 --type，或使用 --file 上传 ZIP 包", err=True)
        return
    payload = {
        "name": name, "type": task_type,
        "modelName": model, "datasetPath": dataset,
        "priority": priority or 0
    }
    if params:
        try:
            payload["params"] = json.loads(params)
        except json.JSONDecodeError:
            click.echo("错误: params 参数需为合法 JSON", err=True)
            return

    resp = requests.post(f"{config.API_BASE}/tasks", json=payload)
    data = resp.json()
    if resp.status_code in (200, 201):
        task = data.get("data", {})
        click.echo(f"任务已提交: {task.get('taskId')} [{task.get('status')}]")
    else:
        click.echo(f"提交失败: {data.get('message')}", err=True)
