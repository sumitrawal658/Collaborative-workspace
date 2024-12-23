package com.beetexting.workspace.service;

import com.amazonaws.services.comprehend.AmazonComprehend;
import com.amazonaws.services.comprehend.model.DetectEntitiesRequest;
import com.amazonaws.services.comprehend.model.DetectEntitiesResult;
import com.amazonaws.services.comprehend.model.Entity;
import com.beetexting.workspace.model.Note;
import com.beetexting.workspace.repository.NoteRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class SearchService {
    private static final Logger logger = LoggerFactory.getLogger(SearchService.class);
    private static final double RELEVANCE_THRESHOLD = 0.5;
    private static final Set<String> ENTITY_TYPES = new HashSet<>(Arrays.asList(
        "PERSON", "ORGANIZATION", "LOCATION", "COMMERCIAL_ITEM", "EVENT", "TITLE", "QUANTITY"
    ));

    private final NoteRepository noteRepository;
    private final AmazonComprehend comprehendClient;

    @Autowired
    public SearchService(NoteRepository noteRepository, AmazonComprehend comprehendClient) {
        this.noteRepository = noteRepository;
        this.comprehendClient = comprehendClient;
    }

    public Page<Note> searchNotes(String tenantId, String query, Set<String> tags, 
            String sentiment, Pageable pageable) {
        if (tags != null && !tags.isEmpty() && sentiment != null) {
            return noteRepository.findByTenantIdAndTagsInAndSentiment(
                tenantId, tags, sentiment, pageable);
        } else if (tags != null && !tags.isEmpty()) {
            return noteRepository.findByTenantIdAndTagsIn(tenantId, tags, pageable);
        } else if (sentiment != null) {
            return noteRepository.findByTenantIdAndSentiment(tenantId, sentiment, pageable);
        } else if (query != null && !query.trim().isEmpty()) {
            return noteRepository.searchByTenantIdAndContent(tenantId, query, pageable);
        } else {
            return noteRepository.findByTenantId(tenantId, pageable);
        }
    }

    public Set<String> generateTags(String content) {
        try {
            DetectEntitiesRequest request = new DetectEntitiesRequest()
                .withText(content)
                .withLanguageCode("en");
            
            DetectEntitiesResult result = comprehendClient.detectEntities(request);
            
            return result.getEntities().stream()
                .filter(entity -> ENTITY_TYPES.contains(entity.getType()))
                .filter(entity -> entity.getScore() >= RELEVANCE_THRESHOLD)
                .map(Entity::getText)
                .map(String::toLowerCase)
                .collect(Collectors.toSet());
        } catch (Exception e) {
            logger.error("Error generating tags: {}", e.getMessage());
            return Collections.emptySet();
        }
    }

    public List<String> suggestTags(String tenantId, String prefix) {
        return noteRepository.findTopTags(tenantId, prefix, 10);
    }

    public Map<String, Long> getTagUsageStats(String tenantId) {
        return noteRepository.getTagUsageStats(tenantId);
    }

    public List<Note> findSimilarNotes(String tenantId, String noteId) {
        Optional<Note> noteOpt = noteRepository.findById(noteId);
        if (!noteOpt.isPresent()) {
            return Collections.emptyList();
        }

        Note note = noteOpt.get();
        Set<String> tags = note.getTags();
        String sentiment = note.getSentiment() != null ? 
            note.getSentiment().getPrimarySentiment() : null;

        return noteRepository.findSimilarNotes(tenantId, noteId, tags, sentiment);
    }
} 