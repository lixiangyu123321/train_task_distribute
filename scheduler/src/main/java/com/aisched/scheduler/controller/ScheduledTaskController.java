package com.aisched.scheduler.controller;

import com.aisched.scheduler.config.JwtAuthFilter;
import com.aisched.scheduler.model.entity.ScheduledTask;
import com.aisched.scheduler.model.entity.User;
import com.aisched.scheduler.service.TaskSchedulerService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/schedules")
public class ScheduledTaskController {

    private final TaskSchedulerService schedulerService;

    public ScheduledTaskController(TaskSchedulerService schedulerService) {
        this.schedulerService = schedulerService;
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> list() {
        Long userId = getCurrentUserId();
        boolean isAdmin = isCurrentUserAdmin();
        List<ScheduledTask> list = isAdmin
                ? schedulerService.listAll()
                : schedulerService.listByUser(userId);
        return ResponseEntity.ok(buildResponse(200, "success", list));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> get(@PathVariable String id) {
        return ResponseEntity.ok(buildResponse(200, "success", schedulerService.getById(id)));
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> create(@RequestBody Map<String, String> body) {
        String templateId = body.get("templateId");
        String taskName = body.get("taskName");
        String cron = body.get("cronExpression");
        Long userId = getCurrentUserId();
        ScheduledTask st = schedulerService.create(templateId, userId, taskName, cron);
        return ResponseEntity.status(HttpStatus.CREATED).body(buildResponse(201, "定时任务已创建", st));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Map<String, Object>> update(@PathVariable String id,
                                                       @RequestBody Map<String, String> body) {
        ScheduledTask st = schedulerService.update(id,
                body.get("templateId"), body.get("taskName"), body.get("cronExpression"));
        return ResponseEntity.ok(buildResponse(200, "定时任务已更新", st));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Object>> delete(@PathVariable String id) {
        schedulerService.delete(id);
        return ResponseEntity.ok(buildResponse(200, "定时任务已删除", null));
    }

    @PostMapping("/{id}/toggle")
    public ResponseEntity<Map<String, Object>> toggle(@PathVariable String id) {
        ScheduledTask st = schedulerService.toggle(id);
        String msg = Boolean.TRUE.equals(st.getEnabled()) ? "已启用" : "已停用";
        return ResponseEntity.ok(buildResponse(200, msg, st));
    }

    private Long getCurrentUserId() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getDetails() instanceof JwtAuthFilter.JwtUserDetails details) {
            return details.getUserId();
        }
        return null;
    }

    private boolean isCurrentUserAdmin() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getDetails() instanceof JwtAuthFilter.JwtUserDetails details) {
            return details.getRole() == User.Role.ADMIN;
        }
        return false;
    }

    private Map<String, Object> buildResponse(int code, String message, Object data) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("code", code);
        body.put("message", message);
        body.put("data", data);
        body.put("timestamp", LocalDateTime.now().toString());
        return body;
    }
}
