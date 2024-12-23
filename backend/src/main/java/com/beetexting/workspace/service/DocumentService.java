package com.beetexting.workspace.service;

import com.beetexting.workspace.model.Note;
import com.beetexting.workspace.model.DocumentChange;
import com.beetexting.workspace.model.CursorInfo;
import com.beetexting.workspace.model.PresenceInfo;
import com.beetexting.workspace.repository.NoteRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class DocumentService {
    private static final Logger logger = LoggerFactory.getLogger(DocumentService.class);
    private static final String PRESENCE_KEY_PREFIX = "presence:";
    private static final String CURSOR_KEY_PREFIX = "cursor:";
    private static final Duration PRESENCE_TIMEOUT = Duration.ofMinutes(5);

    private final NoteRepository noteRepository;
    private final RedisTemplate<String, Object> redisTemplate;
    private final Map<String, Note> activeDocuments;

    @Autowired
    public DocumentService(
            NoteRepository noteRepository,
            RedisTemplate<String, Object> redisTemplate) {
        this.noteRepository = noteRepository;
        this.redisTemplate = redisTemplate;
        this.activeDocuments = new ConcurrentHashMap<>();
    }

    @Transactional
    public Note applyChange(String documentId, DocumentChange change) {
        Note note = getOrLoadDocument(documentId);
        synchronized (note) {
            // Validate change version
            if (change.getVersion() != note.getVersion()) {
                throw new IllegalStateException("Version mismatch");
            }

            // Apply the change
            applyChangeToContent(note, change);
            note.addVersion(note.getContent(), change.getUserId(), change.getChangeType(), change.getDescription());

            // Save to database
            note = noteRepository.save(note);

            // Update cache
            activeDocuments.put(documentId, note);
        }
        return note;
    }

    private void applyChangeToContent(Note note, DocumentChange change) {
        String content = note.getContent();
        StringBuilder newContent = new StringBuilder(content);

        switch (change.getOperation()) {
            case "INSERT":
                newContent.insert(change.getStartPosition(), change.getText());
                break;
            case "DELETE":
                newContent.delete(change.getStartPosition(), change.getEndPosition());
                break;
            case "REPLACE":
                newContent.replace(change.getStartPosition(), change.getEndPosition(), change.getText());
                break;
            default:
                throw new IllegalArgumentException("Unknown operation: " + change.getOperation());
        }

        note.setContent(newContent.toString());
    }

    public void updatePresence(String documentId, String userId, boolean active) {
        String presenceKey = PRESENCE_KEY_PREFIX + documentId;
        PresenceInfo presence = new PresenceInfo(userId);
        presence.setActive(active);

        // Update Redis
        redisTemplate.opsForHash().put(presenceKey, userId, presence);
        redisTemplate.expire(presenceKey, PRESENCE_TIMEOUT);

        // Update note
        Note note = getOrLoadDocument(documentId);
        if (active) {
            note.addCollaborator(userId);
        } else {
            note.removeCollaborator(userId);
        }
    }

    public void updateCursor(String documentId, String userId, CursorInfo cursor) {
        String cursorKey = CURSOR_KEY_PREFIX + documentId;

        // Update Redis
        redisTemplate.opsForHash().put(cursorKey, userId, cursor);
        redisTemplate.expire(cursorKey, PRESENCE_TIMEOUT);
    }

    public void removeUser(String documentId, String userId) {
        // Remove from Redis
        String presenceKey = PRESENCE_KEY_PREFIX + documentId;
        String cursorKey = CURSOR_KEY_PREFIX + documentId;
        redisTemplate.opsForHash().delete(presenceKey, userId);
        redisTemplate.opsForHash().delete(cursorKey, userId);

        // Update note
        Note note = getOrLoadDocument(documentId);
        note.removeCollaborator(userId);
    }

    @Transactional(readOnly = true)
    public Note getDocument(String documentId) {
        return getOrLoadDocument(documentId);
    }

    @Transactional(readOnly = true)
    public List<Note.NoteVersion> getVersionHistory(String documentId) {
        Note note = getOrLoadDocument(documentId);
        return note.getVersions();
    }

    private Note getOrLoadDocument(String documentId) {
        return activeDocuments.computeIfAbsent(documentId, id -> {
            Optional<Note> doc = noteRepository.findById(id);
            return doc.orElseThrow(() -> new IllegalArgumentException("Document not found: " + id));
        });
    }

    public void cleanupInactiveDocuments() {
        Instant threshold = Instant.now().minus(PRESENCE_TIMEOUT);
        activeDocuments.entrySet().removeIf(entry -> {
            Note doc = entry.getValue();
            return doc.getCollaborators().isEmpty();
        });
    }
}
