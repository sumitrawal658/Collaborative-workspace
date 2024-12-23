package com.beetexting.workspace.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "tenants")
public class Tenant {
  @Id
  private String id;
  private String name;
  private String domain;
  private TenantSettings settings;
  private LocalDateTime createdAt;

  // Getters and Setters
  // ... (implement all getters and setters)
}
