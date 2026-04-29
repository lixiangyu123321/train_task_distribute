"""CLI 客户端 — 入口"""
import click
from commands.submit import submit
from commands.status import status
from commands.list_tasks import list_tasks
from commands.pack import pack


@click.group()
def cli():
    """AI 训练调度系统 — 命令行客户端"""


cli.add_command(submit)
cli.add_command(status)
cli.add_command(list_tasks, name="list-tasks")
cli.add_command(list_tasks, name="list")
cli.add_command(pack)

if __name__ == "__main__":
    cli()
