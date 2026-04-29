package com.aisched.scheduler.service;

import com.aisched.scheduler.model.dto.TaskStatusResponse;
import com.aisched.scheduler.model.entity.Task;
import com.aisched.scheduler.model.entity.TaskPackage;
import com.aisched.scheduler.model.enums.TaskStatus;
import com.aisched.scheduler.queue.RedisTaskQueue;
import com.aisched.scheduler.repository.TaskLogRepository;
import com.aisched.scheduler.repository.TaskPackageRepository;
import com.aisched.scheduler.repository.TaskRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.*;

@Service
public class TaskService {

    private static final Logger log = LoggerFactory.getLogger(TaskService.class);

    private final TaskRepository taskRepository;
    private final TaskLogRepository logRepository;
    private final RedisTaskQueue taskQueue;
    private final TaskPackageRepository pkgRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public TaskService(TaskRepository taskRepository, TaskLogRepository logRepository,
                       RedisTaskQueue taskQueue, TaskPackageRepository pkgRepository) {
        this.taskRepository = taskRepository;
        this.logRepository = logRepository;
        this.taskQueue = taskQueue;
        this.pkgRepository = pkgRepository;
    }

    @Transactional
    public Task submit(String name, String type, String modelName, String datasetPath,
                        String outputPath, Map<String, Object> params, int priority) {
        Task task = new Task();
        task.setId(UUID.randomUUID().toString());
        task.setName(name);
        task.setType(Task.TaskType.valueOf(type));
        task.setModelName(modelName);
        task.setDatasetPath(datasetPath);
        task.setOutputPath(outputPath);
        task.setPriority(priority);
        task.setStatus(TaskStatus.PENDING);
        task.setCreatedAt(LocalDateTime.now());

        if (params != null && !params.isEmpty()) {
            task.setParams(toJson(params));
        }

        taskRepository.save(task);
        taskQueue.enqueue(task.getId());
        log.info("Task submitted: {} [{}]", task.getName(), task.getId());
        return task;
    }

    public TaskStatusResponse getTask(String taskId) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new IllegalArgumentException("任务不存在: " + taskId));
        return toResponse(task);
    }

    public Page<TaskStatusResponse> listTasks(TaskStatus status, int page, int size) {
        Page<Task> tasks;
        if (status != null) {
            tasks = taskRepository.findByStatus(status, PageRequest.of(page, size));
        } else {
            tasks = taskRepository.findAll(PageRequest.of(page, size));
        }
        return tasks.map(this::toResponse);
    }

    @Transactional
    public void cancel(String taskId) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new IllegalArgumentException("任务不存在: " + taskId));
        if (task.getStatus() == TaskStatus.COMPLETED || task.getStatus() == TaskStatus.FAILED) {
            throw new IllegalArgumentException("任务已处于终态，无法取消");
        }
        task.setStatus(TaskStatus.CANCELLED);
        task.setFinishedAt(LocalDateTime.now());
        taskQueue.remove(taskId);
        taskRepository.save(task);
        log.info("Task cancelled: {}", taskId);
    }

    @Transactional
    public long purgeAllTasks() {
        long count = taskRepository.count();
        taskQueue.clear();
        logRepository.deleteAll();
        pkgRepository.deleteAll();
        taskRepository.deleteAll();
        log.info("Purged all tasks: {} records", count);
        return count;
    }

    @Transactional
    public void updateStatus(String taskId, TaskStatus newStatus, String errorMsg) {
        taskRepository.findById(taskId).ifPresent(task -> {
            task.setStatus(newStatus);
            if (errorMsg != null && !errorMsg.isBlank()) {
                task.setErrorMsg(errorMsg);
            }
            if (newStatus == TaskStatus.RUNNING && task.getStartedAt() == null) {
                task.setStartedAt(LocalDateTime.now());
            }
            if (newStatus == TaskStatus.COMPLETED || newStatus == TaskStatus.FAILED) {
                task.setFinishedAt(LocalDateTime.now());
            }
            taskRepository.save(task);
        });
    }

    @Transactional
    public Task submitFromPackage(String packageId, String taskName, int priority, TransferService transferService) {
        TaskPackage pkg = pkgRepository.findById(packageId)
                .orElseThrow(() -> new IllegalArgumentException("Package not found: " + packageId));

        byte[] zipData;
        try {
            zipData = java.nio.file.Files.readAllBytes(java.nio.file.Path.of(pkg.getFilePath()));
        } catch (java.io.IOException e) {
            throw new RuntimeException("Failed to read package file", e);
        }

        Map<String, Object> yamlData = transferService.parseYamlData(zipData);
        List<String> zipEntries;
        try (java.util.zip.ZipInputStream zis = new java.util.zip.ZipInputStream(
                new java.io.ByteArrayInputStream(zipData))) {
            zipEntries = new ArrayList<>();
            java.util.zip.ZipEntry entry;
            while ((entry = zis.getNextEntry()) != null) {
                zipEntries.add(entry.getName());
                zis.closeEntry();
            }
        } catch (java.io.IOException e) {
            zipEntries = List.of();
        }

        Task.TaskType detectedType = transferService.detectTaskType(zipEntries);

        Task task = new Task();
        task.setId(UUID.randomUUID().toString());
        task.setName(taskName);
        task.setType(detectedType);
        task.setModelName((String) yamlData.getOrDefault("model_name", ""));
        task.setPackageId(packageId);
        task.setParams(toJson(yamlData.getOrDefault("params", Map.of())));
        task.setPriority(priority);
        task.setStatus(TaskStatus.PENDING);
        task.setCreatedAt(LocalDateTime.now());

        taskRepository.save(task);
        pkg.setTaskId(task.getId());
        pkg.setStatus(TaskPackage.PkgStatus.READY);
        pkg.setYamlData(toJson(yamlData));
        pkgRepository.save(pkg);
        taskQueue.enqueue(task.getId());
        log.info("Task submitted from package: {} [{}] type={}", task.getName(), task.getId(), detectedType);
        return task;
    }

    @Transactional
    public void updateMetrics(String taskId, Map<String, Object> metrics) {
        taskRepository.findById(taskId).ifPresent(task -> {
            try {
                task.setMetrics(objectMapper.writeValueAsString(metrics));
            } catch (JsonProcessingException e) {
                log.warn("Failed to serialize metrics", e);
            }
            taskRepository.save(task);
        });
    }

    @Transactional
    public void updateProgress(String taskId, double percent, int currentStep, int totalSteps, long estimatedRemainingSec) {
        taskRepository.findById(taskId).ifPresent(task -> {
            task.setProgressPct(percent);
            task.setCurrentStep(currentStep);
            task.setTotalSteps(totalSteps);
            taskRepository.save(task);
        });
        taskQueue.setTaskProgress(taskId, percent, currentStep, totalSteps, estimatedRemainingSec);
    }

    private TaskStatusResponse toResponse(Task task) {
        TaskStatusResponse r = new TaskStatusResponse();
        r.setTaskId(task.getId());
        r.setName(task.getName());
        r.setType(task.getType().name());
        r.setStatus(task.getStatus());
        r.setModelName(task.getModelName());
        r.setNodeId(task.getNodeId());
        if (task.getProgressPct() != null) {
            r.setProgress(Map.of(
                    "percent", task.getProgressPct(),
                    "currentStep", task.getCurrentStep() != null ? task.getCurrentStep() : 0,
                    "totalSteps", task.getTotalSteps() != null ? task.getTotalSteps() : 0
            ));
        }
        r.setCreatedAt(task.getCreatedAt());
        r.setStartedAt(task.getStartedAt());
        r.setFinishedAt(task.getFinishedAt());
        r.setPackageId(task.getPackageId());
        if (task.getMetrics() != null) {
            try { r.setMetrics(objectMapper.readValue(task.getMetrics(), Map.class)); } catch (Exception ignored) {}
        }
        r.setLogPath(task.getLogPath());
        r.setErrorMsg(task.getErrorMsg());
        return r;
    }

    /** 获取训练日志全文（从 Worker 的 output/logs/training.log 读取） */
    public String getTaskLogs(String taskId) {
        Task task = taskRepository.findById(taskId).orElse(null);
        if (task == null) return "";
        // logs 存储在 Worker 节点上，需要通过 Worker API 获取
        // 当前返回 Scheduler 端的 task_logs 表内容
        return "Logs available on Worker node. Use worker-specific log endpoint.";
    }

    /** 获取训练日志尾部 N 行 */
    public String getTaskLogsTail(String taskId, int lines) {
        return getTaskLogs(taskId); // 简化实现，后续通过 Worker API 代理
    }

    /** 获取指标历史（从 metrics JSON 字段解析） */
    public List<Map<String, Object>> getMetricsHistory(String taskId) {
        Task task = taskRepository.findById(taskId).orElse(null);
        if (task == null || task.getMetrics() == null) return List.of();
        try {
            return List.of(objectMapper.readValue(task.getMetrics(), Map.class));
        } catch (Exception e) {
            return List.of();
        }
    }

    /** 获取队列状态 */
    public Map<String, Object> getQueueStatus(String taskId) {
        long pendingCount = taskRepository.countByStatus(TaskStatus.PENDING);
        long queuedCount = taskRepository.countByStatus(TaskStatus.QUEUED);
        long runningCount = taskRepository.countByStatus(TaskStatus.RUNNING);

        Map<String, Object> status = new LinkedHashMap<>();
        status.put("pendingCount", pendingCount);
        status.put("queuedCount", queuedCount);
        status.put("runningCount", runningCount);

        if (taskId != null) {
            // 计算该任务在队列中的位置
            long queuePosition = 0;
            List<String> pendingTasks = taskQueue.peekAll();
            for (int i = 0; i < pendingTasks.size(); i++) {
                if (pendingTasks.get(i).equals(taskId)) {
                    queuePosition = pendingTasks.size() - i; // Redis list is LIFO
                    break;
                }
            }
            status.put("taskId", taskId);
            status.put("queuePosition", queuePosition);
        }
        return status;
    }

    private String toJson(Object obj) {
        try {
            return objectMapper.writeValueAsString(obj);
        } catch (Exception e) {
            log.warn("Failed to serialize", e);
            return "{}";
        }
    }
}
