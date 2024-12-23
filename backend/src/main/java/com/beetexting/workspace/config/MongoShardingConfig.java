package com.beetexting.workspace.config;

import com.mongodb.MongoClientSettings;
import com.mongodb.ReadPreference;
import com.mongodb.WriteConcern;
import com.mongodb.connection.ClusterSettings;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.mongodb.MongoDatabaseFactory;
import org.springframework.data.mongodb.MongoTransactionManager;
import org.springframework.data.mongodb.config.AbstractMongoClientConfiguration;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.convert.DefaultMongoTypeMapper;
import org.springframework.data.mongodb.core.convert.MappingMongoConverter;
import org.springframework.data.mongodb.core.convert.MongoCustomConversions;
import org.springframework.data.mongodb.core.mapping.MongoMappingContext;

import java.util.concurrent.TimeUnit;

@Configuration
public class MongoShardingConfig extends AbstractMongoClientConfiguration {

    @Value("${spring.data.mongodb.uri}")
    private String mongoUri;

    @Value("${app.mongodb.read-preference:primaryPreferred}")
    private String readPreference;

    @Value("${app.mongodb.write-concern.w:majority}")
    private String writeConcernW;

    @Value("${app.mongodb.write-concern.j:true}")
    private boolean writeConcernJ;

    @Value("${app.mongodb.write-concern.wtimeout:5000}")
    private int writeConcernTimeout;

    @Override
    protected String getDatabaseName() {
        return "workspace";
    }

    @Override
    protected void configureClientSettings(MongoClientSettings.Builder builder) {
        // Configure cluster settings for sharding
        builder.applyToClusterSettings(this::configureCluster);
        
        // Configure read preference
        builder.readPreference(ReadPreference.valueOf(readPreference));
        
        // Configure write concern
        builder.writeConcern(WriteConcern.valueOf(writeConcernW)
            .withJournal(writeConcernJ)
            .withWTimeout(writeConcernTimeout, TimeUnit.MILLISECONDS));
        
        // Configure connection pool
        builder.applyToConnectionPoolSettings(settings -> settings
            .maxSize(100)
            .minSize(10)
            .maxConnectionIdleTime(60000, TimeUnit.MILLISECONDS)
            .maxWaitTime(10000, TimeUnit.MILLISECONDS));
        
        // Configure server selection timeout
        builder.applyToServerSettings(settings -> settings
            .heartbeatFrequency(10000, TimeUnit.MILLISECONDS)
            .minHeartbeatFrequency(500, TimeUnit.MILLISECONDS));
        
        // Configure socket settings
        builder.applyToSocketSettings(settings -> settings
            .connectTimeout(10000, TimeUnit.MILLISECONDS)
            .readTimeout(60000, TimeUnit.MILLISECONDS));
    }

    private void configureCluster(ClusterSettings.Builder settings) {
        settings
            .serverSelectionTimeout(30000, TimeUnit.MILLISECONDS)
            .localThreshold(15, TimeUnit.MILLISECONDS);
    }

    @Bean
    public MongoTemplate mongoTemplate(MongoDatabaseFactory mongoDbFactory, MappingMongoConverter converter) {
        converter.setTypeMapper(new DefaultMongoTypeMapper(null)); // Remove _class field
        return new MongoTemplate(mongoDbFactory, converter);
    }

    @Bean
    public MongoTransactionManager transactionManager(MongoDatabaseFactory dbFactory) {
        return new MongoTransactionManager(dbFactory);
    }

    @Bean
    public MongoCustomConversions mongoCustomConversions() {
        return new MongoCustomConversions(java.util.Collections.emptyList());
    }

    @Bean
    public MongoMappingContext mongoMappingContext(MongoCustomConversions conversions) {
        MongoMappingContext context = new MongoMappingContext();
        context.setSimpleTypeHolder(conversions.getSimpleTypeHolder());
        return context;
    }
} 