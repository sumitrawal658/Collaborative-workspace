package com.workspace.service;

import com.workspace.model.Note;
import com.workspace.model.SecureLink;
import com.workspace.repository.NoteLinkRepository;
import com.workspace.repository.NoteRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.SimpleMailMessage;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;

@ExtendWith(MockitoExtension.class)
public class NoteShareServiceTest {

    @Mock
    private NoteRepository noteRepository;

    @Mock
    private NoteLinkRepository linkRepository;

    @Mock
    private JavaMailSender mailSender;

    @InjectMocks
    private NoteShareService noteShareService;

    private Note testNote;
    private SecureLink testLink;

    @BeforeEach
    void setUp() {
        testNote = new Note();
        testNote.setId("test-note-id");
        testNote.setTitle("Test Note");
        testNote.setContent("Test Content");
        testNote.setTenantId("test-tenant");
        testNote.setCreatedBy("test-user");

        testLink = new SecureLink();
        testLink.setId("test-link-id");
        testLink.setNoteId(testNote.getId());
        testLink.setToken("test-token");
        testLink.setExpiresAt(LocalDateTime.now().plusDays(7));
    }

    @Test
    void generateSecureShareLink_ShouldCreateValidLink() {
        when(noteRepository.findById(testNote.getId())).thenReturn(Optional.of(testNote));
        when(linkRepository.save(any(SecureLink.class))).thenReturn(testLink);

        String link = noteShareService.generateSecureShareLink(testNote.getId());

        assertNotNull(link);
        assertTrue(link.contains(testLink.getToken()));
        verify(linkRepository).save(any(SecureLink.class));
    }

    @Test
    void validateShareLink_WithValidLink_ShouldReturnTrue() {
        when(linkRepository.findByToken(testLink.getToken())).thenReturn(Optional.of(testLink));

        boolean isValid = noteShareService.validateShareLink(testLink.getToken());

        assertTrue(isValid);
        verify(linkRepository).findByToken(testLink.getToken());
    }

    @Test
    void validateShareLink_WithExpiredLink_ShouldReturnFalse() {
        SecureLink expiredLink = new SecureLink();
        expiredLink.setToken("expired-token");
        expiredLink.setExpiresAt(LocalDateTime.now().minusDays(1));

        when(linkRepository.findByToken(expiredLink.getToken())).thenReturn(Optional.of(expiredLink));

        boolean isValid = noteShareService.validateShareLink(expiredLink.getToken());

        assertFalse(isValid);
        verify(linkRepository).findByToken(expiredLink.getToken());
    }

    @Test
    void validateShareLink_WithInvalidLink_ShouldReturnFalse() {
        when(linkRepository.findByToken("invalid-token")).thenReturn(Optional.empty());

        boolean isValid = noteShareService.validateShareLink("invalid-token");

        assertFalse(isValid);
        verify(linkRepository).findByToken("invalid-token");
    }

    @Test
    void shareNoteViaEmail_ShouldSendEmail() {
        String recipientEmail = "test@example.com";
        when(noteRepository.findById(testNote.getId())).thenReturn(Optional.of(testNote));
        when(linkRepository.save(any(SecureLink.class))).thenReturn(testLink);

        noteShareService.shareNoteViaEmail(testNote.getId(), recipientEmail);

        verify(mailSender).send(any(SimpleMailMessage.class));
        verify(linkRepository).save(any(SecureLink.class));
    }

    @Test
    void shareNoteViaEmail_WithInvalidNote_ShouldThrowException() {
        String recipientEmail = "test@example.com";
        when(noteRepository.findById("invalid-id")).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class, () -> 
            noteShareService.shareNoteViaEmail("invalid-id", recipientEmail)
        );

        verify(mailSender, never()).send(any(SimpleMailMessage.class));
        verify(linkRepository, never()).save(any(SecureLink.class));
    }

    @Test
    void getNoteByShareLink_WithValidLink_ShouldReturnNote() {
        when(linkRepository.findByToken(testLink.getToken())).thenReturn(Optional.of(testLink));
        when(noteRepository.findById(testLink.getNoteId())).thenReturn(Optional.of(testNote));

        Optional<Note> result = noteShareService.getNoteByShareLink(testLink.getToken());

        assertTrue(result.isPresent());
        assertEquals(testNote.getId(), result.get().getId());
        verify(linkRepository).findByToken(testLink.getToken());
        verify(noteRepository).findById(testLink.getNoteId());
    }

    @Test
    void getNoteByShareLink_WithInvalidLink_ShouldReturnEmpty() {
        when(linkRepository.findByToken("invalid-token")).thenReturn(Optional.empty());

        Optional<Note> result = noteShareService.getNoteByShareLink("invalid-token");

        assertTrue(result.isEmpty());
        verify(linkRepository).findByToken("invalid-token");
        verify(noteRepository, never()).findById(any());
    }

    @Test
    void getNoteByShareLink_WithExpiredLink_ShouldReturnEmpty() {
        SecureLink expiredLink = new SecureLink();
        expiredLink.setToken("expired-token");
        expiredLink.setNoteId(testNote.getId());
        expiredLink.setExpiresAt(LocalDateTime.now().minusDays(1));

        when(linkRepository.findByToken(expiredLink.getToken())).thenReturn(Optional.of(expiredLink));

        Optional<Note> result = noteShareService.getNoteByShareLink(expiredLink.getToken());

        assertTrue(result.isEmpty());
        verify(linkRepository).findByToken(expiredLink.getToken());
        verify(noteRepository, never()).findById(any());
    }
} 