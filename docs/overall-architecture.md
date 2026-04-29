# AI 训练调度系统 — 整体架构文档

## 1. 部署拓扑

```
┌─────────────────────────────────────────────────────────────────────┐
│                         公网 (Internet)                              │
│                                                                     │
│   124.221.85.5:8080                         117.50.180.219:9000    │
│        (安全组: TCP 22, 8080, 8081)              (安全组: TCP 22, 9000) │
└─────────────────────────────────────────────────────────────────────┘
          │                                              │
          ▼                                              ▼
┌──────────────────┐                       ┌──────────────────┐
│  CPU 调度服务器    │  ←── HTTP REST ───→  │  GPU 算力服务器    │
│  124.221.85.5     │                       │  117.50.180.219   │
│  Ubuntu 22.04     │  ←── WebSocket ──→   │  Ubuntu 24.04     │
│                   │                       │                   │
│  ┌─────────────┐  │                       │  ┌─────────────┐  │
│  │ Scheduler    │  │  5s 心跳 + 资源上报   │  │ Worker       │  │
│  │ Java 21      │  │ ◄────────────────── │  │ Python 3.12  │  │
│  │ SpringBoot   │  │                      │  │ FastAPI      │  │
│  │ :8080        │  │  任务分发 (downloadUrl)│  │ :9000        │  │
│  └──────┬───────┘  │ ──────────────────► │  └──────┬───────┘  │
│         │          │                      │         │          │
│  ┌──────┴───────┐  │                      │  ┌──────┴───────┐  │
│  │ MySQL 8.0    │  │                      │  │ nvidia-smi   │  │
│  │ (Docker)     │  │                      │  │ RTX 4090     │  │
│  │ :3306        │  │                      │  │ 24564MB VRAM │  │
│  └──────────────┘  │                      │  │ CUDA 12.2    │  │
│                    │                      │  └──────────────┘  │
│  ┌──────────────┐  │                      │                    │
│  │ Redis 7.2    │  │                      │  systemd 托管      │
│  │ (Docker)     │  │                      │  auto-restart     │
│  │ :6379        │  │                      │                    │
│  └──────────────┘  │                      └──────────────────┘
└──────────────────┘
          │
          │ REST / WebSocket
          ▼
┌──────────────────┐
│  用户终端          │
│                   │
│  React 前端面板    │
│  Python CLI 客户端 │
└──────────────────┘
```

## 2. 硬件配置（真实检测值）

| 服务器 | CPU | 内存 | GPU | 系统 |
|--------|-----|------|-----|------|
| 124.221.85.5 | 2C AMD EPYC 7K62 | 1.9GB | 无 | Ubuntu 22.04 |
| 117.50.180.219 | 16C AMD EPYC 7413 | 31GB | RTX 4090 ×1, 24GB VRAM | Ubuntu 24.04 |

**硬件检测机制**：Worker 启动时通过 `nvidia-smi` 命令自动检测 GPU 型号/数量/显存，不依赖任何硬编码配置。

## 3. 任务生命周期

```
CLI/Web 提交 ZIP
     │
     ▼
┌──────────┐    upload     ┌──────────────┐   dispatch    ┌──────────────┐
│  Client   │ ──────────► │  Scheduler    │ ────────────► │  GPU Worker  │
│          │              │              │  downloadUrl  │              │
│ pack ZIP │              │ files/{id}.zip│ ◄─────────── │ download ZIP │
│ submit   │              │ task_packages │              │ extract      │
└──────────┘              │ tasks (MySQL) │              │ subprocess   │
                          │              │   progress    │              │
                          │ ◄────────────────────────── │ stdout parse │
                          │              │   metrics     │              │
                          │ WebSocket ──►│ ◄─────────── │              │
                          │   前端实时     │              └──────────────┘
                          └──────────────┘
```

### 状态机

```
PENDING  →  QUEUED  →  RUNNING  →  COMPLETED
   │           │           │
   │           │           └── FAILED
   │           │
   │     CANCELLED
   │
   (可取消)
```

## 4. Transfer 传输架构

### 4.1 ZIP 包规范

```
task-package.zip
├── task.yaml              # 必需：任务元配置
│   ├── name: "任务名称"
│   ├── type: TRAIN|FINETUNE|EVAL     # 可选，不填则自动检测
│   ├── model_name: "模型标识"
│   ├── entry_point: "train.py"       # 训练入口脚本
│   └── params:                       # 训练参数
│       ├── learning_rate: 2e-5
│       ├── epochs: 3
│       └── ...（任意自定义参数）
├── train.py               # 训练脚本（接收命令行参数）
├── finetune.py / eval.py  # 可选：微调/评估入口
└── data/                  # 可选：数据集文件
```

### 4.2 自动任务类型检测

Scheduler 收到 ZIP 后扫描文件名，自动判断任务类型：

| ZIP 内文件 | 检测结果 |
|-----------|---------|
| 仅 `train.py` | TRAIN |
| 仅 `finetune.py` / `lora.py` | FINETUNE |
| 仅 `eval.py` | EVAL |
| 同时有 `train.py` + `finetune.py` | FULL（全流程） |

### 4.3 传输流程

```
Client                          Scheduler                       Worker
  │                                │                              │
  │ POST /transfer/upload (ZIP)    │                              │
  │ ─────────────────────────────► │                              │
  │                                │ 保存 files/{pkgId}.zip       │
  │                                │ 解析 task.yaml → JSON        │
  │                                │ 自动检测 type                │
  │                                │ 写入 task_packages 表        │
  │                                │                              │
  │ POST /tasks/submit-package     │                              │
  │ ─────────────────────────────► │                              │
  │                                │ 创建 Task 实体 (PENDING)     │
  │                                │ 入队 Redis                   │
  │                                │                              │
  │                                │ DispatchService 轮询         │
  │                                │ LoadBalancer 选节点          │
  │                                │                              │
  │                                │ POST /transfer/receive       │
  │                                │ ────────────────────────────►│
  │                                │  {taskId, downloadUrl}       │
  │                                │                              │
  │                                │                              │ download ZIP
  │                                │                              │ extract
  │                                │                              │ parse task.yaml
  │                                │                              │ subprocess train.py
  │                                │                              │ parse stdout
  │                                │                              │
  │                                │ ◄── POST /tasks/{id}/progress│
  │                                │ ◄── POST /tasks/{id}/metrics │
  │                                │ ◄── POST /tasks/{id}/status  │
```

## 5. 训练脚本约定

Worker 通过 subprocess 调用训练脚本，从 stdout 解析进度：

### 5.1 命令行参数

Scheduler 将 `task.yaml` 中的 `params` 自动转为命令行参数：

```yaml
params:
  learning_rate: 2e-5
  epochs: 3
  batch_size: 4
```
→ `python train.py --learning_rate 2e-05 --epochs 3 --batch_size 4`

### 5.2 标准输出格式

训练脚本向 stdout 输出以下格式的行，Worker 自动解析上报：

```
PROGRESS: step=150/1000 loss=2.345 lr=1.8e-5 epoch=1/3
METRICS: {"step":150,"loss":2.345,"lr":1.8e-5,"epoch":1,"gpu_memory_mb":39500}
```

## 6. 负载均衡策略

**V1: 最少活跃任务 + GPU 利用率加权**

```
score = activeTasks × 10 + gpuUtilization × 0.6 + memoryUtilization × 0.4
```

选择 score 最低的 ONLINE 节点分发。通过 `LoadBalancer` 接口抽象，支持策略热切换。

## 7. 完整 API 端点

### 7.1 Scheduler API (124.221.85.5:8080)

| 方法 | 路径 | 说明 | 调用方 |
|------|------|------|--------|
| POST | `/api/v1/transfer/upload` | 上传 ZIP 包（multipart） | Client |
| GET | `/api/v1/transfer/download/{id}` | 下载 ZIP 包 | Worker |
| POST | `/api/v1/tasks` | JSON 方式提交任务（兼容旧版） | Client |
| POST | `/api/v1/tasks/submit-package` | 基于 ZIP 包创建任务 | Client |
| GET | `/api/v1/tasks` | 任务列表（支持 status 筛选、分页） | Client |
| GET | `/api/v1/tasks/{id}` | 任务详情（含 progress + metrics） | Client |
| DELETE | `/api/v1/tasks/{id}` | 取消任务 | Client |
| POST | `/api/v1/tasks/{id}/status` | Worker 状态回调 | Worker |
| POST | `/api/v1/tasks/{id}/progress` | Worker 进度上报 | Worker |
| POST | `/api/v1/tasks/{id}/metrics` | Worker 指标上报 | Worker |
| POST | `/api/v1/nodes/register` | GPU 节点注册 | Worker |
| POST | `/api/v1/nodes/heartbeat` | 心跳 + 资源上报（5s 周期） | Worker |
| GET | `/api/v1/nodes` | 节点列表 + 实时状态 | Client |
| GET | `/api/v1/monitor/dashboard` | 仪表盘聚合数据 | Client |
| WS | `/ws/dashboard` | WebSocket 实时推送 | Frontend |

### 7.2 Worker API (117.50.180.219:9000)

| 方法 | 路径 | 说明 | 调用方 |
|------|------|------|--------|
| GET | `/api/v1/health` | 健康检查 | Scheduler/运维 |
| POST | `/api/v1/transfer/receive` | 接收 downloadUrl + taskId | Scheduler |
| DELETE | `/api/v1/tasks/{id}` | 取消执行中的任务 | Scheduler |

## 8. 数据模型

### 8.1 MySQL（`ai_scheduler` 库）

```
tasks                   — 任务主表
├── id, name, type(TRAIN|FINETUNE|EVAL|FULL)
├── status(PENDING|QUEUED|RUNNING|COMPLETED|FAILED|CANCELLED)
├── params(JSON), model_name, dataset_path
├── node_id, package_id, priority
├── progress_pct, current_step, total_steps
├── metrics(JSON), log_path
├── created_at, started_at, finished_at, error_msg

gpu_nodes              — GPU 节点表
├── id, name, public_ip, api_port
├── gpu_model, gpu_count, vram_total_mb
├── status(ONLINE|OFFLINE|BUSY|ERROR)
├── gpu_utilization, memory_util, vram_used_mb
├── active_tasks, gpu_temp
├── last_heartbeat, registered_at

task_packages          — 任务包表
├── id, task_id, file_name, file_size, file_path
├── status(UPLOADING|READY|TRANSFERRING|EXTRACTED|ERROR)
├── yaml_data(JSON), uploaded_at

task_logs              — 任务日志表
├── id, task_id, level(INFO|WARN|ERROR), message, created_at
```

### 8.2 Redis

| Key | 类型 | 用途 |
|-----|------|------|
| `queue:task:pending` | List | 待调度任务队列 |
| `node:{id}:heartbeat` | String | 心跳时间戳（TTL 30s） |
| `node:{id}:resources` | Hash | 实时资源快照 |
| `task:{id}:progress` | Hash | 任务进度缓存 |
| `lock:dispatch` | String (NX) | 调度器分布式锁 |

## 9. Worker systemd 配置

GPU Worker 以 systemd 服务运行，崩溃自动重启：

```ini
[Unit]
Description=AI GPU Worker
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/opt/aisched-worker
Environment=SCHEDULER_URL=http://124.221.85.5:8080
Environment=WORKER_NAME=gpu-rtx4090-01
Environment=GPU_API_PORT=9000
Environment=WORKSPACE_DIR=/opt/aisched-worker/workspace
Environment=WORKER_PUBLIC_IP=117.50.180.219
ExecStart=/opt/aisched-worker/venv/bin/python -m uvicorn main:app --host 0.0.0.0 --port 9000
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

### 常用运维命令

```bash
# GPU 服务器
sudo systemctl status aisched-worker    # 查看状态
sudo systemctl restart aisched-worker   # 重启
sudo journalctl -u aisched-worker -f    # 实时日志
curl http://localhost:9000/api/v1/health  # 健康检查

# CPU 服务器
tail -f /home/ubuntu/scheduler.log      # 调度器日志
docker ps                                # MySQL/Redis 状态
curl http://localhost:8080/api/v1/nodes  # 节点列表
```

## 10. 安全组配置

| 服务器 | 端口 | 协议 | 来源 | 用途 |
|--------|------|------|------|------|
| CPU 124.221.85.5 | 22 | TCP | 任意 | SSH 管理 |
| CPU | 8080 | TCP | 任意 | Scheduler REST API |
| CPU | 8081 | TCP | 任意 | WebSocket 推送 |
| GPU 117.50.180.219 | 22 | TCP | 任意 | SSH 管理 |
| GPU | 9000 | TCP | 124.221.85.5/32 | Worker API（仅 CPU 调度器） |

## 11. CLI 客户端命令

```bash
# 打包本地项目
python cli.py pack --dir ./my-training-project --output task-package.zip

# 上传 ZIP 并提交任务
python cli.py submit --file task-package.zip --name "my-task"

# 查看任务列表
python cli.py list
python cli.py list -s RUNNING

# 查看任务详情
python cli.py status <task-id>

# 连接远程调度器
export SCHEDULER_URL=http://124.221.85.5:8080
```

## 12. Claude Skill / Agent 扩展接口

在 `scheduler/.../extension/` 包下预留三组接口，为后续智能调度做准备：

| 接口 | 用途 |
|------|------|
| `SkillRegistry` | 技能注册中心：注册调度策略/监控分析/故障自愈 Skill |
| `AgentOrchestrator` | Sub-Agent 编排器：多智能体协作（Dispatcher/Monitor/Trainer/Alert） |
| `EventHook` | 任务生命周期事件钩子：onTaskQueued/onTaskRunning/onTaskCompleted/onTaskFailed |

## 13. 技术栈总览

| 组件 | 技术 | 部署位置 |
|------|------|---------|
| 调度后端 | Java 21 + Spring Boot 3.2 + JPA + WebSocket | CPU 服务器 |
| 数据库 | MySQL 8.0 (Docker) | CPU 服务器 |
| 缓存队列 | Redis 7.2 (Docker) | CPU 服务器 |
| GPU Worker | Python 3.12 + FastAPI + uvicorn | GPU 服务器 |
| GPU 监控 | nvidia-ml-py + nvidia-smi | GPU 服务器 |
| 训练执行 | subprocess + 自定义训练脚本 | GPU 服务器 |
| 前端面板 | React 18 + TypeScript + Vite + ECharts | 用户本地 |
| CLI 客户端 | Python Click + requests | 用户本地 |
| 部署方式 | 直接部署 (CPU) + systemd (GPU) | — |

## 14. 项目文件结构

```
DeepSeekV4Test/
├── docs/
│   ├── overall-architecture.md      # 本文档
│   ├── architecture.md              # 系统架构总览
│   ├── api-spec.md                  # API 接口规范
│   ├── database-schema.md           # 数据库设计
│   ├── deployment.md                # 部署指南
│   ├── claude-extension.md          # Claude 扩展设计
│   ├── task-execution.md            # 任务执行机制
│   └── server-rental-guide.md       # 服务器租用指南
│
├── scheduler/                       # Java 调度服务 (~35 类)
│   ├── controller/                  # TaskController, TransferController, NodeController
│   ├── service/                     # TaskService, TransferService, DispatchService, ...
│   ├── scheduler/                   # LoadBalancer, LeastLoadedBalancer
│   ├── websocket/                   # DashboardHandler, NodeStatusHandler
│   ├── queue/                       # RedisTaskQueue
│   ├── node/                        # NodeRegistry, HeartbeatChecker
│   ├── model/{entity,dto,enums}/   # JPA实体, DTO
│   ├── repository/                  # JPA仓储
│   ├── extension/                   # SkillRegistry, AgentOrchestrator, EventHook
│   └── config/                      # AppConfig, RedisConfig, AsyncConfig
│
├── worker/                          # Python GPU Worker (~15 模块)
│   ├── main.py                      # FastAPI 入口
│   ├── config.py                    # 配置管理
│   ├── api/routes.py                # REST 路由（含 /transfer/receive）
│   ├── engine/executor.py           # subprocess 执行 + stdout 进度解析
│   ├── monitor/gpu_monitor.py       # GPU 硬件检测 + 资源采集
│   ├── heartbeat/reporter.py        # 心跳 + 资源周期性上报
│   ├── transfer/receiver.py         # ZIP 下载 + 解压
│   └── utils/network.py             # 节点注册（含硬件自动检测）
│
├── frontend/                        # React 监控面板 (~25 组件)
│   └── src/pages/                   # Dashboard, TaskList, TaskDetail, NodeMonitor, SubmitTask
│
├── client/                          # Python CLI (~7 模块)
│   └── commands/                    # submit, pack, status, list_tasks
│
├── docker-compose.yml               # 开发环境编排
├── .env.example                     # 环境变量模板
└── README.md
```
