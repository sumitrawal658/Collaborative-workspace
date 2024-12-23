package com.beetexting.workspace.model;

import lombok.Data;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.annotation.Version;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.HashSet;
import java.util.Set;

@Data
@Document(collection = "users")
@CompoundIndexes({
    @CompoundIndex(name = "tenant_email", def = "{'tenantId': 1, 'email': 1}", unique = true),
    @CompoundIndex(name = "provider_providerId", def = "{'provider': 1, 'providerId': 1}", unique = true)
})
public class User {
    @Id
    private String id;

    @NotBlank
    @Size(max = 100)
    @Indexed(unique = true)
    @Email
    private String email;

    @NotBlank
    @Size(max = 100)
    private String name;

    @Size(max = 500)
    private String imageUrl;

    @NotBlank
    @Indexed
    private String tenantId;

    @Indexed
    private Set<String> roles = new HashSet<>();

    @NotBlank
    @Indexed
    private AuthProvider provider;

    @NotBlank
    private String providerId;

    private boolean emailVerified;

    private UserStatus status = UserStatus.ACTIVE;

    private UserPreferences preferences = new UserPreferences();

    @Version
    private Long version;

    @CreatedDate
    private Instant createdAt;

    @LastModifiedDate
    private Instant updatedAt;

    private Instant lastLoginAt;
    private Instant lastLogoutAt;
    private String lastLoginIp;

    public void setAuthProvider(String provider) {
    }

    public enum AuthProvider {
        GOOGLE,
        GITHUB
    }

    public enum UserStatus {
        ACTIVE,
        INACTIVE,
        SUSPENDED,
        DELETED
    }

    @Data
    public static class UserPreferences {
        private String theme = "light";
        private String language = "en";
        private boolean emailNotifications = true;
        private boolean pushNotifications = true;
        private Set<String> favoriteWorkspaces = new HashSet<>();
        private NotificationSettings notifications = new NotificationSettings();
    }

    @Data
    public static class NotificationSettings {
        private boolean workspaceUpdates = true;
        private boolean collaborationRequests = true;
        private boolean commentMentions = true;
        private boolean documentShares = true;
    }

    // Helper methods
    public void addRole(String role) {
        this.roles.add(role);
    }

    public void removeRole(String role) {
        this.roles.remove(role);
    }

    public boolean hasRole(String role) {
        return this.roles.contains(role);
    }

    public void updateLoginInfo(String ipAddress) {
        this.lastLoginAt = Instant.now();
        this.lastLoginIp = ipAddress;
    }

    public void updateLogoutInfo() {
        this.lastLogoutAt = Instant.now();
    }

    public boolean isActive() {
        return this.status == UserStatus.ACTIVE;
    }
} 
