package com.aisched.scheduler.service;

import com.aisched.scheduler.model.entity.ScheduledTask;
import com.aisched.scheduler.model.entity.TaskTemplate;
import com.aisched.scheduler.repository.ScheduledTaskRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.scheduling.support.CronExpression;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class TaskSchedulerService {

    private static final Logger log = LoggerFactory.getLogger(TaskSchedulerService.class);

    private final ScheduledTaskRepository schedRepo;
    private final TaskTemplateService templateService;
    private final TaskService taskService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public TaskSchedulerService(ScheduledTaskRepository schedRepo,
                                TaskTemplateService templateService,
                                TaskService taskService) {
        this.schedRepo = schedRepo;
        this.templateService = templateService;
        this.taskService = taskService;
    }

    public List<ScheduledTask> listAll() {
        return schedRepo.findAll();
    }

    public List<ScheduledTask> listByUser(Long userId) {
        return schedRepo.findByUserId(userId);
    }

    public ScheduledTask getById(String id) {
        return schedRepo.findById(id).orElseThrow(() ->
                new IllegalArgumentException("Scheduled task not found: " + id));
    }

    @Transactional
    public ScheduledTask create(String templateId, Long userId, String taskName, String cronExpression) {
        CronExpression cron = CronExpression.parse(cronExpression);
        ScheduledTask st = new ScheduledTask();
        st.setId(UUID.randomUUID().toString());
        st.setTemplateId(templateId);
        st.setUserId(userId);
        st.setTaskName(taskName);
        st.setCronExpression(cronExpression);
        st.setEnabled(true);
        st.setCreatedAt(LocalDateTime.now());
        st.setNextRunAt(cron.next(LocalDateTime.now()));
        return schedRepo.save(st);
    }

    @Transactional
    public ScheduledTask update(String id, String templateId, String taskName, String cronExpression) {
        ScheduledTask st = getById(id);
        if (templateId != null) st.setTemplateId(templateId);
        if (taskName != null) st.setTaskName(taskName);
        if (cronExpression != null) {
            CronExpression cron = CronExpression.parse(cronExpression);
            st.setCronExpression(cronExpression);
            st.setNextRunAt(cron.next(LocalDateTime.now()));
        }
        return schedRepo.save(st);
    }

    @Transactional
    public void delete(String id) {
        schedRepo.deleteById(id);
    }

    @Transactional
    public ScheduledTask toggle(String id) {
        ScheduledTask st = getById(id);
        st.setEnabled(!Boolean.TRUE.equals(st.getEnabled()));
        if (Boolean.TRUE.equals(st.getEnabled())) {
            CronExpression cron = CronExpression.parse(st.getCronExpression());
            st.setNextRunAt(cron.next(LocalDateTime.now()));
        }
        return schedRepo.save(st);
    }

    @Scheduled(fixedDelay = 60000)
    @Transactional
    @SuppressWarnings("unchecked")
    public void checkAndRun() {
        LocalDateTime now = LocalDateTime.now();
        List<ScheduledTask> due = schedRepo.findByEnabledTrue();

        for (ScheduledTask st : due) {
            if (st.getNextRunAt() == null || st.getNextRunAt().isAfter(now)) continue;

            try {
                TaskTemplate tpl = templateService.getById(st.getTemplateId());
                Map<String, Object> params = null;
                if (tpl.getDefaultParams() != null) {
                    params = objectMapper.readValue(tpl.getDefaultParams(), Map.class);
                }
                String name = st.getTaskName() != null ? st.getTaskName() : tpl.getName();
                taskService.submit(name, tpl.getType().name(), null, null, null,
                        params, 0, st.getUserId());

                st.setLastRunAt(now);
                CronExpression cron = CronExpression.parse(st.getCronExpression());
                st.setNextRunAt(cron.next(now));
                schedRepo.save(st);

                log.info("Scheduled task fired: {} → template {}", st.getId(), tpl.getName());
            } catch (Exception e) {
                log.warn("Failed to execute scheduled task {}: {}", st.getId(), e.getMessage());
            }
        }
    }
}
