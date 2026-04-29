# 系统架构设计文档

## 1. 概述

AI 训练与微调分布式任务调度分发系统，由 1 台 CPU 云服务器作为核心调度节点、2 台 GPU 算力服务器作为执行节点构成。系统支持用户通过 CLI 或 Web 面板提交训练/微调任务，由调度节点依据负载均衡策略自动分发至 GPU 节点执行，提供全生命周期可视化监控。

## 2. 集群拓扑

```
┌─────────────────────────────────────────────────────────────────┐
│                        公网 (Internet)                          │
└─────────────────────────────────────────────────────────────────┘
        │                    │                    │
   [公网IP]              [公网IP]             [公网IP]
        │                    │                    │
┌───────┴───────┐     ┌──────┴──────┐     ┌──────┴──────┐
│  CPU 云服务器  │     │ GPU 服务器 1 │     │ GPU 服务器 2 │
│               │     │              │     │              │
│  Scheduler ◄──┼─────┼──► Worker   │     │   Worker     │
│  + MySQL      │     │   FastAPI   │     │   FastAPI    │
│  + Redis      │     │   端口:9000 │     │   端口:9000   │
│  端口:8080    │     │              │     │              │
│  WS :8081     │     │  A100 ×8    │     │  A100 ×8    │
└───────────────┘     └─────────────┘     └──────────────┘
```

## 3. 核心组件

### 3.1 CPU 调度节点 (scheduler/)

- **框架**: Java 17 + Spring Boot 3.x
- **持久化**: Spring Data JPA → MySQL 8.0
- **缓存/队列**: Spring Data Redis → Redis 7.x
- **实时推送**: Spring WebSocket (STOMP)
- **异步处理**: @Async + CompletableFuture

#### 职责
- 任务 CRUD 接口（客户端提交、查询、取消任务）
- GPU 节点注册、心跳维护、离线检测
- 任务队列管理与自动调度分发
- 负载均衡策略执行
- WebSocket 实时数据推送（任务状态、节点负载）
- 用户认证与权限管控（预留）
- Claude Skill/Agent 扩展接口（预留）

### 3.2 GPU 算力节点 (worker/)

- **框架**: Python 3.11 + FastAPI
- **GPU 监控**: pynvml / nvidia-smi
- **训练引擎**: PyTorch / Transformers / PEFT

#### 职责
- 接收调度器下发的训练/微调任务
- 执行训练脚本并实时上报进度
- GPU 资源（利用率、显存、温度）周期性采集上报
- 心跳维持，节点注册

### 3.3 前端监控面板 (frontend/)

- **框架**: React 18 + TypeScript + Vite
- **图表**: ECharts
- **通信**: Axios (REST) + WebSocket (实时推送)

#### 职责
- 总览仪表盘（集群状态概览）
- 任务列表 + 详细生命周期追踪
- GPU 节点实时资源监控
- 任务提交界面

### 3.4 CLI 客户端 (client/)

- **框架**: Python Click
- **通信**: requests (REST)

#### 职责
- `submit`：提交训练/微调任务
- `status`：查询任务状态与进度
- `list`：查看任务列表
- `cancel`：取消排队中任务

## 4. 数据流

### 4.1 任务提交流

```
Client (CLI/Web) ──POST /api/v1/tasks──► Scheduler
                                            │
                                    写入 MySQL (status=PENDING)
                                            │
                                    写入 Redis queue:task:pending
                                            │
                                    DispatchService 定时轮询
                                            │
                                    选择最优节点 (LoadBalancer)
                                            │
                                    POST /api/v1/tasks/execute ──► GPU Worker
                                                                      │
                                                              执行训练脚本
                                                                      │
                                    WebSocket 推送进度 ◄──────────────┘
```

### 4.2 心跳/监控流

```
GPU Worker ──周期性 (5s)──► POST /api/v1/nodes/heartbeat ──► Scheduler
                                                               │
                                                       更新 Redis (heartbeat + resources)
                                                               │
                                                       检查超时 (30s) → 标记 OFFLINE
                                                               │
                                                       WebSocket 推送给前端
```

## 5. 负载均衡策略

**V1: 最少活跃任务 + GPU 利用率加权**

```
score = activeTasks × 10 + gpuUtilization × 0.6 + memoryUtilization × 0.4
```

选择 score 最低的 ONLINE 节点分发任务。策略通过 `LoadBalancer` 接口抽象，支持运行时切换。

## 6. 安全设计

- API 鉴权：基于 JWT Token（预留）
- 节点间通信：HMAC 签名校验（预留）
- SQL 注入防护：JPA 参数化查询
- 敏感配置：环境变量注入，不硬编码

## 7. 高可用考虑

- 单个调度节点 + MySQL/Redis 为单点，但满足初期需求
- Redis 开启 AOF 持久化，防止重启丢失队列
- 后续可扩展为调度器多副本 + Redis Sentinel
