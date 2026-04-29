package com.aisched.scheduler.repository;

import com.aisched.scheduler.model.entity.TaskPackage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface TaskPackageRepository extends JpaRepository<TaskPackage, String> {
    Optional<TaskPackage> findByTaskId(String taskId);
}
