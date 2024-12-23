package com.workspace.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import com.workspace.model.Note;
import com.workspace.repository.NoteRepository;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class CollaborationService {
    
    @Autowired
    private SimpMessagingTemplate messagingTemplate;
    
    @Autowired
    private NoteRepository noteRepository;
    
    private final Map<String, Integer> activeUsers = new ConcurrentHashMap<>();
    
    public void handleNoteEdit(String noteId, String content, String userId) {
        Note note = noteRepository.findById(noteId)
            .orElseThrow(() -> new ResourceNotFoundException("Note not found"));
            
        // Update note content
        note.setContent(content);
        note.setLastModifiedBy(userId);
        note.setVersion(note.getVersion() + 1);
        
        // Create version history
        NoteVersion version = new NoteVersion();
        version.setNoteId(noteId);
        version.setContent(content);
        version.setVersion(note.getVersion());
        version.setCreatedBy(userId);
        
        noteRepository.save(note);
        
        // Broadcast changes to all collaborators
        messagingTemplate.convertAndSend(
            "/topic/notes/" + noteId,
            Map.of(
                "type", "CONTENT_UPDATE",
                "content", content,
                "version", note.getVersion(),
                "userId", userId
            )
        );
    }
    
    public void trackUserActivity(String noteId, String userId, boolean isJoining) {
        String key = noteId + ":" + userId;
        if (isJoining) {
            activeUsers.put(key, activeUsers.getOrDefault(key, 0) + 1);
        } else {
            activeUsers.computeIfPresent(key, (k, v) -> v > 1 ? v - 1 : null);
        }
        
        // Broadcast active users update
        messagingTemplate.convertAndSend(
            "/topic/notes/" + noteId + "/users",
            Map.of(
                "type", "ACTIVE_USERS",
                "count", getActiveUsersCount(noteId)
            )
        );
    }
    
    private int getActiveUsersCount(String noteId) {
        return (int) activeUsers.keySet().stream()
            .filter(key -> key.startsWith(noteId + ":"))
            .count();
    }
} 