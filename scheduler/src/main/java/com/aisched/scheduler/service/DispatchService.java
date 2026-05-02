package com.aisched.scheduler.service;

import com.aisched.scheduler.config.AppConfig;
import com.aisched.scheduler.model.entity.GpuNode;
import com.aisched.scheduler.model.entity.Task;
import com.aisched.scheduler.model.enums.TaskStatus;
import com.aisched.scheduler.queue.RedisTaskQueue;
import com.aisched.scheduler.repository.TaskRepository;
import com.aisched.scheduler.scheduler.LoadBalancer;
import com.aisched.scheduler.websocket.DashboardHandler;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.core.io.FileSystemResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;

@Service
public class DispatchService {

    private static final Logger log = LoggerFactory.getLogger(DispatchService.class);

    private final TaskRepository taskRepository;
    private final NodeService nodeService;
    private final RedisTaskQueue taskQueue;
    private final LoadBalancer loadBalancer;
    private final DashboardHandler dashboardHandler;
    private final AppConfig appConfig;
    private final RestTemplate restTemplate;
    private final TransferService transferService;

    public DispatchService(TaskRepository taskRepository,
                           NodeService nodeService,
                           RedisTaskQueue taskQueue,
                           LoadBalancer loadBalancer,
                           DashboardHandler dashboardHandler,
                           AppConfig appConfig,
                           TransferService transferService) {
        this.taskRepository = taskRepository;
        this.nodeService = nodeService;
        this.taskQueue = taskQueue;
        this.loadBalancer = loadBalancer;
        this.dashboardHandler = dashboardHandler;
        this.appConfig = appConfig;
        this.transferService = transferService;
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(10_000);
        factory.setReadTimeout(600_000);
        factory.setBufferRequestBody(false);
        this.restTemplate = new RestTemplate(factory);
    }

    @EventListener(ApplicationReadyEvent.class)
    public void recoverOrphanedTasks() {
        List<Task> dispatching = taskRepository.findAllByStatus(TaskStatus.DISPATCHING);
        int resetCount = 0;
        for (Task task : dispatching) {
            task.setStatus(TaskStatus.PENDING);
            task.setNodeId(null);
            taskRepository.save(task);
            taskQueue.enqueue(task.getId());
            resetCount++;
        }
        if (resetCount > 0) {
            log.info("Reset {} interrupted DISPATCHING tasks back to PENDING", resetCount);
        }

        List<Task> orphaned = taskRepository.findByStatusAndNodeIdIsNull(TaskStatus.PENDING);
        if (orphaned.isEmpty()) return;

        Set<String> inQueue = new HashSet<>(taskQueue.peekAll());
        int recovered = 0;
        for (Task task : orphaned) {
            if (!inQueue.contains(task.getId())) {
                taskQueue.enqueue(task.getId());
                recovered++;
            }
        }
        if (recovered > 0) {
            log.info("Recovered {} orphaned PENDING tasks to dispatch queue", recovered);
        }
    }

    /** 定时轮询调度（可配置间隔） */
    @Scheduled(fixedDelayString = "${aisched.dispatch.poll-interval-ms:5000}")
    public void dispatchLoop() {
        if (!taskQueue.tryAcquireDispatchLock(appConfig.getDispatch().getLockTimeoutSeconds())) {
            return;
        }
        try {
            long queueSize = taskQueue.size();
            if (queueSize == 0) return;

            List<GpuNode> onlineNodes = nodeService.getOnlineNodes();
            if (onlineNodes.isEmpty()) {
                log.debug("No online GPU nodes, skip dispatch. Queue size: {}", queueSize);
                return;
            }

            String taskId = taskQueue.dequeue();
            if (taskId == null) return;

            Task task = taskRepository.findById(taskId).orElse(null);
            if (task == null) return;

            GpuNode target = loadBalancer.select(onlineNodes);
            if (target == null) {
                taskQueue.enqueue(taskId);
                return;
            }

            dispatchTask(task, target);
        } finally {
            taskQueue.releaseDispatchLock();
        }
    }

    public void dispatchTask(Task task, GpuNode target) {
        Path zipPath;
        try {
            zipPath = transferService.getPackageFilePath(task.getPackageId());
        } catch (Exception e) {
            log.error("Package not found for task {}: {}", task.getId(), e.getMessage());
            task.setStatus(TaskStatus.FAILED);
            task.setErrorMsg("分发失败: 包文件不存在");
            task.setFinishedAt(LocalDateTime.now());
            taskRepository.save(task);
            dashboardHandler.pushTaskStatusChange(task.getId(), "PENDING", "FAILED");
            return;
        }

        long fileSize = zipPath.toFile().length();

        task.setNodeId(target.getId());
        task.setStatus(TaskStatus.DISPATCHING);
        task.setStartedAt(LocalDateTime.now());
        taskRepository.save(task);
        dashboardHandler.pushTaskStatusChange(task.getId(), "PENDING", "DISPATCHING");
        log.info("Task {} DISPATCHING to node {} ({} bytes)", task.getId(), target.getName(), fileSize);

        try {
            String workerUrl = "http://" + target.getPublicIp() + ":" + target.getApiPort() + "/api/v1/transfer/receive";

            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            body.add("taskId", task.getId());
            body.add("type", task.getType().name());
            body.add("params", task.getParams() != null ? task.getParams() : "{}");
            body.add("file", new FileSystemResource(zipPath));

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);

            restTemplate.postForEntity(workerUrl, new HttpEntity<>(body, headers), String.class);

            task.setStatus(TaskStatus.QUEUED);
            taskRepository.save(task);

            target.setActiveTasks((target.getActiveTasks() != null ? target.getActiveTasks() : 0) + 1);
            dashboardHandler.pushTaskStatusChange(task.getId(), "DISPATCHING", "QUEUED");
            log.info("Task {} dispatched to node {} ({} bytes, streamed)", task.getId(), target.getName(), fileSize);

            try {
                Files.deleteIfExists(zipPath);
                log.info("Deleted dispatched ZIP: {}", zipPath);
            } catch (Exception ex) {
                log.warn("Failed to delete ZIP {}: {}", zipPath, ex.getMessage());
            }
        } catch (Exception e) {
            log.error("Failed to dispatch task {} to node {}: {}", task.getId(), target.getName(), e.getMessage());
            task.setStatus(TaskStatus.FAILED);
            task.setErrorMsg("分发失败: " + e.getMessage());
            task.setFinishedAt(LocalDateTime.now());
            taskRepository.save(task);
            dashboardHandler.pushTaskStatusChange(task.getId(), "DISPATCHING", "FAILED");
        }
    }
}
