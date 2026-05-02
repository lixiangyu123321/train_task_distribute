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

        Map<String, Long> totalTasks = singlePassCounts();
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

    /** Single GROUP BY query instead of 6 individual count queries */
    private Map<String, Long> singlePassCounts() {
        Map<String, Long> counts = new HashMap<>();
        List<Object[]> rows = taskRepository.countByStatusGrouped();
        for (Object[] row : rows) {
            TaskStatus status = (TaskStatus) row[0];
            Long count = (Long) row[1];
            counts.put(status.name().toLowerCase(), count);
        }
        for (TaskStatus s : TaskStatus.values()) {
            counts.putIfAbsent(s.name().toLowerCase(), 0L);
        }
        return counts;
    }

}
