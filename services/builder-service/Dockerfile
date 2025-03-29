FROM node:18-alpine AS base

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./
COPY shared/package*.json ./shared/
COPY services/builder-service/package*.json ./services/builder-service/

# Install dependencies
RUN npm install
RUN cd shared && npm install
RUN cd services/builder-service && npm install

# Copy source files
COPY shared ./shared
COPY services/builder-service ./services/builder-service
COPY tsconfig.json ./

# Build shared module
RUN cd shared && npm run build

# Build service
RUN cd services/builder-service && npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

COPY --from=base /app/services/builder-service/dist ./dist
COPY --from=base /app/services/builder-service/package*.json ./
COPY --from=base /app/shared/dist ./shared/dist
COPY --from=base /app/shared/package*.json ./shared/

RUN npm install --production
RUN cd shared && npm install --production

EXPOSE 3001

CMD ["npm", "start"]
