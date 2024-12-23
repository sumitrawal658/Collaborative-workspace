package com.beetexting.workspace.service;

import com.amazonaws.services.comprehend.AmazonComprehend;
import com.amazonaws.services.comprehend.model.DetectSentimentRequest;
import com.amazonaws.services.comprehend.model.DetectSentimentResult;
import com.beetexting.workspace.model.Analytics;
import com.beetexting.workspace.model.Note;
import com.beetexting.workspace.repository.AnalyticsRepository;
import com.beetexting.workspace.repository.NoteRepository;
import com.beetexting.workspace.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class AnalyticsService {
    private static final Logger logger = LoggerFactory.getLogger(AnalyticsService.class);
    private static final int CACHE_DURATION_MINUTES = 5;

    private final AnalyticsRepository analyticsRepository;
    private final NoteRepository noteRepository;
    private final UserRepository userRepository;
    private final AmazonComprehend comprehendClient;

    @Autowired
    public AnalyticsService(
            AnalyticsRepository analyticsRepository,
            NoteRepository noteRepository,
            UserRepository userRepository,
            AmazonComprehend comprehendClient) {
        this.analyticsRepository = analyticsRepository;
        this.noteRepository = noteRepository;
        this.userRepository = userRepository;
        this.comprehendClient = comprehendClient;
    }

    public Analytics getUserActivityMetrics(String tenantId) {
        return getOrComputeAnalytics(tenantId, Analytics.AnalyticsType.USER_ACTIVITY, () -> {
            Analytics.UserActivity metrics = new Analytics.UserActivity();
            Instant oneDayAgo = Instant.now().minus(24, ChronoUnit.HOURS);

            // Query active users and their activities
            List<Note> recentNotes = noteRepository.findByTenantIdAndUpdatedAtAfter(tenantId, oneDayAgo);
            Map<String, Analytics.UserActivity> userActivities = new HashMap<>();

            recentNotes.forEach(note -> {
                String userId = note.getLastModifiedBy();
                userActivities.computeIfAbsent(userId, k -> {
                    Analytics.UserActivity activity = new Analytics.UserActivity();
                    activity.setUserId(userId);
                    activity.setUserName(userRepository.findById(userId).map(u -> u.getName()).orElse("Unknown"));
                    activity.setDocumentEdits(0);
                    activity.setRecentDocuments(new ArrayList<>());
                    return activity;
                });

                Analytics.UserActivity activity = userActivities.get(userId);
                activity.setDocumentEdits(activity.getDocumentEdits() + 1);
                activity.getRecentDocuments().add(note.getId());
                activity.setLastActive(note.getUpdatedAt());
            });

            Map<String, Object> data = new HashMap<>();
            data.put("activeUsers", userActivities.size());
            data.put("userActivities", userActivities.values());

            return data;
        });
    }

    public Analytics getDocumentMetrics(String tenantId) {
        return getOrComputeAnalytics(tenantId, Analytics.AnalyticsType.DOCUMENT_METRICS, () -> {
            Analytics.DocumentMetrics metrics = new Analytics.DocumentMetrics();
            Instant today = Instant.now().truncatedTo(ChronoUnit.DAYS);

            // Calculate document metrics
            List<Note> allNotes = noteRepository.findByTenantId(tenantId);
            metrics.setTotalDocuments(allNotes.size());
            metrics.setDocumentsCreatedToday((int) allNotes.stream()
                    .filter(note -> note.getCreatedAt().isAfter(today))
                    .count());

            // Calculate tag distribution
            Map<String, Integer> tagCounts = new HashMap<>();
            allNotes.forEach(note -> {
                note.getTags().forEach(tag -> 
                    tagCounts.merge(tag, 1, Integer::sum)
                );
            });
            metrics.setDocumentsByTag(tagCounts);

            // Calculate average document length
            double avgLength = allNotes.stream()
                    .mapToInt(note -> note.getContent().length())
                    .average()
                    .orElse(0.0);
            metrics.setAverageDocumentLength(avgLength);

            Map<String, Object> data = new HashMap<>();
            data.put("metrics", metrics);

            return data;
        });
    }

    public Analytics getSentimentAnalysis(String tenantId) {
        return getOrComputeAnalytics(tenantId, Analytics.AnalyticsType.SENTIMENT_ANALYSIS, () -> {
            Analytics.SentimentMetrics metrics = new Analytics.SentimentMetrics();
            List<Note> notes = noteRepository.findByTenantId(tenantId);
            List<Analytics.DocumentSentiment> documentSentiments = new ArrayList<>();

            notes.forEach(note -> {
                try {
                    DetectSentimentRequest request = new DetectSentimentRequest()
                            .withText(note.getContent())
                            .withLanguageCode("en");
                    DetectSentimentResult result = comprehendClient.detectSentiment(request);

                    Analytics.DocumentSentiment sentiment = new Analytics.DocumentSentiment();
                    sentiment.setDocumentId(note.getId());
                    sentiment.setTitle(note.getTitle());
                    sentiment.setPrimarySentiment(result.getSentiment());
                    sentiment.setSentimentScore(result.getSentimentScore().getPositive());
                    
                    Map<String, Double> scores = new HashMap<>();
                    scores.put("POSITIVE", result.getSentimentScore().getPositive());
                    scores.put("NEGATIVE", result.getSentimentScore().getNegative());
                    scores.put("NEUTRAL", result.getSentimentScore().getNeutral());
                    scores.put("MIXED", result.getSentimentScore().getMixed());
                    sentiment.setDetailedScores(scores);

                    documentSentiments.add(sentiment);
                } catch (Exception e) {
                    logger.error("Error analyzing sentiment for document {}: {}", note.getId(), e.getMessage());
                }
            });

            // Sort and get top positive/negative documents
            documentSentiments.sort((a, b) -> Double.compare(b.getSentimentScore(), a.getSentimentScore()));
            metrics.setTopPositiveDocuments(documentSentiments.subList(0, Math.min(5, documentSentiments.size())));
            
            List<Analytics.DocumentSentiment> negativeDocuments = new ArrayList<>(documentSentiments);
            Collections.reverse(negativeDocuments);
            metrics.setTopNegativeDocuments(negativeDocuments.subList(0, Math.min(5, negativeDocuments.size())));

            Map<String, Object> data = new HashMap<>();
            data.put("metrics", metrics);

            return data;
        });
    }

    private Analytics getOrComputeAnalytics(String tenantId, Analytics.AnalyticsType type, 
            java.util.function.Supplier<Map<String, Object>> computeFunction) {
        // Try to get from cache
        Optional<Analytics> cached = analyticsRepository.findByTenantIdAndTypeAndCacheExpiryAfter(
                tenantId, type, Instant.now());
        
        if (cached.isPresent()) {
            return cached.get();
        }

        // Compute new analytics
        Analytics analytics = new Analytics();
        analytics.setTenantId(tenantId);
        analytics.setType(type);
        analytics.setTimestamp(Instant.now());
        analytics.setCacheExpiry(CACHE_DURATION_MINUTES);
        
        Map<String, Object> data = computeFunction.get();
        analytics.updateData(data);

        return analyticsRepository.save(analytics);
    }

    @Scheduled(fixedRate = 300000) // 5 minutes
    public void cleanupExpiredAnalytics() {
        analyticsRepository.deleteByTimestampBefore(
                Instant.now().minus(24, ChronoUnit.HOURS)
        );
    }
} 