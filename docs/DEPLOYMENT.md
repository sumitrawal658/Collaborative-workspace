# Deployment Guide

## Prerequisites
- Java 17 or higher
- Node.js 18 or higher
- Docker 20.10 or higher
- AWS CLI configured with appropriate permissions
- MongoDB 5.0 or higher
- Redis 6.2 or higher

## Infrastructure Setup

### AWS Services Configuration

#### 1. Amazon ECS (Elastic Container Service)
```bash
# Create ECS cluster
aws ecs create-cluster --cluster-name workspace-cluster

# Create task definition
aws ecs register-task-definition --cli-input-json file://task-definition.json

# Create service
aws ecs create-service --cli-input-json file://service-definition.json
```

#### 2. Amazon S3
```bash
# Create buckets
aws s3 mb s3://workspace-frontend
aws s3 mb s3://workspace-assets
aws s3 mb s3://workspace-backups

# Configure frontend bucket for static website hosting
aws s3 website s3://workspace-frontend --index-document index.html --error-document index.html
```

#### 3. Amazon CloudFront
```bash
# Create distribution for frontend
aws cloudfront create-distribution --cli-input-json file://cloudfront-config.json
```

#### 4. Amazon RDS for MongoDB
```bash
# Create MongoDB cluster
aws rds create-db-cluster --cli-input-json file://mongodb-config.json
```

#### 5. Amazon ElastiCache for Redis
```bash
# Create Redis cluster
aws elasticache create-cache-cluster --cli-input-json file://redis-config.json
```

### Security Configuration

#### 1. SSL/TLS Certificates
```bash
# Request certificate
aws acm request-certificate --domain-name api.workspace.com --validation-method DNS

# Add CNAME record to your DNS
aws route53 change-resource-record-sets --hosted-zone-id YOUR_ZONE_ID --change-batch file://dns-config.json
```

#### 2. Security Groups
```bash
# Create security groups
aws ec2 create-security-group --group-name workspace-api-sg --description "API Security Group"
aws ec2 create-security-group --group-name workspace-db-sg --description "Database Security Group"

# Configure security group rules
aws ec2 authorize-security-group-ingress --group-id sg-xxx --protocol tcp --port 443 --cidr 0.0.0.0/0
```

## Application Deployment

### Backend Deployment

#### 1. Build and Push Docker Image
```bash
# Build image
docker build -t workspace-api .

# Tag image
docker tag workspace-api:latest $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/workspace-api:latest

# Push to ECR
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/workspace-api:latest
```

#### 2. Deploy to ECS
```bash
# Update service
aws ecs update-service --cluster workspace-cluster --service workspace-api --force-new-deployment
```

### Frontend Deployment

#### 1. Build Frontend
```bash
# Install dependencies
npm install

# Build production bundle
npm run build

# Deploy to S3
aws s3 sync dist/ s3://workspace-frontend/ --delete
```

#### 2. Invalidate CloudFront Cache
```bash
# Create invalidation
aws cloudfront create-invalidation --distribution-id $DISTRIBUTION_ID --paths "/*"
```

## Monitoring Setup

### 1. CloudWatch Alarms
```bash
# Create CPU utilization alarm
aws cloudwatch put-metric-alarm --cli-input-json file://cpu-alarm.json

# Create memory utilization alarm
aws cloudwatch put-metric-alarm --cli-input-json file://memory-alarm.json

# Create API latency alarm
aws cloudwatch put-metric-alarm --cli-input-json file://latency-alarm.json
```

### 2. Logging Configuration
```bash
# Create log group
aws logs create-log-group --log-group-name /workspace/api

# Set retention policy
aws logs put-retention-policy --log-group-name /workspace/api --retention-in-days 30
```

## Scaling Configuration

### 1. Auto Scaling
```bash
# Create auto scaling target
aws application-autoscaling register-scalable-target --cli-input-json file://scaling-target.json

# Create scaling policy
aws application-autoscaling put-scaling-policy --cli-input-json file://scaling-policy.json
```

### 2. Load Balancer Configuration
```bash
# Create target group
aws elbv2 create-target-group --cli-input-json file://target-group.json

# Create load balancer
aws elbv2 create-load-balancer --cli-input-json file://load-balancer.json
```

## Backup Strategy

### 1. Database Backups
```bash
# Configure automated backups
aws rds modify-db-cluster --db-cluster-identifier workspace-cluster --backup-retention-period 7

# Create manual snapshot
aws rds create-db-cluster-snapshot --db-cluster-identifier workspace-cluster --db-cluster-snapshot-identifier manual-backup-1
```

### 2. Application State Backups
```bash
# Configure S3 lifecycle policy
aws s3api put-bucket-lifecycle-configuration --bucket workspace-backups --lifecycle-configuration file://lifecycle-config.json
```

## Troubleshooting

### Common Issues and Solutions

1. **Container Health Check Failures**
   - Check container logs: `aws logs get-log-events --log-group-name /workspace/api --log-stream-name $STREAM_NAME`
   - Verify environment variables
   - Check resource limits

2. **Database Connection Issues**
   - Verify security group rules
   - Check connection string configuration
   - Validate credentials

3. **High Latency**
   - Review CloudWatch metrics
   - Check resource utilization
   - Analyze slow queries

4. **Memory Leaks**
   - Analyze heap dumps
   - Review garbage collection logs
   - Monitor memory usage patterns

## Maintenance

### Regular Maintenance Tasks

1. **Daily**
   - Monitor error rates
   - Check system health
   - Review security alerts

2. **Weekly**
   - Analyze performance metrics
   - Review resource utilization
   - Check backup status

3. **Monthly**
   - Apply security patches
   - Update dependencies
   - Review and optimize costs

### Emergency Procedures

1. **Service Outage**
   ```bash
   # Roll back to last known good deployment
   aws ecs update-service --cluster workspace-cluster --service workspace-api --task-definition workspace-api:LAST_KNOWN_GOOD_VERSION
   ```

2. **Data Recovery**
   ```bash
   # Restore from backup
   aws rds restore-db-cluster-from-snapshot --cli-input-json file://restore-config.json
   ```

## Security Best Practices

1. **Access Management**
   - Use IAM roles and policies
   - Implement least privilege principle
   - Regularly rotate credentials

2. **Network Security**
   - Use VPC endpoints
   - Implement WAF rules
   - Enable DDoS protection

3. **Data Protection**
   - Encrypt data at rest
   - Use SSL/TLS for data in transit
   - Implement backup encryption

## Performance Optimization

1. **Caching Strategy**
   - Configure Redis caching
   - Implement browser caching
   - Use CloudFront caching

2. **Database Optimization**
   - Create appropriate indexes
   - Optimize queries
   - Configure connection pooling

3. **Application Tuning**
   - Configure JVM parameters
   - Optimize static assets
   - Implement request batching
  </rewritten_file>