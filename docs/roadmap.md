# 后续优化与开发方案

> 基于 2026-05-03 代码库现状，按优先级分组

---

## 已完成

| 编号 | 功能 | 完成日期 |
|------|------|----------|
| P1.1 | WebSocket 实时推送 — STOMP 全双工、状态变更/节点资源/日志流推送、useRealtimeData hook、断线自动回退轮询 | 2026-05-02 |
| — | 训练产物管理 — 文件浏览器、单文件下载、ZIP 打包下载、指标导出 (CSV/JSON/JSONL) | 2026-05-03 |
| — | 前端性能优化 — Canvas 动画循环不再随数据更新重建、首次加载立即发 HTTP、MonitorService 单 SQL GROUP BY | 2026-05-03 |

---

## Phase 1 — 基础体验与稳定性（1-2 周）

### 1.1 前端骨架屏 + 全局错误通知

**现状**: 加载期间纯文本 "LOADING..."，操作失败无提示，网络断开无反馈。

**改动项**:
- 新建 `Skeleton.tsx` — 像素风脉冲骨架屏，替换 TaskList / TaskDetail / NodeMonitor 的 LOADING 状态
- 全局 `Toast.tsx` 组件 — 右上角弹出，支持 success / error / warning
- `api.ts` axios 拦截器 — 统一捕获 4xx/5xx/网络错误，自动弹 Toast
- `useApi` 增加重试（3 次，指数退避 1s → 2s → 4s）

**涉及文件**: 新建 2 组件，改 `useApi.ts`、`api.ts`，改 5 个页面

---

### 1.2 数据库索引 + 历史任务归档

**现状**: `schema.sql` 索引已存在但 `DISPATCHING` 状态缺失；任务数量增长后全表查询变慢。

**改动项**:
- `schema.sql` — 补 `DISPATCHING` 到 status ENUM
- 新建 `tasks_archive` 表 — 同构 tasks 表
- 新建 `TaskArchiveService` — `@Scheduled(cron = "0 3 * * *")` 每日凌晨 3 点归档 30 天前终态任务
- `TaskRepository` — 增加 `deleteByStatusInAndFinishedAtBefore()` 方法
- 前端分页: 总量 > 1000 时不返回精确 count，改用 `hasMore` 标记

**涉及文件**: `schema.sql`、新建 `TaskArchiveService.java`、改 `TaskRepository.java`、`TaskController.java`

---

### 1.3 数据一致性修复

**现状**: 多处类型不一致可能导致边缘问题。

**改动项**:
- 前端 `TaskType` 补 `'FULL'`（后端已支持）
- `database-schema.md` 更新 — 补 `package_id`、`metrics`、`log_path` 字段文档
- 删除废弃 `worker/heartbeat/reporter.py`（已标注废弃，调度器改为主动轮询）
- `HeartbeatChecker.java` 确认注释状态，移除或标记 `@Deprecated`

---

## Phase 2 — 功能扩展（3-4 周）

### 2.1 任务模板系统

**现状**: 提交任务页硬编码 LoRA 参数，新增任务类型需改前端代码。

**改动项**:

**后端**:
- 新建 `TaskTemplate` 实体 — `id, name, type, description, defaultParams(JSON), createdAt`
- 新建 `TaskTemplateRepository` + `TaskTemplateService` + `TaskTemplateController`
  - `GET /api/v1/templates` — 列表
  - `POST /api/v1/templates` — 创建
  - `PUT /api/v1/templates/{id}` — 更新
  - `DELETE /api/v1/templates/{id}` — 删除
- 预置数据 (`data.sql`):
  - MAE 自监督预训练 (epochs=200, mask_ratio=0.75, lr=1.5e-4)
  - LoRA 微调 (lora_rank=16, lora_alpha=32, lr=2e-5, epochs=3)
  - 图像分类微调 (epochs=20, lr=1e-3, batch_size=32)
  - 全量微调 (epochs=5, lr=5e-6, warmup=0.1)

**前端**:
- `SubmitTask.tsx` — 增加模板选择下拉，选中后自动填充参数，可覆盖
- 新建 `TemplateManager.tsx` 页面 — CRUD 管理模板
- 新路由 `/templates`

**涉及文件**: 新建 4 后端文件、新建 1 前端页面、改 `SubmitTask.tsx`、`App.tsx`、`Layout.tsx`

---

### 2.2 批量操作与任务管理增强

**改动项**:

**后端**:
- `POST /api/v1/tasks/batch/cancel` — 批量取消 `{ taskIds: string[] }`
- `POST /api/v1/tasks/batch/retry` — 批量重跑 FAILED 任务（克隆参数 + 重新提交）
- `POST /api/v1/tasks/{taskId}/clone` — 克隆任务
- `GET /api/v1/tasks/compare?ids=a,b,c` — 返回多个任务的指标历史，用于对比

**前端**:
- `TaskList.tsx` — 多选复选框 + 底部操作栏（批量取消/批量重跑）
- 新建 `TaskCompare.tsx` 页面 — 选择 2-3 个 COMPLETED 任务，ECharts 多曲线叠加对比 loss/LR
- `TaskDetail.tsx` — 增加 "CLONE" 按钮
- 新建 `GanttTimeline.tsx` 组件 — 甘特图展示 DISPATCHING/QUEUED/RUNNING 各阶段耗时

**涉及文件**: 改 `TaskController.java`、`TaskService.java`、新建 2 前端页面/组件、改 `TaskList.tsx`

---

### 2.3 Worker 专用引擎实现

**现状**: `trainer.py` 和 `finetuner.py` 是空桩，所有任务通过 `executor.py` 通用子进程模式执行。

**改动项**:
- `executor.py` — 按 `task_type` 路由到对应引擎
- `trainer.py` — TRAIN 类型专用流程：自动检测数据集格式、设置分布式训练参数、checkpoint 自动恢复
- `finetuner.py` — FINETUNE 类型专用流程：自动加载预训练权重、LoRA/QLoRA adapter 管理、合并 adapter 到 base model
- 通用改进：GPU 内存预检（预测 VRAM 需求，不足时拒绝任务而非 OOM crash）

---

## Phase 3 — 多用户与安全（5-6 周）

### 3.1 JWT 认证 + 多用户

**现状**: `users` 表已存在但未接入认证，所有人可操作所有资源。

**改动项**:

**后端**:
- 引入 `spring-boot-starter-security` + `jjwt`
- 新建 `SecurityConfig.java` — JWT filter chain
- 新建 `AuthController` — `POST /api/v1/auth/login`、`POST /api/v1/auth/register`
- `Task` 实体增加 `userId` 字段
- `TaskService` — 查询/操作时过滤当前用户的任务（ADMIN 可看全部）
- 公开端点白名单: `/actuator/health`, `/api/v1/auth/**`, `/ws/**`

**前端**:
- 新建 `Login.tsx` 页面
- `api.ts` — axios request 拦截器自动带 `Authorization: Bearer {token}`
- `Layout.tsx` — 显示当前用户名 + 登出按钮
- 路由守卫: 未登录重定向到 `/login`
- ADMIN 角色: 显示节点管理、Purge All 按钮
- USER 角色: 只看自己任务，隐藏危险操作

**涉及文件**: 新建 4 后端文件、新建 1 前端页面、改 `api.ts`、`Layout.tsx`、`App.tsx`、`TaskService.java`

---

### 3.2 定时调度

**改动项**:
- 新建 `ScheduledTask` 实体 — `id, templateId, cronExpression, enabled, lastRunAt, nextRunAt`
- 新建 `TaskSchedulerService` — 解析 Cron 表达式，到时自动调用 `TaskService.submit()`
- 前端 `ScheduleManager.tsx` — Cron 可视化选择器（分/时/日/周快捷选项）
- 与模板系统联动: 选择模板 → 设置 Cron → 自动周期训练

---

## Phase 4 — DevOps 与可观测性（7-8 周）

### 4.1 CI/CD 自动化

**现状**: 手动 SSH + systemctl 部署。

**改动项**:
- `.github/workflows/deploy-scheduler.yml`:
  - Trigger: push to `master`, path `scheduler/**`
  - Steps: `mvn package -DskipTests` → `scp scheduler.jar` → `ssh systemctl restart aisched`
- `.github/workflows/deploy-frontend.yml`:
  - Trigger: push to `master`, path `frontend/**`
  - Steps: `npm ci && npm run build` → `scp dist/*` → `ssh: 清理旧 assets`
- `.github/workflows/deploy-worker.yml`:
  - Trigger: push to `master`, path `worker/**`
  - Steps: `scp worker/*` → `ssh pip install && systemctl restart worker`
- GitHub Secrets: `SSH_HOST`, `SSH_USER`, `SSH_KEY`, `GPU_HOST`

---

### 4.2 健康检查与 Prometheus 监控

**改动项**:
- `GET /actuator/health` 增强: Redis 连通性、MySQL 连接池、各 Worker 可达性
- 引入 `micrometer-prometheus`:
  - `scheduler_tasks_submitted_total` (counter)
  - `scheduler_tasks_completed_total` (counter, label: status)
  - `scheduler_queue_depth` (gauge)
  - `scheduler_dispatch_duration_seconds` (histogram)
  - `scheduler_worker_poll_duration_seconds` (histogram)
- Worker 增加 `/metrics` Prometheus endpoint: GPU util, VRAM, temperature, task count
- Grafana dashboard JSON 预置
- 告警规则: 队列深度 > 10 持续 5 分钟 → 通知

---

### 4.3 Docker 部署优化

**改动项**:
- Scheduler Dockerfile 多阶段构建 (`maven:3.9-eclipse-temurin-17` → `eclipse-temurin:17-jre-alpine`)
- `docker-compose.yml` 拆分 `docker-compose.dev.yml` / `docker-compose.prod.yml`
- 前端加入 docker-compose: nginx + 预构建 dist
- Redis AOF + RDB 双持久化配置
- 日志收集: `docker-compose` 加入 Loki + Promtail，或 ELK

---

## Phase 5 — 高级特性（远期）

### 5.1 多 GPU 分布式训练
- Worker 端 `torchrun` / `deepspeed` 启动器
- Scheduler 分配多节点到同一任务
- 节点间通信配置自动生成 (NCCL, host file)

### 5.2 模型仓库 + 版本管理
- 训练产物注册为模型版本
- 模型对比 (accuracy / loss / inference speed)
- 一键部署推理服务

### 5.3 智能调度
- 基于历史数据预测任务耗时
- 自动选择最优节点（不仅是最空闲，还考虑 GPU 型号匹配、VRAM 充足性）
- 抢占式调度: 高优先级任务可暂停低优先级任务

### 5.4 扩展系统激活
- 实现 `SkillRegistry` / `AgentOrchestrator` / `EventHook` 接口
- 异常自动恢复: OOM → 自动降低 batch_size 重跑
- 调度决策 agent: 根据集群负载自动调整并发度

---

## 推荐执行顺序

```
Week 1-2    Phase 1: 骨架屏 + 错误通知 + 索引归档 + 数据一致性
Week 3-4    Phase 2: 任务模板 + 批量操作 + 任务对比
Week 5-6    Phase 3: JWT 认证 + 定时调度
Week 7-8    Phase 4: CI/CD + Prometheus + Docker 优化
Week 9+     Phase 5: 分布式训练 / 模型仓库 / 智能调度
```

> 此文档基于 2026-05-03 代码库状态生成。
