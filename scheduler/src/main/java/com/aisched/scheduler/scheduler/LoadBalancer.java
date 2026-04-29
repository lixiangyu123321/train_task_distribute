package com.aisched.scheduler.scheduler;

import com.aisched.scheduler.model.entity.GpuNode;
import java.util.List;

/**
 * 负载均衡策略接口 — 后续可扩展多种策略实现。
 */
public interface LoadBalancer {

    /**
     * 从候选节点中选择最优节点
     * @param candidates 可用的 GPU 节点列表
     * @return 选中的节点，若无可用节点返回 null
     */
    GpuNode select(List<GpuNode> candidates);
}
