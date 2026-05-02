package com.aisched.scheduler.controller;

import com.aisched.scheduler.model.entity.Task;
import com.aisched.scheduler.model.entity.TaskTemplate;
import com.aisched.scheduler.service.TaskTemplateService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/templates")
public class TaskTemplateController {

    private final TaskTemplateService templateService;

    public TaskTemplateController(TaskTemplateService templateService) {
        this.templateService = templateService;
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> listTemplates(
            @RequestParam(required = false) String type) {
        List<TaskTemplate> list = type != null
                ? templateService.listByType(Task.TaskType.valueOf(type.toUpperCase()))
                : templateService.listAll();
        return ResponseEntity.ok(buildResponse(200, "success", list));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getTemplate(@PathVariable String id) {
        TaskTemplate t = templateService.getById(id);
        return ResponseEntity.ok(buildResponse(200, "success", t));
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> createTemplate(@RequestBody Map<String, Object> body) {
        String name = (String) body.get("name");
        String type = (String) body.get("type");
        String description = (String) body.get("description");
        String defaultParams = body.get("defaultParams") != null
                ? new com.fasterxml.jackson.databind.ObjectMapper().valueToTree(body.get("defaultParams")).toString()
                : null;
        TaskTemplate t = templateService.create(name, type, description, defaultParams);
        return ResponseEntity.status(HttpStatus.CREATED).body(buildResponse(201, "模板已创建", t));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Map<String, Object>> updateTemplate(
            @PathVariable String id,
            @RequestBody Map<String, Object> body) {
        String name = (String) body.get("name");
        String type = (String) body.get("type");
        String description = (String) body.get("description");
        String defaultParams = body.get("defaultParams") != null
                ? new com.fasterxml.jackson.databind.ObjectMapper().valueToTree(body.get("defaultParams")).toString()
                : null;
        TaskTemplate t = templateService.update(id, name, type, description, defaultParams);
        return ResponseEntity.ok(buildResponse(200, "模板已更新", t));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Object>> deleteTemplate(@PathVariable String id) {
        templateService.delete(id);
        return ResponseEntity.ok(buildResponse(200, "模板已删除", null));
    }

    private Map<String, Object> buildResponse(int code, String message, Object data) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("code", code);
        body.put("message", message);
        body.put("data", data);
        body.put("timestamp", LocalDateTime.now().toString());
        return body;
    }
}
