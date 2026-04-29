# AI 模型训练与微调分布式任务调度分发系统

## 1. 项目概述

一套面向 AI 大模型训练与微调的分布式任务调度分发系统。集群包含 1 台 CPU 云服务器（核心调度 + MySQL + Redis）和 2 台 GPU 算力服务器（训练/微调执行），支持用户通过 CLI 或 Web 面板提交任务，由调度节点依据负载均衡策略自动分发，提供全生命周期可视化监控。

### 核心能力

- **任务调度**：提交训练/微调作业，自动排队与负载均衡分发
- **状态追踪**：PENDING → QUEUED → RUNNING → COMPLETED/FAILED/CANCELLED 全生命周期
- **实时监控**：WebSocket 推送 GPU 利用率、显存占用、温度等资源指标
- **多节点协作**：双 GPU 节点并发执行，心跳维持与离线自动检测
- **扩展预留**：架构深度适配 Claude Skill / Sub-Agent 智能体协作

---

## 2. 架构概览

```
┌──────────────┐     REST/WS      ┌─────────────────┐     REST/WS      ┌──────────────┐
│   React 前端  │ ◄──────────────► │  CPU 调度节点    │ ◄──────────────► │  GPU Worker  │
│  (localhost)  │                  │  Java SpringBoot │                  │  Python      │
└──────────────┘                  │  + MySQL + Redis │                  │  FastAPI ×2  │
        │                         └─────────────────┘                  └──────────────┘
        │ REST                           │   ▲                              │   ▲
        ▼                               │   │                              │   │
┌──────────────┐                        ▼   │                              ▼   │
│  Python CLI   │ ──── REST ──────────►┘   │          REST ◄──────────────┘   │
│  客户端       │                           │  心跳/状态上报                   │
└──────────────┘                           │          WebSocket ◄─────────────┘
                                            │  资源监控数据推送
                                            │
                                     WebSocket ────────► 前端监控面板
```

### 集群拓扑

| 节点 | 角色 | 技术栈 | 端口 |
|------|------|--------|------|
| CPU 云服务器 ×1 | 核心调度 + MySQL + Redis | Java 17 + Spring Boot 3.2 | 8080 (API) / 8081 (WS) |
| GPU 服务器 ×2 | 算力执行 | Python 3.11 + FastAPI | 9000 (Worker API) |
| 用户本地 | 监控面板 + CLI 客户端 | React 18 + TypeScript / Python Click | 5173 (Vite) |

### 技术栈

| 组件 | 技术选型 | 说明 |
|------|---------|------|
| 调度后端 | Java 17 + Spring Boot 3.2 | JPA + Redis + WebSocket + Actuator |
| 数据持久化 | MySQL 8.0 | 任务元数据、节点注册、权限表 |
| 缓存/队列 | Redis 7.x | List 任务队列、Hash 资源快照、分布式锁 |
| GPU Worker | Python 3.11 + FastAPI | pynvml GPU 监控、httpx 异步通信 |
| 监控前端 | React 18 + TypeScript + Vite | ECharts 图表、WebSocket 实时推送 |
| CLI 客户端 | Python Click + requests | 提交/查询/列表三大命令 |
| 部署 | Docker Compose | 按节点角色分离编排文件 |

---

## 3. 项目目录结构

```
DeepSeekV4Test/
│
├── docs/                                   # 📄 设计文档
│   ├── architecture.md                     #   系统架构总览与数据流
│   ├── api-spec.md                         #   API 接口规范（调度端 + Worker 端）
│   ├── database-schema.md                  #   MySQL 表设计 + Redis 数据结构
│   ├── deployment.md                       #   Docker Compose 部署指南
│   ├── claude-extension.md                 #   Claude Skill/Agent 扩展预留设计
│   ├── task-execution.md                   #   训练任务执行机制详解
│   └── server-rental-guide.md              #   服务器租用指南
│
├── scheduler/                              # ☕ CPU 核心调度服务 (Java)
│   ├── pom.xml                             #   Maven 依赖配置
│   ├── Dockerfile                          #   多阶段构建（maven build → jre run）
│   └── src/main/
│       ├── resources/
│       │   ├── application.yml             #   主配置（含公网 IP 占位）
│       │   ├── application-dev.yml         #   开发环境配置
│       │   └── schema.sql                  #   数据库初始化 DDL
│       └── java/com/aisched/scheduler/
│           ├── SchedulerApplication.java   #   SpringBoot 入口 (@EnableAsync + @EnableScheduling)
│           ├── controller/
│           │   ├── TaskController.java     #   任务 CRUD REST 接口
│           │   ├── NodeController.java     #   GPU 节点注册/心跳接口
│           │   └── MonitorController.java  #   仪表盘数据查询接口
│           ├── service/
│           │   ├── TaskService.java        #   任务生命周期管理
│           │   ├── DispatchService.java    #   调度分发引擎（定时轮询 + 分布式锁）
│           │   ├── NodeService.java        #   节点注册/心跳/状态管理
│           │   └── MonitorService.java     #   监控数据聚合
│           ├── scheduler/
│           │   ├── LoadBalancer.java       #   负载均衡策略接口
│           │   └── LeastLoadedBalancer.java #  最少负载实现 (score = tasks×10 + gpu×0.6 + mem×0.4)
│           ├── websocket/
│           │   ├── WebSocketConfig.java    #   STOMP WebSocket 配置
│           │   ├── DashboardHandler.java   #   仪表盘数据定时推送
│           │   └── NodeStatusHandler.java  #   节点状态实时推送
│           ├── queue/
│           │   └── RedisTaskQueue.java     #   Redis List 任务队列 + 分布式锁
│           ├── node/
│           │   ├── NodeRegistry.java       #   节点内存注册表
│           │   └── HeartbeatChecker.java   #   心跳超时检测（@Scheduled）
│           ├── model/
│           │   ├── entity/                 #   JPA 实体: Task, GpuNode, TaskLog, User
│           │   ├── dto/                    #   DTO: TaskSubmitRequest, TaskStatusResponse, NodeStatusDTO, DashboardSnapshot
│           │   └── enums/                  #   枚举: TaskStatus, NodeStatus
│           ├── repository/                 #   Spring Data JPA 接口
│           ├── config/                     #   AppConfig, RedisConfig, AsyncConfig
│           ├── extension/                  #   🔌 Claude Skill/Agent 扩展预留
│           │   ├── SkillRegistry.java      #     技能注册中心接口
│           │   ├── AgentOrchestrator.java  #     Sub-Agent 编排器接口
│           │   └── EventHook.java          #     任务生命周期事件钩子接口
│           └── common/
│               ├── exception/              #   全局异常处理
│               └── util/                   #   工具类
│
├── worker/                                 # 🐍 GPU 算力执行节点 (Python)
│   ├── requirements.txt                    #   fastapi, uvicorn, httpx, pynvml, psutil
│   ├── Dockerfile                          #   Python 3.11-slim 镜像
│   ├── main.py                             #   FastAPI 启动入口 + 生命周期事件
│   ├── config.py                           #   配置管理（调度器地址等环境变量）
│   ├── api/
│   │   └── routes.py                       #   REST 接口（任务执行/取消/健康检查）
│   ├── engine/
│   │   ├── executor.py                     #   任务执行引擎（异步任务分发）
│   │   ├── trainer.py                      #   全量训练任务封装
│   │   └── finetuner.py                    #   LoRA/QLoRA 微调任务封装
│   ├── monitor/
│   │   └── gpu_monitor.py                  #   GPU 资源采集（pynvml / 降级 psutil）
│   ├── heartbeat/
│   │   └── reporter.py                     #   心跳 + 资源周期性上报
│   └── utils/
│       └── network.py                      #   节点注册 + 公网 IP 检测
│
├── frontend/                               # ⚛️ 可视化监控面板 (React)
│   ├── package.json                        #   react, react-router, axios, echarts
│   ├── vite.config.ts                      #   Vite + API/WS 代理配置
│   ├── tsconfig.json                       #   TypeScript 配置
│   ├── index.html                          #   SPA 入口
│   ├── Dockerfile                          #   Node build → Nginx 多阶段构建
│   ├── nginx.conf                          #   Nginx 反向代理（API + WS）
│   └── src/
│       ├── main.tsx                        #   应用入口（WebSocket 初始化）
│       ├── App.tsx                         #   路由配置（5 页面）
│       ├── pages/
│       │   ├── Dashboard.tsx               #   集群总览仪表盘（任务统计 + GPU 节点卡片 + 资源图表）
│       │   ├── TaskList.tsx                 #   任务列表（状态筛选 + 分页）
│       │   ├── TaskDetail.tsx              #   任务详情（时间线 + 进度条 + 元数据）
│       │   ├── NodeMonitor.tsx             #   GPU 节点实时监控（仪表盘 + 趋势图）
│       │   └── SubmitTask.tsx              #   任务提交表单（LoRA 参数配置）
│       ├── components/
│       │   ├── Layout.tsx                  #   侧边栏导航布局
│       │   ├── StatusBadge.tsx             #   状态标签（颜色映射）
│       │   ├── NodeCard.tsx                #   GPU 节点信息卡片
│       │   ├── TaskTimeline.tsx            #   任务生命周期时间线
│       │   ├── GpuGauge.tsx                #   GPU 利用率仪表盘
│       │   └── ResourceChart.tsx           #   集群资源对比柱状图
│       ├── hooks/
│       │   ├── useApi.ts                   #   通用 API 请求 + 轮询 Hook
│       │   └── useWebSocket.ts             #   WebSocket 订阅 Hook
│       ├── services/
│       │   ├── api.ts                      #   Axios 实例 + 所有 API 方法
│       │   └── ws.ts                       #   WebSocket 客户端（自动重连）
│       ├── types/
│       │   └── index.ts                    #   完整 TypeScript 类型定义
│       └── styles/
│           └── global.css                  #   全局样式重置
│
├── client/                                 # 🖥️ 命令行客户端 (Python)
│   ├── requirements.txt                    #   click, requests, tabulate
│   ├── cli.py                              #   Click CLI 入口
│   ├── config.py                           #   调度器地址配置
│   └── commands/
│       ├── submit.py                       #   submit: 提交训练/微调任务
│       ├── status.py                       #   status: 查询任务详情
│       └── list_tasks.py                   #   list: 任务列表筛选
│
├── docker-compose.yml                      # 🐳 开发环境编排 (MySQL + Redis + Scheduler)
├── docker-compose.cpu.yml                  # 🐳 CPU 节点生产编排
├── docker-compose.gpu.yml                  # 🐳 GPU 节点生产编排（含 NVIDIA 设备映射）
├── .env.example                            # 📋 环境变量模板（公网 IP 占位）
├── .gitignore
└── README.md                               # 📖 本文件
```

---

## 4. 快速开始

### 4.1 环境要求

| 组件 | 要求 |
|------|------|
| Docker | 20.10+ |
| Docker Compose | 2.x |
| NVIDIA Container Toolkit | GPU 节点必需 |
| Java | 17+（本地开发） |
| Python | 3.11+（本地开发） |
| Node.js | 20.x（前端开发） |

### 4.2 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env`，填入实际值：

```env
# === 必填：CPU 节点公网 IP ===
SCHEDULER_PUBLIC_IP=123.45.67.89

# === 必填：GPU 节点公网 IP ===
GPU1_PUBLIC_IP=98.76.54.32
GPU2_PUBLIC_IP=98.76.54.33

# === 必填：密码 ===
MYSQL_PASSWORD=<强密码>
MYSQL_ROOT_PASSWORD=<强密码>
REDIS_PASSWORD=<强密码>
```

### 4.3 启动 CPU 调度节点

在 CPU 云服务器上：

```bash
# 克隆项目
git clone <repo-url> && cd DeepSeekV4Test

# 配置环境变量
cp .env.example .env
vim .env  # 填入公网 IP 和密码

# 启动 MySQL + Redis + Scheduler
docker-compose -f docker-compose.cpu.yml up -d

# 验证
curl http://localhost:8080/api/v1/nodes
# 应返回: {"code":200,"message":"success","data":[]}
```

### 4.4 启动 GPU Worker 节点

在每台 GPU 服务器上：

```bash
# 安装 NVIDIA Container Toolkit（首次）
distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | \
  sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg
curl -s -L https://nvidia.github.io/libnvidia-container/$distribution/libnvidia-container.list | \
  sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | \
  sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list
sudo apt-get update && sudo apt-get install -y nvidia-container-toolkit
sudo nvidia-ctk runtime configure --runtime=docker
sudo systemctl restart docker

# 创建 .env（每台机器上的值不同）
cat > .env << 'EOF'
SCHEDULER_PUBLIC_IP=123.45.67.89
SCHEDULER_API_PORT=8080
WORKER_NAME=gpu-worker-01          # 节点名称，两台设不同值
GPU_API_PORT=9000
GPU_COUNT=8
GPU_MODEL=NVIDIA A100-SXM4-80GB
VRAM_TOTAL_MB=655360
EOF

# 启动 Worker
docker-compose -f docker-compose.gpu.yml up -d

# 查看日志确认注册成功
docker logs aisched-gpu-worker
# 应看到: Worker registered as nodeId=xxx
```

### 4.5 启动前端监控面板

```bash
cd frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev
# 访问 http://localhost:5173
```

### 4.6 使用 CLI 提交任务

```bash
cd client

# 安装依赖
pip install -r requirements.txt

# 提交微调任务
python cli.py submit \
  --name "qwen-lora-finetune" \
  --type FINETUNE \
  --model "Qwen/Qwen2.5-7B" \
  --dataset "/data/datasets/instruction.jsonl" \
  --params '{"loraRank":16,"loraAlpha":32,"learningRate":2e-5,"epochs":3,"batchSize":4}'

# 查看任务列表
python cli.py list --status RUNNING

# 查看任务详情
python cli.py status <task-id>

# 连接到远程调度器
export SCHEDULER_URL=http://123.45.67.89:8080
python cli.py list
```

---

## 5. 任务生命周期

```
用户/CLI 提交
     │
     ▼
  PENDING ──────► 已写入 MySQL，进入 Redis 队列
     │
     ▼
  QUEUED  ──────► 调度器已分配节点，等待 Worker 拉取
     │
     ▼
  RUNNING ──────► Worker 执行中，实时上报进度
     │
     ├──────────► COMPLETED  ── 训练/微调完成
     │
     ├──────────► FAILED     ── 异常失败（可重试）
     │
     └──────────► CANCELLED  ── 用户手动取消（仅 PENDING/QUEUED 态可取消）
```

---

## 6. 端口规划

| 服务 | 端口 | 协议 | 暴露方向 |
|------|------|------|---------|
| Scheduler API | 8080 | HTTP REST | 公网（客户端 + Worker 访问） |
| Scheduler WS | 8081 | WebSocket (STOMP) | 公网（前端访问） |
| MySQL | 3306 | TCP | 仅容器内网（Scheduler 访问） |
| Redis | 6379 | TCP | 仅容器内网（Scheduler 访问） |
| GPU Worker API | 9000 | HTTP REST | 公网（Scheduler 访问） |
| Frontend Dev | 5173 | HTTP | 本地（Vite 开发服务器） |

---

## 7. 设计文档

| 文档 | 内容 |
|------|------|
| [overall-architecture.md](docs/overall-architecture.md) | **整体架构文档** — 部署拓扑、Transfer传输、ZIP规范、安全组、运维命令 |
| [architecture.md](docs/architecture.md) | 系统架构总览、组件职责、数据流、负载均衡策略、高可用考量 |
| [api-spec.md](docs/api-spec.md) | 完整的 REST API 规范（任务 CRUD、节点管理、监控、Worker 端接口） |
| [database-schema.md](docs/database-schema.md) | MySQL 4 张表 DDL + Redis 5 类数据结构定义 |
| [deployment.md](docs/deployment.md) | 分角色 Docker Compose 部署指南、防火墙规则、故障恢复 |
| [claude-extension.md](docs/claude-extension.md) | Claude Skill/Agent 扩展接口契约、MCP 对齐方案、演进路线图 |
| [task-execution.md](docs/task-execution.md) | 训练任务执行机制详解（调度链路、占位实现 vs 真实 subprocess、接入步骤） |
| [server-rental-guide.md](docs/server-rental-guide.md) | 服务器租用指南（平台对比、配置推荐、网络规划、到手初始设置、费用控制） |

---

## 8. Kubernetes 部署（可选）

```bash
# 创建 ConfigMap
kubectl create configmap aisched-config --from-env-file=.env

# 部署 MySQL + Redis
kubectl apply -f k8s/infrastructure/

# 部署 Scheduler
kubectl apply -f k8s/scheduler/

# 部署 GPU Worker（DaemonSet）
kubectl apply -f k8s/worker/

# 部署 Frontend
kubectl apply -f k8s/frontend/
```

---

## 9. Claude Skill / Sub-Agent 扩展

系统在 `scheduler/.../extension/` 包下预留了三组扩展接口，设计阶段仅定义契约：

- **SkillRegistry** — 技能注册中心（调度策略 Skill、监控分析 Skill、故障自愈 Skill）
- **AgentOrchestrator** — Sub-Agent 编排器（多智能体协作决策）
- **EventHook** — 任务生命周期事件钩子（状态变更回调）

后续通过 Spring `@ConditionalOnProperty` 激活，与 Claude Code 的 MCP 协议对齐。详见 [claude-extension.md](docs/claude-extension.md)。

---

## 10. 常用操作

### 查看服务状态

```bash
# CPU 节点
docker-compose -f docker-compose.cpu.yml ps

# GPU 节点
docker-compose -f docker-compose.gpu.yml ps

# 调度器健康检查
curl http://localhost:8080/actuator/health

# Worker 健康检查
curl http://localhost:9000/api/v1/health
```

### 查看日志

```bash
# 调度器日志
docker logs -f aisched-scheduler

# Worker 日志
docker logs -f aisched-gpu-worker

# MySQL 日志
docker logs -f aisched-mysql

# Redis 日志
docker logs -f aisched-redis
```

### 停止服务

```bash
# CPU 节点
docker-compose -f docker-compose.cpu.yml down

# GPU 节点
docker-compose -f docker-compose.gpu.yml down

# 清理数据卷（慎用）
docker-compose -f docker-compose.cpu.yml down -v
```

### 数据库直连

```bash
# 进入 MySQL 容器
docker exec -it aisched-mysql mysql -u aisched -p ai_scheduler

# 查看任务统计
SELECT status, COUNT(*) FROM tasks GROUP BY status;

# 查看在线节点
SELECT name, status, gpu_utilization, active_tasks, last_heartbeat FROM gpu_nodes;
```
