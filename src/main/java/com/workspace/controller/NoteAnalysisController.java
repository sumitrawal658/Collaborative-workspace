package com.workspace.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.workspace.service.NoteAnalysisService;

@RestController
@RequestMapping("/api/notes/analysis")
public class NoteAnalysisController {

    @Autowired
    private NoteAnalysisService noteAnalysisService;

    @PostMapping("/{noteId}/analyze")
    public ResponseEntity<?> analyzeNote(@PathVariable String noteId) {
        noteAnalysisService.analyzeNote(noteId);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/reanalyze-all")
    public ResponseEntity<?> reanalyzeAllNotes() {
        noteAnalysisService.reanalyzeAllNotes();
        return ResponseEntity.ok().build();
    }
} 