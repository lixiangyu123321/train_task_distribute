package com.aisched.scheduler.controller;

import com.aisched.scheduler.model.dto.TaskStatusResponse;
import com.aisched.scheduler.model.entity.Task;
import com.aisched.scheduler.model.enums.TaskStatus;
import com.aisched.scheduler.model.dto.TaskSubmitRequest;
import com.aisched.scheduler.service.TaskService;
import com.aisched.scheduler.service.TransferService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;
import com.aisched.scheduler.config.JwtAuthFilter;
import com.aisched.scheduler.model.entity.User;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/tasks")
public class TaskController {

    private final TaskService taskService;
    private final TransferService transferService;

    public TaskController(TaskService taskService, TransferService transferService) {
        this.taskService = taskService;
        this.transferService = transferService;
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> submitTask(@Valid @RequestBody TaskSubmitRequest request) {
        Long userId = getCurrentUserId();
        Task task = taskService.submit(
                request.getName(),
                request.getType(),
                request.getModelName(),
                request.getDatasetPath(),
                request.getOutputPath(),
                request.getParams(),
                request.getPriority() != null ? request.getPriority() : 0,
                userId
        );
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("taskId", task.getId());
        data.put("status", task.getStatus().name());
        data.put("createdAt", task.getCreatedAt().toString());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(buildResponse(201, "任务已提交", data));
    }

    @GetMapping("/{taskId}")
    public ResponseEntity<Map<String, Object>> getTask(@PathVariable String taskId) {
        TaskStatusResponse task = taskService.getTask(taskId);
        return ResponseEntity.ok(buildResponse(200, "success", task));
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> listTasks(
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size) {
        TaskStatus taskStatus = status != null ? TaskStatus.valueOf(status.toUpperCase()) : null;
        Long userId = getCurrentUserId();
        boolean isAdmin = isCurrentUserAdmin();
        Page<TaskStatusResponse> tasks = taskService.listTasks(
                taskStatus, page - 1, size, isAdmin ? null : userId);
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("items", tasks.getContent());
        data.put("total", tasks.getTotalElements());
        data.put("page", page);
        data.put("size", size);
        return ResponseEntity.ok(buildResponse(200, "success", data));
    }

    @DeleteMapping("/{taskId}")
    public ResponseEntity<Map<String, Object>> cancelTask(@PathVariable String taskId) {
        taskService.cancel(taskId);
        return ResponseEntity.ok(buildResponse(200, "任务已取消", null));
    }

    @DeleteMapping
    public ResponseEntity<Map<String, Object>> purgeAllTasks() {
        long count = taskService.purgeAllTasks();
        return ResponseEntity.ok(buildResponse(200, "已删除全部任务", Map.of("deleted", count)));
    }

    /** Worker 回调：更新任务状态 */
    @PostMapping("/{taskId}/status")
    public ResponseEntity<Map<String, Object>> updateStatus(
            @PathVariable String taskId,
            @RequestBody Map<String, Object> body) {
        String status = (String) body.get("status");
        String errorMsg = (String) body.get("errorMsg");
        taskService.updateStatus(taskId, TaskStatus.valueOf(status), errorMsg);
        return ResponseEntity.ok(buildResponse(200, "ok", null));
    }

    /** Worker 回调：上报训练进度 */
    @PostMapping("/{taskId}/progress")
    public ResponseEntity<Map<String, Object>> updateProgress(
            @PathVariable String taskId,
            @RequestBody Map<String, Object> body) {
        double percent = ((Number) body.getOrDefault("percent", 0)).doubleValue();
        int currentStep = ((Number) body.getOrDefault("currentStep", 0)).intValue();
        int totalSteps = ((Number) body.getOrDefault("totalSteps", 0)).intValue();
        long estimatedRemainingSec = ((Number) body.getOrDefault("estimatedRemainingSec", 0)).longValue();
        taskService.updateProgress(taskId, percent, currentStep, totalSteps, estimatedRemainingSec);
        return ResponseEntity.ok(buildResponse(200, "ok", null));
    }

    /** Worker 回调：上报详细训练指标 */
    @PostMapping("/{taskId}/metrics")
    public ResponseEntity<Map<String, Object>> updateMetrics(
            @PathVariable String taskId,
            @RequestBody Map<String, Object> body) {
        @SuppressWarnings("unchecked")
        Map<String, Object> metrics = (Map<String, Object>) body.get("metrics");
        taskService.updateMetrics(taskId, metrics);
        return ResponseEntity.ok(buildResponse(200, "ok", null));
    }

    /** 基于 ZIP 包提交任务（先上传 ZIP，再绑定任务） */
    @PostMapping("/submit-package")
    public ResponseEntity<Map<String, Object>> submitFromPackage(@RequestBody Map<String, Object> body) {
        String packageId = (String) body.get("packageId");
        String taskName = (String) body.getOrDefault("name", "task-from-package");
        int priority = ((Number) body.getOrDefault("priority", 0)).intValue();
        Task task = taskService.submitFromPackage(packageId, taskName, priority, transferService);
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("taskId", task.getId());
        data.put("type", task.getType().name());
        data.put("status", task.getStatus().name());
        data.put("packageId", packageId);
        return ResponseEntity.status(HttpStatus.CREATED).body(buildResponse(201, "任务已提交", data));
    }

    /** 获取任务训练日志 */
    @GetMapping("/{taskId}/logs")
    public ResponseEntity<Map<String, Object>> getTaskLogs(@PathVariable String taskId) {
        String logs = taskService.getTaskLogs(taskId);
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("taskId", taskId);
        data.put("logs", logs);
        return ResponseEntity.ok(buildResponse(200, "success", data));
    }

    /** 获取训练日志尾部 N 行 */
    @GetMapping("/{taskId}/logs/tail")
    public ResponseEntity<Map<String, Object>> getTaskLogsTail(
            @PathVariable String taskId,
            @RequestParam(defaultValue = "100") int lines) {
        String logs = taskService.getTaskLogsTail(taskId, lines);
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("taskId", taskId);
        data.put("logs", logs);
        data.put("lines", lines);
        return ResponseEntity.ok(buildResponse(200, "success", data));
    }

    /** 获取任务指标历史（metrics.jsonl 内容） */
    @GetMapping("/{taskId}/metrics/history")
    public ResponseEntity<Map<String, Object>> getMetricsHistory(@PathVariable String taskId) {
        var history = taskService.getMetricsHistory(taskId);
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("taskId", taskId);
        data.put("history", history);
        return ResponseEntity.ok(buildResponse(200, "success", data));
    }

    @GetMapping("/{taskId}/artifacts/download")
    public ResponseEntity<StreamingResponseBody> downloadArtifacts(@PathVariable String taskId) {
        StreamingResponseBody body = out -> taskService.streamArtifacts(taskId, out);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_OCTET_STREAM);
        headers.set("Content-Disposition", "attachment; filename=\"" + taskId + "-artifacts.zip\"");
        return new ResponseEntity<>(body, headers, HttpStatus.OK);
    }

    @GetMapping("/{taskId}/artifacts/list")
    public ResponseEntity<Map<String, Object>> listArtifacts(@PathVariable String taskId) {
        var files = taskService.listArtifacts(taskId);
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("taskId", taskId);
        data.put("files", files);
        return ResponseEntity.ok(buildResponse(200, "success", data));
    }

    @GetMapping("/{taskId}/artifacts/file")
    public ResponseEntity<StreamingResponseBody> downloadArtifactFile(
            @PathVariable String taskId,
            @RequestParam String path) {
        StreamingResponseBody body = out -> taskService.streamArtifactFile(taskId, path, out);
        String filename = path.contains("/") ? path.substring(path.lastIndexOf('/') + 1) : path;
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_OCTET_STREAM);
        headers.set("Content-Disposition", "attachment; filename=\"" + filename + "\"");
        return new ResponseEntity<>(body, headers, HttpStatus.OK);
    }

    /** 批量取消 */
    @SuppressWarnings("unchecked")
    @PostMapping("/batch/cancel")
    public ResponseEntity<Map<String, Object>> batchCancel(@RequestBody Map<String, Object> body) {
        List<String> taskIds = (List<String>) body.get("taskIds");
        var result = taskService.batchCancel(taskIds);
        return ResponseEntity.ok(buildResponse(200, "批量取消完成", result));
    }

    /** 批量重试 FAILED 任务 */
    @SuppressWarnings("unchecked")
    @PostMapping("/batch/retry")
    public ResponseEntity<Map<String, Object>> batchRetry(@RequestBody Map<String, Object> body) {
        List<String> taskIds = (List<String>) body.get("taskIds");
        var result = taskService.batchRetry(taskIds);
        return ResponseEntity.ok(buildResponse(200, "批量重试完成", result));
    }

    /** 克隆任务 */
    @PostMapping("/{taskId}/clone")
    public ResponseEntity<Map<String, Object>> cloneTask(@PathVariable String taskId) {
        var result = taskService.cloneTask(taskId);
        return ResponseEntity.status(HttpStatus.CREATED).body(buildResponse(201, "任务已克隆", result));
    }

    /** 任务指标对比 */
    @GetMapping("/compare")
    public ResponseEntity<Map<String, Object>> compareTasks(@RequestParam List<String> ids) {
        var result = taskService.compareTasks(ids);
        return ResponseEntity.ok(buildResponse(200, "success", result));
    }

    /** 获取队列状态（排队任务数 + 位置） */
    @GetMapping("/queue/status")
    public ResponseEntity<Map<String, Object>> getQueueStatus(
            @RequestParam(required = false) String taskId) {
        var status = taskService.getQueueStatus(taskId);
        return ResponseEntity.ok(buildResponse(200, "success", status));
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
