package com.aisched.scheduler.node;

import com.aisched.scheduler.model.entity.GpuNode;
import org.springframework.stereotype.Component;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 节点注册表（内存缓存），加速节点查找。
 */
@Component
public class NodeRegistry {

    private final Map<String, GpuNode> nodes = new ConcurrentHashMap<>();

    public void register(GpuNode node) {
        nodes.put(node.getId(), node);
    }

    public void unregister(String nodeId) {
        nodes.remove(nodeId);
    }

    public Optional<GpuNode> get(String nodeId) {
        return Optional.ofNullable(nodes.get(nodeId));
    }

    public java.util.Collection<GpuNode> getAll() {
        return nodes.values();
    }

    public int count() {
        return nodes.size();
    }
}
