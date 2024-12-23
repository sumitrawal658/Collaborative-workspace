package com.workspace.service;

import com.workspace.exception.ResourceNotFoundException;
import com.workspace.exception.UnauthorizedAccessException;
import com.workspace.model.Note;
import com.workspace.model.SecureLink;
import com.workspace.repository.NoteLinkRepository;
import com.workspace.repository.NoteRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.retry.annotation.Backoff;
import org.springframework.retry.annotation.Retryable;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@Service
public class NoteShareService {
    private static final Logger logger = LoggerFactory.getLogger(NoteShareService.class);
    private static final int MAX_RETRY_ATTEMPTS = 3;

    private final NoteRepository noteRepository;
    private final NoteLinkRepository linkRepository;
    private final JavaMailSender mailSender;

    public NoteShareService(NoteRepository noteRepository, NoteLinkRepository linkRepository, JavaMailSender mailSender) {
        this.noteRepository = noteRepository;
        this.linkRepository = linkRepository;
        this.mailSender = mailSender;
    }

    public String generateSecureShareLink(String noteId) {
        logger.debug("Generating secure share link for note: {}", noteId);
        Note note = noteRepository.findById(noteId)
            .orElseThrow(() -> new ResourceNotFoundException("Note", "id", noteId));

        SecureLink secureLink = new SecureLink();
        secureLink.setNoteId(noteId);
        secureLink.setToken(UUID.randomUUID().toString());
        secureLink.setExpiresAt(LocalDateTime.now().plusDays(7));

        try {
            linkRepository.save(secureLink);
            logger.info("Successfully generated share link for note: {}", noteId);
            return "http://localhost:8080/share/" + secureLink.getToken();
        } catch (Exception e) {
            logger.error("Failed to generate share link for note: {}", noteId, e);
            throw new RuntimeException("Failed to generate share link", e);
        }
    }

    @Retryable(value = MailException.class, maxAttempts = MAX_RETRY_ATTEMPTS, backoff = @Backoff(delay = 1000))
    public void shareNoteViaEmail(String noteId, String recipientEmail) {
        logger.debug("Sharing note {} with recipient: {}", noteId, recipientEmail);
        Note note = noteRepository.findById(noteId)
            .orElseThrow(() -> new ResourceNotFoundException("Note", "id", noteId));

        String shareLink = generateSecureShareLink(noteId);

        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(recipientEmail);
        message.setSubject("Note Shared: " + note.getTitle());
        message.setText("A note has been shared with you. Click the following link to view it: " + shareLink);

        try {
            mailSender.send(message);
            logger.info("Successfully sent share email for note {} to {}", noteId, recipientEmail);
        } catch (MailException e) {
            logger.error("Failed to send share email for note {} to {}", noteId, recipientEmail, e);
            throw e;
        }
    }

    public boolean validateShareLink(String token) {
        logger.debug("Validating share link token: {}", token);
        Optional<SecureLink> link = linkRepository.findByToken(token);
        
        if (link.isEmpty()) {
            logger.warn("Share link not found for token: {}", token);
            return false;
        }

        if (link.get().getExpiresAt().isBefore(LocalDateTime.now())) {
            logger.warn("Share link expired for token: {}", token);
            return false;
        }

        return true;
    }

    public Optional<Note> getNoteByShareLink(String token) {
        logger.debug("Retrieving note by share link token: {}", token);
        if (!validateShareLink(token)) {
            logger.warn("Invalid or expired share link token: {}", token);
            return Optional.empty();
        }

        try {
            SecureLink link = linkRepository.findByToken(token).get();
            return noteRepository.findById(link.getNoteId());
        } catch (Exception e) {
            logger.error("Error retrieving note by share link token: {}", token, e);
            return Optional.empty();
        }
    }
} 