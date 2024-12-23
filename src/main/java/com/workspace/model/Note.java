package com.workspace.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import lombok.Data;
import java.time.Instant;
import java.util.List;

@Data
@Document(collection = "notes")
public class Note {
    @Id
    private String id;
    private String title;
    private String content;
    private String summary;
    private String tenantId;
    private String createdBy;
    private String lastModifiedBy;
    private List<String> tags;
    private String sentiment;
    private Integer version;
    private List<SharedUser> sharedWith;
    private SecureLink secureLink;
    private Instant createdAt;
    private Instant updatedAt;

    @Data
    public static class SharedUser {
        private String userId;
        private String role;
    }
} 