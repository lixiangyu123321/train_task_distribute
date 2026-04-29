# 服务器租用指南

## 1. 硬件需求总览

本项目集群由 1 台 CPU 节点 + 2 台 GPU 节点组成：

| 角色 | 数量 | 核心要求 | 最低配置 | 推荐配置 |
|------|------|---------|---------|---------|
| CPU 调度节点 | 1 台 | CPU 密集 + 内存大 | 4C8G + 100G SSD | 8C16G + 200G SSD |
| GPU 算力节点 | 2 台 | GPU 显存大（跑大模型） | 1×A100 40G + 12C32G | 8×A100 80G + 64C256G |

---

## 2. 主流平台对比

### 2.1 GPU 算力租赁平台

| 平台 | 特点 | 适用场景 | 计费方式 |
|------|------|---------|---------|
| [AutoDL](https://www.autodl.com) | 按量计费灵活，社区镜像丰富，适合个人开发者 | 微调小模型、实验验证 | 按小时，关机不收费 |
| [青椒云](https://www.qingjiaoyun.com) | 免费用 1 小时体验，GPU 种类全 | 短期体验、快速出活 | 按小时 |
| [恒源云](https://www.gpushare.com) | P40/A100/H100 等，价格梯度丰富 | 中大模型训练 | 按小时/包天包月 |
| [Google Colab Pro](https://colab.research.google.com) | 免费 T4 可选，Pro+ 可选 A100 | 学习/小实验 | 月付 |
| [阿里云 PAI](https://www.aliyun.com/product/bigdata/learn) | 企业级，弹性扩缩 | 生产级大规模训练 | 按量/包年包月 |
| [腾讯云 GPU](https://cloud.tencent.com/product/gpu) | GN10Xp(A100) / HCCPNV4h(H800) | 企业级训练 | 按量/包月 |
| [AWS EC2 P4d](https://aws.amazon.com/ec2/instance-types/p4/) | A100 实例，全球节点 | 海外部署 | 按小时/预留实例 |
| [RunPod](https://www.runpod.io) | 社区云，价格较低，支持 Serverless | 海外用户 | 按小时 |
| [Vast.ai](https://vast.ai) | 个人出租闲置 GPU，价格最低 | 预算敏感 | 按小时竞价 |

### 2.2 CPU 云服务器

| 平台 | 特点 |
|------|------|
| [阿里云 ECS](https://www.aliyun.com/product/ecs) | 国内首选，按量/包月均可，VPC 网络利于内网互通 |
| [腾讯云 CVM](https://cloud.tencent.com/product/cvm) | 与腾讯云 GPU 同厂商，内网通信延迟更低 |
| [华为云 ECS](https://www.huaweicloud.com/product/ecs.html) | 鲲鹏/昇腾可选 |
| [AWS EC2](https://aws.amazon.com/ec2/) | 海外部署 |
| [UCloud](https://www.ucloud.cn) | 性价比高，中小型国内厂商 |

---

## 3. 推荐方案

### 方案 A：入门实验（花费低，适合验证）

| 节点 | 平台 | 规格 | 价格（约） |
|------|------|------|-----------|
| CPU 节点 | 阿里云 ECS | 4C8G + 100G ESSD，按量 | ~0.4 元/时 |
| GPU 节点 ×2 | AutoDL | 1×A100 40G + 12C32G | ~4 元/时/卡 |
| **合计** | | | **~8.4 元/时** |

### 方案 B：生产训练（大模型全量训练/微调）

| 节点 | 平台 | 规格 | 价格（约） |
|------|------|------|-----------|
| CPU 节点 | 阿里云 ECS | 8C16G + 200G ESSD，包月 | ~500 元/月 |
| GPU 节点 ×2 | 腾讯云 GN10Xp | 8×A100 80G SXM，包月 | ~3 万元/月/台 |
| **合计** | | | **~6 万元/月** |

---

## 4. 操作步骤（以阿里云 + AutoDL 为例）

### 4.1 租用 CPU 云服务器

1. 登录 [阿里云 ECS 控制台](https://ecs.console.aliyun.com)
2. 点击 **创建实例**
3. 选择配置：
   - 地域：根据你所在区域选择（如华东 2 上海）
   - 实例规格：**ecs.c7.xlarge**（4C8G）或 **ecs.c7.2xlarge**（8C16G）
   - 镜像：**Ubuntu 22.04** 或 **CentOS 7.9**
   - 系统盘：100G ESSD PL0
   - 网络：分配公网 IPv4 地址，按使用流量计费（带宽峰值 100Mbps）
4. 安全组规则开放端口：

   | 端口 | 协议 | 来源 | 说明 |
   |------|------|------|------|
   | 22 | TCP | 你的 IP | SSH 管理 |
   | 8080 | TCP | 0.0.0.0/0 | Scheduler API |
   | 8081 | TCP | 0.0.0.0/0 | WebSocket |
   | 3306 | TCP | 内网/GPU 节点 IP | MySQL（建议仅内网） |
   | 6379 | TCP | 内网 | Redis（建议仅内网） |

5. 创建并记录**公网 IP**

### 4.2 租用 GPU 算力服务器

以 AutoDL 为例：

1. 登录 [AutoDL 控制台](https://www.autodl.com/console)
2. 点击 **租用实例**
3. 筛选：
   - GPU 型号：**A100 80G**（微调 7B-70B 模型）或 **RTX 4090**（微调 7B 以下）
   - 计费方式：**按量计费**
   - 数据盘：50G 系统 + 200G 数据（存放模型权重和数据集）
4. 选择包含 PyTorch 2.x 的社区镜像（如 `PyTorch 2.1.0 + CUDA 12.1`）
5. 创建后记录**实例公网 IP** 和 **SSH 端口**

> **提示：** AutoDL 实例关闭后不收费，数据盘保留但按量计。做完实验记得关机。

### 4.3 租用 GPU 算力服务器（腾讯云包月）

1. 登录 [腾讯云 GPU 实例购买页](https://buy.cloud.tencent.com/cvm?tab=gpu)
2. 选择：
   - 实例规格：**GN10Xp.20XLARGE320**（8×A100 80G，320G 显存，80C640G）
   - 镜像：Ubuntu 22.04
   - 系统盘：200G 高性能云硬盘
   - 数据盘：1TB 高性能云硬盘（存放数据集和模型权重）
   - 带宽：按使用流量，带宽上限 200Mbps
3. 安全组开放端口：

   | 端口 | 说明 |
   |------|------|
   | 22 | SSH |
   | 9000 | Worker API（供 Scheduler 访问） |

4. 确认订单，记录公网 IP

---

## 5. 网络规划

### 5.1 网络拓扑

```
                        公网 (Internet)
                             │
              ┌──────────────┼──────────────┐
              │              │              │
        [公网IP-A]     [公网IP-B]     [公网IP-C]
              │              │              │
        ┌─────┴─────┐  ┌────┴────┐  ┌────┴────┐
        │ CPU 节点   │  │ GPU 节点1│  │ GPU 节点2│
        │ :8080     │  │ :9000   │  │ :9000   │
        └───────────┘  └─────────┘  └─────────┘
```

### 5.2 配置建议

- **同厂商同地域**：CPU 和 GPU 节点租用同一云厂商同一地域时，可通过内网通信（低延迟、免流量费），安全组中将 MySQL/Redis 端口仅开放给内网
- **跨厂商**：所有节点间通信走公网，需在 `.env` 中配置各节点公网 IP，并确保安全组规则允许对应端口
- **固定公网 IP**：生产环境建议使用弹性公网 IP（EIP），即使实例重启 IP 也不变

---

## 6. 到手后的初始设置

三台服务器拿到后，逐一执行：

### 6.1 所有节点通用

```bash
# SSH 登录
ssh root@<公网IP>

# 更新系统
apt update && apt upgrade -y

# 安装 Docker
curl -fsSL https://get.docker.com | bash
systemctl enable docker && systemctl start docker

# 安装 Docker Compose
curl -SL "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" \
  -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# 克隆项目
git clone <repo-url> /opt/aisched
cd /opt/aisched
```

### 6.2 GPU 节点额外步骤

```bash
# 安装 NVIDIA 驱动（若镜像未预装）
apt install -y nvidia-driver-550
reboot

# 验证驱动
nvidia-smi

# 安装 NVIDIA Container Toolkit
distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | \
  sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg
curl -s -L https://nvidia.github.io/libnvidia-container/$distribution/libnvidia-container.list | \
  sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | \
  sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list
apt update && apt install -y nvidia-container-toolkit
nvidia-ctk runtime configure --runtime=docker
systemctl restart docker

# 验证 Docker 可访问 GPU
docker run --rm --gpus all nvidia/cuda:12.1-base nvidia-smi
```

### 6.3 配置环境变量

```bash
cp .env.example .env
vim .env  # 填入三台机器的公网 IP 和密码
```

### 6.4 各节点启动

```bash
# CPU 节点
docker-compose -f docker-compose.cpu.yml up -d

# GPU 节点 1（在 GPU 节点 1 上执行）
WORKER_NAME=gpu-worker-01 docker-compose -f docker-compose.gpu.yml up -d

# GPU 节点 2（在 GPU 节点 2 上执行）
WORKER_NAME=gpu-worker-02 docker-compose -f docker-compose.gpu.yml up -d
```

验证：

```bash
# 在 CPU 节点上检查 GPU Worker 是否注册成功
curl http://localhost:8080/api/v1/nodes
# 应看到 2 个 ONLINE 节点
```

---

## 7. 费用控制建议

| 策略 | 做法 |
|------|------|
| GPU 按量关机 | AutoDL/云 GPU 关机不收费（仅保留数据盘），不用时关机 |
| CPU 包月 | CPU 节点运行调度 + 数据库，需要 7×24 在线，包月更划算 |
| 竞价实例 | AWS/AutoDL 的 Spot 实例便宜 60-70%，适合可中断的训练任务 |
| 预算告警 | 云平台设置余额/消费告警，防止意外超额 |
| 先用后买 | 先用按量计费测通流程（几小时），确认配置够用后再转包月 |

---

## 8. 常用链接

| 平台 | 控制台 | 价格计算器 |
|------|--------|-----------|
| 阿里云 | [ecs.console.aliyun.com](https://ecs.console.aliyun.com) | [费用计算器](https://www.aliyun.com/price/product) |
| 腾讯云 | [buy.cloud.tencent.com/cvm](https://buy.cloud.tencent.com/cvm?tab=gpu) | [价格计算器](https://buy.cloud.tencent.com/price/cvm/calculator) |
| AutoDL | [autodl.com/console](https://www.autodl.com/console) | 官网直接显示单价 |
| 青椒云 | [qingjiaoyun.com](https://www.qingjiaoyun.com) | 官网直接显示单价 |
| AWS | [console.aws.amazon.com/ec2](https://console.aws.amazon.com/ec2) | [价格计算器](https://calculator.aws.amazon.com) |
