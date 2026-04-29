package com.aisched.scheduler.model.entity;

import com.aisched.scheduler.model.enums.NodeStatus;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "gpu_nodes")
public class GpuNode {

    @Id
    @Column(length = 36)
    private String id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(name = "public_ip", nullable = false, length = 45)
    private String publicIp;

    @Column(name = "api_port")
    private Integer apiPort = 9000;

    @Column(name = "gpu_model", length = 100)
    private String gpuModel;

    @Column(name = "gpu_count")
    private Integer gpuCount;

    @Column(name = "vram_total_mb")
    private Long vramTotalMb;

    @Column(nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private NodeStatus status = NodeStatus.OFFLINE;

    @Column(name = "gpu_utilization")
    private Double gpuUtilization = 0.0;

    @Column(name = "memory_util")
    private Double memoryUtil = 0.0;

    @Column(name = "vram_used_mb")
    private Long vramUsedMb = 0L;

    @Column(name = "active_tasks")
    private Integer activeTasks = 0;

    @Column(name = "gpu_temp")
    private Double gpuTemp;

    @Column(name = "last_heartbeat")
    private LocalDateTime lastHeartbeat;

    @Column(name = "registered_at")
    private LocalDateTime registeredAt = LocalDateTime.now();

    public GpuNode() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
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
    public NodeStatus getStatus() { return status; }
    public void setStatus(NodeStatus status) { this.status = status; }
    public Double getGpuUtilization() { return gpuUtilization; }
    public void setGpuUtilization(Double gpuUtilization) { this.gpuUtilization = gpuUtilization; }
    public Double getMemoryUtil() { return memoryUtil; }
    public void setMemoryUtil(Double memoryUtil) { this.memoryUtil = memoryUtil; }
    public Long getVramUsedMb() { return vramUsedMb; }
    public void setVramUsedMb(Long vramUsedMb) { this.vramUsedMb = vramUsedMb; }
    public Integer getActiveTasks() { return activeTasks; }
    public void setActiveTasks(Integer activeTasks) { this.activeTasks = activeTasks; }
    public Double getGpuTemp() { return gpuTemp; }
    public void setGpuTemp(Double gpuTemp) { this.gpuTemp = gpuTemp; }
    public LocalDateTime getLastHeartbeat() { return lastHeartbeat; }
    public void setLastHeartbeat(LocalDateTime lastHeartbeat) { this.lastHeartbeat = lastHeartbeat; }
    public LocalDateTime getRegisteredAt() { return registeredAt; }
    public void setRegisteredAt(LocalDateTime registeredAt) { this.registeredAt = registeredAt; }
}
