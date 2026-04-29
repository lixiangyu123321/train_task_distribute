"""CLI — 任务列表"""
import click
import requests
from tabulate import tabulate
import config


@click.command()
@click.option("--status", "-s", "filter_status", help="按状态筛选 (PENDING/QUEUED/RUNNING/COMPLETED/FAILED)")
@click.option("--page", default=1, help="页码")
@click.option("--size", default=20, help="每页条数")
def list_tasks(filter_status, page, size):
    """查看任务列表"""
    try:
        params = {"page": page, "size": size}
        if filter_status:
            params["status"] = filter_status
        resp = requests.get(f"{config.API_BASE}/tasks", params=params)
        data = resp.json()
        if resp.status_code == 200:
            result = data.get("data", {})
            items = result.get("items", [])
            if not items:
                click.echo("暂无任务")
                return
            rows = []
            for t in items:
                nid = t.get("nodeId") or "-"
                rows.append([
                    (t.get("taskId") or "")[:12] + "...",
                    (t.get("name") or "")[:30],
                    t.get("type"),
                    t.get("status"),
                    nid[:12] if nid != "-" else "-",
                    (t.get("createdAt") or "")[:19]
                ])
            headers = ["Task ID", "Name", "Type", "Status", "Node", "Created"]
            click.echo(tabulate(rows, headers=headers, tablefmt="grid"))
            click.echo(f"共 {result.get('total')} 条，第 {page}/{ (result.get('total',0)+size-1)//size } 页")
        else:
            click.echo(f"查询失败: {data.get('message')}", err=True)
    except requests.RequestException as e:
        click.echo(f"连接调度器失败: {e}", err=True)
