package com.aisched.scheduler.service;

import com.aisched.scheduler.model.dto.TaskStatusResponse;
import com.aisched.scheduler.model.entity.GpuNode;
import com.aisched.scheduler.model.entity.Task;
import com.aisched.scheduler.model.entity.TaskPackage;
import com.aisched.scheduler.model.enums.TaskStatus;
import com.aisched.scheduler.queue.RedisTaskQueue;
import com.aisched.scheduler.repository.GpuNodeRepository;
import com.aisched.scheduler.repository.TaskLogRepository;
import com.aisched.scheduler.repository.TaskPackageRepository;
import com.aisched.scheduler.repository.TaskRepository;
import com.aisched.scheduler.websocket.DashboardHandler;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StreamUtils;
import org.springframework.web.client.RestTemplate;
import java.io.OutputStream;
import java.time.LocalDateTime;
import java.util.*;

@Service
public class TaskService {

    private static final Logger log = LoggerFactory.getLogger(TaskService.class);

    private final TaskRepository taskRepository;
    private final TaskLogRepository logRepository;
    private final RedisTaskQueue taskQueue;
    private final TaskPackageRepository pkgRepository;
    private final GpuNodeRepository gpuNodeRepository;
    private final DashboardHandler dashboardHandler;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final RestTemplate proxyRestTemplate;
    private final RestTemplate streamingRestTemplate;

    public TaskService(TaskRepository taskRepository, TaskLogRepository logRepository,
                       RedisTaskQueue taskQueue, TaskPackageRepository pkgRepository,
                       GpuNodeRepository gpuNodeRepository,
                       DashboardHandler dashboardHandler) {
        this.taskRepository = taskRepository;
        this.logRepository = logRepository;
        this.taskQueue = taskQueue;
        this.pkgRepository = pkgRepository;
        this.gpuNodeRepository = gpuNodeRepository;
        this.dashboardHandler = dashboardHandler;
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(30_000);
        factory.setReadTimeout(60_000);
        this.proxyRestTemplate = new RestTemplate(factory);
        SimpleClientHttpRequestFactory streamFactory = new SimpleClientHttpRequestFactory();
        streamFactory.setConnectTimeout(30_000);
        streamFactory.setReadTimeout(300_000);
        this.streamingRestTemplate = new RestTemplate(streamFactory);
    }

    @Transactional
    public Task submit(String name, String type, String modelName, String datasetPath,
                        String outputPath, Map<String, Object> params, int priority, Long userId) {
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
        task.setUserId(userId);

        if (params != null && !params.isEmpty()) {
            task.setParams(toJson(params));
        }

        taskRepository.save(task);
        taskQueue.enqueue(task.getId());
        log.info("Task submitted: {} [{}]", task.getName(), task.getId());
        return task;
    }

    @Transactional
    public Task submit(String name, String type, String modelName, String datasetPath,
                        String outputPath, Map<String, Object> params, int priority) {
        return submit(name, type, modelName, datasetPath, outputPath, params, priority, null);
    }

    public TaskStatusResponse getTask(String taskId) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new IllegalArgumentException("任务不存在: " + taskId));
        return toResponse(task);
    }

    public Page<TaskStatusResponse> listTasks(TaskStatus status, int page, int size) {
        return listTasks(status, page, size, null);
    }

    public Page<TaskStatusResponse> listTasks(TaskStatus status, int page, int size, Long userId) {
        Page<Task> tasks;
        Pageable pageable = PageRequest.of(page, size);
        if (userId != null) {
            tasks = status != null
                    ? taskRepository.findByUserIdAndStatusSorted(userId, status, pageable)
                    : taskRepository.findByUserIdSorted(userId, pageable);
        } else {
            tasks = status != null
                    ? taskRepository.findByStatusSorted(status, pageable)
                    : taskRepository.findAllSorted(pageable);
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
        String oldStatus = task.getStatus().name();
        task.setStatus(TaskStatus.CANCELLED);
        task.setFinishedAt(LocalDateTime.now());
        taskQueue.remove(taskId);
        taskRepository.save(task);
        pushStatusChange(taskId, oldStatus, "CANCELLED");
        log.info("Task cancelled: {}", taskId);
    }

    @Transactional
    public long purgeAllTasks() {
        long count = taskRepository.count();
        taskQueue.clear();
        logRepository.deleteAll();
        pkgRepository.deleteAll();
        taskRepository.deleteAll();
        pushStatusChange("__all__", "ANY", "PURGED");
        log.info("Purged all tasks: {} records", count);
        return count;
    }

    @Transactional
    public void updateStatus(String taskId, TaskStatus newStatus, String errorMsg) {
        taskRepository.findById(taskId).ifPresent(task -> {
            TaskStatus old = task.getStatus();
            if (old == newStatus) return;
            if (old == TaskStatus.COMPLETED || old == TaskStatus.FAILED || old == TaskStatus.CANCELLED) return;
            String oldName = old.name();
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
            pushStatusChange(taskId, oldName, newStatus.name());
        });
    }

    private void pushStatusChange(String taskId, String oldStatus, String newStatus) {
        dashboardHandler.pushTaskStatusChange(taskId, oldStatus, newStatus);
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
        if (task.getPackageId() != null) {
            pkgRepository.findById(task.getPackageId()).ifPresent(pkg -> {
                if (pkg.getFileSize() != null) r.setPackageFileSize(pkg.getFileSize());
            });
        }
        return r;
    }

    public String getTaskLogs(String taskId) {
        Task task = taskRepository.findById(taskId).orElse(null);
        if (task == null) return "";
        String baseUrl = resolveWorkerBaseUrl(task);
        if (baseUrl == null) return "";
        try {
            ResponseEntity<Map> resp = proxyRestTemplate.getForEntity(
                    baseUrl + "/api/v1/tasks/" + taskId + "/logs", Map.class);
            if (resp.getBody() != null) {
                Object logs = resp.getBody().get("logs");
                return logs != null ? logs.toString() : "";
            }
        } catch (Exception e) {
            log.warn("Failed to fetch logs from Worker for task {}: {}", taskId, e.getMessage());
        }
        return "";
    }

    public String getTaskLogsTail(String taskId, int lines) {
        Task task = taskRepository.findById(taskId).orElse(null);
        if (task == null) return "";
        String baseUrl = resolveWorkerBaseUrl(task);
        if (baseUrl == null) return "";
        try {
            ResponseEntity<Map> resp = proxyRestTemplate.getForEntity(
                    baseUrl + "/api/v1/tasks/" + taskId + "/logs/tail?lines=" + lines, Map.class);
            if (resp.getBody() != null) {
                Object logs = resp.getBody().get("logs");
                return logs != null ? logs.toString() : "";
            }
        } catch (Exception e) {
            log.warn("Failed to fetch log tail from Worker for task {}: {}", taskId, e.getMessage());
        }
        return "";
    }

    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> getMetricsHistory(String taskId) {
        Task task = taskRepository.findById(taskId).orElse(null);
        if (task == null) return List.of();
        String baseUrl = resolveWorkerBaseUrl(task);
        if (baseUrl != null) {
            try {
                ResponseEntity<Map> resp = proxyRestTemplate.getForEntity(
                        baseUrl + "/api/v1/tasks/" + taskId + "/metrics", Map.class);
                if (resp.getBody() != null) {
                    Object history = resp.getBody().get("history");
                    if (history instanceof List) {
                        return (List<Map<String, Object>>) history;
                    }
                }
            } catch (Exception e) {
                log.warn("Failed to fetch metrics from Worker for task {}: {}", taskId, e.getMessage());
            }
        }
        if (task.getMetrics() != null) {
            try {
                return List.of(objectMapper.readValue(task.getMetrics(), Map.class));
            } catch (Exception ignored) {}
        }
        return List.of();
    }

    public void streamArtifacts(String taskId, OutputStream outputStream) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new IllegalArgumentException("任务不存在: " + taskId));
        String baseUrl = resolveWorkerBaseUrl(task);
        if (baseUrl == null) {
            throw new IllegalStateException("Worker 不可达: 无法解析节点地址");
        }
        streamingRestTemplate.execute(
                baseUrl + "/api/v1/tasks/" + taskId + "/artifacts/download",
                HttpMethod.GET, null,
                response -> { StreamUtils.copy(response.getBody(), outputStream); return null; });
    }

    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> listArtifacts(String taskId) {
        Task task = taskRepository.findById(taskId).orElse(null);
        if (task == null) return List.of();
        String baseUrl = resolveWorkerBaseUrl(task);
        if (baseUrl == null) return List.of();
        try {
            ResponseEntity<Map> resp = proxyRestTemplate.getForEntity(
                    baseUrl + "/api/v1/tasks/" + taskId + "/artifacts/list", Map.class);
            if (resp.getBody() != null) {
                Object files = resp.getBody().get("files");
                if (files instanceof List) {
                    return (List<Map<String, Object>>) files;
                }
            }
        } catch (Exception e) {
            log.warn("Failed to list artifacts from Worker for task {}: {}", taskId, e.getMessage());
        }
        return List.of();
    }

    public void streamArtifactFile(String taskId, String path, OutputStream outputStream) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new IllegalArgumentException("任务不存在: " + taskId));
        String baseUrl = resolveWorkerBaseUrl(task);
        if (baseUrl == null) {
            throw new IllegalStateException("Worker 不可达: 无法解析节点地址");
        }
        String encodedPath = java.net.URLEncoder.encode(path, java.nio.charset.StandardCharsets.UTF_8);
        java.net.URI uri = java.net.URI.create(baseUrl + "/api/v1/tasks/" + taskId + "/artifacts/file?path=" + encodedPath);
        streamingRestTemplate.execute(
                uri, HttpMethod.GET, null,
                response -> { StreamUtils.copy(response.getBody(), outputStream); return null; });
    }

    private String resolveWorkerBaseUrl(Task task) {
        if (task.getNodeId() == null) return null;
        Optional<GpuNode> nodeOpt = gpuNodeRepository.findById(task.getNodeId());
        if (nodeOpt.isEmpty()) return null;
        GpuNode node = nodeOpt.get();
        return "http://" + node.getPublicIp() + ":" + node.getApiPort();
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

    @Transactional
    public Map<String, Object> batchCancel(List<String> taskIds) {
        int success = 0, failed = 0;
        for (String id : taskIds) {
            try {
                cancel(id);
                success++;
            } catch (Exception e) {
                failed++;
                log.warn("Batch cancel failed for {}: {}", id, e.getMessage());
            }
        }
        return Map.of("success", success, "failed", failed);
    }

    @Transactional
    public List<TaskStatusResponse> batchRetry(List<String> taskIds) {
        List<TaskStatusResponse> results = new ArrayList<>();
        for (String id : taskIds) {
            try {
                Task original = taskRepository.findById(id)
                        .orElseThrow(() -> new IllegalArgumentException("任务不存在: " + id));
                if (original.getStatus() != TaskStatus.FAILED) continue;
                Task cloned = cloneTaskInternal(original);
                results.add(toResponse(cloned));
            } catch (Exception e) {
                log.warn("Batch retry failed for {}: {}", id, e.getMessage());
            }
        }
        return results;
    }

    @Transactional
    public TaskStatusResponse cloneTask(String taskId) {
        Task original = taskRepository.findById(taskId)
                .orElseThrow(() -> new IllegalArgumentException("任务不存在: " + taskId));
        Task cloned = cloneTaskInternal(original);
        return toResponse(cloned);
    }

    private Task cloneTaskInternal(Task original) {
        Task task = new Task();
        task.setId(UUID.randomUUID().toString());
        task.setName(original.getName());
        task.setType(original.getType());
        task.setModelName(original.getModelName());
        task.setDatasetPath(original.getDatasetPath());
        task.setOutputPath(original.getOutputPath());
        task.setParams(original.getParams());
        task.setPackageId(original.getPackageId());
        task.setPriority(original.getPriority());
        task.setStatus(TaskStatus.PENDING);
        task.setCreatedAt(LocalDateTime.now());
        taskRepository.save(task);
        taskQueue.enqueue(task.getId());
        log.info("Task cloned: {} -> {} [{}]", original.getId(), task.getName(), task.getId());
        return task;
    }

    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> compareTasks(List<String> taskIds) {
        List<Map<String, Object>> results = new ArrayList<>();
        for (String id : taskIds) {
            Task task = taskRepository.findById(id).orElse(null);
            if (task == null) continue;
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("task", toResponse(task));
            entry.put("metricsHistory", getMetricsHistory(id));
            results.add(entry);
        }
        return results;
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
