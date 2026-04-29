package com.aisched.scheduler.model.dto;

import com.aisched.scheduler.model.enums.NodeStatus;
import java.time.LocalDateTime;
import java.util.Map;

public class NodeStatusDTO {

    private String nodeId;
    private String name;
    private NodeStatus status;
    private String publicIp;
    private Integer apiPort;
    private String gpuModel;
    private Integer gpuCount;
    private Long vramTotalMb;
    private Map<String, Object> resources;
    private LocalDateTime lastHeartbeat;

    public String getNodeId() { return nodeId; }
    public void setNodeId(String nodeId) { this.nodeId = nodeId; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public NodeStatus getStatus() { return status; }
    public void setStatus(NodeStatus status) { this.status = status; }
    public String getPublicIp() { return publicIp; }
    public void setPublicIp(String publicIp) { this.publicIp = publicIp; }
    public Integer getApiPort() { return apiPort; }
    public void setApiPort(Integer apiPort) { this.apiPort = apiPort; }
    public String getGpuModel() { return gpuModel; }
    public void setGpuModel(String gpuModel) { this.gpuModel = gpuModel; }
    public Integer getGpuCount() { return gpuCount; }
    public void setGpuCount(Integer gpuCount) { this.gpuCount = gpuCount; }
    public Long getVramTotalMb() { return vramTotalMb; }
    public void setVramTotalMb(Long vramTotalMb) { this.vramTotalMb = vramTotalMb; }
    public Map<String, Object> getResources() { return resources; }
    public void setResources(Map<String, Object> resources) { this.resources = resources; }
    public LocalDateTime getLastHeartbeat() { return lastHeartbeat; }
    public void setLastHeartbeat(LocalDateTime lastHeartbeat) { this.lastHeartbeat = lastHeartbeat; }
}
