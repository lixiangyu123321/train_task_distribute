# API 接口规范

## 基础信息

- **Base URL**: `http://<SCHEDULER_PUBLIC_IP>:8080/api/v1`
- **Content-Type**: `application/json`
- **认证方式**: Bearer Token (预留，Header: `Authorization: Bearer <token>`)

---

## 1. 任务管理

### 1.1 提交任务

```
POST /tasks
```

**Request Body:**

```json
{
  "name": "qwen-finetune-20260428",
  "type": "FINETUNE",
  "modelName": "Qwen/Qwen2.5-7B",
  "datasetPath": "/data/datasets/instruction.jsonl",
  "params": {
    "learningRate": 2e-5,
    "epochs": 3,
    "batchSize": 4,
    "loraRank": 16,
    "loraAlpha": 32
  },
  "priority": 0
}
```

**Response (201):**

```json
{
  "code": 201,
  "message": "任务已提交",
  "data": {
    "taskId": "a1b2c3d4-...",
    "status": "PENDING",
    "createdAt": "2026-04-28T10:30:00"
  }
}
```

### 1.2 查询任务详情

```
GET /tasks/{taskId}
```

**Response (200):**

```json
{
  "code": 200,
  "data": {
    "taskId": "a1b2c3d4-...",
    "name": "qwen-finetune-20260428",
    "type": "FINETUNE",
    "status": "RUNNING",
    "modelName": "Qwen/Qwen2.5-7B",
    "nodeId": "gpu-worker-01",
    "progress": { "percent": 45, "currentStep": 1350, "totalSteps": 3000 },
    "createdAt": "2026-04-28T10:30:00",
    "startedAt": "2026-04-28T10:30:15",
    "finishedAt": null,
    "errorMsg": null
  }
}
```

### 1.3 查询任务列表

```
GET /tasks?status=RUNNING&page=1&size=20
```

**Response (200):**

```json
{
  "code": 200,
  "data": {
    "items": [ "..." ],
    "total": 42,
    "page": 1,
    "size": 20
  }
}
```

### 1.4 取消任务

```
DELETE /tasks/{taskId}
```

**Response (200):**

```json
{ "code": 200, "message": "任务已取消" }
```

---

## 2. 节点管理

### 2.1 节点注册

```
POST /nodes/register
```

**Request Body:**

```json
{
  "name": "gpu-worker-01",
  "publicIp": "<公网IP>",
  "apiPort": 9000,
  "gpuModel": "NVIDIA A100-SXM4-80GB",
  "gpuCount": 8,
  "vramTotalMb": 655360
}
```

### 2.2 节点心跳

```
POST /nodes/heartbeat
```

**Request Body:**

```json
{
  "nodeId": "a1b2c3d4-...",
  "resources": {
    "gpuUtilization": 72.5,
    "memoryUtilization": 45.2,
    "vramUsedMb": 524288,
    "activeTasks": 3,
    "gpuTemp": 68
  }
}
```

### 2.3 查询节点列表

```
GET /nodes
```

**Response (200):**

```json
{
  "code": 200,
  "data": [
    {
      "nodeId": "a1b2c3d4-...",
      "name": "gpu-worker-01",
      "status": "ONLINE",
      "gpuModel": "NVIDIA A100-SXM4-80GB",
      "gpuCount": 8,
      "resources": { "gpuUtilization": 72.5, "activeTasks": 3 },
      "lastHeartbeat": "2026-04-28T10:30:00"
    }
  ]
}
```

---

## 3. 监控数据

### 3.1 仪表盘快照

```
GET /monitor/dashboard
```

**Response (200):**

```json
{
  "code": 200,
  "data": {
    "totalTasks": { "pending": 5, "queued": 2, "running": 3, "completed": 128, "failed": 4 },
    "nodes": [ "..." ],
    "clusterUtilization": 58.3
  }
}
```

### 3.2 WebSocket 实时推送

```
WS /ws/dashboard
```

**推送格式:**

```json
{
  "type": "TASK_STATUS_CHANGE",
  "payload": {
    "taskId": "a1b2c3d4-...",
    "oldStatus": "QUEUED",
    "newStatus": "RUNNING",
    "timestamp": "2026-04-28T10:30:15"
  }
}
```

```json
{
  "type": "NODE_RESOURCE_UPDATE",
  "payload": {
    "nodeId": "a1b2c3d4-...",
    "resources": { "gpuUtilization": 72.5, "activeTasks": 3 },
    "timestamp": "2026-04-28T10:30:05"
  }
}
```

---

## 4. Worker 端接口（Scheduler → Worker）

### 4.1 任务执行

```
POST http://<GPU_IP>:9000/api/v1/tasks/execute
```

**Request Body:**

```json
{
  "taskId": "a1b2c3d4-...",
  "type": "FINETUNE",
  "modelName": "Qwen/Qwen2.5-7B",
  "datasetPath": "/data/datasets/instruction.jsonl",
  "params": { "learningRate": 2e-5, "epochs": 3, "batchSize": 4 }
}
```

### 4.2 取消执行

```
DELETE http://<GPU_IP>:9000/api/v1/tasks/{taskId}
```

### 4.3 Worker 健康检查

```
GET http://<GPU_IP>:9000/api/v1/health
```

---

## 5. 错误码

| 状态码 | code | 说明 |
|--------|------|------|
| 400 | 40001 | 参数校验失败 |
| 404 | 40002 | 任务/节点不存在 |
| 409 | 40003 | 任务状态不允许此操作 |
| 429 | 40004 | 请求频率超限 |
| 500 | 50000 | 服务器内部错误 |
| 503 | 50001 | 无可用 GPU 节点 |

---

## 6. 通用响应格式

```json
{
  "code": 200,
  "message": "success",
  "data": {},
  "timestamp": "2026-04-28T10:30:00"
}
```
