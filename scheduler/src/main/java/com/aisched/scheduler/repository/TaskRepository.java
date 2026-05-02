package com.aisched.scheduler.repository;

import com.aisched.scheduler.model.entity.Task;
import com.aisched.scheduler.model.enums.TaskStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface TaskRepository extends JpaRepository<Task, String> {
    Page<Task> findByStatus(TaskStatus status, Pageable pageable);
    List<Task> findByStatusInOrderByPriorityDescCreatedAtAsc(List<TaskStatus> statuses);
    List<Task> findByNodeId(String nodeId);
    long countByStatus(TaskStatus status);

    /** Single GROUP BY query instead of N individual count queries */
    @Query("SELECT t.status, COUNT(t) FROM Task t GROUP BY t.status")
    List<Object[]> countByStatusGrouped();
    List<Task> findByStatusAndNodeIdIsNull(TaskStatus status);
    List<Task> findAllByStatus(TaskStatus status);

    /** All tasks sorted by status (non-completed first) then by createdAt descending */
    @Query("SELECT t FROM Task t ORDER BY CASE WHEN t.status = 'COMPLETED' THEN 1 ELSE 0 END, t.createdAt DESC")
    Page<Task> findAllSorted(Pageable pageable);

    /** Tasks filtered by status, sorted by createdAt descending */
    @Query("SELECT t FROM Task t WHERE t.status = :status ORDER BY t.createdAt DESC")
    Page<Task> findByStatusSorted(@Param("status") TaskStatus status, Pageable pageable);

    List<Task> findByStatusInAndFinishedAtBefore(List<TaskStatus> statuses, LocalDateTime cutoff);

    @Query("SELECT t FROM Task t WHERE t.userId = :userId ORDER BY CASE WHEN t.status = 'COMPLETED' THEN 1 ELSE 0 END, t.createdAt DESC")
    Page<Task> findByUserIdSorted(@Param("userId") Long userId, Pageable pageable);

    @Query("SELECT t FROM Task t WHERE t.userId = :userId AND t.status = :status ORDER BY t.createdAt DESC")
    Page<Task> findByUserIdAndStatusSorted(@Param("userId") Long userId, @Param("status") TaskStatus status, Pageable pageable);
}
