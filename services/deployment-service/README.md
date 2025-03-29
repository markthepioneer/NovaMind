# NovaMind Deployment Service

The Deployment Service is responsible for managing agent deployments across multiple cloud providers including Kubernetes, AWS Lambda, and Google Cloud Run.

## Features

- Multi-cloud deployment support
- Real-time deployment status monitoring
- Resource usage metrics collection
- Automated scaling and management
- Provider-agnostic deployment interface

## Supported Providers

1. **Kubernetes**
   - Custom resource management
   - Auto-scaling support
   - Health monitoring
   - Log aggregation

2. **AWS Lambda**
   - Serverless deployments
   - Automatic scaling
   - CloudWatch integration
   - Cost optimization

3. **Google Cloud Run**
   - Container-based deployments
   - Auto-scaling
   - Cloud Monitoring integration
   - Zero-config deployments

## Installation

```bash
# Install dependencies
npm install

# Build the service
npm run build

# Start the service
npm start

# Run in development mode
npm run dev
```

## Configuration

The service requires the following environment variables:

```env
# General
NODE_ENV=development
PORT=4000

# MongoDB
MONGODB_URI=mongodb://localhost:27017/novamind

# Kubernetes
KUBERNETES_CONFIG=path/to/kubeconfig
KUBERNETES_NAMESPACE=novamind

# AWS
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key

# Google Cloud
GOOGLE_CLOUD_PROJECT=your-project-id
GOOGLE_CLOUD_REGION=us-central1
GOOGLE_APPLICATION_CREDENTIALS=path/to/credentials.json
```

## API Documentation

### Deployments

#### Create Deployment
```http
POST /api/v1/deployments
Content-Type: application/json

{
  "name": "my-agent",
  "type": "kubernetes",
  "config": {
    "namespace": "default",
    "image": "novamind/agent:latest",
    "replicas": 1
  }
}
```

#### Get Deployment Status
```http
GET /api/v1/deployments/:id/status
```

#### Get Deployment Metrics
```http
GET /api/v1/deployments/:id/metrics
```

#### Get Deployment Logs
```http
GET /api/v1/deployments/:id/logs
```

## Development

### Running Tests
```bash
# Run all tests
npm test

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test -- deployment-factory.test.ts
```

### Linting
```bash
# Run linter
npm run lint

# Fix linting issues
npm run lint -- --fix
```

## Architecture

The service follows a modular architecture:

```
src/
├── controllers/    # Request handlers
├── models/        # Data models
├── services/      # Business logic
│   ├── kubernetes.service.ts
│   ├── aws-lambda.service.ts
│   └── cloud-run.service.ts
├── utils/         # Shared utilities
└── index.ts       # Service entry point
```

## Security

- All API endpoints require authentication
- Provider credentials are securely stored
- RBAC for deployment management
- Rate limiting on API endpoints
- Input validation and sanitization

## Monitoring

The service includes:
- Health check endpoints
- Prometheus metrics
- Detailed logging
- Error tracking
- Performance monitoring

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details. 