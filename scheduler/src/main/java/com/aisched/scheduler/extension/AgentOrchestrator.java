package com.aisched.scheduler.extension;

import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

/**
 * Sub-Agent 编排器 — 多智能体协作框架。
 * 设计阶段仅定义契约，后续实现 Dispatcher/Monitor/Trainer/Alert Agent。
 */
public interface AgentOrchestrator {

    void registerAgent(Agent agent);

    OrchestrationResult orchestrate(AgentTask task);

    List<Agent> getActiveAgents();

    interface Agent {
        String getId();
        String getName();
        AgentRole getRole();
        CompletableFuture<AgentResult> process(AgentTask task);
    }

    enum AgentRole {
        DISPATCHER,
        MONITOR,
        TRAINER,
        ALERT
    }

    class AgentTask {
        private String taskId;
        private AgentTaskType type;
        private Map<String, Object> payload;

        public String getTaskId() { return taskId; }
        public void setTaskId(String taskId) { this.taskId = taskId; }
        public AgentTaskType getType() { return type; }
        public void setType(AgentTaskType type) { this.type = type; }
        public Map<String, Object> getPayload() { return payload; }
        public void setPayload(Map<String, Object> payload) { this.payload = payload; }
    }

    enum AgentTaskType {
        SCHEDULE_DECISION,
        ANOMALY_DETECT,
        FAILOVER,
        RESOURCE_OPTIMIZE
    }

    class OrchestrationResult {
        private String orchestrationId;
        private List<AgentResult> agentResults;
        private long elapsedMs;

        public String getOrchestrationId() { return orchestrationId; }
        public void setOrchestrationId(String orchestrationId) { this.orchestrationId = orchestrationId; }
        public List<AgentResult> getAgentResults() { return agentResults; }
        public void setAgentResults(List<AgentResult> agentResults) { this.agentResults = agentResults; }
        public long getElapsedMs() { return elapsedMs; }
        public void setElapsedMs(long elapsedMs) { this.elapsedMs = elapsedMs; }
    }

    class AgentResult {
        private String agentId;
        private boolean success;
        private String output;
        private Map<String, Object> metadata;

        public String getAgentId() { return agentId; }
        public void setAgentId(String agentId) { this.agentId = agentId; }
        public boolean isSuccess() { return success; }
        public void setSuccess(boolean success) { this.success = success; }
        public String getOutput() { return output; }
        public void setOutput(String output) { this.output = output; }
        public Map<String, Object> getMetadata() { return metadata; }
        public void setMetadata(Map<String, Object> metadata) { this.metadata = metadata; }
    }
}
