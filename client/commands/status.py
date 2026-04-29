"""CLI — 查询任务状态"""
import click
import requests
from tabulate import tabulate
import config


@click.command()
@click.argument("task_id")
def status(task_id):
    """查询任务详情"""
    try:
        resp = requests.get(f"{config.API_BASE}/tasks/{task_id}")
        data = resp.json()
        if resp.status_code == 200:
            task = data.get("data", {})
            rows = [
                ["Task ID", task.get("taskId")],
                ["Name", task.get("name")],
                ["Type", task.get("type")],
                ["Status", task.get("status")],
                ["Model", task.get("modelName", "-")],
                ["Node", task.get("nodeId", "-")],
                ["Created", task.get("createdAt")],
                ["Started", task.get("startedAt", "-")],
                ["Finished", task.get("finishedAt", "-")],
                ["Error", task.get("errorMsg", "-")]
            ]
            progress = task.get("progress")
            if progress:
                rows.append(["Progress", f"{progress.get('percent', 0)}% "
                                         f"({progress.get('currentStep')}/{progress.get('totalSteps')})"])
            click.echo(tabulate(rows, tablefmt="plain"))
        else:
            click.echo(f"查询失败: {data.get('message')}", err=True)
    except requests.RequestException as e:
        click.echo(f"连接调度器失败: {e}", err=True)
