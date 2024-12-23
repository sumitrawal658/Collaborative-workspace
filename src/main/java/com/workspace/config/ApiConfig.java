package com.workspace.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.services.comprehend.ComprehendClient;
import software.amazon.awssdk.regions.Region;
import com.theokanning.openai.OpenAiService;

@Configuration
public class ApiConfig {

    @Value("${aws.region}")
    private String awsRegion;

    @Value("${openai.api.key}")
    private String openAiApiKey;

    @Bean
    public ComprehendClient comprehendClient() {
        return ComprehendClient.builder()
            .region(Region.of(awsRegion))
            .build();
    }

    @Bean
    public OpenAiService openAiService() {
        return new OpenAiService(openAiApiKey);
    }
} 