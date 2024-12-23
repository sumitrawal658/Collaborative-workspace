package com.beetexting.workspace.repository;

import com.beetexting.workspace.model.Note;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.Aggregation;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Repository
public interface NoteRepository extends MongoRepository<Note, String> {

    @Query("{ 'tenantId': ?0, 'tags': { $in: ?1 }, 'sentiment.primarySentiment': ?2 }")
    Page<Note> findByTenantIdAndTagsInAndSentiment(
            String tenantId, Set<String> tags, String sentiment, Pageable pageable);

    @Query("{ 'tenantId': ?0, 'tags': { $in: ?1 } }")
    Page<Note> findByTenantIdAndTagsIn(String tenantId, Set<String> tags, Pageable pageable);

    @Query("{ 'tenantId': ?0, 'sentiment.primarySentiment': ?1 }")
    Page<Note> findByTenantIdAndSentiment(String tenantId, String sentiment, Pageable pageable);

    @Query("{ 'tenantId': ?0 }")
    Page<Note> findByTenantId(String tenantId, Pageable pageable);

    @Query("{ 'tenantId': ?0, $text: { $search: ?1 } }")
    Page<Note> searchByTenantIdAndContent(String tenantId, String query, Pageable pageable);

    @Query("{ 'tenantId': ?0, 'updatedAt': { $gt: ?1 } }")
    List<Note> findByTenantIdAndUpdatedAtAfter(String tenantId, Instant since);

    @Aggregation(pipeline = {
        "{ $match: { 'tenantId': ?0 } }",
        "{ $unwind: '$tags' }",
        "{ $match: { 'tags': { $regex: ?1, $options: 'i' } } }",
        "{ $group: { _id: '$tags', count: { $sum: 1 } } }",
        "{ $sort: { count: -1 } }",
        "{ $limit: ?2 }",
        "{ $project: { _id: 0, tag: '$_id' } }"
    })
    List<String> findTopTags(String tenantId, String prefix, int limit);

    @Aggregation(pipeline = {
        "{ $match: { 'tenantId': ?0 } }",
        "{ $unwind: '$tags' }",
        "{ $group: { _id: '$tags', count: { $sum: 1 } } }",
        "{ $project: { _id: 0, tag: '$_id', count: 1 } }"
    })
    List<TagCount> getTagUsageStats(String tenantId);

    @Query(value = "{ " +
        "'tenantId': ?0, " +
        "_id': { $ne: ?1 }, " +
        "$or: [ " +
            "{ 'tags': { $in: ?2 } }, " +
            "{ 'sentiment.primarySentiment': ?3 } " +
        "] " +
    "}", sort = "{ score: -1 }")
    List<Note> findSimilarNotes(String tenantId, String noteId, Set<String> tags, String sentiment);

    interface TagCount {
        String getTag();
        Long getCount();
    }
} 