#!/bin/bash

# Create main project directory
mkdir -p collaborative-workspace/{frontend,backend,docs,scripts}

# Frontend structure
cd collaborative-workspace/frontend
mkdir -p src/app/{core,shared,features}/{components,services,models,guards,interceptors}
mkdir -p src/app/features/{auth,workspace,analytics,search}
mkdir -p src/assets/{styles,images,icons}

# Backend structure
cd ../backend
mkdir -p src/main/java/com/beetexting/workspace/{config,controller,model,repository,service,security,exception}
mkdir -p src/main/resources/{static,templates}
mkdir -p src/test/java/com/beetexting/workspace

# Documentation
cd ../docs
touch README.md ARCHITECTURE.md API.md DEPLOYMENT.md

# Create initial README
echo "# Collaborative Workspace

A multi-tenant collaborative workspace application with real-time features and analytics.

## Features
- OAuth2 Authentication (Google/GitHub)
- Real-time collaboration
- Analytics dashboard
- Advanced search
- Secure note sharing
- Sentiment analysis

## Tech Stack
- Frontend: Angular
- Backend: Spring Boot
- Database: MongoDB
- Cloud: AWS (ECS Fargate, S3, DynamoDB)

## Getting Started
1. Clone the repository
2. Set up environment variables
3. Run frontend: \`npm start\`
4. Run backend: \`./mvnw spring-boot:run\`

## Documentation
- [Architecture](./ARCHITECTURE.md)
- [API Documentation](./API.md)
- [Deployment Guide](./DEPLOYMENT.md)
" > README.md

echo "Project structure created successfully!"