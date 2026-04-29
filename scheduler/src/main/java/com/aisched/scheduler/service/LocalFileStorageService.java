package com.aisched.scheduler.service;

import com.aisched.scheduler.config.AppConfig;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import java.io.*;
import java.nio.file.*;
import java.util.*;
import java.util.stream.Collectors;

/**
 * 本地文件系统实现 — 使用 files/ 目录存储训练包。
 * 后续切换为 MinioStorageService 或 S3StorageService 即可。
 */
@Service
public class LocalFileStorageService implements ObjectStorageService {

    private static final Logger log = LoggerFactory.getLogger(LocalFileStorageService.class);
    private final Path baseDir;

    public LocalFileStorageService(AppConfig config) {
        this.baseDir = Path.of(config.getTransfer().getUploadDir()).toAbsolutePath();
        try { Files.createDirectories(baseDir); } catch (IOException e) { /* ignore */ }
    }

    @Override
    public String upload(String key, byte[] data, Map<String, String> metadata) {
        try {
            Path target = baseDir.resolve(key);
            Files.createDirectories(target.getParent());
            Files.write(target, data);
            if (metadata != null && !metadata.isEmpty()) {
                Path metaPath = baseDir.resolve(key + ".meta");
                Properties p = new Properties();
                p.putAll(metadata);
                try (OutputStream os = Files.newOutputStream(metaPath)) {
                    p.store(os, "metadata");
                }
            }
            log.info("Stored: {} ({} bytes)", key, data.length);
            return key;
        } catch (IOException e) {
            throw new RuntimeException("Failed to store: " + key, e);
        }
    }

    @Override
    public byte[] download(String key) {
        try {
            return Files.readAllBytes(baseDir.resolve(key));
        } catch (IOException e) {
            throw new RuntimeException("Failed to read: " + key, e);
        }
    }

    @Override
    public List<StorageObject> list(String prefix) {
        try {
            Path prefixPath = baseDir.resolve(prefix != null ? prefix : "");
            if (!Files.exists(prefixPath)) return List.of();
            return Files.walk(prefixPath)
                    .filter(Files::isRegularFile)
                    .filter(p -> !p.getFileName().toString().endsWith(".meta"))
                    .map(p -> {
                        try {
                            return new StorageObject(
                                    baseDir.relativize(p).toString().replace("\\", "/"),
                                    Files.size(p),
                                    Files.getLastModifiedTime(p).toString()
                            );
                        } catch (IOException e) { return null; }
                    })
                    .filter(Objects::nonNull)
                    .collect(Collectors.toList());
        } catch (IOException e) {
            return List.of();
        }
    }

    @Override
    public void delete(String key) {
        try {
            Files.deleteIfExists(baseDir.resolve(key));
            Files.deleteIfExists(baseDir.resolve(key + ".meta"));
        } catch (IOException e) {
            log.warn("Failed to delete: {}", key);
        }
    }

    @Override
    public String getAccessUrl(String key, int expireSeconds) {
        // 本地存储直接返回下载 API 路径
        return "/api/v1/transfer/download/" + key;
    }

    @Override
    public boolean exists(String key) {
        return Files.exists(baseDir.resolve(key));
    }

    @Override
    public Map<String, String> getMetadata(String key) {
        try {
            Path metaPath = baseDir.resolve(key + ".meta");
            if (!Files.exists(metaPath)) return Map.of();
            Properties p = new Properties();
            try (InputStream is = Files.newInputStream(metaPath)) {
                p.load(is);
            }
            Map<String, String> result = new LinkedHashMap<>();
            p.forEach((k, v) -> result.put((String) k, (String) v));
            return result;
        } catch (IOException e) {
            return Map.of();
        }
    }
}
