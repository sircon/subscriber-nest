# Multi-stage build for Next.js frontend
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Explicitly set NODE_ENV=development to ensure devDependencies are installed
# Coolify sets NODE_ENV=production at build time, which causes yarn to skip devDependencies
# We override it here to ensure build tools are installed
ENV NODE_ENV=development

# Copy root package files
COPY package.json yarn.lock* ./

# Copy frontend package.json
COPY apps/frontend/package.json ./apps/frontend/

# Install root dependencies
RUN yarn install --frozen-lockfile

# Build stage
FROM base AS builder
WORKDIR /app

# Don't set NODE_ENV here - let Next.js handle it
# Yarn will install all dependencies (including devDependencies) by default

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY apps/frontend ./apps/frontend
COPY package.json yarn.lock* ./

# Set build-time environment variables
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Build Next.js app
# Disable Turbopack to avoid monorepo resolution issues
WORKDIR /app/apps/frontend
ENV NEXT_PRIVATE_SKIP_TURBO=1
# Set NODE_ENV=production for Next.js build (it expects this)
# devDependencies are already installed from the deps stage
ENV NODE_ENV=production
RUN yarn build

# Production stage
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Install Infisical CLI
# Following official installation guide: https://infisical.com/docs/cli/overview#alpine
RUN apk add --no-cache bash curl coreutils && \
    curl -1sLf 'https://dl.cloudsmith.io/public/infisical/infisical-cli/setup.alpine.sh' | bash && \
    apk update && apk add infisical && \
    apk del curl

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application (standalone mode)
COPY --from=builder --chown=nextjs:nodejs /app/apps/frontend/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/frontend/.next/static ./apps/frontend/.next/static
# Create public directory (Next.js public folder is optional, create empty if it doesn't exist)
RUN mkdir -p ./apps/frontend/public

# Infisical entrypoint
COPY --chown=nextjs:nodejs infisical-entrypoint.sh /app/infisical-entrypoint.sh
RUN chmod +x /app/infisical-entrypoint.sh

USER nextjs

# Expose port
EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000', (r) => {process.exit(r.statusCode === 200 || r.statusCode === 404 ? 0 : 1)})" || exit 1

# Start Next.js with Infisical, per docs:
# `infisical run --projectId <id> -- <command>`
# Explicitly set PORT=3000 to override any PORT from Infisical or deployment platform
ENTRYPOINT ["/app/infisical-entrypoint.sh"]
CMD ["sh", "-c", "PORT=3000 node apps/frontend/server.js"]
