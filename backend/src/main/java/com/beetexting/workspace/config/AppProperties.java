package com.beetexting.workspace.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Data
@Component
@ConfigurationProperties(prefix = "app")
public class AppProperties {
    private final Auth auth = new Auth();
    private final Tenant tenant = new Tenant();
    private final RateLimit rateLimit = new RateLimit();
    private final WebSocket webSocket = new WebSocket();

    @Data
    public static class Auth {
        private String tokenSecret;
        private long tokenExpiration;
        private List<String> allowedOrigins = new ArrayList<>();
    }

    @Data
    public static class Tenant {
        private int maxUsersPerTenant;
        private List<String> defaultFeatures = new ArrayList<>();
    }

    @Data
    public static class RateLimit {
        private boolean enabled;
        private int defaultLimit;
        private int duration;
    }

    @Data
    public static class WebSocket {
        private List<String> allowedOrigins = new ArrayList<>();
        private String endpoint;
        private String destinationPrefix;
        private String applicationPrefix;
    }
} 