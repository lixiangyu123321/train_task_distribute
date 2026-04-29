package com.aisched.scheduler.websocket;

import com.aisched.scheduler.model.dto.DashboardSnapshot;
import com.aisched.scheduler.service.MonitorService;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Controller;
import java.time.LocalDateTime;
import java.util.Map;

@Controller
public class DashboardHandler {

    private final SimpMessagingTemplate template;
    private final MonitorService monitorService;

    public DashboardHandler(SimpMessagingTemplate template, MonitorService monitorService) {
        this.template = template;
        this.monitorService = monitorService;
    }

    /** 定时推送仪表盘快照（每 5 秒） */
    @Scheduled(fixedDelay = 5000)
    public void pushDashboardSnapshot() {
        DashboardSnapshot snapshot = monitorService.getDashboardSnapshot();
        template.convertAndSend("/topic/dashboard", snapshot);
    }

    /** 任务状态变更推送 */
    public void pushTaskStatusChange(String taskId, String oldStatus, String newStatus) {
        Map<String, Object> payload = Map.of(
                "taskId", taskId,
                "oldStatus", oldStatus,
                "newStatus", newStatus,
                "timestamp", LocalDateTime.now().toString()
        );
        template.convertAndSend("/topic/task-status", Map.of("type", "TASK_STATUS_CHANGE", "payload", payload));
    }

    /** 节点资源更新推送 */
    public void pushNodeResourceUpdate(String nodeId, Map<String, Object> resources) {
        Map<String, Object> payload = Map.of(
                "nodeId", nodeId,
                "resources", resources,
                "timestamp", LocalDateTime.now().toString()
        );
        template.convertAndSend("/topic/node-resource", Map.of("type", "NODE_RESOURCE_UPDATE", "payload", payload));
    }

    /** 客户端可通过 STOMP 发送请求主动拉取最新快照 */
    @MessageMapping("/dashboard/refresh")
    @SendTo("/topic/dashboard")
    public DashboardSnapshot refreshDashboard() {
        return monitorService.getDashboardSnapshot();
    }
}
