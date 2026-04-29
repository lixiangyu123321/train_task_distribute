package com.aisched.scheduler.scheduler;

import com.aisched.scheduler.model.entity.GpuNode;
import org.springframework.stereotype.Component;
import java.util.Comparator;
import java.util.List;

/**
 * 最少负载均衡实现：score = activeTasks × 10 + gpuUtilization × 0.6 + memoryUtilization × 0.4
 */
@Component
public class LeastLoadedBalancer implements LoadBalancer {

    @Override
    public GpuNode select(List<GpuNode> candidates) {
        if (candidates == null || candidates.isEmpty()) {
            return null;
        }
        return candidates.stream()
                .min(Comparator.comparingDouble(this::calculateScore))
                .orElse(null);
    }

    private double calculateScore(GpuNode node) {
        int activeTasks = node.getActiveTasks() != null ? node.getActiveTasks() : 0;
        double gpuUtil = node.getGpuUtilization() != null ? node.getGpuUtilization() : 0;
        double memUtil = node.getMemoryUtil() != null ? node.getMemoryUtil() : 0;
        return activeTasks * 10.0 + gpuUtil * 0.6 + memUtil * 0.4;
    }
}
