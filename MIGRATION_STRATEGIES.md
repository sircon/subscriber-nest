# Database Migration Strategy

This document describes how database migrations are run in production.

## Post-Deployment Script Approach ✅

**How it works:**
- Coolify runs `node /app/run-migrations.js` after deployment
- Manual control over when migrations run
- Can be triggered independently of app startup

**Pros:**
- ✅ Explicit and visible in deployment logs
- ✅ Can run migrations without restarting the app
- ✅ Easy to debug if migrations fail
- ✅ Works well with Coolify's post-deployment hooks

**Cons:**
- ❌ Requires manual configuration in Coolify
- ❌ Easy to forget to run migrations
- ❌ App might start before migrations complete (if not configured correctly)

## Configuration in Coolify

**Post-Deployment Command:**
- **Container Name:** `api`
- **Command:** `node /app/run-migrations.js`

The migration script (`run-migrations.js`) is included in the Docker image and:
- Uses the compiled migrations from `dist/apps/api/src/migrations/*.js`
- Reads database connection from environment variables
- Runs all pending migrations
- Exits with code 0 on success, 1 on failure

## Migration Script

The `apps/backend/run-migrations.js` script:
1. Connects to the database using environment variables
2. Runs all pending migrations
3. Displays which migrations were executed
4. Exits cleanly on success or failure

## Troubleshooting

If migrations fail:
1. Check Coolify deployment logs for error messages
2. Verify database connection environment variables are set correctly
3. Ensure the database is accessible from the container
4. Check that migration files are present in `dist/apps/api/src/migrations/`
