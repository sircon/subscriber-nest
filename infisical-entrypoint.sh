#!/bin/sh
# Infisical entrypoint script based on official documentation:
# https://infisical.com/docs/integrations/platforms/docker

# Set defaults
INFISICAL_ENV="${INFISICAL_ENV:-prod}"
INFISICAL_API_URL="${INFISICAL_API_URL:-https://app.infisical.com}"
INFISICAL_API_URL="${INFISICAL_API_URL%/}"

# Obtain access token for the machine identity (if not already provided)
if [ -z "${INFISICAL_TOKEN:-}" ]; then
  if [ -z "${INFISICAL_MACHINE_CLIENT_ID:-}" ] || [ -z "${INFISICAL_MACHINE_CLIENT_SECRET:-}" ]; then
    echo "Error: INFISICAL_TOKEN or (INFISICAL_MACHINE_CLIENT_ID + INFISICAL_MACHINE_CLIENT_SECRET) must be set" >&2
    exit 1
  fi
  
  if [ -z "${INFISICAL_PROJECT_ID:-}" ]; then
    echo "Error: INFISICAL_PROJECT_ID must be set" >&2
    exit 1
  fi
  
  export INFISICAL_TOKEN=$(infisical login \
    --method=universal-auth \
    --client-id=$INFISICAL_MACHINE_CLIENT_ID \
    --client-secret=$INFISICAL_MACHINE_CLIENT_SECRET \
    --domain=$INFISICAL_API_URL \
    --plain \
    --silent)
fi

# Preserve Docker-specific infrastructure variables before Infisical injection
# These use Docker service names and should override Infisical values (which may be localhost)
SAVED_DATABASE_HOST="${DATABASE_HOST:-}"
SAVED_DATABASE_PORT="${DATABASE_PORT:-}"
SAVED_REDIS_HOST="${REDIS_HOST:-}"
SAVED_REDIS_PORT="${REDIS_PORT:-}"

# Run the application with Infisical injecting secrets
# Use a wrapper to restore Docker-specific vars after Infisical injection
exec infisical run \
  --token $INFISICAL_TOKEN \
  --projectId $INFISICAL_PROJECT_ID \
  --env $INFISICAL_ENV \
  --domain $INFISICAL_API_URL \
  -- sh -c "
    # Restore Docker-specific infrastructure variables (override Infisical values if they were set)
    [ -n \"${SAVED_DATABASE_HOST}\" ] && export DATABASE_HOST=\"${SAVED_DATABASE_HOST}\"
    [ -n \"${SAVED_DATABASE_PORT}\" ] && export DATABASE_PORT=\"${SAVED_DATABASE_PORT}\"
    [ -n \"${SAVED_REDIS_HOST}\" ] && export REDIS_HOST=\"${SAVED_REDIS_HOST}\"
    [ -n \"${SAVED_REDIS_PORT}\" ] && export REDIS_PORT=\"${SAVED_REDIS_PORT}\"
    # Now run the actual command
    exec \"\$@\"
  " -- "$@"
