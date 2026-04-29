package com.aisched.scheduler.service;

import com.aisched.scheduler.config.AppConfig;
import com.aisched.scheduler.model.dto.NodeStatusDTO;
import com.aisched.scheduler.model.entity.GpuNode;
import com.aisched.scheduler.model.enums.NodeStatus;
import com.aisched.scheduler.node.NodeRegistry;
import com.aisched.scheduler.repository.GpuNodeRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class NodeService {

    private static final Logger log = LoggerFactory.getLogger(NodeService.class);

    private final GpuNodeRepository nodeRepository;
    private final NodeRegistry nodeRegistry;
    private final RedisTemplate<String, String> redisTemplate;
    private final AppConfig appConfig;

    public NodeService(GpuNodeRepository nodeRepository,
                       NodeRegistry nodeRegistry,
                       RedisTemplate<String, String> redisTemplate,
                       AppConfig appConfig) {
        this.nodeRepository = nodeRepository;
        this.nodeRegistry = nodeRegistry;
        this.redisTemplate = redisTemplate;
        this.appConfig = appConfig;
    }

    @Transactional
    public GpuNode register(String name, String publicIp, int apiPort,
                             String gpuModel, int gpuCount, long vramTotalMb) {
        // 检查是否已注册同名节点
        var existing = nodeRepository.findByName(name);
        if (existing.isPresent()) {
            GpuNode node = existing.get();
            node.setPublicIp(publicIp);
            node.setApiPort(apiPort);
            node.setGpuModel(gpuModel);
            node.setGpuCount(gpuCount);
            node.setVramTotalMb(vramTotalMb);
            node.setStatus(NodeStatus.ONLINE);
            node.setLastHeartbeat(LocalDateTime.now());
            nodeRepository.save(node);
            nodeRegistry.register(node);
            log.info("Node re-registered: {}", name);
            return node;
        }

        GpuNode node = new GpuNode();
        node.setId(UUID.randomUUID().toString());
        node.setName(name);
        node.setPublicIp(publicIp);
        node.setApiPort(apiPort);
        node.setGpuModel(gpuModel);
        node.setGpuCount(gpuCount);
        node.setVramTotalMb(vramTotalMb);
        node.setStatus(NodeStatus.ONLINE);
        node.setLastHeartbeat(LocalDateTime.now());
        nodeRepository.save(node);
        nodeRegistry.register(node);
        log.info("Node registered: {}", name);
        return node;
    }

    public void heartbeat(String nodeId, Map<String, Object> resources) {
        GpuNode node = nodeRepository.findById(nodeId).orElse(null);
        if (node == null) {
            log.warn("Heartbeat from unknown node: {}", nodeId);
            return;
        }

        long now = System.currentTimeMillis();
        redisTemplate.opsForValue().set("node:" + nodeId + ":heartbeat",
                String.valueOf(now), Duration.ofSeconds(appConfig.getNode().getHeartbeatTimeoutSeconds() + 10));

        // 更新资源信息到 Redis
        String key = "node:" + nodeId + ":resources";
        resources.forEach((k, v) ->
                redisTemplate.opsForHash().put(key, k, String.valueOf(v)));
        redisTemplate.expire(key, Duration.ofSeconds(appConfig.getNode().getHeartbeatTimeoutSeconds() + 10));

        // 更新 DB 资源字段
        if (resources.containsKey("gpuUtilization")) node.setGpuUtilization(toDouble(resources.get("gpuUtilization")));
        if (resources.containsKey("memoryUtilization")) node.setMemoryUtil(toDouble(resources.get("memoryUtilization")));
        if (resources.containsKey("vramUsedMb")) node.setVramUsedMb(toLong(resources.get("vramUsedMb")));
        if (resources.containsKey("activeTasks")) node.setActiveTasks(toInt(resources.get("activeTasks")));
        if (resources.containsKey("gpuTemp")) node.setGpuTemp(toDouble(resources.get("gpuTemp")));

        node.setLastHeartbeat(LocalDateTime.now());
        if (node.getStatus() != NodeStatus.ONLINE) {
            node.setStatus(NodeStatus.ONLINE);
        }
        nodeRepository.save(node);
    }

    public List<NodeStatusDTO> listAllNodes() {
        return nodeRepository.findAll().stream().map(this::toDTO).collect(Collectors.toList());
    }

    public List<GpuNode> getOnlineNodes() {
        return nodeRepository.findByStatus(NodeStatus.ONLINE);
    }

    public NodeStatusDTO getNode(String nodeId) {
        return nodeRepository.findById(nodeId).map(this::toDTO)
                .orElseThrow(() -> new IllegalArgumentException("节点不存在: " + nodeId));
    }

    private NodeStatusDTO toDTO(GpuNode node) {
        NodeStatusDTO dto = new NodeStatusDTO();
        dto.setNodeId(node.getId());
        dto.setName(node.getName());
        dto.setStatus(node.getStatus());
        dto.setPublicIp(node.getPublicIp());
        dto.setApiPort(node.getApiPort());
        dto.setGpuModel(node.getGpuModel());
        dto.setGpuCount(node.getGpuCount());
        dto.setVramTotalMb(node.getVramTotalMb());
        dto.setResources(Map.of(
                "gpuUtilization", (Object) node.getGpuUtilization(),
                "memoryUtil", node.getMemoryUtil(),
                "vramUsedMb", node.getVramUsedMb(),
                "activeTasks", node.getActiveTasks(),
                "gpuTemp", node.getGpuTemp() != null ? node.getGpuTemp() : 0
        ));
        dto.setLastHeartbeat(node.getLastHeartbeat());
        return dto;
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
        return Integer.parseInt(v.toString());
    }
}
