# 数据库表设计

## MySQL 8.0

### 1. tasks — 任务表

```sql
CREATE TABLE tasks (
    id            VARCHAR(36)  PRIMARY KEY COMMENT 'UUID',
    name          VARCHAR(200) NOT NULL COMMENT '任务名称',
    type          ENUM('TRAIN','FINETUNE','EVAL') NOT NULL COMMENT '任务类型',
    status        ENUM('PENDING','QUEUED','RUNNING','COMPLETED','FAILED','CANCELLED') DEFAULT 'PENDING',
    params        JSON COMMENT '训练/微调超参数',
    dataset_path  VARCHAR(500) COMMENT '数据集路径',
    model_name    VARCHAR(200) COMMENT '模型名称/HuggingFace ID',
    output_path   VARCHAR(500) COMMENT '模型输出路径',
    node_id       VARCHAR(36) COMMENT '分配的 GPU 节点 ID',
    priority      INT DEFAULT 0 COMMENT '优先级(越大越高)',
    progress_pct  DECIMAL(5,2) COMMENT '进度百分比',
    current_step  INT DEFAULT 0,
    total_steps   INT DEFAULT 0,
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
    started_at    DATETIME,
    finished_at   DATETIME,
    error_msg     TEXT,
    INDEX idx_status (status),
    INDEX idx_node_id (node_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 2. gpu_nodes — GPU 节点表

```sql
CREATE TABLE gpu_nodes (
    id              VARCHAR(36) PRIMARY KEY COMMENT 'UUID',
    name            VARCHAR(100) NOT NULL COMMENT '节点名称',
    public_ip       VARCHAR(45) NOT NULL COMMENT '公网 IP',
    api_port        INT DEFAULT 9000 COMMENT 'Worker API 端口',
    gpu_model       VARCHAR(100) COMMENT 'GPU 型号',
    gpu_count       INT COMMENT 'GPU 数量',
    vram_total_mb   BIGINT COMMENT '总显存(MB)',
    status          ENUM('ONLINE','OFFLINE','BUSY','ERROR') DEFAULT 'OFFLINE',
    gpu_utilization DECIMAL(5,2) DEFAULT 0 COMMENT 'GPU 利用率 %',
    memory_util     DECIMAL(5,2) DEFAULT 0 COMMENT '内存利用率 %',
    vram_used_mb    BIGINT DEFAULT 0 COMMENT '已用显存(MB)',
    active_tasks    INT DEFAULT 0 COMMENT '当前活跃任务数',
    gpu_temp        DECIMAL(5,1) COMMENT 'GPU 温度(℃)',
    last_heartbeat  DATETIME,
    registered_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_status (status),
    INDEX idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 3. task_logs — 任务日志表

```sql
CREATE TABLE task_logs (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    task_id     VARCHAR(36) NOT NULL,
    level       ENUM('INFO','WARN','ERROR') DEFAULT 'INFO',
    message     TEXT,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_task_id (task_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 4. users — 用户表（预留）

```sql
CREATE TABLE users (
    id            BIGINT AUTO_INCREMENT PRIMARY KEY,
    username      VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(200) NOT NULL,
    role          ENUM('ADMIN','USER') DEFAULT 'USER',
    enabled       TINYINT(1) DEFAULT 1,
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

---

## Redis 7.x

### 数据结构设计

| Key 模式 | 类型 | 说明 | TTL |
|----------|------|------|-----|
| `queue:task:pending` | List | 待调度任务 ID 列表 (RPUSH/LPOP) | 无 |
| `node:{nodeId}:heartbeat` | String | 心跳时间戳 (毫秒) | 30s |
| `node:{nodeId}:resources` | Hash | 实时资源快照 | 30s |
| `task:{taskId}:progress` | Hash | 任务进度详情 | 1h |
| `lock:dispatch` | String | 调度器分布式锁 (SET NX) | 5s |
| `node:registry` | Set | 已注册节点 ID 集合 | 无 |

### node:{nodeId}:resources Hash 字段

```
gpu_utilization  → 72.5
memory_util      → 45.2
vram_used_mb     → 524288
active_tasks     → 3
gpu_temp         → 68.0
api_port         → 9000
public_ip        → x.x.x.x
```

### task:{taskId}:progress Hash 字段

```
percent           → 45.00
current_step      → 1350
total_steps       → 3000
estimated_remaining_sec → 1200
```
