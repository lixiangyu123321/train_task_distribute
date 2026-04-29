# 训练任务执行机制说明

## 1. 当前阶段

项目处于架构初始化阶段，Worker 的训练/微调执行为**框架占位实现**——完整的任务调度分发链路（Scheduler → Redis 队列 → Worker 接收 → 状态回调）已打通，但核心训练代码尚未接入真实模型训练逻辑。

---

## 2. 任务执行完整链路

```
┌──────────────┐                  ┌─────────────────┐               ┌──────────────────┐
│  CLI / Web   │  POST /api/v1   │   Scheduler      │  POST :9000   │   GPU Worker     │
│  Client      │ ─────tasks────► │   (Java)         │ ──tasks/exe──►│   (Python)       │
│              │                 │                  │               │                  │
└──────────────┘                │  DispatchService │              │  routes.py       │
                                │  定时轮询 Redis   │              │  ↓ BackgroundTasks│
                                │  LeastLoaded     │              │  executor.py     │
                                │  负载均衡选节点   │              │  ↓ 分支路由       │
                                └─────────────────┘              │  trainer / finetuner│
                                        │                        └──────────────────┘
                                        │  WebSocket 推送                │
                                        ▼                               │
                                ┌─────────────────┐    REST 回调        │
                                │   React 前端     │ ◄── status/ ───────┘
                                │   实时展示进度    │    progress
                                └─────────────────┘
```

### 2.1 调度分发（Scheduler 端）

文件：`scheduler/src/main/java/com/aisched/scheduler/service/DispatchService.java`

```java
@Scheduled(fixedDelayString = "${aisched.dispatch.poll-interval-ms:5000}")
public void dispatchLoop() {
    // 1. 尝试获取 Redis 分布式锁，防止多实例重复分发
    if (!taskQueue.tryAcquireDispatchLock(...)) return;

    // 2. 从 Redis List 中取出一个待调度任务 ID
    String taskId = taskQueue.dequeue();

    // 3. 从 MySQL 加载任务实体
    Task task = taskRepository.findById(taskId);

    // 4. 查询所有 ONLINE 的 GPU 节点
    List<GpuNode> onlineNodes = nodeService.getOnlineNodes();

    // 5. 负载均衡选择最优节点
    GpuNode target = loadBalancer.select(onlineNodes);

    // 6. REST 请求下发到目标 GPU Worker
    restTemplate.postForEntity(
        "http://" + target.getPublicIp() + ":" + target.getApiPort() + "/api/v1/tasks/execute",
        payload, String.class
    );

    // 7. 更新任务状态为 QUEUED，WebSocket 推送前端
    task.setStatus(TaskStatus.QUEUED);
    taskRepository.save(task);
}
```

### 2.2 任务接收（Worker 端）

文件：`worker/api/routes.py`

```python
@router.post("/tasks/execute")
async def execute_task(payload: dict, background_tasks: BackgroundTasks):
    from engine.executor import run_task

    task_id = payload.get("taskId")
    task_type = payload.get("type", "TRAIN")
    model_name = payload.get("modelName", "")
    dataset_path = payload.get("datasetPath", "")
    params = payload.get("params", {})

    # 作为异步后台任务执行，不阻塞 HTTP 响应
    background_tasks.add_task(run_task, task_id, task_type, model_name, dataset_path, params)

    # 立即返回 200，Scheduler 不用等训练完成
    return {"status": "accepted", "taskId": task_id}
```

### 2.3 执行引擎（Worker 端）

文件：`worker/engine/executor.py`

```python
async def run_task(task_id, task_type, model_name, dataset_path, params):
    # 状态回调 → Scheduler
    await _update_task_status(task_id, "RUNNING")

    try:
        if task_type == "FINETUNE":
            await run_finetune(task_id, model_name, dataset_path, params)
        elif task_type == "TRAIN":
            await run_train(task_id, model_name, dataset_path, params)
        else:
            await run_train(task_id, model_name, dataset_path, params)

        await _update_task_status(task_id, "COMPLETED")
    except Exception as e:
        await _update_task_status(task_id, "FAILED", error_msg=str(e))


async def _update_task_status(task_id, status, error_msg=None):
    async with httpx.AsyncClient() as client:
        await client.post(
            f"{config.SCHEDULER_URL}/api/v1/tasks/{task_id}/status",
            json={"status": status, "errorMsg": error_msg}
        )
```

---

## 3. 当前占位实现 vs 真实实现

### 3.1 当前：模拟训练循环

文件：`worker/engine/trainer.py`

```python
async def run_train(task_id, model_name, dataset_path, params):
    # 不加载模型、不读写数据、不算梯度
    total_steps = params.get("totalSteps", 1000)
    for step in range(1, total_steps + 1):
        await asyncio.sleep(0.1)           # 模拟单步耗时
        if step % 100 == 0:
            logger.info(f"Progress: {step}/{total_steps}")
```

文件：`worker/engine/finetuner.py`

```python
async def run_finetune(task_id, model_name, dataset_path, params):
    lora_rank = params.get("loraRank", 16)
    lora_alpha = params.get("loraAlpha", 32)
    # 不加载模型、不应用 LoRA、不算梯度
    total_steps = params.get("totalSteps", 500)
    for step in range(1, total_steps + 1):
        await asyncio.sleep(0.1)
        if step % 50 == 0:
            logger.info(f"Fine-tune progress: {step}/{total_steps}")
```

### 3.2 目标：subprocess 调用真实训练脚本

Worker 定位为**进程管理器**，不内嵌训练逻辑。后续替换为 `asyncio.create_subprocess_exec` 启动独立训练进程：

```python
import asyncio
import json
import re
import httpx
import config

PROGRESS_PATTERN = re.compile(r"Progress:\s*(\d+)/(\d+)")

async def run_finetune(task_id, model_name, dataset_path, params):
    cmd = [
        "torchrun",
        "--nproc_per_node", str(params.get("nprocPerNode", 8)),
        "--master_port", "29500",
        "scripts/finetune_lora.py",
        "--model_name_or_path", model_name,
        "--dataset_path", dataset_path,
        "--lora_r", str(params.get("loraRank", 16)),
        "--lora_alpha", str(params.get("loraAlpha", 32)),
        "--learning_rate", str(params.get("learningRate", 2e-5)),
        "--num_train_epochs", str(params.get("epochs", 3)),
        "--per_device_train_batch_size", str(params.get("batchSize", 4)),
        "--output_dir", f"/workspace/output/{task_id}",
        "--report_to", "none",
    ]

    logger.info(f"Launching: {' '.join(cmd)}")

    process = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.STDOUT,
    )

    # 逐行读取子进程输出，解析进度并上报 Scheduler
    current_step = 0
    total_steps = params.get("totalSteps", 0)

    async for line in process.stdout:
        text = line.decode().strip()
        logger.info(f"[{task_id}] {text}")

        match = PROGRESS_PATTERN.search(text)
        if match:
            current_step = int(match.group(1))
            total_steps_from_trainer = int(match.group(2))
            if total_steps_from_trainer > 0:
                total_steps = total_steps_from_trainer
            percent = round(current_step / total_steps * 100, 1) if total_steps > 0 else 0
            await _report_progress(task_id, percent, current_step, total_steps)

    await process.wait()

    if process.returncode != 0:
        raise RuntimeError(f"Training process exited with code {process.returncode}")


async def _report_progress(task_id, percent, current_step, total_steps):
    try:
        async with httpx.AsyncClient() as client:
            await client.post(
                f"{config.SCHEDULER_URL}/api/v1/tasks/{task_id}/progress",
                json={
                    "percent": percent,
                    "currentStep": current_step,
                    "totalSteps": total_steps
                }
            )
    except Exception as e:
        logger.warning(f"Failed to report progress: {e}")
```

对应的训练脚本接收命令行参数输出标准化的进度行：

```python
# scripts/finetune_lora.py（示意，非项目文件）

import argparse
from transformers import Trainer, TrainingArguments, AutoModelForCausalLM, AutoTokenizer
from peft import LoraConfig, get_peft_model
from datasets import load_dataset

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--model_name_or_path")
    parser.add_argument("--dataset_path")
    parser.add_argument("--lora_r", type=int, default=16)
    parser.add_argument("--output_dir")
    # ... 其他参数
    args = parser.parse_args()

    model = AutoModelForCausalLM.from_pretrained(args.model_name_or_path, ...)
    lora_config = LoraConfig(r=args.lora_r, ...)
    model = get_peft_model(model, lora_config)

    dataset = load_dataset("json", data_files=args.dataset_path)
    trainer = Trainer(model=model, train_dataset=dataset, ...)

    trainer.train()  # HuggingFace Trainer 进度回调输出 "Progress: N/TOTAL"
```

---

## 4. 接入真实训练的步骤

| 序号 | 步骤 | 涉及文件 |
|------|------|---------|
| 1 | 编写真实训练脚本（PyTorch + Transformers + PEFT），接收命令行参数，输出进度到 stdout | `scripts/finetune_lora.py`（新建） |
| 2 | 将 `trainer.py` / `finetuner.py` 中的 `asyncio.sleep` 循环替换为 `asyncio.create_subprocess_exec` | `worker/engine/trainer.py`, `worker/engine/finetuner.py` |
| 3 | 实现进度行解析 + 实时回调 Scheduler | `worker/engine/executor.py` |
| 4 | Dockerfile 安装 PyTorch + CUDA 依赖 | `worker/Dockerfile` |
| 5 | docker-compose.gpu.yml 挂载数据卷和训练脚本目录 | `docker-compose.gpu.yml` |
| 6 | Scheduler 端新增 `/tasks/{id}/progress` 回调接口 | `scheduler/.../controller/TaskController.java` |
| 7 | 任务取消支持（Worker 端 kill 子进程） | `worker/engine/executor.py` |

---

## 5. 训练脚本参数约定

调度器下发的 `params` JSON 字段约定如下，训练脚本应按此解析：

| 参数 | 类型 | 说明 |
|------|------|------|
| `learningRate` | float | 学习率 |
| `epochs` | int | 训练轮数 |
| `batchSize` | int | 每卡 batch size |
| `loraRank` | int | LoRA rank（仅微调） |
| `loraAlpha` | int | LoRA alpha（仅微调） |
| `maxSeqLength` | int | 最大序列长度（可选） |
| `gradientAccumulation` | int | 梯度累积步数（可选） |
| `warmupRatio` | float | warmup 比例（可选） |
| `weightDecay` | float | 权重衰减（可选） |
| `nprocPerNode` | int | GPU 卡数（可选，默认全部） |
