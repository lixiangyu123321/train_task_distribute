package com.aisched.scheduler.repository;

import com.aisched.scheduler.model.entity.GpuNode;
import com.aisched.scheduler.model.enums.NodeStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface GpuNodeRepository extends JpaRepository<GpuNode, String> {
    Optional<GpuNode> findByName(String name);
    List<GpuNode> findByStatus(NodeStatus status);
    List<GpuNode> findByStatusIn(List<NodeStatus> statuses);
}
