# 调度器服务器内存分析报告

> 服务器: 124.221.85.5 (腾讯云 CVM)  
> 分析日期: 2026-05-02  
> RAM: 2 GB, Swap: 无  
> OS: Ubuntu 22.04  

---

## 一、系统内存全局视图

### 优化前 (Xms512m / Xmx2048m)

```
              total    used    free    shared  buff/cache  available
Mem:          1963    1206     297       2       459         603 MB
```

### 优化后 (Xms256m / Xmx768m)

```
              total    used    free    shared  buff/cache  available
Mem:          1963    1077     381       2       504         732 MB
```

| 指标 | 优化前 | 优化后 | 变化 |
|------|--------|--------|------|
| 系统已用 | 1206 MB | 1077 MB | **-129 MB** |
| 系统可用 | 603 MB | 732 MB | **+129 MB** |
| Java RSS | 583 MB | 447 MB | **-136 MB** |
| Java VSZ | 4827 MB | 2607 MB | -2220 MB |

---

## 二、各进程内存占用

| 进程 | RSS | 占总 RAM | 说明 |
|------|-----|----------|------|
| Java 调度器 | 447 MB | 22.2% | Spring Boot + Hibernate + Tomcat |
| MySQL (Docker) | 376 MB | 19.5% | InnoDB buffer pool + 连接缓存 |
| dockerd | 45 MB | 2.2% | Docker daemon |
| YDService | 37 MB | 1.8% | 腾讯云安全组件 |
| multipathd | 27 MB | 1.3% | 磁盘多路径 |
| containerd | 24 MB | 1.1% | 容器运行时 |
| journald | 23 MB | 1.1% | 系统日志 |
| Redis (Docker) | 5 MB | 0.2% | 任务队列 + 节点心跳 |
| **合计** | **~984 MB** | | |
| Buff/Cache | 504 MB | | 可回收 |
| **可用 (available)** | **732 MB** | | |

---

## 三、JVM 内部内存分布 (优化后)

### 3.1 堆内存 (G1GC)

```
G1 Heap: total 256 MB committed, 768 MB max
├─ Young Gen:     117 regions (115 MB)
│  ├─ Eden:       146 MB capacity, 100 MB used (68%)
│  └─ Survivor:   15 MB (S1 满)
├─ Old Gen:       95 MB capacity, 21 MB used (22%)
└─ 空闲堆:        120 MB (committed 未使用)

实际堆使用: 141 MB / 256 MB committed / 768 MB max
堆利用率:   55% (committed), 18% (max)
```

### 3.2 非堆内存

| 区域 | 已用 | 已提交 | 保留 | 说明 |
|------|------|--------|------|------|
| Metaspace | 96 MB | 97 MB | 192 MB (max) | 类元数据, Spring 框架较重 |
| Class Space | 13 MB | 13 MB | 160 MB | 压缩类指针 |
| Code Cache | ~30 MB | — | 240 MB | JIT 编译产物 |
| 线程栈 | ~48 MB | — | — | 48 线程 × ~1 MB |
| Direct Memory | <1 MB | — | 256 MB (max) | NIO 缓冲区 |

### 3.3 RSS 组成推算

```
  堆 committed:          256 MB
+ Metaspace committed:    97 MB
+ Code Cache:            ~30 MB
+ 线程栈 (48×1MB):       ~48 MB
+ JVM 内部 + JNI:        ~16 MB
= 估算 RSS:             ~447 MB  ✓ (实测 447 MB)
```

### 3.4 GC 状态

```
Young GC:       12 次, 累计 0.185s (avg 15ms/次)
Full GC:        0 次
Concurrent GC:  6 次, 累计 0.016s
总 GC 时间:     0.202s — 非常健康
```

---

## 四、JVM 参数对比

### 优化前 (危险)

```bash
-Xms512m -Xmx2048m -XX:MaxDirectMemorySize=2048m
# 理论内存上限: 2048 (heap) + 2048 (direct) + ~200 (meta+stack) = 4.3 GB
# 物理 RAM: 仅 1.96 GB, 无 Swap → OOM Kill 风险极高
```

### 优化后 (安全)

```bash
-Xms256m -Xmx768m -XX:MaxDirectMemorySize=256m -XX:MaxMetaspaceSize=192m
# 理论内存上限: 768 (heap) + 256 (direct) + 192 (meta) + ~80 (stack+code) = 1.3 GB
# 留给 MySQL(376MB) + OS(200MB) + 缓存 仍有余量
```

### 参数说明

| 参数 | 优化前 | 优化后 | 理由 |
|------|--------|--------|------|
| `-Xms` | 512m | 256m | 堆实际使用 141 MB, 无需预分配 512 |
| `-Xmx` | 2048m | 768m | 已改为流式传输, 不再将 ZIP 加载到堆; 768 MB 足够应对并发调度 |
| `MaxDirectMemorySize` | 2048m | 256m | FileSystemResource 流式发送, NIO 缓冲 256 MB 足够 |
| `MaxMetaspaceSize` | 无限 | 192m | Spring Boot 稳定在 ~96 MB, 设上限防止泄漏 |

---

## 五、前端部署可行性分析

### 前端项目概况

- **框架**: React 18 + TypeScript + Vite 5
- **构建产物**: ~1.3 MB 静态文件 (JS 1.27 MB + CSS 10 KB + HTML 0.6 KB)
- **gzip 后**: ~500 KB (echarts 占大部分)
- **已有配置**: Dockerfile (nginx:alpine) + nginx.conf (反向代理 /api/ 和 /ws/)

### nginx 资源消耗估算

| 指标 | 预估值 |
|------|--------|
| RSS (master + 2 worker) | 10-15 MB |
| 磁盘 (nginx + 前端静态文件) | ~5 MB |
| CPU | 接近 0 (纯静态服务) |
| 端口 | 80 (可用) |

### 部署后内存预算

```
Java 调度器:       ~450 MB (峰值可达 600 MB)
MySQL (Docker):    ~376 MB
nginx (前端):      ~15 MB
Redis (Docker):    ~5 MB
OS + 系统服务:     ~200 MB
────────────────────────
合计:              ~1046 MB
可用 (2 GB 中):    ~917 MB
```

### 结论: 完全可行

在调优 JVM 之后, 服务器有约 **730 MB 可用内存**, nginx 仅需 **15 MB**。
部署前端不会对现有服务造成任何压力。

### 部署方式建议

**推荐: 直接安装 nginx (非 Docker)**

理由:
- 省去 Docker 网络层开销
- nginx 可直接 proxy_pass 到 localhost:8080 和 localhost:8081
- 占用更少内存 (Docker 容器有额外开销)
- 管理更简单 (systemd 管理)

需要调整 nginx.conf:
- `proxy_pass http://scheduler:8080` → `proxy_pass http://127.0.0.1:8080`
- `proxy_pass http://scheduler:8081` → `proxy_pass http://127.0.0.1:8081`

---

## 六、后续优化建议

### 高优先级

1. **配置 Swap 空间 (2 GB)** — 防止突发内存需求触发 OOM Killer
   ```bash
   sudo fallocate -l 2G /swapfile
   sudo chmod 600 /swapfile
   sudo mkswap /swapfile
   sudo swapon /swapfile
   echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
   ```

2. **MySQL 内存调优** — 当前 376 MB, 可通过降低 `innodb_buffer_pool_size` 节省
   ```
   innodb_buffer_pool_size = 128M  (默认 128M, 确认是否被改大)
   max_connections = 20            (当前仅需 ~10 连接)
   ```

### 低优先级

3. **启用 Actuator metrics** — 便于运行时监控 JVM 内存
   ```yaml
   management.endpoints.web.exposure.include: health,metrics,info
   ```

4. **定期清理上传文件** — `files/` 目录会随任务增长 (当前 163 MB)
