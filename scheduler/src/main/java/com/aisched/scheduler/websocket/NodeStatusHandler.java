package com.aisched.scheduler.websocket;

import com.aisched.scheduler.model.dto.NodeStatusDTO;
import com.aisched.scheduler.service.NodeService;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;
import java.util.List;

@Controller
public class NodeStatusHandler {

    private final SimpMessagingTemplate template;
    private final NodeService nodeService;

    public NodeStatusHandler(SimpMessagingTemplate template, NodeService nodeService) {
        this.template = template;
        this.nodeService = nodeService;
    }

    @MessageMapping("/nodes/refresh")
    @SendTo("/topic/nodes")
    public List<NodeStatusDTO> refreshNodes() {
        return nodeService.listAllNodes();
    }

    public void broadcastNodeUpdate() {
        template.convertAndSend("/topic/nodes", nodeService.listAllNodes());
    }
}
