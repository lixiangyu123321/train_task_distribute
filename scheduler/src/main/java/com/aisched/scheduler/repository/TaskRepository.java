package com.aisched.scheduler.repository;

import com.aisched.scheduler.model.entity.Task;
import com.aisched.scheduler.model.enums.TaskStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface TaskRepository extends JpaRepository<Task, String> {
    Page<Task> findByStatus(TaskStatus status, Pageable pageable);
    List<Task> findByStatusInOrderByPriorityDescCreatedAtAsc(List<TaskStatus> statuses);
    List<Task> findByNodeId(String nodeId);
    long countByStatus(TaskStatus status);
}
