package com.aisched.scheduler.service;

import com.aisched.scheduler.model.entity.Task;
import com.aisched.scheduler.model.entity.TaskTemplate;
import com.aisched.scheduler.repository.TaskTemplateRepository;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class TaskTemplateService {

    private final TaskTemplateRepository repo;

    public TaskTemplateService(TaskTemplateRepository repo) {
        this.repo = repo;
    }

    public List<TaskTemplate> listAll() {
        return repo.findAll();
    }

    public List<TaskTemplate> listByType(Task.TaskType type) {
        return repo.findByType(type);
    }

    public TaskTemplate getById(String id) {
        return repo.findById(id).orElseThrow(() ->
                new IllegalArgumentException("Template not found: " + id));
    }

    public TaskTemplate create(String name, String type, String description, String defaultParams) {
        TaskTemplate t = new TaskTemplate();
        t.setId(UUID.randomUUID().toString());
        t.setName(name);
        t.setType(Task.TaskType.valueOf(type.toUpperCase()));
        t.setDescription(description);
        t.setDefaultParams(defaultParams);
        t.setCreatedAt(LocalDateTime.now());
        t.setUpdatedAt(LocalDateTime.now());
        return repo.save(t);
    }

    public TaskTemplate update(String id, String name, String type, String description, String defaultParams) {
        TaskTemplate t = getById(id);
        if (name != null) t.setName(name);
        if (type != null) t.setType(Task.TaskType.valueOf(type.toUpperCase()));
        if (description != null) t.setDescription(description);
        if (defaultParams != null) t.setDefaultParams(defaultParams);
        t.setUpdatedAt(LocalDateTime.now());
        return repo.save(t);
    }

    public void delete(String id) {
        repo.deleteById(id);
    }
}
