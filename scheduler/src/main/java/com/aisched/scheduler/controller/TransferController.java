package com.aisched.scheduler.controller;

import com.aisched.scheduler.model.entity.Task;
import com.aisched.scheduler.model.entity.TaskPackage;
import com.aisched.scheduler.service.TransferService;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/v1/transfer")
public class TransferController {

    private final TransferService transferService;

    public TransferController(TransferService transferService) {
        this.transferService = transferService;
    }

    /** 上传 ZIP 包，自动检测任务类型 */
    @PostMapping("/upload")
    public ResponseEntity<Map<String, Object>> upload(@RequestParam("file") MultipartFile file) {
        try {
            byte[] data = file.getBytes();
            String originalName = file.getOriginalFilename();
            if (originalName == null || !originalName.toLowerCase().endsWith(".zip")) {
                return ResponseEntity.badRequest().body(buildResponse(40001, "仅支持 .zip 文件", null));
            }

            TaskPackage pkg = transferService.receiveUpload(originalName, data);

            // 自动检测任务类型
            Map<String, Object> yamlData = transferService.parseYamlData(data);
            List<String> zipEntries = listZipEntries(data);
            Task.TaskType detectedType = transferService.detectTaskType(zipEntries);

            Map<String, Object> result = new LinkedHashMap<>();
            result.put("packageId", pkg.getId());
            result.put("fileName", pkg.getFileName());
            result.put("fileSize", pkg.getFileSize());
            result.put("detectedType", detectedType.name());
            result.put("yamlData", yamlData);
            result.put("entries", zipEntries);
            return ResponseEntity.status(HttpStatus.CREATED).body(buildResponse(201, "上传成功", result));
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(buildResponse(50000, "文件处理失败: " + e.getMessage(), null));
        }
    }

    /** 下载 ZIP 包（Worker 调用） */
    @GetMapping("/download/{packageId}")
    public ResponseEntity<byte[]> download(@PathVariable String packageId) {
        try {
            byte[] data = transferService.readPackageFile(packageId);
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_OCTET_STREAM);
            headers.setContentDisposition(ContentDisposition.attachment().filename("task-package.zip").build());
            return ResponseEntity.ok().headers(headers).body(data);
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }

    private List<String> listZipEntries(byte[] data) throws IOException {
        List<String> names = new ArrayList<>();
        try (java.util.zip.ZipInputStream zis = new java.util.zip.ZipInputStream(new java.io.ByteArrayInputStream(data))) {
            java.util.zip.ZipEntry entry;
            while ((entry = zis.getNextEntry()) != null) {
                names.add(entry.getName());
                zis.closeEntry();
            }
        }
        return names;
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
