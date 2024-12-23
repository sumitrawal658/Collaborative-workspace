package com.beetexting.workspace.model;

import java.time.Instant;

public class PresenceInfo {
    private String userId;
    private boolean active;
    private Instant lastSeen;
    private String status;  // ONLINE, AWAY, OFFLINE

    public PresenceInfo() {
        this.lastSeen = Instant.now();
        this.active = true;
        this.status = "ONLINE";
    }

    public PresenceInfo(String userId) {
        this.userId = userId;
        this.lastSeen = Instant.now();
        this.active = true;
        this.status = "ONLINE";
    }

    // Getters and setters
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public boolean isActive() { return active; }
    public void setActive(boolean active) { 
        this.active = active;
        this.lastSeen = Instant.now();
        this.status = active ? "ONLINE" : "AWAY";
    }

    public Instant getLastSeen() { return lastSeen; }
    public void setLastSeen(Instant lastSeen) { this.lastSeen = lastSeen; }

    public String getStatus() { return status; }
    public void setStatus(String status) { 
        this.status = status;
        this.lastSeen = Instant.now();
        this.active = "ONLINE".equals(status);
    }

    public void updatePresence(boolean active) {
        this.active = active;
        this.lastSeen = Instant.now();
        this.status = active ? "ONLINE" : "AWAY";
    }

    public void markOffline() {
        this.active = false;
        this.lastSeen = Instant.now();
        this.status = "OFFLINE";
    }
} 