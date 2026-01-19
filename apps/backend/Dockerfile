# Multi-stage build for NestJS backend
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy root package files
COPY package.json yarn.lock* ./

# Copy backend package.json
COPY apps/backend/package.json ./apps/backend/

# Install root dependencies
RUN yarn install --frozen-lockfile

# Build stage
FROM base AS builder
WORKDIR /app

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY apps/backend ./apps/backend
COPY turbo.json ./
COPY package.json ./

# Build both API and Worker
WORKDIR /app/apps/backend
RUN yarn build

# Production stage
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy built applications and dependencies
COPY --from=builder /app/apps/backend/dist ./dist
COPY --from=builder /app/apps/backend/node_modules ./node_modules
COPY --from=builder /app/node_modules ./node_modules

# Default to API, can be overridden
ARG SERVICE=api
ENV SERVICE=$SERVICE

# Expose ports
EXPOSE 4000 4001

# Start based on SERVICE arg
CMD if [ "$SERVICE" = "worker" ]; then node dist/worker/apps/worker/src/main.js; else node dist/api/apps/api/src/main.js; fi
