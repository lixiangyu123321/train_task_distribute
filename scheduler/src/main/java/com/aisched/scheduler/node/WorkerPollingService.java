package com.aisched.scheduler.node;

import com.aisched.scheduler.model.entity.GpuNode;
import com.aisched.scheduler.model.enums.NodeStatus;
import com.aisched.scheduler.model.enums.TaskStatus;
import com.aisched.scheduler.repository.GpuNodeRepository;
import com.aisched.scheduler.service.TaskService;
import com.aisched.scheduler.websocket.DashboardHandler;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class WorkerPollingService {

    private static final Logger log = LoggerFactory.getLogger(WorkerPollingService.class);

    private final GpuNodeRepository nodeRepository;
    private final NodeRegistry nodeRegistry;
    private final RedisTemplate<String, String> redisTemplate;
    private final TaskService taskService;
    private final DashboardHandler dashboardHandler;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();

    private final ConcurrentHashMap<String, Integer> failureCounts = new ConcurrentHashMap<>();
    private static final int MAX_FAILURES = 3;

    public WorkerPollingService(GpuNodeRepository nodeRepository,
                                NodeRegistry nodeRegistry,
                                RedisTemplate<String, String> redisTemplate,
                                TaskService taskService,
                                DashboardHandler dashboardHandler) {
        this.nodeRepository = nodeRepository;
        this.nodeRegistry = nodeRegistry;
        this.redisTemplate = redisTemplate;
        this.taskService = taskService;
        this.dashboardHandler = dashboardHandler;
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(5_000);
        factory.setReadTimeout(5_000);
        this.restTemplate = new RestTemplate(factory);
    }

    @Scheduled(fixedDelayString = "${aisched.node.heartbeat-check-interval-ms:10000}")
    public void pollWorkers() {
        List<GpuNode> nodes = nodeRepository.findAll();
        for (GpuNode node : nodes) {
            pollSingleWorker(node);
        }
    }

    @SuppressWarnings("unchecked")
    private void pollSingleWorker(GpuNode node) {
        String url = "http://" + node.getPublicIp() + ":" + node.getApiPort() + "/api/v1/status";
        try {
            String json = restTemplate.getForObject(url, String.class);
            Map<String, Object> response = objectMapper.readValue(json, Map.class);

            failureCounts.remove(node.getId());

            long now = System.currentTimeMillis();
            redisTemplate.opsForValue().set("node:" + node.getId() + ":heartbeat",
                    String.valueOf(now), Duration.ofSeconds(60));

            Map<String, Object> gpu = (Map<String, Object>) response.get("gpu");
            if (gpu != null) {
                updateNodeGpuInfo(node, gpu);
            }

            if (node.getStatus() != NodeStatus.ONLINE) {
                node.setStatus(NodeStatus.ONLINE);
                nodeRegistry.register(node);
            }
            node.setLastHeartbeat(LocalDateTime.now());
            nodeRepository.save(node);

            Map<String, Object> tasks = (Map<String, Object>) response.get("tasks");
            if (tasks != null) {
                processTaskStates(node, tasks);
            }

            if (gpu != null) {
                dashboardHandler.pushNodeResourceUpdate(node.getId(), gpu);
            }
        } catch (Exception e) {
            int failures = failureCounts.merge(node.getId(), 1, Integer::sum);
            if (failures >= MAX_FAILURES && node.getStatus() == NodeStatus.ONLINE) {
                log.warn("Node {} unreachable after {} polls, marking OFFLINE", node.getName(), failures);
                markOffline(node);
            } else {
                log.debug("Poll failed for node {} ({}/{}): {}", node.getName(), failures, MAX_FAILURES, e.getMessage());
            }
        }
    }

    @SuppressWarnings("unchecked")
    private void processTaskStates(GpuNode node, Map<String, Object> tasks) {
        int activeTasks = 0;
        for (Map.Entry<String, Object> entry : tasks.entrySet()) {
            String taskId = entry.getKey();
            Map<String, Object> taskState = (Map<String, Object>) entry.getValue();
            String status = (String) taskState.get("status");

            if ("RUNNING".equals(status)) {
                activeTasks++;
                taskService.updateStatus(taskId, TaskStatus.RUNNING, null);

                Map<String, Object> progress = (Map<String, Object>) taskState.get("progress");
                if (progress != null) {
                    double percent = toDouble(progress.get("percent"));
                    int currentStep = toInt(progress.get("currentStep"));
                    int totalSteps = toInt(progress.get("totalSteps"));
                    taskService.updateProgress(taskId, percent, currentStep, totalSteps, 0);
                }

                Map<String, Object> metrics = (Map<String, Object>) taskState.get("metrics");
                if (metrics != null && !metrics.isEmpty()) {
                    taskService.updateMetrics(taskId, metrics);
                }
            } else if ("COMPLETED".equals(status)) {
                Map<String, Object> progress = (Map<String, Object>) taskState.get("progress");
                if (progress != null) {
                    int totalSteps = toInt(progress.get("totalSteps"));
                    taskService.updateProgress(taskId, 100.0, totalSteps, totalSteps, 0);
                }
                taskService.updateStatus(taskId, TaskStatus.COMPLETED, null);
            } else if ("FAILED".equals(status)) {
                String errorMsg = (String) taskState.get("errorMsg");
                taskService.updateStatus(taskId, TaskStatus.FAILED, errorMsg);
            }
        }
        node.setActiveTasks(activeTasks);
    }

    private void updateNodeGpuInfo(GpuNode node, Map<String, Object> gpu) {
        if (gpu.containsKey("gpuUtilization")) node.setGpuUtilization(toDouble(gpu.get("gpuUtilization")));
        if (gpu.containsKey("vramUsedMb")) node.setVramUsedMb(toLong(gpu.get("vramUsedMb")));
        if (gpu.containsKey("vramTotalMb")) node.setVramTotalMb(toLong(gpu.get("vramTotalMb")));
        if (gpu.containsKey("gpuTemp")) node.setGpuTemp(toDouble(gpu.get("gpuTemp")));

        String resKey = "node:" + node.getId() + ":resources";
        gpu.forEach((k, v) -> redisTemplate.opsForHash().put(resKey, k, String.valueOf(v)));
        redisTemplate.expire(resKey, Duration.ofSeconds(60));
    }

    private void markOffline(GpuNode node) {
        node.setStatus(NodeStatus.OFFLINE);
        nodeRepository.save(node);
        nodeRegistry.unregister(node.getId());
        redisTemplate.delete("node:" + node.getId() + ":heartbeat");
        redisTemplate.delete("node:" + node.getId() + ":resources");
        log.info("Node {} marked OFFLINE", node.getName());
    }

    private double toDouble(Object v) {
        if (v == null) return 0;
        return Double.parseDouble(v.toString());
    }

    private long toLong(Object v) {
        if (v == null) return 0;
        return Long.parseLong(v.toString());
    }

    private int toInt(Object v) {
        if (v == null) return 0;
        return (int) Double.parseDouble(v.toString());
    }
}
