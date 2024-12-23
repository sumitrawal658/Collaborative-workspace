package com.beetexting.workspace.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Data
@Document(collection = "analytics")
@CompoundIndexes({
    @CompoundIndex(name = "tenant_type_timestamp", def = "{'tenantId': 1, 'type': 1, 'timestamp': -1}")
})
public class Analytics {
    @Id
    private String id;

    private String tenantId;
    private AnalyticsType type;
    private Map<String, Object> data = new HashMap<>();
    private Map<String, String> metadata = new HashMap<>();
    private Instant timestamp;
    private Instant cacheExpiry;
    private Instant lastUpdated;

    public enum AnalyticsType {
        USER_ACTIVITY,
        DOCUMENT_METRICS,
        SENTIMENT_ANALYSIS,
        COLLABORATION_METRICS
    }

    @Data
    public static class UserActivity {
        private String userId;
        private String userName;
        private int documentEdits;
        private int commentsAdded;
        private Instant lastActive;
        private List<String> recentDocuments;
    }

    @Data
    public static class DocumentMetrics {
        private int totalDocuments;
        private int activeDocuments;
        private int documentsCreatedToday;
        private Map<String, Integer> documentsByTag;
        private double averageDocumentLength;
    }

    @Data
    public static class SentimentMetrics {
        private Map<String, Double> overallSentiment;
        private List<DocumentSentiment> topPositiveDocuments;
        private List<DocumentSentiment> topNegativeDocuments;
        private Map<String, Double> sentimentTrends;
    }

    @Data
    public static class DocumentSentiment {
        private String documentId;
        private String title;
        private double sentimentScore;
        private String primarySentiment;
        private Map<String, Double> detailedScores;
    }

    @Data
    public static class CollaborationMetrics {
        private int activeCollaborations;
        private int totalCollaborators;
        private Map<String, Integer> collaboratorsByDocument;
        private List<String> mostCollaborativeUsers;
    }

    public void updateData(Map<String, Object> newData) {
        this.data.putAll(newData);
        this.lastUpdated = Instant.now();
    }

    public void addMetadata(String key, String value) {
        this.metadata.put(key, value);
    }

    public boolean isCacheExpired() {
        return cacheExpiry != null && Instant.now().isAfter(cacheExpiry);
    }

    public void setCacheExpiry(int minutes) {
        this.cacheExpiry = Instant.now().plusSeconds(minutes * 60L);
    }
} 