package com.beetexting.workspace.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDateTime;
import java.util.Set;



public class TenantSettings {
    private int maxUsers;
    private Set<String> allowedFeatures;
    private int apiRateLimit;

    // Getters and Setters
    // ... (implement all getters and setters)
}
