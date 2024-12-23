package com.workspace.integration;

import com.workspace.model.Note;
import com.workspace.service.NotesService;
import com.workspace.service.OfflineStorageService;
import com.workspace.service.NetworkService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.reactive.server.WebTestClient;

import java.util.Arrays;
import java.util.Date;

import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
public class OfflineModeIntegrationTest {

    @Autowired
    private WebTestClient webTestClient;

    @Autowired
    private NotesService notesService;

    @Autowired
    private OfflineStorageService offlineStorageService;

    @MockBean
    private NetworkService networkService;

    private Note testNote;

    @BeforeEach
    void setUp() {
        testNote = new Note();
        testNote.setId("test-note-1");
        testNote.setTitle("Test Note");
        testNote.setContent("Test Content");
        testNote.setTags(Arrays.asList("test", "integration"));
        testNote.setVersion(1);
        testNote.setCreatedAt(new Date());
        testNote.setUpdatedAt(new Date());
        testNote.setCreatedBy("test-user");
        testNote.setLastModifiedBy("test-user");
    }

    @Test
    void shouldSaveNoteOfflineWhenNetworkIsUnavailable() {
        // Given
        when(networkService.isOnline()).thenReturn(false);

        // When
        Note savedNote = notesService.createNote(testNote).block();

        // Then
        assertNotNull(savedNote);
        assertTrue(savedNote.isOffline());
        assertEquals(testNote.getTitle(), savedNote.getTitle());
        
        // Verify note is in offline storage
        Note offlineNote = offlineStorageService.getNote(savedNote.getId()).block();
        assertNotNull(offlineNote);
        assertEquals(savedNote.getId(), offlineNote.getId());
    }

    @Test
    void shouldSyncOfflineNotesWhenNetworkBecomesAvailable() {
        // Given
        when(networkService.isOnline()).thenReturn(false);
        Note offlineNote = notesService.createNote(testNote).block();
        assertNotNull(offlineNote);
        assertTrue(offlineNote.isOffline());

        // When network becomes available
        when(networkService.isOnline()).thenReturn(true);
        networkService.triggerSync();

        // Then
        verify(networkService, times(1)).triggerSync();
        
        // Verify note is synced to server
        webTestClient.get()
            .uri("/api/notes/" + offlineNote.getId())
            .exchange()
            .expectStatus().isOk()
            .expectBody(Note.class)
            .value(note -> {
                assertNotNull(note);
                assertFalse(note.isOffline());
                assertEquals(offlineNote.getTitle(), note.getTitle());
                assertEquals(offlineNote.getContent(), note.getContent());
            });
    }

    @Test
    void shouldHandleConflictsWhenSyncing() {
        // Given
        when(networkService.isOnline()).thenReturn(false);
        Note offlineNote = notesService.createNote(testNote).block();
        assertNotNull(offlineNote);

        // Create a server-side change
        when(networkService.isOnline()).thenReturn(true);
        Note serverNote = testNote;
        serverNote.setContent("Server Content");
        serverNote.setVersion(2);
        notesService.updateNote(serverNote.getId(), serverNote).block();

        // Update note offline
        when(networkService.isOnline()).thenReturn(false);
        offlineNote.setContent("Offline Content");
        Note updatedOfflineNote = notesService.updateNote(offlineNote.getId(), offlineNote).block();
        assertNotNull(updatedOfflineNote);
        assertTrue(updatedOfflineNote.isOffline());

        // When network becomes available
        when(networkService.isOnline()).thenReturn(true);
        networkService.triggerSync();

        // Then
        Note syncedNote = notesService.getNote(offlineNote.getId()).block();
        assertNotNull(syncedNote);
        assertTrue(syncedNote.getConflictState().hasConflict());
        assertEquals(2, syncedNote.getConflictState().getServerVersion());
        assertEquals(1, syncedNote.getConflictState().getLocalVersion());
    }

    @Test
    void shouldResolveConflictsWithUserChoice() {
        // Given a note with conflict
        Note conflictedNote = testNote;
        conflictedNote.setConflictState(new Note.ConflictState(true, 2, 1));

        // When resolving with local version
        Note resolvedNote = notesService.resolveConflict(conflictedNote, "local").block();

        // Then
        assertNotNull(resolvedNote);
        assertNull(resolvedNote.getConflictState());
        assertFalse(resolvedNote.isOffline());
        
        // Verify resolution is persisted
        Note persistedNote = notesService.getNote(resolvedNote.getId()).block();
        assertNotNull(persistedNote);
        assertNull(persistedNote.getConflictState());
    }
} 