FROM node:18-alpine AS base

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./
COPY shared/package*.json ./shared/
COPY services/api-gateway/package*.json ./services/api-gateway/

# Install dependencies
RUN npm install
RUN cd shared && npm install
RUN cd services/api-gateway && npm install

# Copy source files
COPY shared ./shared
COPY services/api-gateway ./services/api-gateway
COPY tsconfig.json ./

# Build shared module
RUN cd shared && npm run build

# Build service
RUN cd services/api-gateway && npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

COPY --from=base /app/services/api-gateway/dist ./dist
COPY --from=base /app/services/api-gateway/package*.json ./
COPY --from=base /app/shared/dist ./shared/dist
COPY --from=base /app/shared/package*.json ./shared/

RUN npm install --production
RUN cd shared && npm install --production

EXPOSE 4000

CMD ["npm", "start"]
