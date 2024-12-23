package com.beetexting.workspace.controller;

import com.beetexting.workspace.model.Analytics;
import com.beetexting.workspace.service.AnalyticsService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@RestController
@RequestMapping("/api/analytics")
public class AnalyticsController {

    private final AnalyticsService analyticsService;
    private final Map<String, SseEmitter> emitters = new ConcurrentHashMap<>();

    @Autowired
    public AnalyticsController(AnalyticsService analyticsService) {
        this.analyticsService = analyticsService;
    }

    @GetMapping("/user-activity/{tenantId}")
    @PreAuthorize("hasRole('ADMIN')")
    public Analytics getUserActivityMetrics(@PathVariable String tenantId) {
        return analyticsService.getUserActivityMetrics(tenantId);
    }

    @GetMapping("/document-metrics/{tenantId}")
    @PreAuthorize("hasRole('ADMIN')")
    public Analytics getDocumentMetrics(@PathVariable String tenantId) {
        return analyticsService.getDocumentMetrics(tenantId);
    }

    @GetMapping("/sentiment/{tenantId}")
    @PreAuthorize("hasRole('ADMIN')")
    public Analytics getSentimentAnalysis(@PathVariable String tenantId) {
        return analyticsService.getSentimentAnalysis(tenantId);
    }

    @GetMapping(path = "/stream/{tenantId}", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    @PreAuthorize("hasRole('ADMIN')")
    public SseEmitter streamAnalytics(@PathVariable String tenantId) {
        SseEmitter emitter = new SseEmitter(Long.MAX_VALUE);
        emitters.put(tenantId, emitter);

        emitter.onCompletion(() -> emitters.remove(tenantId));
        emitter.onTimeout(() -> emitters.remove(tenantId));
        emitter.onError(e -> emitters.remove(tenantId));

        // Send initial data
        try {
            sendAnalyticsUpdate(tenantId);
        } catch (IOException e) {
            emitter.completeWithError(e);
        }

        return emitter;
    }

    public void sendAnalyticsUpdate(String tenantId) throws IOException {
        SseEmitter emitter = emitters.get(tenantId);
        if (emitter != null) {
            try {
                // Get latest analytics data
                Analytics userActivity = analyticsService.getUserActivityMetrics(tenantId);
                Analytics documentMetrics = analyticsService.getDocumentMetrics(tenantId);
                Analytics sentiment = analyticsService.getSentimentAnalysis(tenantId);

                // Send updates
                emitter.send(SseEmitter.event()
                        .name("user-activity")
                        .data(userActivity));

                emitter.send(SseEmitter.event()
                        .name("document-metrics")
                        .data(documentMetrics));

                emitter.send(SseEmitter.event()
                        .name("sentiment")
                        .data(sentiment));
            } catch (Exception e) {
                emitter.completeWithError(e);
                emitters.remove(tenantId);
            }
        }
    }
} 