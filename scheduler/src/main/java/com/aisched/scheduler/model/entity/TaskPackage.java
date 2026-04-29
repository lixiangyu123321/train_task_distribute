package com.aisched.scheduler.model.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "task_packages")
public class TaskPackage {

    @Id
    @Column(length = 36)
    private String id;

    @Column(name = "task_id", length = 36)
    private String taskId;

    @Column(name = "file_name", length = 255)
    private String fileName;

    @Column(name = "file_size")
    private Long fileSize;

    @Column(name = "file_path", length = 500)
    private String filePath;

    @Column(length = 20)
    @Enumerated(EnumType.STRING)
    private PkgStatus status = PkgStatus.UPLOADING;

    @Column(name = "yaml_data", columnDefinition = "JSON")
    private String yamlData;

    @Column(name = "uploaded_at")
    private LocalDateTime uploadedAt = LocalDateTime.now();

    public enum PkgStatus {
        UPLOADING, READY, TRANSFERRING, EXTRACTED, ERROR
    }

    public TaskPackage() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getTaskId() { return taskId; }
    public void setTaskId(String taskId) { this.taskId = taskId; }
    public String getFileName() { return fileName; }
    public void setFileName(String fileName) { this.fileName = fileName; }
    public Long getFileSize() { return fileSize; }
    public void setFileSize(Long fileSize) { this.fileSize = fileSize; }
    public String getFilePath() { return filePath; }
    public void setFilePath(String filePath) { this.filePath = filePath; }
    public PkgStatus getStatus() { return status; }
    public void setStatus(PkgStatus status) { this.status = status; }
    public String getYamlData() { return yamlData; }
    public void setYamlData(String yamlData) { this.yamlData = yamlData; }
    public LocalDateTime getUploadedAt() { return uploadedAt; }
    public void setUploadedAt(LocalDateTime uploadedAt) { this.uploadedAt = uploadedAt; }
}
