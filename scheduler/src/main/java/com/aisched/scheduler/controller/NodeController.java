package com.aisched.scheduler.controller;

import com.aisched.scheduler.model.dto.NodeStatusDTO;
import com.aisched.scheduler.model.entity.GpuNode;
import com.aisched.scheduler.service.NodeService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/nodes")
public class NodeController {

    private final NodeService nodeService;

    public NodeController(NodeService nodeService) {
        this.nodeService = nodeService;
    }

    @PostMapping("/register")
    public ResponseEntity<Map<String, Object>> register(@RequestBody Map<String, Object> body) {
        GpuNode node = nodeService.register(
                (String) body.get("name"),
                (String) body.get("publicIp"),
                ((Number) body.getOrDefault("apiPort", 9000)).intValue(),
                (String) body.get("gpuModel"),
                ((Number) body.getOrDefault("gpuCount", 1)).intValue(),
                ((Number) body.getOrDefault("vramTotalMb", 0)).longValue()
        );
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("nodeId", node.getId());
        data.put("status", node.getStatus().name());
        return ResponseEntity.ok(buildResponse(200, "节点注册成功", data));
    }

    @PostMapping("/heartbeat")
    public ResponseEntity<Map<String, Object>> heartbeat(@RequestBody Map<String, Object> body) {
        String nodeId = (String) body.get("nodeId");
        @SuppressWarnings("unchecked")
        Map<String, Object> resources = (Map<String, Object>) body.get("resources");
        nodeService.heartbeat(nodeId, resources != null ? resources : Map.of());
        return ResponseEntity.ok(buildResponse(200, "ok", null));
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> listNodes() {
        List<NodeStatusDTO> nodes = nodeService.listAllNodes();
        return ResponseEntity.ok(buildResponse(200, "success", nodes));
    }

    @GetMapping("/{nodeId}")
    public ResponseEntity<Map<String, Object>> getNode(@PathVariable String nodeId) {
        NodeStatusDTO node = nodeService.getNode(nodeId);
        return ResponseEntity.ok(buildResponse(200, "success", node));
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
