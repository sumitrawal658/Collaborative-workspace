package com.workspace.config;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Bucket4j;
import io.github.bucket4j.Refill;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.Scheduled;

import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Configuration
public class RateLimitConfig {
    
    private final Map<String, BucketInfo> tenantBuckets = new ConcurrentHashMap<>();
    private final Map<String, BucketInfo> userBuckets = new ConcurrentHashMap<>();
    
    public enum PricingPlan {
        FREE(100),      // 100 requests per minute
        BASIC(500),     // 500 requests per minute
        PROFESSIONAL(1000), // 1000 requests per minute
        ENTERPRISE(5000);   // 5000 requests per minute

        private final int requestsPerMinute;

        PricingPlan(int requestsPerMinute) {
            this.requestsPerMinute = requestsPerMinute;
        }

        public int getRequestsPerMinute() {
            return this.requestsPerMinute;
        }
    }

    private static class BucketInfo {
        final Bucket bucket;
        final long lastAccessTimestamp;
        final PricingPlan plan;

        BucketInfo(Bucket bucket, PricingPlan plan) {
            this.bucket = bucket;
            this.lastAccessTimestamp = System.currentTimeMillis();
            this.plan = plan;
        }
    }

    public Bucket resolveTenantBucket(String tenantId, PricingPlan plan) {
        BucketInfo bucketInfo = tenantBuckets.compute(tenantId, (key, existingBucket) -> {
            if (existingBucket == null || existingBucket.plan != plan) {
                return new BucketInfo(createBucket(plan), plan);
            }
            return new BucketInfo(existingBucket.bucket, plan);
        });
        return bucketInfo.bucket;
    }
    
    public Bucket resolveUserBucket(String userId, PricingPlan plan) {
        BucketInfo bucketInfo = userBuckets.compute(userId, (key, existingBucket) -> {
            if (existingBucket == null || existingBucket.plan != plan) {
                return new BucketInfo(createBucket(plan), plan);
            }
            return new BucketInfo(existingBucket.bucket, plan);
        });
        return bucketInfo.bucket;
    }
    
    private Bucket createBucket(PricingPlan plan) {
        Bandwidth limit = Bandwidth.classic(plan.getRequestsPerMinute(), 
            Refill.greedy(plan.getRequestsPerMinute(), Duration.ofMinutes(1)));
        return Bucket4j.builder()
            .addLimit(limit)
            .build();
    }

    public PricingPlan resolveUserPlan(String userId) {
        // This should be replaced with actual user plan resolution logic
        // For example, fetching from a database or user service
        return PricingPlan.BASIC;
    }

    public PricingPlan resolveTenantPlan(String tenantId) {
        // This should be replaced with actual tenant plan resolution logic
        // For example, fetching from a database or tenant service
        return PricingPlan.PROFESSIONAL;
    }

    public long getRemainingTokens(Bucket bucket) {
        return bucket.getAvailableTokens();
    }

    public Duration getResetTime(Bucket bucket) {
        return bucket.getAvailableTokens() == 0 ? 
            Duration.ofMinutes(1) : Duration.ZERO;
    }

    @Scheduled(fixedRate = 3600000) // Run every hour
    public void cleanupExpiredBuckets() {
        long expirationTime = System.currentTimeMillis() - Duration.ofHours(1).toMillis();
        
        tenantBuckets.entrySet().removeIf(entry -> 
            entry.getValue().lastAccessTimestamp < expirationTime);
        
        userBuckets.entrySet().removeIf(entry -> 
            entry.getValue().lastAccessTimestamp < expirationTime);
    }
} 