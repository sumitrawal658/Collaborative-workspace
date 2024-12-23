package com.workspace.interceptor;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.workspace.config.RateLimitConfig;
import com.workspace.config.RateLimitConfig.PricingPlan;
import io.github.bucket4j.Bucket;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.time.Duration;
import java.util.HashMap;
import java.util.Map;

@Component
public class RateLimitInterceptor implements HandlerInterceptor {
    
    @Autowired
    private RateLimitConfig rateLimitConfig;
    
    @Autowired
    private ObjectMapper objectMapper;
    
    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        String tenantId = request.getHeader("X-Tenant-ID");
        String userId = request.getHeader("X-User-ID");
        
        if (tenantId == null || userId == null) {
            sendErrorResponse(response, HttpStatus.BAD_REQUEST, "Missing required headers: X-Tenant-ID or X-User-ID");
            return false;
        }

        // Resolve plans
        PricingPlan tenantPlan = rateLimitConfig.resolveTenantPlan(tenantId);
        PricingPlan userPlan = rateLimitConfig.resolveUserPlan(userId);
        
        // Check tenant rate limit
        Bucket tenantBucket = rateLimitConfig.resolveTenantBucket(tenantId, tenantPlan);
        if (!tenantBucket.tryConsume(1)) {
            Duration resetTime = rateLimitConfig.getResetTime(tenantBucket);
            setRateLimitHeaders(response, tenantBucket, tenantPlan, "tenant");
            sendErrorResponse(response, HttpStatus.TOO_MANY_REQUESTS, 
                "Tenant rate limit exceeded. Please try again in " + resetTime.getSeconds() + " seconds.");
            return false;
        }
        
        // Check user rate limit
        Bucket userBucket = rateLimitConfig.resolveUserBucket(userId, userPlan);
        if (!userBucket.tryConsume(1)) {
            Duration resetTime = rateLimitConfig.getResetTime(userBucket);
            setRateLimitHeaders(response, userBucket, userPlan, "user");
            sendErrorResponse(response, HttpStatus.TOO_MANY_REQUESTS, 
                "User rate limit exceeded. Please try again in " + resetTime.getSeconds() + " seconds.");
            return false;
        }
        
        // Set rate limit headers for successful requests
        setRateLimitHeaders(response, userBucket, userPlan, "user");
        setRateLimitHeaders(response, tenantBucket, tenantPlan, "tenant");
        
        return true;
    }
    
    private void setRateLimitHeaders(HttpServletResponse response, Bucket bucket, PricingPlan plan, String type) {
        response.setHeader("X-RateLimit-" + type + "-Limit", String.valueOf(plan.getRequestsPerMinute()));
        response.setHeader("X-RateLimit-" + type + "-Remaining", String.valueOf(rateLimitConfig.getRemainingTokens(bucket)));
        response.setHeader("X-RateLimit-" + type + "-Reset", String.valueOf(rateLimitConfig.getResetTime(bucket).getSeconds()));
    }
    
    private void sendErrorResponse(HttpServletResponse response, HttpStatus status, String message) throws Exception {
        response.setStatus(status.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        
        Map<String, Object> errorResponse = new HashMap<>();
        errorResponse.put("status", status.value());
        errorResponse.put("error", status.getReasonPhrase());
        errorResponse.put("message", message);
        
        response.getWriter().write(objectMapper.writeValueAsString(errorResponse));
    }
} 