package com.aisched.scheduler.repository;

import com.aisched.scheduler.model.entity.Task;
import com.aisched.scheduler.model.entity.TaskTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface TaskTemplateRepository extends JpaRepository<TaskTemplate, String> {
    List<TaskTemplate> findByType(Task.TaskType type);
    Optional<TaskTemplate> findByName(String name);
}
