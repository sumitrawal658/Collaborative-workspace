# Collaborative Workspace - Setup Guide

## Prerequisites

### Local Development Environment
1. **Node.js and npm**
   ```bash
   # Install Node.js 18+ and npm
   brew install node    # macOS
   # or
   apt install nodejs   # Ubuntu
   ```

2. **Java Development Kit**
   ```bash
   # Install JDK 17+
   brew install openjdk@17    # macOS
   # or
   apt install openjdk-17-jdk # Ubuntu
   ```

3. **MongoDB**
   ```bash
   # Install MongoDB 6+
   brew install mongodb-community    # macOS
   # or
   apt install mongodb              # Ubuntu
   ```

4. **Redis**
   ```bash
   # Install Redis 7+
   brew install redis    # macOS
   # or
   apt install redis    # Ubuntu
   ```

5. **Docker**
   ```bash
   # Install Docker
   brew install docker    # macOS
   # or
   apt install docker.io # Ubuntu
   ```

### AWS Account Setup
1. Create an AWS account
2. Install AWS CLI
3. Configure AWS credentials:
   ```bash
   aws configure
   ```

### Development Tools
1. Install Angular CLI:
   ```bash
   npm install -g @angular/cli
   ```

2. Install Maven:
   ```bash
   brew install maven    # macOS
   # or
   apt install maven    # Ubuntu
   ```

## Initial Setup

1. **Clone the Repository**
   ```bash
   git clone https://github.com/yourusername/collaborative-workspace.git
   cd collaborative-workspace
   ```

2. **Set Up Environment Variables**
   ```bash
   # Copy example environment files
   cp backend/.env.example backend/.env
   cp frontend/src/environments/environment.example.ts frontend/src/environments/environment.ts
   
   # Edit the environment files with your configuration
   nano backend/.env
   nano frontend/src/environments/environment.ts
   ```

3. **Initialize the Project**
   ```bash
   # Run the initialization script
   ./scripts/init-project.sh
   ```

## Local Development

1. **Start Backend Services**
   ```bash
   # Start MongoDB with sharding
   ./scripts/setup-mongodb-sharding.sh
   
   # Start Redis
   redis-server
   
   # Start Spring Boot application
   cd backend
   ./mvnw spring-boot:run
   ```

2. **Start Frontend Development Server**
   ```bash
   cd frontend
   npm install
   ng serve
   ```

3. **Access the Application**
   - Frontend: http://localhost:4200
   - Backend API: http://localhost:8080
   - MongoDB: mongodb://localhost:27017
   - Redis: redis://localhost:6379

## Production Deployment

1. **Set Up AWS Infrastructure**
   ```bash
   # Deploy AWS infrastructure using CDK
   cd deployment/aws/cdk
   npm install
   cdk deploy
   ```

2. **Configure Environment Variables**
   ```bash
   # Set required AWS environment variables
   export AWS_REGION="us-east-1"
   export AWS_ACCOUNT_ID="your-account-id"
   export CLOUDFRONT_DISTRIBUTION_ID="your-distribution-id"
   export ALERT_EMAIL="your-email@example.com"
   ```

3. **Deploy Backend**
   ```bash
   # Build and deploy backend to ECS
   ./scripts/deploy-backend.sh
   ```

4. **Deploy Frontend**
   ```bash
   # Build and deploy frontend to S3/CloudFront
   ./scripts/deploy-frontend.sh
   ```

5. **Set Up Monitoring**
   ```bash
   # Configure CloudWatch and X-Ray
   ./scripts/setup-monitoring.sh
   ```

## Verification Steps

1. **Backend Health Check**
   ```bash
   curl https://api.yourdomain.com/health
   ```

2. **Frontend Access**
   - Open CloudFront URL in browser
   - Verify OAuth login
   - Test real-time collaboration

3. **Monitoring**
   - Check CloudWatch dashboard
   - Verify X-Ray traces
   - Test alert notifications

## Common Issues and Solutions

1. **MongoDB Connection Issues**
   ```bash
   # Check MongoDB status
   mongosh --eval "rs.status()"
   ```

2. **Redis Connection Issues**
   ```bash
   # Check Redis status
   redis-cli ping
   ```

3. **AWS Deployment Issues**
   ```bash
   # Check ECS service status
   aws ecs describe-services \
       --cluster WorkspaceCluster \
       --services BackendService
   ```

## Security Considerations

1. **SSL/TLS Configuration**
   - Enable HTTPS only
   - Configure security headers
   - Set up CORS properly

2. **Authentication**
   - Set up OAuth providers
   - Configure JWT settings
   - Enable MFA if required

3. **Data Protection**
   - Enable encryption at rest
   - Configure backup policies
   - Set up audit logging

## Maintenance Tasks

1. **Database Maintenance**
   ```bash
   # MongoDB backup
   mongodump --out /backup/$(date +%Y%m%d)
   
   # Redis backup
   redis-cli save
   ```

2. **Log Rotation**
   ```bash
   # Configure logrotate
   sudo nano /etc/logrotate.d/workspace
   ```

3. **Updates and Patches**
   ```bash
   # Update dependencies
   npm audit fix    # Frontend
   ./mvnw versions:display-dependency-updates    # Backend
   ```

## Scaling Guidelines

1. **Horizontal Scaling**
   - Adjust ECS task count
   - Configure MongoDB sharding
   - Set up Redis cluster

2. **Performance Tuning**
   - Optimize database indexes
   - Configure caching
   - Adjust JVM settings

## Support and Documentation

1. **Technical Documentation**
   - API documentation: `/docs/api`
   - Architecture: `/docs/architecture`
   - Testing guide: `/docs/testing`

2. **Monitoring**
   - CloudWatch dashboards
   - X-Ray traces
   - Log analysis

3. **Contact**
   - Technical support: support@yourdomain.com
   - Emergency contact: oncall@yourdomain.com 