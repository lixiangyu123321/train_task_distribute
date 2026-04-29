package com.aisched.scheduler.service;

import com.aisched.scheduler.model.dto.DashboardSnapshot;
import com.aisched.scheduler.model.dto.NodeStatusDTO;
import com.aisched.scheduler.model.entity.Task;
import com.aisched.scheduler.model.enums.TaskStatus;
import com.aisched.scheduler.repository.GpuNodeRepository;
import com.aisched.scheduler.repository.TaskRepository;
import org.springframework.stereotype.Service;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class MonitorService {

    private final TaskRepository taskRepository;
    private final GpuNodeRepository nodeRepository;
    private final NodeService nodeService;

    public MonitorService(TaskRepository taskRepository,
                          GpuNodeRepository nodeRepository,
                          NodeService nodeService) {
        this.taskRepository = taskRepository;
        this.nodeRepository = nodeRepository;
        this.nodeService = nodeService;
    }

    public DashboardSnapshot getDashboardSnapshot() {
        DashboardSnapshot snapshot = new DashboardSnapshot();

        Map<String, Long> totalTasks = new HashMap<>();
        totalTasks.put("pending", taskRepository.countByStatus(TaskStatus.PENDING));
        totalTasks.put("queued", taskRepository.countByStatus(TaskStatus.QUEUED));
        totalTasks.put("running", taskRepository.countByStatus(TaskStatus.RUNNING));
        totalTasks.put("completed", taskRepository.countByStatus(TaskStatus.COMPLETED));
        totalTasks.put("failed", taskRepository.countByStatus(TaskStatus.FAILED));
        snapshot.setTotalTasks(totalTasks);

        List<NodeStatusDTO> nodes = nodeService.listAllNodes();
        snapshot.setNodes(nodes);

        double clusterUtil = nodes.stream()
                .filter(n -> n.getResources() != null)
                .mapToDouble(n -> {
                    Object gpu = n.getResources().get("gpuUtilization");
                    return gpu != null ? ((Number) gpu).doubleValue() : 0;
                })
                .average()
                .orElse(0.0);
        snapshot.setClusterUtilization(Math.round(clusterUtil * 10.0) / 10.0);

        return snapshot;
    }
}
