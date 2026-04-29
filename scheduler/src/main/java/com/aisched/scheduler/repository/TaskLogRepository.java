package com.aisched.scheduler.repository;

import com.aisched.scheduler.model.entity.TaskLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface TaskLogRepository extends JpaRepository<TaskLog, Long> {
    List<TaskLog> findByTaskIdOrderByCreatedAtAsc(String taskId);
    void deleteByTaskId(String taskId);
}
