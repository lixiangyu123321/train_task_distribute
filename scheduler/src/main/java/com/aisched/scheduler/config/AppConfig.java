package com.aisched.scheduler.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "aisched")
public class AppConfig {

    private String publicIp = "127.0.0.1";
    private int wsPort = 8081;

    private Node node = new Node();
    private Dispatch dispatch = new Dispatch();

    public static class Node {
        private int heartbeatTimeoutSeconds = 30;
        private long heartbeatCheckIntervalMs = 10000;
        public int getHeartbeatTimeoutSeconds() { return heartbeatTimeoutSeconds; }
        public void setHeartbeatTimeoutSeconds(int heartbeatTimeoutSeconds) { this.heartbeatTimeoutSeconds = heartbeatTimeoutSeconds; }
        public long getHeartbeatCheckIntervalMs() { return heartbeatCheckIntervalMs; }
        public void setHeartbeatCheckIntervalMs(long heartbeatCheckIntervalMs) { this.heartbeatCheckIntervalMs = heartbeatCheckIntervalMs; }
    }

    public static class Dispatch {
        private long pollIntervalMs = 5000;
        private int lockTimeoutSeconds = 5;
        public long getPollIntervalMs() { return pollIntervalMs; }
        public void setPollIntervalMs(long pollIntervalMs) { this.pollIntervalMs = pollIntervalMs; }
        public int getLockTimeoutSeconds() { return lockTimeoutSeconds; }
        public void setLockTimeoutSeconds(int lockTimeoutSeconds) { this.lockTimeoutSeconds = lockTimeoutSeconds; }
    }

    public String getPublicIp() { return publicIp; }
    public void setPublicIp(String publicIp) { this.publicIp = publicIp; }
    public int getWsPort() { return wsPort; }
    public void setWsPort(int wsPort) { this.wsPort = wsPort; }
    public Node getNode() { return node; }
    public void setNode(Node node) { this.node = node; }
    public Dispatch getDispatch() { return dispatch; }
    public void setDispatch(Dispatch dispatch) { this.dispatch = dispatch; }

    private Extension extension = new Extension();
    private Transfer transfer = new Transfer();

    public static class Transfer {
        private String uploadDir = "files";
        public String getUploadDir() { return uploadDir; }
        public void setUploadDir(String uploadDir) { this.uploadDir = uploadDir; }
    }

    public Transfer getTransfer() { return transfer; }
    public void setTransfer(Transfer transfer) { this.transfer = transfer; }

    public static class Extension {
        private boolean claudeEnabled = false;
        public boolean isClaudeEnabled() { return claudeEnabled; }
        public void setClaudeEnabled(boolean claudeEnabled) { this.claudeEnabled = claudeEnabled; }
    }

    public Extension getExtension() { return extension; }
    public void setExtension(Extension extension) { this.extension = extension; }
}
