#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}Initializing Collaborative Workspace Project${NC}"
echo "----------------------------------------"

# Create main project directories
mkdir -p frontend/src/app/{core,shared,features}/{components,services,models,guards,interceptors,pipes,directives}
mkdir -p frontend/src/app/features/{auth,workspace,editor,analytics}/{components,services,models}
mkdir -p frontend/src/assets/{icons,images,styles}
mkdir -p frontend/src/environments

# Create backend structure
mkdir -p backend/src/main/java/com/beetexting/workspace/{config,controller,model,repository,service,security,util}
mkdir -p backend/src/main/resources/{static,templates}
mkdir -p backend/src/test/java/com/beetexting/workspace
mkdir -p backend/src/test/resources

# Create documentation directories
mkdir -p docs/{api,architecture,deployment,testing}

# Create deployment and configuration directories
mkdir -p deployment/{docker,k8s,aws}
mkdir -p config/{dev,staging,prod}

# Create initial README files
cat > README.md <<EOL
# Collaborative Workspace Application

A multi-tenant platform enabling real-time collaboration, document management, and analytics.

## Features

- OAuth2 Authentication (Google/GitHub)
- Real-time Collaboration
- Analytics Dashboard
- Multi-tenancy Support
- Advanced Search
- Third-party Integrations

## Tech Stack

- Frontend: Angular
- Backend: Spring Boot
- Database: MongoDB
- Cloud: AWS

## Getting Started

1. Clone the repository
2. Run \`./scripts/setup-mongodb.sh\` to set up MongoDB
3. Run \`./scripts/setup-env.sh\` to configure environment variables
4. Start the backend: \`cd backend && ./mvnw spring-boot:run\`
5. Start the frontend: \`cd frontend && npm start\`

## Documentation

- [Technical Specification](docs/TECHNICAL_SPECIFICATION.md)
- [API Documentation](docs/api/README.md)
- [Architecture Guide](docs/architecture/README.md)
- [Deployment Guide](docs/deployment/README.md)
EOL

cat > docs/api/README.md <<EOL
# API Documentation

## Authentication Endpoints

### POST /auth/token
Get JWT token after OAuth2 authentication

### POST /auth/refresh
Refresh expired JWT token

### GET /auth/user
Get current user information

## Workspace Endpoints

### GET /api/workspaces
List all workspaces for current user

### POST /api/workspaces
Create new workspace

### GET /api/workspaces/{id}
Get workspace details

## Notes Endpoints

### GET /api/notes
List all notes in workspace

### POST /api/notes
Create new note

### PUT /api/notes/{id}
Update note content

## Analytics Endpoints

### GET /api/analytics/workspace/{id}
Get workspace analytics

### GET /api/analytics/user/{id}
Get user activity analytics
EOL

cat > docs/architecture/README.md <<EOL
# Architecture Documentation

## System Components

1. Frontend (Angular)
   - Core Module
   - Feature Modules
   - Shared Module

2. Backend (Spring Boot)
   - REST Controllers
   - Service Layer
   - Data Access Layer

3. Database (MongoDB)
   - Users Collection
   - Workspaces Collection
   - Notes Collection

4. AWS Infrastructure
   - EC2 Instances
   - S3 Storage
   - CloudFront CDN

## Security Architecture

1. Authentication
   - OAuth2 Providers
   - JWT Tokens
   - Role-based Access

2. Data Security
   - Encryption at Rest
   - Secure Communication
   - Regular Audits

## Scalability

1. Horizontal Scaling
   - Load Balancing
   - Database Sharding
   - Caching Strategy

2. Performance Optimization
   - CDN Integration
   - Database Indexing
   - Connection Pooling
EOL

cat > docs/deployment/README.md <<EOL
# Deployment Guide

## Local Development

1. Prerequisites
   - Java 17
   - Node.js 18+
   - MongoDB
   - Docker

2. Environment Setup
   - Configure environment variables
   - Set up MongoDB
   - Install dependencies

3. Running the Application
   - Start MongoDB
   - Run backend server
   - Run frontend development server

## Production Deployment

1. AWS Setup
   - EC2 Configuration
   - S3 Bucket Creation
   - CloudFront Distribution

2. Database Setup
   - MongoDB Atlas Configuration
   - Initial Collections
   - Backup Strategy

3. CI/CD Pipeline
   - GitHub Actions
   - Automated Testing
   - Deployment Process
EOL

# Make scripts executable
chmod +x scripts/*.sh

echo -e "${GREEN}Project structure initialized successfully!${NC}"
echo "Next steps:"
echo "1. Run ./scripts/setup-mongodb.sh to set up the database"
echo "2. Configure environment variables in backend/.env"
echo "3. Start implementing the core features" 