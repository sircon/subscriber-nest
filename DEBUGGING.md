# Debugging Deployment Issues

This guide helps you troubleshoot deployment issues, particularly container health check failures.

## Quick Debug Commands

### Check Container Status
```bash
docker ps -a | grep audience_safe
```

### View Container Logs
```bash
# API logs
docker logs -f api_audience_safe

# Worker logs
docker logs -f worker_audience_safe

# Frontend logs
docker logs -f frontend_audience_safe
```

### Use Debug Script
```bash
# Debug API container
./debug-container.sh api_audience_safe

# Debug worker container
./debug-container.sh worker_audience_safe
```

### Check Health Status
```bash
docker inspect --format='{{.State.Health.Status}}' api_audience_safe
docker inspect --format='{{json .State.Health}}' api_audience_safe | jq
```

### Exec into Container
```bash
docker exec -it api_audience_safe sh
```

## Common Issues and Solutions

### 1. API Container Failing Health Check

**Symptoms:**
- Container starts but becomes unhealthy after ~60 seconds
- Health check endpoint `/health` returns non-200 status or times out

**Debugging Steps:**

1. **Check logs for startup errors:**
   ```bash
   docker logs api_audience_safe | tail -100
   ```

2. **Check if the application is actually running:**
   ```bash
   docker exec api_audience_safe ps aux
   docker exec api_audience_safe netstat -tlnp | grep 4000
   ```

3. **Test health endpoint manually:**
   ```bash
   docker exec api_audience_safe wget -q -O- http://localhost:4000/health
   # or
   docker exec api_audience_safe curl http://localhost:4000/health
   ```

4. **Check environment variables:**
   ```bash
   docker exec api_audience_safe env | grep -E 'DATABASE_|REDIS_|INFISICAL_'
   ```

**Common Causes:**

- **Infisical authentication failure**: Check `INFISICAL_MACHINE_CLIENT_ID` and `INFISICAL_MACHINE_CLIENT_SECRET`
- **Database connection failure**: Verify `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_USER`, `DATABASE_PASSWORD`
- **Redis connection failure**: Verify `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`
- **Application crash during startup**: Check logs for unhandled exceptions
- **Port binding issue**: Application might not be listening on the expected port

### 2. Infisical Authentication Issues

**Symptoms:**
- Entrypoint script fails immediately
- Logs show "Infisical login failed"

**Debugging:**

1. **Check Infisical credentials:**
   ```bash
   docker exec api_audience_safe env | grep INFISICAL
   ```

2. **Test Infisical login manually:**
   ```bash
   docker exec api_audience_safe infisical login \
     --method=universal-auth \
     --client-id=$INFISICAL_MACHINE_CLIENT_ID \
     --client-secret=$INFISICAL_MACHINE_CLIENT_SECRET \
     --domain=$INFISICAL_API_URL
   ```

3. **Verify Infisical project access:**
   - Check that the machine identity has access to the project
   - Verify the project ID is correct
   - Ensure the environment (`prod`) exists in Infisical

### 3. Database Connection Issues

**Symptoms:**
- Application logs show database connection errors
- Container starts but crashes when trying to connect

**Debugging:**

1. **Test database connectivity from container:**
   ```bash
   docker exec api_audience_safe sh -c 'nc -zv $DATABASE_HOST ${DATABASE_PORT:-5432}'
   ```

2. **Check database environment variables:**
   ```bash
   docker exec api_audience_safe env | grep DATABASE_
   ```

3. **Verify database is running:**
   ```bash
   docker ps | grep postgres
   docker logs postgres_audience_safe | tail -20
   ```

4. **Test database connection with psql:**
   ```bash
   docker exec -it postgres_audience_safe psql -U postgres -d subscriber_nest
   ```

### 4. Redis Connection Issues

**Symptoms:**
- Application logs show Redis connection errors
- BullMQ queues not working

**Debugging:**

1. **Test Redis connectivity:**
   ```bash
   docker exec api_audience_safe sh -c 'nc -zv $REDIS_HOST ${REDIS_PORT:-6379}'
   ```

2. **Check Redis environment variables:**
   ```bash
   docker exec api_audience_safe env | grep REDIS_
   ```

3. **Verify Redis is running:**
   ```bash
   docker ps | grep redis
   docker exec redis_audience_safe redis-cli ping
   ```

### 5. Application Startup Errors

**Symptoms:**
- Container exits immediately
- Logs show unhandled exceptions

**Debugging:**

1. **View full startup logs:**
   ```bash
   docker logs api_audience_safe 2>&1 | less
   ```

2. **Check for missing dependencies:**
   ```bash
   docker exec api_audience_safe ls -la /app/dist/apps/api/src/
   docker exec api_audience_safe ls -la /app/node_modules | head -20
   ```

3. **Verify build artifacts:**
   ```bash
   docker exec api_audience_safe node -e "console.log(require('/app/dist/apps/api/src/main.js'))"
   ```

## Health Check Configuration

The health check has been configured with:
- **Start period**: 60 seconds (allows time for Infisical auth and app startup)
- **Interval**: 30 seconds (checks every 30s after start period)
- **Timeout**: 5 seconds (each check times out after 5s)
- **Retries**: 3 (fails after 3 consecutive failures)

If your application takes longer than 60 seconds to start, you may need to increase the `start_period` in:
- `docker-compose.yml` (for local development)
- `Dockerfile.api` (for production builds)

## Enhanced Logging

The application now includes enhanced logging:

1. **Entrypoint script** logs:
   - Infisical authentication status
   - Environment variable values (non-sensitive)
   - Command execution details

2. **Application bootstrap** logs:
   - Database connection details
   - Redis connection details
   - Port configuration
   - Startup progress

3. **Error handling**:
   - All errors are caught and logged with stack traces
   - Process exits with code 1 on fatal errors

## Monitoring in Production (Coolify)

In Coolify, you can:

1. **View deployment logs**: Check the deployment logs for build and startup errors
2. **View container logs**: Use the container logs viewer in Coolify UI
3. **Check health status**: Monitor the health check status in the service overview
4. **SSH into server**: If you have SSH access, use the debug script on the server

## Getting Help

When reporting issues, include:

1. **Container logs** (last 100 lines):
   ```bash
   docker logs --tail 100 api_audience_safe
   ```

2. **Health check status**:
   ```bash
   docker inspect api_audience_safe | jq '.[0].State.Health'
   ```

3. **Environment summary** (sanitize sensitive data):
   ```bash
   docker exec api_audience_safe env | grep -E 'NODE_ENV|DATABASE_|REDIS_|INFISICAL_' | sed 's/=.*/=***/'
   ```

4. **Container status**:
   ```bash
   docker ps -a | grep audience_safe
   ```
