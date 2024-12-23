package com.beetexting.workspace.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.Version;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.index.TextIndexed;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.TextScore;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Data
@Document(collection = "notes")
@CompoundIndexes({
    @CompoundIndex(name = "tenant_title", def = "{'tenantId': 1, 'title': 1}"),
    @CompoundIndex(name = "tenant_tags", def = "{'tenantId': 1, 'tags': 1}"),
    @CompoundIndex(name = "tenant_sentiment", def = "{'tenantId': 1, 'sentiment.primarySentiment': 1}")
})
public class Note {
    @Id
    private String id;

    @TextIndexed(weight = 2)
    private String title;

    @TextIndexed(weight = 1)
    private String content;

    private String tenantId;
    private Set<String> tags = new HashSet<>();
    private List<NoteVersion> versions = new ArrayList<>();
    private Set<String> collaborators = new HashSet<>();
    private SentimentInfo sentiment;

    @TextScore
    private Float score;

    @Version
    private Long version;

    private Instant createdAt;
    private Instant updatedAt;
    private String createdBy;
    private String lastModifiedBy;

    @Data
    public static class NoteVersion {
        private String content;
        private Long version;
        private String userId;
        private Instant timestamp;
        private String changeType;
        private String changeDescription;
        private Set<String> tags;
        private SentimentInfo sentiment;
    }

    @Data
    public static class SentimentInfo {
        private String primarySentiment;
        private Map<String, Double> scores;
        private Instant analyzedAt;
    }

    public void addVersion(String content, String userId, String changeType, String changeDescription) {
        NoteVersion noteVersion = new NoteVersion();
        noteVersion.setContent(content);
        noteVersion.setVersion(this.version);
        noteVersion.setUserId(userId);
        noteVersion.setTimestamp(Instant.now());
        noteVersion.setChangeType(changeType);
        noteVersion.setChangeDescription(changeDescription);
        noteVersion.setTags(new HashSet<>(this.tags));
        noteVersion.setSentiment(this.sentiment);
        
        this.versions.add(noteVersion);
        this.content = content;
        this.updatedAt = Instant.now();
        this.lastModifiedBy = userId;
    }

    public void addCollaborator(String userId) {
        this.collaborators.add(userId);
    }

    public void removeCollaborator(String userId) {
        this.collaborators.remove(userId);
    }

    public boolean hasCollaborator(String userId) {
        return this.collaborators.contains(userId);
    }

    public void addTag(String tag) {
        this.tags.add(tag);
    }

    public void removeTag(String tag) {
        this.tags.remove(tag);
    }

    public void updateSentiment(String primarySentiment, Map<String, Double> scores) {
        if (this.sentiment == null) {
            this.sentiment = new SentimentInfo();
        }
        this.sentiment.setPrimarySentiment(primarySentiment);
        this.sentiment.setScores(scores);
        this.sentiment.setAnalyzedAt(Instant.now());
    }
} 