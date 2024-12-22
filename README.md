# Collaborative Workspace

A modern, real-time collaborative workspace application built with Angular and Spring Boot, deployed on AWS.

## Features

### Core Features
- Real-time documentClass collaboration
- OAuth2 authentication (Google/GitHub)
- Full-text search capabilities
- Analytics dashboard
- Document version history
- Cross-tenant note sharing

### Technical Features
- WebSocket for real-time updates
- MongoDB sharding for scalability
- Redis for caching and real-time presence
- AWS Comprehend for sentiment analysis
- OpenSearch for full-text search
- CloudFront CDN for content delivery

## Architecture

The application follows a microservices architecture pattern and is deployed on AWS:

- **Frontend**: Angular 17+ SPA hosted on S3/CloudFront
- **Backend**: Spring Boot 3.x services running on ECS Fargate
- **Database**: Sharded MongoDB cluster
- **Cache**: Redis cluster
- **Search**: OpenSearch service
- **Analytics**: AWS Comprehend
- **CDN**: CloudFront
- **Monitoring**: CloudWatch, X-Ray

For detailed architecture information, see [HIGH_LEVEL_ARCHITECTURE.md](docs/architecture/HIGH_LEVEL_ARCHITECTURE.md)

## Prerequisites

- Node.js 18+
- Java 17+
- MongoDB 6+
- Redis 7+
- Docker
- AWS CLI
- Angular CLI

For detailed setup instructions, see [SETUP.md](docs/SETUP.md)

## Quick Start

1. **Clone the Repository**
   ```bash
   git clone https://github.com/yourusername/collaborative-workspace.git
   cd collaborative-workspace
   ```

2. **Set Up Environment**
   ```bash
   # Copy environment files
   cp backend/.env.example backend/.env
   cp frontend/src/environments/environment.example.ts frontend/src/environments/environment.ts
   
   # Edit configuration
   nano backend/.env
   nano frontend/src/environments/environment.ts
   ```

3. **Initialize Project**
   ```bash
   ./scripts/init-project.sh
   ```

4. **Start Development Servers**
   ```bash
   # Terminal 1: Start backend
   cd backend
   ./mvnw spring-boot:run
   
   # Terminal 2: Start frontend
   cd frontend
   npm install
   ng serve
   ```

5. **Access Application**
   - Frontend: http://localhost:4200
   - Backend API: http://localhost:8080

## Development

### Backend Development
```bash
cd backend
./mvnw spring-boot:run
```

### Frontend Development
```bash
cd frontend
ng serve
```

### Running Tests
```bash
# Backend tests
cd backend
./mvnw test

# Frontend tests
cd frontend
ng test
```

## Deployment

### AWS Deployment

1. **Set Up Infrastructure**
   ```bash
   cd deployment/aws/cdk
   npm install
   cdk deploy
   ```

2. **Configure Environment**
   ```bash
   export AWS_REGION="us-east-1"
   export AWS_ACCOUNT_ID="your-account-id"
   export CLOUDFRONT_DISTRIBUTION_ID="your-distribution-id"
   export ALERT_EMAIL="your-email@example.com"
   ```

3. **Deploy Application**
   ```bash
   # Deploy backend
   ./scripts/deploy-backend.sh
   
   # Deploy frontend
   ./scripts/deploy-frontend.sh
   
   # Set up monitoring
   ./scripts/setup-monitoring.sh
   ```

For detailed deployment instructions, see [SETUP.md](docs/SETUP.md)

## Documentation

- [Setup Guide](docs/SETUP.md)
- [Architecture](docs/architecture/HIGH_LEVEL_ARCHITECTURE.md)
- [API Documentation](docs/api/README.md)
- [Testing Guide](docs/testing/README.md)
- [Assumptions and Limitations](docs/ASSUMPTIONS_AND_LIMITATIONS.md)

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## Testing

### Running Tests
```bash
# Run all tests
./scripts/run-tests.sh

# Run specific test suites
cd backend
./mvnw test -Dtest=AuthServiceTest
cd frontend
ng test --include=src/app/core/services/auth.service.spec.ts
```

### Test Coverage
```bash
# Backend coverage
cd backend
./mvnw verify

# Frontend coverage
cd frontend
ng test --code-coverage
```

## Security

For security issues, please contact security@yourdomain.com

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details

## Support

For support, email join my Slack channel.

## Acknowledgments

- Angular team for the fantastic framework
- Spring team for the robust backend framework
- AWS for the reliable cloud infrastructure
- MongoDB team for the scalable database
- All contributors who have helped with the project
