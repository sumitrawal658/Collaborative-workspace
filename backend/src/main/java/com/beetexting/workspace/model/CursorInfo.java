package com.beetexting.workspace.model;

import java.time.Instant;

public class CursorInfo {
    private String userId;
    private int line;
    private int column;
    private Instant lastUpdated;

    public CursorInfo() {
        this.lastUpdated = Instant.now();
    }

    public CursorInfo(String userId, int line, int column) {
        this.userId = userId;
        this.line = line;
        this.column = column;
        this.lastUpdated = Instant.now();
    }

    // Getters and setters
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public int getLine() { return line; }
    public void setLine(int line) { this.line = line; }

    public int getColumn() { return column; }
    public void setColumn(int column) { this.column = column; }

    public Instant getLastUpdated() { return lastUpdated; }
    public void setLastUpdated(Instant lastUpdated) { this.lastUpdated = lastUpdated; }

    public void update(int line, int column) {
        this.line = line;
        this.column = column;
        this.lastUpdated = Instant.now();
    }
} 