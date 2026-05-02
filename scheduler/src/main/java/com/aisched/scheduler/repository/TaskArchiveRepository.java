package com.aisched.scheduler.repository;

import com.aisched.scheduler.model.entity.TaskArchive;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TaskArchiveRepository extends JpaRepository<TaskArchive, String> {
}
