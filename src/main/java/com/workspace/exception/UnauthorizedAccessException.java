package com.workspace.exception;

public class UnauthorizedAccessException extends RuntimeException {
    private String userId;
    private String resource;
    private String action;

    public UnauthorizedAccessException(String userId, String resource, String action) {
        super(String.format("User %s is not authorized to %s %s", userId, action, resource));
        this.userId = userId;
        this.resource = resource;
        this.action = action;
    }

    public UnauthorizedAccessException(String message) {
        super(message);
    }

    public String getUserId() {
        return userId;
    }

    public String getResource() {
        return resource;
    }

    public String getAction() {
        return action;
    }
} 