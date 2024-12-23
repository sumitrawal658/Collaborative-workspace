package com.workspace.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.workspace.model.Note;
import com.workspace.model.SecureLink;
import com.workspace.service.NoteShareService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
public class NoteShareControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
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
    @WithMockUser
    void shareNote_WithValidRequest_ShouldReturnSuccess() throws Exception {
        String shareLink = "http://localhost:8080/share/" + testLink.getToken();
        when(noteShareService.generateSecureShareLink(testNote.getId())).thenReturn(shareLink);

        mockMvc.perform(post("/api/notes/{noteId}/share", testNote.getId())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new ShareRequest("test@example.com"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.shareLink").value(shareLink));
    }

    @Test
    @WithMockUser
    void shareNote_WithoutUserEmail_ShouldReturnBadRequest() throws Exception {
        mockMvc.perform(post("/api/notes/{noteId}/share", testNote.getId())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new ShareRequest(null))))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser
    void getSharedNote_WithValidToken_ShouldReturnNote() throws Exception {
        when(noteShareService.getNoteByShareLink(testLink.getToken())).thenReturn(Optional.of(testNote));

        mockMvc.perform(get("/api/notes/shared/{token}", testLink.getToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(testNote.getId()))
                .andExpect(jsonPath("$.title").value(testNote.getTitle()))
                .andExpect(jsonPath("$.content").value(testNote.getContent()));
    }

    @Test
    @WithMockUser
    void getSharedNote_WithInvalidToken_ShouldReturnNotFound() throws Exception {
        when(noteShareService.getNoteByShareLink(anyString())).thenReturn(Optional.empty());

        mockMvc.perform(get("/api/notes/shared/{token}", "invalid-token"))
                .andExpect(status().isNotFound());
    }

    @Test
    @WithMockUser
    void validateShareLink_WithValidToken_ShouldReturnTrue() throws Exception {
        when(noteShareService.validateShareLink(testLink.getToken())).thenReturn(true);

        mockMvc.perform(get("/api/notes/share/validate/{token}", testLink.getToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.valid").value(true));
    }

    @Test
    @WithMockUser
    void validateShareLink_WithInvalidToken_ShouldReturnFalse() throws Exception {
        when(noteShareService.validateShareLink(anyString())).thenReturn(false);

        mockMvc.perform(get("/api/notes/share/validate/{token}", "invalid-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.valid").value(false));
    }

    @Test
    void getSharedNote_WithoutAuthentication_ShouldReturnUnauthorized() throws Exception {
        mockMvc.perform(get("/api/notes/shared/{token}", testLink.getToken()))
                .andExpect(status().isUnauthorized());
    }

    private static class ShareRequest {
        private String email;

        public ShareRequest() {}

        public ShareRequest(String email) {
            this.email = email;
        }

        public String getEmail() {
            return email;
        }

        public void setEmail(String email) {
            this.email = email;
        }
    }
} 