package com.aisched.scheduler.websocket;

import com.aisched.scheduler.service.TaskService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Controller;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Controller
public class LogStreamController {

    private static final Logger log = LoggerFactory.getLogger(LogStreamController.class);

    private final SimpMessagingTemplate template;
    private final TaskService taskService;

    /** taskId -> no. of active watchers (no need to track sessions) */
    private final ConcurrentHashMap<String, Boolean> watchedTasks = new ConcurrentHashMap<>();

    public LogStreamController(SimpMessagingTemplate template, TaskService taskService) {
        this.template = template;
        this.taskService = taskService;
    }

    @MessageMapping("/logs/subscribe")
    public void subscribeLogs(Map<String, Object> payload) {
        String taskId = (String) payload.get("taskId");
        if (taskId != null && !taskId.isBlank()) {
            watchedTasks.put(taskId, Boolean.TRUE);
        }
    }

    @MessageMapping("/logs/unsubscribe")
    public void unsubscribeLogs(Map<String, Object> payload) {
        String taskId = (String) payload.get("taskId");
        if (taskId != null) {
            watchedTasks.remove(taskId);
        }
    }

    /** Push log tails for all watched tasks every 2 seconds */
    @Scheduled(fixedDelay = 2000)
    public void pushLogStreams() {
        if (watchedTasks.isEmpty()) return;

        Set<String> tasks = Set.copyOf(watchedTasks.keySet());
        for (String taskId : tasks) {
            try {
                String logs = taskService.getTaskLogsTail(taskId, 200);
                if (logs == null || logs.isEmpty()) continue;

                template.convertAndSend("/topic/task-log-stream/" + taskId, Map.of(
                        "type", "LOG_UPDATE",
                        "payload", Map.of(
                                "taskId", taskId,
                                "logs", logs,
                                "timestamp", LocalDateTime.now().toString()
                        )
                ));
            } catch (Exception e) {
                log.debug("Failed to push log stream for task {}: {}", taskId, e.getMessage());
            }
        }
    }
}
