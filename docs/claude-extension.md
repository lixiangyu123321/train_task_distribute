# Claude Skill / Sub-Agent 扩展预留设计

## 概述

在系统架构设计阶段，为 Claude Code 的 Skill 能力和 Sub-Agent 多智能体协作预留扩展接口。这些接口定义在 `scheduler/src/main/java/com/aisched/scheduler/extension/` 包下，设计阶段仅定义契约，不提供具体实现。

---

## 1. SkillRegistry — 技能注册中心

### 定位
允许将自定义调度策略、监控分析、故障恢复等能力封装为"技能 (Skill)"插件，实现运行时注册与热加载。

### 接口定义

```java
package com.aisched.scheduler.extension;

/**
 * 技能注册中心 - 管理可插拔的调度/监控/运维技能
 */
public interface SkillRegistry {

    /** 注册一个技能 */
    void register(Skill skill);

    /** 根据名称获取技能 */
    Optional<Skill> get(String name);

    /** 获取所有已注册技能 */
    List<Skill> listAll();

    /** 获取指定类型的技能 */
    <T extends Skill> List<T> listByType(Class<T> type);

    /** 卸载技能 */
    void unregister(String name);
}

/**
 * 技能抽象 - 所有技能（调度策略/监控分析/故障处理）的父接口
 */
interface Skill {
    String getName();
    String getDescription();
    SkillType getType();
    boolean isEnabled();
}

enum SkillType {
    SCHEDULING,      // 调度策略类
    MONITORING,      // 监控分析类
    RECOVERY,        // 故障自愈类
    NOTIFICATION     // 通知告警类
}
```

### 扩展场景

| 技能 | 类型 | 描述 |
|------|------|------|
| AdaptiveBalancerSkill | SCHEDULING | 基于历史任务耗时自适应调整调度权重 |
| AnomalyDetectSkill | MONITORING | GPU 温度异常/显存泄漏检测 |
| AutoFailoverSkill | RECOVERY | 任务失败自动重试/节点切换 |

---

## 2. AgentOrchestrator — Sub-Agent 编排器

### 定位
支持多个 AI Agent 协作完成复杂运维任务，如"智能扩容决策"需要综合调度 Agent、监控 Agent、预测 Agent 的输出。

### 接口定义

```java
package com.aisched.scheduler.extension;

/**
 * Sub-Agent 编排器 - 多智能体协作框架
 */
public interface AgentOrchestrator {

    /** 向编排器注册一个 Agent */
    void registerAgent(Agent agent);

    /** 提交一个协作任务，编排器决定由哪些 Agent 处理 */
    OrchestrationResult orchestrate(AgentTask task);

    /** 获取当前活跃的 Agent 列表 */
    List<Agent> getActiveAgents();
}

/**
 * Agent 抽象 - 每个 Agent 承担特定职责
 */
interface Agent {
    String getId();
    String getName();
    AgentRole getRole();          // DISPATCHER, MONITOR, TRAINER, ALERT
    CompletableFuture<AgentResult> process(AgentTask task);
}

enum AgentRole {
    DISPATCHER,   // 任务调度 Agent
    MONITOR,      // 监控 Agent
    TRAINER,      // 训练管理 Agent
    ALERT         // 告警 Agent
}

class AgentTask {
    String taskId;
    AgentTaskType type;
    Map<String, Object> payload;
}

class OrchestrationResult {
    String orchestrationId;
    List<AgentResult> agentResults;
    long elapsedMs;
}

class AgentResult {
    String agentId;
    boolean success;
    String output;
    Map<String, Object> metadata;
}
```

### 扩展场景

| 编排任务 | 协作 Agent | 描述 |
|----------|-----------|------|
| 智能调度 | Dispatcher + Monitor | Monitor 提供节点负载数据，Dispatcher 决策分发 |
| 故障自愈 | Monitor + Alert + Dispatcher | Monitor 发现异常 → Alert 通知 → Dispatcher 重分配 |
| 训练优化 | Trainer + Monitor | Trainer 调整超参，Monitor 反馈 GPU 效率 |

---

## 3. EventHook — 任务生命周期事件钩子

### 定位
在任务状态变更的关键节点触发自定义逻辑，支持同步/异步回调。后续可注册 Claude Agent 作为钩子处理器，实现智能化事件响应。

### 接口定义

```java
package com.aisched.scheduler.extension;

/**
 * 任务生命周期事件钩子
 */
public interface EventHook {

    /** 注册事件监听器 */
    void registerListener(TaskEventType eventType, TaskEventListener listener);

    /** 触发事件 */
    void fire(TaskEvent event);

    /** 移除监听器 */
    void removeListener(TaskEventType eventType, String listenerId);
}

/**
 * 任务事件监听器
 */
@FunctionalInterface
interface TaskEventListener {
    void onEvent(TaskEvent event);
}

/** 任务事件 */
class TaskEvent {
    String taskId;
    TaskEventType type;
    TaskStatus oldStatus;
    TaskStatus newStatus;
    String nodeId;
    Instant timestamp;
    Map<String, Object> context;
}

enum TaskEventType {
    TASK_SUBMITTED,
    TASK_QUEUED,
    TASK_DISPATCHED,
    TASK_RUNNING,
    TASK_PROGRESS,
    TASK_COMPLETED,
    TASK_FAILED,
    TASK_CANCELLED,
    NODE_ONLINE,
    NODE_OFFLINE,
    NODE_OVERLOADED
}
```

### 扩展场景

| 事件 | 钩子动作 |
|------|---------|
| TASK_FAILED | 自动分析失败原因（Claude Agent 读取日志）并建议修复 |
| NODE_OFFLINE | 自动将该节点任务迁移到其他节点 |
| TASK_COMPLETED | 清理 GPU 显存、归档日志、发送通知 |
| NODE_OVERLOADED | 触发降载保护，暂停新任务分发 |

---

## 4. 与 Claude Code MCP 协议对齐

后续实现时，上述接口可通过以下方式与 Claude Code 集成：

### 4.1 MCP Server 桥接

```
Scheduler Extension ──► MCP Server (stdio/SSE) ──► Claude Code
                            │
                    ┌───────┼───────┐
                    │       │       │
                SkillTool  AgentTool HookTool
```

- **SkillTool**: 将 Skill 暴露为 MCP Tool，Claude 可直接调用调度策略
- **AgentTool**: 将 Agent 暴露为 MCP Resource，Claude 可查询 Agent 状态
- **HookTool**: 将事件钩子暴露为 MCP Prompt，Claude 可订阅任务事件

### 4.2 配置项

```yaml
# application.yml (预留)
aisched:
  extension:
    claude:
      enabled: false                    # 开发阶段关闭
      mcp:
        protocol: stdio                 # stdio | sse
        endpoint: /mcp
    skill:
      auto-load-path: classpath:skills/  # Skill 实现扫描路径
    agent:
      pool-size: 4                      # Agent 线程池大小
```

---

## 5. 演进路线图

| 阶段 | 内容 |
|------|------|
| Phase 0 (当前) | 接口定义 + 文档，代码中预留 extension 包 |
| Phase 1 | Skill 基础实现 + Spring SPI 加载 |
| Phase 2 | EventHook 集成到 TaskService 状态机 |
| Phase 3 | MCP Server 桥接 + Claude Code 集成 |
| Phase 4 | Agent 多智能体编排 + 自主调度决策 |
