package com.aisched.scheduler.model.dto;

import java.util.List;
import java.util.Map;

public class DashboardSnapshot {

    private Map<String, Long> totalTasks;
    private List<NodeStatusDTO> nodes;
    private Double clusterUtilization;

    public Map<String, Long> getTotalTasks() { return totalTasks; }
    public void setTotalTasks(Map<String, Long> totalTasks) { this.totalTasks = totalTasks; }
    public List<NodeStatusDTO> getNodes() { return nodes; }
    public void setNodes(List<NodeStatusDTO> nodes) { this.nodes = nodes; }
    public Double getClusterUtilization() { return clusterUtilization; }
    public void setClusterUtilization(Double clusterUtilization) { this.clusterUtilization = clusterUtilization; }
}
