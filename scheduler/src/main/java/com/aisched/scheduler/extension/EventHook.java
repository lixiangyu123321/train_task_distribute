package com.aisched.scheduler.extension;

import com.aisched.scheduler.model.enums.TaskStatus;
import java.time.Instant;
import java.util.Map;

/**
 * 任务生命周期事件钩子 — 状态变更回调。
 * 设计阶段仅定义契约，后续可注册 Claude Agent 作为事件监听器。
 */
public interface EventHook {

    void registerListener(TaskEventType eventType, TaskEventListener listener);

    void fire(TaskEvent event);

    void removeListener(TaskEventType eventType, String listenerId);

    @FunctionalInterface
    interface TaskEventListener {
        void onEvent(TaskEvent event);
    }

    class TaskEvent {
        private String taskId;
        private TaskEventType type;
        private TaskStatus oldStatus;
        private TaskStatus newStatus;
        private String nodeId;
        private Instant timestamp;
        private Map<String, Object> context;

        public String getTaskId() { return taskId; }
        public void setTaskId(String taskId) { this.taskId = taskId; }
        public TaskEventType getType() { return type; }
        public void setType(TaskEventType type) { this.type = type; }
        public TaskStatus getOldStatus() { return oldStatus; }
        public void setOldStatus(TaskStatus oldStatus) { this.oldStatus = oldStatus; }
        public TaskStatus getNewStatus() { return newStatus; }
        public void setNewStatus(TaskStatus newStatus) { this.newStatus = newStatus; }
        public String getNodeId() { return nodeId; }
        public void setNodeId(String nodeId) { this.nodeId = nodeId; }
        public Instant getTimestamp() { return timestamp; }
        public void setTimestamp(Instant timestamp) { this.timestamp = timestamp; }
        public Map<String, Object> getContext() { return context; }
        public void setContext(Map<String, Object> context) { this.context = context; }
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
}
