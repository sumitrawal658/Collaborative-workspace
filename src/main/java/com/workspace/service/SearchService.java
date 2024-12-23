package com.workspace.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;
import com.workspace.model.Note;
import java.util.List;
import java.util.Set;

@Service
public class SearchService {
    
    @Autowired
    private MongoTemplate mongoTemplate;
    
    public List<Note> searchNotes(SearchCriteria criteria) {
        Query query = new Query();
        
        // Add tenant isolation
        query.addCriteria(Criteria.where("tenantId").is(criteria.getTenantId()));
        
        // Full-text search in title and content
        if (criteria.getKeyword() != null) {
            Criteria textCriteria = new Criteria().orOperator(
                Criteria.where("title").regex(criteria.getKeyword(), "i"),
                Criteria.where("content").regex(criteria.getKeyword(), "i")
            );
            query.addCriteria(textCriteria);
        }
        
        // Filter by tags
        if (!criteria.getTags().isEmpty()) {
            query.addCriteria(Criteria.where("tags").all(criteria.getTags()));
        }
        
        // Filter by sentiment
        if (criteria.getSentiment() != null) {
            query.addCriteria(Criteria.where("sentiment").is(criteria.getSentiment()));
        }
        
        // Add pagination
        query.skip(criteria.getPage() * criteria.getSize())
            .limit(criteria.getSize());
        
        return mongoTemplate.find(query, Note.class);
    }
    
    public static class SearchCriteria {
        private String tenantId;
        private String keyword;
        private Set<String> tags;
        private String sentiment;
        private int page = 0;
        private int size = 20;
        
        // Getters and setters
        public String getTenantId() { return tenantId; }
        public void setTenantId(String tenantId) { this.tenantId = tenantId; }
        
        public String getKeyword() { return keyword; }
        public void setKeyword(String keyword) { this.keyword = keyword; }
        
        public Set<String> getTags() { return tags; }
        public void setTags(Set<String> tags) { this.tags = tags; }
        
        public String getSentiment() { return sentiment; }
        public void setSentiment(String sentiment) { this.sentiment = sentiment; }
        
        public int getPage() { return page; }
        public void setPage(int page) { this.page = page; }
        
        public int getSize() { return size; }
        public void setSize(int size) { this.size = size; }
    }
} 