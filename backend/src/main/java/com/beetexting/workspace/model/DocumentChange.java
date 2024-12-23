package com.beetexting.workspace.model;

import java.time.Instant;

public class DocumentChange {
    private String id;
    private String userId;
    private int version;
    private String operation;  // INSERT, DELETE, REPLACE
    private int startPosition;
    private int endPosition;
    private String text;
    private Instant timestamp;

    public DocumentChange() {
        this.timestamp = Instant.now();
    }

    // Getters and setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public int getVersion() { return version; }
    public void setVersion(int version) { this.version = version; }

    public String getOperation() { return operation; }
    public void setOperation(String operation) { this.operation = operation; }

    public int getStartPosition() { return startPosition; }
    public void setStartPosition(int startPosition) { this.startPosition = startPosition; }

    public int getEndPosition() { return endPosition; }
    public void setEndPosition(int endPosition) { this.endPosition = endPosition; }

    public String getText() { return text; }
    public void setText(String text) { this.text = text; }

    public Instant getTimestamp() { return timestamp; }
    public void setTimestamp(Instant timestamp) { this.timestamp = timestamp; }
} 