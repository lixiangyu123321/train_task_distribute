package com.aisched.scheduler.service;

import com.aisched.scheduler.model.entity.Task;
import com.aisched.scheduler.model.entity.TaskArchive;
import com.aisched.scheduler.model.enums.TaskStatus;
import com.aisched.scheduler.repository.TaskArchiveRepository;
import com.aisched.scheduler.repository.TaskRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class TaskArchiveService {

    private static final Logger log = LoggerFactory.getLogger(TaskArchiveService.class);
    private static final int BATCH_SIZE = 500;
    private static final List<TaskStatus> TERMINAL = List.of(
            TaskStatus.COMPLETED, TaskStatus.FAILED, TaskStatus.CANCELLED);

    private final TaskRepository taskRepository;
    private final TaskArchiveRepository archiveRepository;

    public TaskArchiveService(TaskRepository taskRepository, TaskArchiveRepository archiveRepository) {
        this.taskRepository = taskRepository;
        this.archiveRepository = archiveRepository;
    }

    @Scheduled(cron = "0 0 3 * * *")
    @Transactional
    public void archiveOldTasks() {
        LocalDateTime cutoff = LocalDateTime.now().minusDays(30);
        List<Task> old = taskRepository.findByStatusInAndFinishedAtBefore(TERMINAL, cutoff);
        if (old.isEmpty()) {
            log.debug("No tasks to archive");
            return;
        }

        int total = old.size();
        int archived = 0;
        for (int i = 0; i < old.size(); i += BATCH_SIZE) {
            List<Task> batch = old.subList(i, Math.min(i + BATCH_SIZE, old.size()));
            List<TaskArchive> archives = batch.stream()
                    .map(TaskArchive::fromTask)
                    .toList();
            archiveRepository.saveAll(archives);
            taskRepository.deleteAll(batch);
            archived += batch.size();
        }

        log.info("Archived {} tasks (finished before {})", archived, cutoff);
    }
}
