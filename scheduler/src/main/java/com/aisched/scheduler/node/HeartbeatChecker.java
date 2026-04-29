package com.aisched.scheduler.node;

import com.aisched.scheduler.config.AppConfig;
import com.aisched.scheduler.model.entity.GpuNode;
import com.aisched.scheduler.model.enums.NodeStatus;
import com.aisched.scheduler.repository.GpuNodeRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;

@Component
public class HeartbeatChecker {

    private static final Logger log = LoggerFactory.getLogger(HeartbeatChecker.class);

    private final GpuNodeRepository nodeRepository;
    private final NodeRegistry nodeRegistry;
    private final RedisTemplate<String, String> redisTemplate;
    private final AppConfig appConfig;

    public HeartbeatChecker(GpuNodeRepository nodeRepository,
                            NodeRegistry nodeRegistry,
                            RedisTemplate<String, String> redisTemplate,
                            AppConfig appConfig) {
        this.nodeRepository = nodeRepository;
        this.nodeRegistry = nodeRegistry;
        this.redisTemplate = redisTemplate;
        this.appConfig = appConfig;
    }

    @Scheduled(fixedDelayString = "${aisched.node.heartbeat-check-interval-ms:10000}")
    public void checkHeartbeats() {
        int timeoutSec = appConfig.getNode().getHeartbeatTimeoutSeconds();
        List<GpuNode> onlineNodes = nodeRepository.findByStatus(NodeStatus.ONLINE);

        for (GpuNode node : onlineNodes) {
            String key = "node:" + node.getId() + ":heartbeat";
            String timestamp = redisTemplate.opsForValue().get(key);
            if (timestamp == null) {
                markOffline(node);
                continue;
            }
            try {
                long lastHb = Long.parseLong(timestamp);
                long elapsed = System.currentTimeMillis() - lastHb;
                if (elapsed > Duration.ofSeconds(timeoutSec).toMillis()) {
                    log.warn("Node {} heartbeat timeout, elapsed: {}ms", node.getName(), elapsed);
                    markOffline(node);
                }
            } catch (NumberFormatException e) {
                markOffline(node);
            }
        }
    }

    private void markOffline(GpuNode node) {
        node.setStatus(NodeStatus.OFFLINE);
        nodeRepository.save(node);
        nodeRegistry.unregister(node.getId());
        redisTemplate.delete("node:" + node.getId() + ":heartbeat");
        redisTemplate.delete("node:" + node.getId() + ":resources");
        log.info("Node {} marked OFFLINE", node.getName());
    }
}
