package com.aisched.scheduler.repository;

import com.aisched.scheduler.model.entity.ScheduledTask;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ScheduledTaskRepository extends JpaRepository<ScheduledTask, String> {
    List<ScheduledTask> findByEnabledTrue();
    List<ScheduledTask> findByUserId(Long userId);
}
