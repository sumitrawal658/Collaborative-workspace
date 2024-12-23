package com.workspace.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.scheduling.annotation.Scheduled;
import com.workspace.repository.NoteRepository;
import com.workspace.repository.UserRepository;
import java.util.*;
import java.time.Instant;
import java.time.temporal.ChronoUnit;

@Service
public class AnalyticsService {
    
    @Autowired
    private SimpMessagingTemplate messagingTemplate;
    
    @Autowired
    private NoteRepository noteRepository;
    
    @Autowired
    private UserRepository userRepository;
    
    @Scheduled(fixedRate = 60000) // Update every minute
    public void computeAndBroadcastAnalytics() {
        Map<String, TenantAnalytics> tenantAnalytics = new HashMap<>();
        
        // Compute analytics for each tenant
        noteRepository.findAll().forEach(note -> {
            String tenantId = note.getTenantId();
            TenantAnalytics analytics = tenantAnalytics.computeIfAbsent(
                tenantId,
                k -> new TenantAnalytics()
            );
            
            // Update active users
            if (note.getUpdatedAt().isAfter(Instant.now().minus(15, ChronoUnit.MINUTES))) {
                analytics.activeUsers.add(note.getLastModifiedBy());
            }
            
            // Update sentiment distribution
            analytics.sentimentDistribution.merge(
                note.getSentiment(),
                1,
                Integer::sum
            );
            
            // Update most active users
            analytics.userEditCounts.merge(
                note.getLastModifiedBy(),
                1,
                Integer::sum
            );
        });
        
        // Broadcast analytics to each tenant
        tenantAnalytics.forEach((tenantId, analytics) -> {
            messagingTemplate.convertAndSend(
                "/topic/analytics/" + tenantId,
                Map.of(
                    "activeUsers", analytics.activeUsers.size(),
                    "sentimentDistribution", analytics.sentimentDistribution,
                    "mostActiveUsers", getMostActiveUsers(analytics.userEditCounts)
                )
            );
        });
    }
    
    private List<Map<String, Object>> getMostActiveUsers(Map<String, Integer> userEditCounts) {
        return userEditCounts.entrySet().stream()
            .sorted(Map.Entry.<String, Integer>comparingByValue().reversed())
            .limit(5)
            .map(entry -> Map.of(
                "userId", entry.getKey(),
                "editCount", entry.getValue()
            ))
            .toList();
    }
    
    private static class TenantAnalytics {
        Set<String> activeUsers = new HashSet<>();
        Map<String, Integer> sentimentDistribution = new HashMap<>();
        Map<String, Integer> userEditCounts = new HashMap<>();
    }
} 