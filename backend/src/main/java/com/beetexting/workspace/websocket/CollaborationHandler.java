package com.beetexting.workspace.websocket;

import com.beetexting.workspace.model.Note;
import com.beetexting.workspace.model.DocumentChange;
import com.beetexting.workspace.service.DocumentService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

@Controller
public class CollaborationHandler {

    private static final Logger logger = LoggerFactory.getLogger(CollaborationHandler.class);
    private final SimpMessagingTemplate messagingTemplate;
    private final DocumentService documentService;
    private final ObjectMapper objectMapper;

    @Autowired
    public CollaborationHandler(
            SimpMessagingTemplate messagingTemplate,
            DocumentService documentService,
            ObjectMapper objectMapper) {
        this.messagingTemplate = messagingTemplate;
        this.documentService = documentService;
        this.objectMapper = objectMapper;
    }

    @MessageMapping("/document/{documentId}/edit")
    public void handleDocumentEdit(
            @DestinationVariable String documentId,
            @Payload DocumentChange change,
            SimpMessageHeaderAccessor headerAccessor) {
        try {
            String userId = headerAccessor.getUser().getName();
            logger.debug("Received edit from user {} for document {}", userId, documentId);

            // Apply the change to the document
            Note updatedNote = documentService.applyChange(documentId, change);

            // Broadcast the change to all connected clients except the sender
            messagingTemplate.convertAndSend(
                "/topic/document/" + documentId + "/changes",
                change
            );

            // Send acknowledgment to the sender
            messagingTemplate.convertAndSendToUser(
                userId,
                "/queue/document/" + documentId + "/ack",
                new ChangeAcknowledgment(change.getId(), true)
            );
        } catch (Exception e) {
            logger.error("Error processing document edit", e);
            // Send error to the sender
            String userId = headerAccessor.getUser().getName();
            messagingTemplate.convertAndSendToUser(
                userId,
                "/queue/document/" + documentId + "/error",
                new ChangeError(change.getId(), e.getMessage())
            );
        }
    }

    @MessageMapping("/document/{documentId}/cursor")
    public void handleCursorMove(
            @DestinationVariable String documentId,
            @Payload CursorPosition position,
            SimpMessageHeaderAccessor headerAccessor) {
        String userId = headerAccessor.getUser().getName();
        position.setUserId(userId);

        // Broadcast cursor position to all connected clients
        messagingTemplate.convertAndSend(
            "/topic/document/" + documentId + "/cursors",
            position
        );
    }

    @MessageMapping("/document/{documentId}/presence")
    public void handlePresenceUpdate(
            @DestinationVariable String documentId,
            @Payload PresenceStatus status,
            SimpMessageHeaderAccessor headerAccessor) {
        String userId = headerAccessor.getUser().getName();
        status.setUserId(userId);

        // Update presence in Redis
        documentService.updatePresence(documentId, userId, status.isActive());

        // Broadcast presence update to all connected clients
        messagingTemplate.convertAndSend(
            "/topic/document/" + documentId + "/presence",
            status
        );
    }
}

class ChangeAcknowledgment {
    private String changeId;
    private boolean success;

    public ChangeAcknowledgment(String changeId, boolean success) {
        this.changeId = changeId;
        this.success = success;
    }

    // Getters and setters
    public String getChangeId() { return changeId; }
    public void setChangeId(String changeId) { this.changeId = changeId; }
    public boolean isSuccess() { return success; }
    public void setSuccess(boolean success) { this.success = success; }
}

class ChangeError {
    private String changeId;
    private String error;

    public ChangeError(String changeId, String error) {
        this.changeId = changeId;
        this.error = error;
    }

    // Getters and setters
    public String getChangeId() { return changeId; }
    public void setChangeId(String changeId) { this.changeId = changeId; }
    public String getError() { return error; }
    public void setError(String error) { this.error = error; }
}

class CursorPosition {
    private String userId;
    private int line;
    private int column;

    // Getters and setters
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public int getLine() { return line; }
    public void setLine(int line) { this.line = line; }
    public int getColumn() { return column; }
    public void setColumn(int column) { this.column = column; }
}

class PresenceStatus {
    private String userId;
    private boolean active;

    // Getters and setters
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
}
