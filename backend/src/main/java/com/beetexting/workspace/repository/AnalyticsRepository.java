package com.beetexting.workspace.repository;

import com.beetexting.workspace.model.Analytics;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface AnalyticsRepository extends MongoRepository<Analytics, String> {

    @Query("{ 'tenantId': ?0, 'type': ?1, 'cacheExpiry': { $gt: ?2 } }")
    Optional<Analytics> findByTenantIdAndTypeAndCacheExpiryAfter(
            String tenantId, Analytics.AnalyticsType type, Instant timestamp);

    @Query("{ 'tenantId': ?0, 'type': ?1 }")
    List<Analytics> findByTenantIdAndType(String tenantId, Analytics.AnalyticsType type);

    @Query("{ 'tenantId': ?0, 'type': ?1, 'timestamp': { $gt: ?2 } }")
    List<Analytics> findByTenantIdAndTypeAfterTimestamp(
            String tenantId, Analytics.AnalyticsType type, Instant timestamp);

    @Query(value = "{ 'timestamp': { $lt: ?0 } }", delete = true)
    void deleteByTimestampBefore(Instant timestamp);

    @Query("{ 'tenantId': ?0, 'type': ?1 }")
    void deleteByTenantIdAndType(String tenantId, Analytics.AnalyticsType type);
} 