#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo "🚀 Starting NovaMind platform..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}Error: Docker is not running${NC}"
    exit 1
fi

# Create required directories
mkdir -p infra/mongodb

# Build all services
echo "🏗️  Building services..."
docker-compose build

if [ $? -ne 0 ]; then
    echo -e "${RED}Error: Failed to build services${NC}"
    exit 1
fi

# Start the services
echo "📦 Starting services..."
docker-compose up -d

if [ $? -ne 0 ]; then
    echo -e "${RED}Error: Failed to start services${NC}"
    exit 1
fi

# Function to wait for service health
wait_for_service() {
    local service=$1
    local max_attempts=30
    local attempt=1

    echo "⏳ Waiting for $service to be ready..."
    
    while [ $attempt -le $max_attempts ]; do
        if docker-compose ps $service | grep -q "healthy"; then
            echo -e "${GREEN}✅ $service is ready${NC}"
            return 0
        fi
        echo "Attempt $attempt/$max_attempts..."
        sleep 2
        attempt=$((attempt + 1))
    done

    echo -e "${RED}❌ $service failed to become healthy${NC}"
    return 1
}

# Wait for core services
wait_for_service mongodb
wait_for_service redis

# Check if services are running
echo "🔍 Verifying services..."
services=("api-gateway" "builder-service" "template-service" "deployment-service" "frontend" "mongodb" "redis")

for service in "${services[@]}"; do
    if docker-compose ps $service | grep -q "Up"; then
        echo -e "${GREEN}✅ $service is running${NC}"
    else
        echo -e "${RED}❌ $service is not running${NC}"
        echo "Logs for $service:"
        docker-compose logs $service
    fi
done

# Final check
if docker-compose ps | grep -q "Exit"; then
    echo -e "${RED}❌ Some services failed to start. Please check the logs above.${NC}"
    exit 1
else
    echo -e "${GREEN}✅ All services are running${NC}"
    echo "
🌟 NovaMind platform is ready!
📱 Frontend: http://localhost:8080
🔗 API Gateway: http://localhost:3000

To view logs: docker-compose logs -f
To stop: docker-compose down
"
fi 