# Deployment Guide for SubscriberNest

This guide covers deploying SubscriberNest to production using Docker Compose, specifically for Coolify.

## Architecture Overview

The application consists of 5 services:

1. **PostgreSQL** - Database for storing subscribers, users, and sync history
2. **Redis** - Queue/job processing for BullMQ
3. **API** - NestJS REST API (port 4000)
4. **Worker** - NestJS worker for async jobs (port 4001)
5. **Frontend** - Next.js application (port 3000)

## Prerequisites

- Docker and Docker Compose installed
- Environment variables configured (see `.env.production.example`)
- Domain names configured (if using reverse proxy)

## Quick Start

1. **Clone and configure environment:**

```bash
# Copy the example environment file
cp .env.production.example .env

# Edit .env with your production values
nano .env
```

2. **Build and start all services:**

```bash
docker-compose up -d --build
```

3. **Run database migrations:**

```bash
# Enter the API container
docker-compose exec api sh

# Run migrations
cd /app
node dist/apps/api/src/main.js --migrate
# Or use the migration command if available
```

4. **Check service health:**

```bash
docker-compose ps
```

## Service Details

### PostgreSQL

- **Container:** `postgres_subscriber_nest`
- **Port:** 5432 (internal), configurable via `DATABASE_PORT` (default: 5434)
- **Data:** Persisted in `postgres_data` volume
- **Health Check:** Checks if PostgreSQL is ready to accept connections

### Redis

- **Container:** `redis_subscriber_nest`
- **Port:** 6379 (internal), configurable via `REDIS_PORT` (default: 6380)
- **Data:** Persisted in `redis_data` volume with AOF enabled
- **Health Check:** Pings Redis server

### API Service

- **Container:** `api_subscriber_nest`
- **Port:** 4000 (configurable via `PORT`)
- **Dockerfile:** `apps/backend/Dockerfile.api`
- **Health Check:** HTTP GET to `/health` endpoint
- **Dependencies:** Waits for PostgreSQL and Redis to be healthy

### Worker Service

- **Container:** `worker_subscriber_nest`
- **Port:** 4001 (configurable via `WORKER_PORT`)
- **Dockerfile:** `apps/backend/Dockerfile.worker`
- **Health Check:** HTTP GET to `/health` endpoint
- **Dependencies:** Waits for PostgreSQL and Redis to be healthy

### Frontend Service

- **Container:** `frontend_subscriber_nest`
- **Port:** 3000 (configurable via `FRONTEND_PORT`)
- **Dockerfile:** `apps/frontend/Dockerfile`
- **Health Check:** HTTP GET to `/api/health` endpoint
- **Dependencies:** Waits for API to be healthy

## Environment Variables

### Required Variables

- `DATABASE_PASSWORD` - PostgreSQL password
- `REDIS_PASSWORD` - Redis password (optional but recommended)
- `STRIPE_SECRET_KEY` - Stripe secret key
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook secret
- `STRIPE_METER_ID` - Stripe meter ID for usage-based billing
- `STRIPE_PRICE_ID` - Stripe price ID for subscriptions
- `RESEND_API_KEY` - Resend API key for sending emails
- `NEXT_PUBLIC_API_URL` - Public URL of your API (used by frontend)

### Optional Variables

- OAuth credentials for Kit and Mailchimp integrations
- `RESEND_FROM_EMAIL` - Email address for sending emails (defaults to onboarding@nest.miguelncorreia.com)

## Deployment to Coolify

### Option 1: Using Docker Compose

1. **Push your code to a Git repository**

2. **In Coolify:**
   - Create a new resource
   - Select "Docker Compose"
   - Connect your Git repository
   - Coolify will detect `docker-compose.yml`
   - Configure environment variables in Coolify's UI
   - Deploy

### Option 2: Individual Services

You can also deploy each service separately in Coolify:

1. **PostgreSQL & Redis:**
   - Use the existing `docker-compose.yml` services
   - Or use Coolify's built-in database services

2. **API Service:**
   - Build context: Root directory
   - Dockerfile: `apps/backend/Dockerfile.api`
   - Port: 4000

3. **Worker Service:**
   - Build context: Root directory
   - Dockerfile: `apps/backend/Dockerfile.worker`
   - Port: 4001

4. **Frontend Service:**
   - Build context: Root directory
   - Dockerfile: `apps/frontend/Dockerfile`
   - Port: 3000
   - Build arg: `NEXT_PUBLIC_API_URL`

## Database Migrations

After first deployment, run migrations:

```bash
# Option 1: Using docker-compose
docker-compose exec api yarn db:migrate

# Option 2: Directly in container
docker-compose exec api sh
cd /app
node dist/apps/api/src/main.js
# Then run migration command
```

## Monitoring

### Health Checks

All services include health checks. Monitor them with:

```bash
docker-compose ps
```

### Logs

View logs for all services:

```bash
docker-compose logs -f
```

View logs for a specific service:

```bash
docker-compose logs -f api
docker-compose logs -f worker
docker-compose logs -f frontend
```

### Bull Board Dashboard

Access the queue dashboard at:
- `http://your-api-domain:4000/admin/queues`

## Scaling

### Horizontal Scaling

- **API:** Can be scaled horizontally (multiple instances)
- **Worker:** Can be scaled horizontally (multiple instances)
- **Frontend:** Can be scaled horizontally (multiple instances)
- **PostgreSQL & Redis:** Typically single instance (consider managed services for production)

Example:

```bash
docker-compose up -d --scale api=3 --scale worker=2
```

### Resource Limits

Add resource limits in `docker-compose.yml`:

```yaml
api:
  deploy:
    resources:
      limits:
        cpus: '1'
        memory: 1G
      reservations:
        cpus: '0.5'
        memory: 512M
```

## Backup

### PostgreSQL Backup

```bash
# Create backup
docker-compose exec postgres pg_dump -U postgres subscriber_nest > backup.sql

# Restore backup
docker-compose exec -T postgres psql -U postgres subscriber_nest < backup.sql
```

### Redis Backup

Redis data is persisted in the `redis_data` volume. Backup the volume:

```bash
docker run --rm -v subscriber_nest_redis_data:/data -v $(pwd):/backup alpine tar czf /backup/redis-backup.tar.gz /data
```

## Troubleshooting

### Services won't start

1. Check logs: `docker-compose logs [service-name]`
2. Verify environment variables are set correctly
3. Ensure ports are not already in use
4. Check health of dependencies (PostgreSQL, Redis)

### Database connection errors

1. Verify `DATABASE_HOST` is set to `postgres` (service name)
2. Check PostgreSQL is healthy: `docker-compose ps postgres`
3. Verify credentials match

### Redis connection errors

1. Verify `REDIS_HOST` is set to `redis` (service name)
2. Check Redis is healthy: `docker-compose ps redis`
3. If using password, ensure `REDIS_PASSWORD` is set correctly

### Frontend can't connect to API

1. Verify `NEXT_PUBLIC_API_URL` is set correctly
2. Ensure API service is healthy
3. Check CORS configuration in API if accessing from different domain

## Security Considerations

1. **Change default passwords** for PostgreSQL and Redis
2. **Use secrets management** for sensitive environment variables
3. **Enable SSL/TLS** for database connections in production
4. **Use reverse proxy** (nginx, Traefik) with SSL certificates
5. **Restrict network access** - services should only communicate within the Docker network
6. **Regular updates** - Keep base images and dependencies updated

## Production Checklist

- [ ] All environment variables configured
- [ ] Strong passwords set for database and Redis
- [ ] Database migrations run
- [ ] SSL/TLS certificates configured (if using reverse proxy)
- [ ] Health checks passing
- [ ] Monitoring and logging configured
- [ ] Backup strategy in place
- [ ] Resource limits configured
- [ ] CORS configured correctly
- [ ] Stripe webhook endpoint configured
- [ ] Email service (Resend) configured and tested
