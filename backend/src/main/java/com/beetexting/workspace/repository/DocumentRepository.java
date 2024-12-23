package com.beetexting.workspace.repository;

import com.beetexting.workspace.model.DocumentClass;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DocumentRepository extends MongoRepository<DocumentClass, String> {

    @Query("{ 'tenantId': ?0, 'workspaceId': ?1 }")
    List<DocumentClass> findByTenantAndWorkspace(String tenantId, String workspaceId);

    @Query("{ 'tenantId': ?0, 'workspaceId': ?1, 'title': { $regex: ?2, $options: 'i' } }")
    List<DocumentClass> searchByTitle(String tenantId, String workspaceId, String titleQuery);

    @Query(value = "{ 'tenantId': ?0 }", count = true)
    long countByTenant(String tenantId);

    @Query("{ 'tenantId': ?0, 'lastModifiedAt': { $gt: ?1 } }")
    List<DocumentClass> findRecentlyModified(String tenantId, String since);
}
