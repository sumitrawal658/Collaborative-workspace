package com.workspace.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.workspace.service.NoteShareService;
import lombok.Data;

@RestController
@RequestMapping("/api/notes/share")
public class NoteShareController {

    @Autowired
    private NoteShareService noteShareService;

    @Data
    public static class ShareNoteRequest {
        private String recipientEmail;
    }

    @PostMapping("/{noteId}/share")
    public ResponseEntity<?> shareNote(
            @PathVariable String noteId,
            @RequestBody ShareNoteRequest request,
            @RequestHeader("X-User-Email") String userEmail) {
        
        noteShareService.shareNoteViaEmail(noteId, request.getRecipientEmail(), userEmail);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/{noteId}")
    public ResponseEntity<?> getSharedNote(
            @PathVariable String noteId,
            @RequestParam String token) {
        
        return ResponseEntity.ok(noteShareService.validateShareLink(noteId, token));
    }
} 