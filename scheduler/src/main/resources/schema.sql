-- AI 调度系统数据库初始化
CREATE TABLE IF NOT EXISTS tasks (
    id            VARCHAR(36)  PRIMARY KEY,
    name          VARCHAR(200) NOT NULL,
    type          ENUM('TRAIN','FINETUNE','EVAL','FULL') NOT NULL,
    status        ENUM('PENDING','DISPATCHING','QUEUED','RUNNING','COMPLETED','FAILED','CANCELLED') DEFAULT 'PENDING',
    params        JSON,
    dataset_path  VARCHAR(500),
    model_name    VARCHAR(200),
    output_path   VARCHAR(500),
    node_id       VARCHAR(36),
    priority      INT DEFAULT 0,
    progress_pct  DOUBLE,
    current_step  INT DEFAULT 0,
    total_steps   INT DEFAULT 0,
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
    started_at    DATETIME,
    finished_at   DATETIME,
    error_msg     TEXT,
    package_id    VARCHAR(36),
    metrics       JSON,
    log_path      VARCHAR(500),
    user_id       BIGINT,
    INDEX idx_tasks_status (status),
    INDEX idx_tasks_node_id (node_id),
    INDEX idx_tasks_created_at (created_at),
    INDEX idx_tasks_finished_at (finished_at),
    INDEX idx_tasks_status_finished (status, finished_at),
    INDEX idx_tasks_package_id (package_id),
    INDEX idx_tasks_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS gpu_nodes (
    id              VARCHAR(36) PRIMARY KEY,
    name            VARCHAR(100) NOT NULL,
    public_ip       VARCHAR(45) NOT NULL,
    api_port        INT DEFAULT 9000,
    gpu_model       VARCHAR(100),
    gpu_count       INT,
    vram_total_mb   BIGINT,
    status          ENUM('ONLINE','OFFLINE','BUSY','ERROR') DEFAULT 'OFFLINE',
    gpu_utilization DOUBLE DEFAULT 0,
    memory_util     DOUBLE DEFAULT 0,
    vram_used_mb    BIGINT DEFAULT 0,
    active_tasks    INT DEFAULT 0,
    gpu_temp        DOUBLE,
    last_heartbeat  DATETIME,
    registered_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_nodes_status (status),
    INDEX idx_nodes_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS task_logs (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    task_id     VARCHAR(36) NOT NULL,
    level       ENUM('INFO','WARN','ERROR') DEFAULT 'INFO',
    message     TEXT,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_logs_task_id (task_id),
    INDEX idx_logs_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS task_packages (
    id          VARCHAR(36) PRIMARY KEY,
    task_id     VARCHAR(36),
    file_name   VARCHAR(255),
    file_size   BIGINT,
    file_path   VARCHAR(500),
    status      ENUM('UPLOADING','READY','TRANSFERRING','EXTRACTED','ERROR') DEFAULT 'UPLOADING',
    yaml_data   JSON,
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_pkg_task_id (task_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS tasks_archive (
    id            VARCHAR(36)  PRIMARY KEY,
    name          VARCHAR(200) NOT NULL,
    type          ENUM('TRAIN','FINETUNE','EVAL','FULL') NOT NULL,
    status        ENUM('PENDING','DISPATCHING','QUEUED','RUNNING','COMPLETED','FAILED','CANCELLED') DEFAULT 'PENDING',
    params        JSON,
    dataset_path  VARCHAR(500),
    model_name    VARCHAR(200),
    output_path   VARCHAR(500),
    node_id       VARCHAR(36),
    priority      INT DEFAULT 0,
    progress_pct  DOUBLE,
    current_step  INT DEFAULT 0,
    total_steps   INT DEFAULT 0,
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
    started_at    DATETIME,
    finished_at   DATETIME,
    error_msg     TEXT,
    package_id    VARCHAR(36),
    metrics       JSON,
    log_path      VARCHAR(500),
    INDEX idx_archive_status (status),
    INDEX idx_archive_finished_at (finished_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS task_templates (
    id            VARCHAR(36) PRIMARY KEY,
    name          VARCHAR(200) NOT NULL,
    type          ENUM('TRAIN','FINETUNE','EVAL','FULL') NOT NULL,
    description   TEXT,
    default_params JSON,
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS scheduled_tasks (
    id              VARCHAR(36) PRIMARY KEY,
    template_id     VARCHAR(36) NOT NULL,
    user_id         BIGINT,
    task_name       VARCHAR(200),
    cron_expression VARCHAR(100) NOT NULL,
    enabled         BIT(1) DEFAULT 1,
    last_run_at     DATETIME,
    next_run_at     DATETIME,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_sched_enabled (enabled),
    INDEX idx_sched_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS users (
    id            BIGINT AUTO_INCREMENT PRIMARY KEY,
    username      VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(200) NOT NULL,
    role          ENUM('ADMIN','USER') DEFAULT 'USER',
    enabled       BIT(1) DEFAULT 1,
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
