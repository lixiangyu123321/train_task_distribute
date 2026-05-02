package com.aisched.scheduler.service;

import com.aisched.scheduler.config.AppConfig;
import com.aisched.scheduler.model.entity.Task;
import com.aisched.scheduler.model.entity.TaskPackage;
import com.aisched.scheduler.repository.TaskPackageRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.yaml.snakeyaml.Yaml;
import java.io.*;
import java.nio.file.*;
import java.util.*;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

@Service
public class TransferService {

    private static final Logger log = LoggerFactory.getLogger(TransferService.class);
    private static final Set<String> TRAIN_FILES = Set.of("train.py", "train.sh");
    private static final Set<String> FINETUNE_FILES = Set.of("finetune.py", "finetune.sh", "lora.py");
    private static final Set<String> EVAL_FILES = Set.of("eval.py", "evaluate.py", "eval.sh");

    @Value("${server.port:8080}")
    private int serverPort;

    private final AppConfig appConfig;
    private final TaskPackageRepository pkgRepo;

    public TransferService(AppConfig appConfig, TaskPackageRepository pkgRepo) {
        this.appConfig = appConfig;
        this.pkgRepo = pkgRepo;
    }

    /** 接收上传 ZIP，存储并解析 */
    @Transactional
    public TaskPackage receiveUpload(String originalFilename, byte[] data) throws IOException {
        String pkgId = UUID.randomUUID().toString();
        Path uploadDir = Path.of(appConfig.getTransfer().getUploadDir());
        Files.createDirectories(uploadDir);
        Path filePath = uploadDir.resolve(pkgId + ".zip");
        Files.write(filePath, data);

        List<String> entries = listZipEntries(data);

        TaskPackage pkg = new TaskPackage();
        pkg.setId(pkgId);
        pkg.setFileName(originalFilename);
        pkg.setFileSize((long) data.length);
        pkg.setFilePath(filePath.toString());
        pkg.setStatus(TaskPackage.PkgStatus.UPLOADING);

        // 解析 task.yaml 并转为 JSON 存储
        String yamlContent = extractYamlFromZip(data, "task.yaml");
        if (yamlContent != null) {
            Yaml yaml = new Yaml();
            Object parsed = yaml.load(yamlContent);
            if (parsed != null) {
                com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
                try {
                    pkg.setYamlData(mapper.writeValueAsString(parsed));
                } catch (Exception e) {
                    log.warn("Failed to convert yaml to json", e);
                }
            }
        }

        pkg.setStatus(TaskPackage.PkgStatus.READY);
        pkgRepo.save(pkg);
        log.info("Package stored: {} ({} bytes, {} entries)", pkgId, data.length, entries.size());
        return pkg;
    }

    /** 基于 ZIP 内文件名自动检测任务类型 */
    public Task.TaskType detectTaskType(List<String> zipEntries) {
        boolean hasTrain = zipEntries.stream().anyMatch(e -> TRAIN_FILES.contains(new File(e).getName()));
        boolean hasFinetune = zipEntries.stream().anyMatch(e -> FINETUNE_FILES.contains(new File(e).getName()));
        boolean hasEval = zipEntries.stream().anyMatch(e -> EVAL_FILES.contains(new File(e).getName()));

        int count = (hasTrain ? 1 : 0) + (hasFinetune ? 1 : 0) + (hasEval ? 1 : 0);
        if (count > 1) return Task.TaskType.FULL;
        if (hasTrain) return Task.TaskType.TRAIN;
        if (hasFinetune) return Task.TaskType.FINETUNE;
        if (hasEval) return Task.TaskType.EVAL;
        return Task.TaskType.TRAIN; // 默认
    }

    /** 解析 task.yaml 中的字段 */
    @SuppressWarnings("unchecked")
    public Map<String, Object> parseYamlData(byte[] zipData) {
        String yamlContent = extractYamlFromZip(zipData, "task.yaml");
        if (yamlContent == null) return Map.of();
        try {
            Yaml yaml = new Yaml();
            Map<String, Object> parsed = yaml.load(yamlContent);
            return parsed != null ? parsed : Map.of();
        } catch (Exception e) {
            log.warn("Failed to parse task.yaml: {}", e.getMessage());
            return Map.of();
        }
    }

    /** 读取存储的 ZIP 文件 */
    public byte[] readPackageFile(String packageId) throws IOException {
        TaskPackage pkg = pkgRepo.findById(packageId)
                .orElseThrow(() -> new IllegalArgumentException("Package not found: " + packageId));
        return Files.readAllBytes(Path.of(pkg.getFilePath()));
    }

    /** 获取存储的 ZIP 文件路径 */
    public Path getPackageFilePath(String packageId) {
        TaskPackage pkg = pkgRepo.findById(packageId)
                .orElseThrow(() -> new IllegalArgumentException("Package not found: " + packageId));
        return Path.of(pkg.getFilePath());
    }

    /** 获取下载 URL（Scheduler 对外地址） */
    public String getDownloadUrl(String packageId) {
        return "http://" + appConfig.getPublicIp() + ":" + serverPort + "/api/v1/transfer/download/" + packageId;
    }

    private List<String> listZipEntries(byte[] data) throws IOException {
        List<String> names = new ArrayList<>();
        try (ZipInputStream zis = new ZipInputStream(new ByteArrayInputStream(data))) {
            ZipEntry entry;
            while ((entry = zis.getNextEntry()) != null) {
                names.add(entry.getName());
                zis.closeEntry();
            }
        }
        return names;
    }

    private String extractYamlFromZip(byte[] data, String targetName) {
        try (ZipInputStream zis = new ZipInputStream(new ByteArrayInputStream(data))) {
            ZipEntry entry;
            while ((entry = zis.getNextEntry()) != null) {
                if (entry.getName().equals(targetName) || entry.getName().endsWith("/" + targetName)) {
                    ByteArrayOutputStream bos = new ByteArrayOutputStream();
                    zis.transferTo(bos);
                    zis.closeEntry();
                    return bos.toString();
                }
                zis.closeEntry();
            }
        } catch (IOException e) {
            log.debug("No {} found in ZIP", targetName);
        }
        return null;
    }
}
