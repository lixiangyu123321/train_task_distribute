# 部署指南

## 前置条件

- Docker 20.10+
- Docker Compose 2.x
- NVIDIA Container Toolkit（GPU 节点）
- 所有节点已配置公网 IP 并可互相访问

---

## 1. 配置

### 1.1 获取项目

```bash
git clone <repo-url>
cd DeepSeekV4Test
```

### 1.2 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env`，填入实际值：

```env
SCHEDULER_PUBLIC_IP=123.45.67.89       # CPU 节点公网 IP
GPU1_PUBLIC_IP=98.76.54.32            # GPU 节点 1 公网 IP
GPU2_PUBLIC_IP=98.76.54.33            # GPU 节点 2 公网 IP
MYSQL_PASSWORD=<强密码>
MYSQL_ROOT_PASSWORD=<强密码>
REDIS_PASSWORD=<强密码>
```

---

## 2. CPU 调度节点部署

在 CPU 云服务器上执行：

```bash
# 将项目上传至服务器，或 git clone
# 确保 .env 已配置

# 启动 MySQL + Redis + Scheduler
docker-compose -f docker-compose.cpu.yml up -d
```

验证：

```bash
# 检查服务状态
docker-compose -f docker-compose.cpu.yml ps

# 检查 API
curl http://localhost:8080/api/v1/nodes

# 检查 WebSocket
# 使用 wscat 或浏览器控制台连接 ws://<公网IP>:8081/ws/dashboard
```

---

## 3. GPU 算力节点部署

在每台 GPU 服务器上执行：

### 3.1 安装 NVIDIA Container Toolkit

```bash
distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg
curl -s -L https://nvidia.github.io/libnvidia-container/$distribution/libnvidia-container.list | \
  sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | \
  sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list
sudo apt-get update
sudo apt-get install -y nvidia-container-toolkit
sudo nvidia-ctk runtime configure --runtime=docker
sudo systemctl restart docker
```

### 3.2 配置 Worker 环境变量

在 GPU 服务器上创建 `.env`：

```env
# GPU 节点 1
SCHEDULER_PUBLIC_IP=123.45.67.89
SCHEDULER_API_PORT=8080
WORKER_NAME=gpu-worker-01
GPU_API_PORT=9000
GPU_COUNT=8
GPU_MODEL=NVIDIA A100-SXM4-80GB
VRAM_TOTAL_MB=655360
```

### 3.3 启动 Worker

```bash
# 将 worker/ 目录和 docker-compose.gpu.yml 上传至 GPU 服务器

docker-compose -f docker-compose.gpu.yml up -d
```

验证：

```bash
# 检查 Worker 日志
docker logs aisched-gpu-worker

# 应看到 "Worker registered successfully" 日志
# 在调度节点查询节点列表确认注册成功
curl http://<SCHEDULER_IP>:8080/api/v1/nodes
```

---

## 4. 部署架构图

```
┌──────────────────────────────────────────────────────────────┐
│                    CPU 云服务器                               │
│                                                              │
│  ┌────────────┐  ┌──────────┐  ┌───────────────────┐        │
│  │   MySQL    │  │  Redis   │  │   Scheduler       │        │
│  │   :3306    │  │  :6379   │  │   :8080 / :8081   │        │
│  └────────────┘  └──────────┘  └───────────────────┘        │
│                                                              │
│  docker-compose -f docker-compose.cpu.yml up -d              │
└──────────────────────────────────────────────────────────────┘

┌────────────────────────┐    ┌────────────────────────┐
│    GPU 服务器 1         │    │    GPU 服务器 2         │
│                        │    │                        │
│  ┌──────────────┐      │    │  ┌──────────────┐      │
│  │  GPU Worker  │      │    │  │  GPU Worker  │      │
│  │  :9000       │      │    │  │  :9000       │      │
│  │  A100 ×8    │      │    │  │  A100 ×8    │      │
│  └──────────────┘      │    │  └──────────────┘      │
│                        │    │                        │
│  docker-compose        │    │  docker-compose        │
│  -f docker-compose     │    │  -f docker-compose     │
│  .gpu.yml up -d        │    │  .gpu.yml up -d        │
└────────────────────────┘    └────────────────────────┘
```

---

## 5. 防火墙规则

| 节点 | 端口 | 方向 | 说明 |
|------|------|------|------|
| CPU | 8080 | IN | 调度 API（客户端 + Worker 访问） |
| CPU | 8081 | IN | WebSocket 推送（前端访问） |
| CPU | 3306 | IN | MySQL（仅调度器和 Worker 可访问，建议仅内网） |
| CPU | 6379 | IN | Redis（仅调度器可访问，建议仅内网） |
| GPU | 9000 | IN | Worker API（调度器访问） |

---

## 6. 健康检查

```bash
# 调度器健康
curl http://<SCHEDULER_IP>:8080/actuator/health

# Worker 健康
curl http://<GPU_IP>:9000/api/v1/health

# MySQL 健康（容器内）
docker exec aisched-mysql mysqladmin ping -h localhost

# Redis 健康（容器内）
docker exec aisched-redis redis-cli --raw incr ping
```

---

## 7. 故障恢复

### MySQL 重启后
容器已配置 `restart: always`，自动恢复。数据持久化在 `mysql_data` volume 中。

### Redis 重启后
开启 AOF 持久化，重启后自动加载队列数据。心跳数据因 TTL 机制自动重建。

### GPU Worker 离线
调度器心跳检测（30s 超时）自动标记节点为 OFFLINE，该节点上正在执行的任务标记为 FAILED，队列中待分发任务自动重分配。

### 调度器重启
- MySQL 中持久化的任务状态不变
- Redis 队列中未持久化的数据丢失（通过 MySQL 重建）
- Worker 自动重新注册
