package com.beetexting.workspace.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Document(collection = "documents")
public class DocumentClass {
    @Id
    private String id;
    private String tenantId;
    private String workspaceId;
    private String title;
    private String content;
    private int version;
    private List<DocumentChange> changes;
    private Map<String, CursorInfo> cursors;
    private Map<String, PresenceInfo> presence;
    private String createdBy;
    private Instant createdAt;
    private String lastModifiedBy;
    private Instant lastModifiedAt;

    public DocumentClass() {
        this.changes = new ArrayList<>();
        this.cursors = new ConcurrentHashMap<>();
        this.presence = new ConcurrentHashMap<>();
        this.version = 0;
    }

    // Getters and setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getTenantId() { return tenantId; }
    public void setTenantId(String tenantId) { this.tenantId = tenantId; }

    public String getWorkspaceId() { return workspaceId; }
    public void setWorkspaceId(String workspaceId) { this.workspaceId = workspaceId; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }

    public int getVersion() { return version; }
    public void setVersion(int version) { this.version = version; }

    public List<DocumentChange> getChanges() { return changes; }
    public void setChanges(List<DocumentChange> changes) { this.changes = changes; }

    public Map<String, CursorInfo> getCursors() { return cursors; }
    public void setCursors(Map<String, CursorInfo> cursors) { this.cursors = cursors; }

    public Map<String, PresenceInfo> getPresence() { return presence; }
    public void setPresence(Map<String, PresenceInfo> presence) { this.presence = presence; }

    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public String getLastModifiedBy() { return lastModifiedBy; }
    public void setLastModifiedBy(String lastModifiedBy) { this.lastModifiedBy = lastModifiedBy; }

    public Instant getLastModifiedAt() { return lastModifiedAt; }
    public void setLastModifiedAt(Instant lastModifiedAt) { this.lastModifiedAt = lastModifiedAt; }

    // Helper methods
    public void addChange(DocumentChange change) {
        this.changes.add(change);
        this.version++;
        this.lastModifiedAt = Instant.now();
        this.lastModifiedBy = change.getUserId();
    }

    public void updateCursor(String userId, CursorInfo cursor) {
        this.cursors.put(userId, cursor);
    }

    public void updatePresence(String userId, PresenceInfo presence) {
        this.presence.put(userId, presence);
    }

    public void removeUser(String userId) {
        this.cursors.remove(userId);
        this.presence.remove(userId);
    }
}
