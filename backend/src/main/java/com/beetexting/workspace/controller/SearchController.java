package com.beetexting.workspace.controller;

import com.beetexting.workspace.model.Note;
import com.beetexting.workspace.service.SearchService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/api/search")
public class SearchController {

    private final SearchService searchService;

    @Autowired
    public SearchController(SearchService searchService) {
        this.searchService = searchService;
    }

    @GetMapping("/{tenantId}")
    @PreAuthorize("@securityService.hasTenantAccess(#tenantId)")
    public ResponseEntity<Page<Note>> searchNotes(
            @PathVariable String tenantId,
            @RequestParam(required = false) String query,
            @RequestParam(required = false) Set<String> tags,
            @RequestParam(required = false) String sentiment,
            Pageable pageable) {
        return ResponseEntity.ok(searchService.searchNotes(tenantId, query, tags, sentiment, pageable));
    }

    @GetMapping("/{tenantId}/similar/{noteId}")
    @PreAuthorize("@securityService.hasTenantAccess(#tenantId)")
    public ResponseEntity<List<Note>> findSimilarNotes(
            @PathVariable String tenantId,
            @PathVariable String noteId) {
        return ResponseEntity.ok(searchService.findSimilarNotes(tenantId, noteId));
    }

    @PostMapping("/generate-tags")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Set<String>> generateTags(@RequestBody String content) {
        return ResponseEntity.ok(searchService.generateTags(content));
    }

    @GetMapping("/{tenantId}/tags/suggest")
    @PreAuthorize("@securityService.hasTenantAccess(#tenantId)")
    public ResponseEntity<List<String>> suggestTags(
            @PathVariable String tenantId,
            @RequestParam String prefix) {
        return ResponseEntity.ok(searchService.suggestTags(tenantId, prefix));
    }

    @GetMapping("/{tenantId}/tags/stats")
    @PreAuthorize("@securityService.hasTenantAccess(#tenantId)")
    public ResponseEntity<Map<String, Long>> getTagUsageStats(@PathVariable String tenantId) {
        return ResponseEntity.ok(searchService.getTagUsageStats(tenantId));
    }
} 