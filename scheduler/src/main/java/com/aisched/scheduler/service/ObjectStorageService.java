package com.aisched.scheduler.service;

import java.io.InputStream;
import java.util.List;
import java.util.Map;

/**
 * 对象存储服务接口 — 管理用户提交的训练任务包。
 * 当前默认使用本地文件系统 (LocalFileStorageService)，
 * 后续可切换到 MinIO / S3 / OSS 实现。
 */
public interface ObjectStorageService {

    /** 上传对象，返回对象标识 */
    String upload(String key, byte[] data, Map<String, String> metadata);

    /** 下载对象 */
    byte[] download(String key);

    /** 列出指定前缀下的所有对象 */
    List<StorageObject> list(String prefix);

    /** 删除对象 */
    void delete(String key);

    /** 获取对象的访问 URL（私有桶生成预签名 URL） */
    String getAccessUrl(String key, int expireSeconds);

    /** 对象是否存在 */
    boolean exists(String key);

    /** 获取对象元数据 */
    Map<String, String> getMetadata(String key);

    /** 存储对象元信息 */
    class StorageObject {
        private String key;
        private long size;
        private String lastModified;
        private Map<String, String> metadata;

        public StorageObject() {}
        public StorageObject(String key, long size, String lastModified) {
            this.key = key; this.size = size; this.lastModified = lastModified;
        }
        public String getKey() { return key; }
        public void setKey(String key) { this.key = key; }
        public long getSize() { return size; }
        public void setSize(long size) { this.size = size; }
        public String getLastModified() { return lastModified; }
        public void setLastModified(String lastModified) { this.lastModified = lastModified; }
        public Map<String, String> getMetadata() { return metadata; }
        public void setMetadata(Map<String, String> metadata) { this.metadata = metadata; }
    }
}
