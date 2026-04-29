package com.aisched.scheduler.service;

import com.aisched.scheduler.config.AppConfig;
import com.aisched.scheduler.model.entity.GpuNode;
import com.aisched.scheduler.model.entity.Task;
import com.aisched.scheduler.model.enums.NodeStatus;
import com.aisched.scheduler.model.enums.TaskStatus;
import com.aisched.scheduler.queue.RedisTaskQueue;
import com.aisched.scheduler.repository.TaskRepository;
import com.aisched.scheduler.scheduler.LoadBalancer;
import com.aisched.scheduler.websocket.DashboardHandler;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

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
        this.restTemplate = new RestTemplate();
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

    @Transactional
    public void dispatchTask(Task task, GpuNode target) {
        try {
            String workerUrl = "http://" + target.getPublicIp() + ":" + target.getApiPort() + "/api/v1/transfer/receive";
            String downloadUrl = task.getPackageId() != null
                    ? transferService.getDownloadUrl(task.getPackageId())
                    : null;
            Map<String, Object> payload = Map.of(
                    "taskId", task.getId(),
                    "type", task.getType().name(),
                    "downloadUrl", downloadUrl != null ? downloadUrl : "",
                    "packageId", task.getPackageId() != null ? task.getPackageId() : "",
                    "params", task.getParams() != null ? task.getParams() : Map.of()
            );

            restTemplate.postForEntity(workerUrl, payload, String.class);

            task.setNodeId(target.getId());
            task.setStatus(TaskStatus.QUEUED);
            taskRepository.save(task);

            target.setActiveTasks((target.getActiveTasks() != null ? target.getActiveTasks() : 0) + 1);
            dashboardHandler.pushTaskStatusChange(task.getId(), "PENDING", "QUEUED");
            log.info("Task {} dispatched to node {}", task.getId(), target.getName());
        } catch (Exception e) {
            log.error("Failed to dispatch task {} to node {}: {}", task.getId(), target.getName(), e.getMessage());
            task.setStatus(TaskStatus.FAILED);
            task.setErrorMsg("分发失败: " + e.getMessage());
            task.setFinishedAt(LocalDateTime.now());
            taskRepository.save(task);
            dashboardHandler.pushTaskStatusChange(task.getId(), "PENDING", "FAILED");
        }
    }
}
