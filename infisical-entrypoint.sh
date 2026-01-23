#!/bin/sh
set -e
# Infisical entrypoint script based on official documentation:
# https://infisical.com/docs/integrations/platforms/docker

# Enable better error reporting
set -u  # Exit on undefined variables (after we've checked what we need)

# Set defaults
INFISICAL_ENV="${INFISICAL_ENV:-prod}"
INFISICAL_API_URL="${INFISICAL_API_URL:-https://app.infisical.com}"
INFISICAL_API_URL="${INFISICAL_API_URL%/}"

# Entrypoint starting

# Validate required variables
if [ -z "${INFISICAL_PROJECT_ID:-}" ]; then
  echo "ERROR: INFISICAL_PROJECT_ID must be set" >&2
  exit 1
fi

# Obtain access token for the machine identity (if not already provided)
if [ -z "${INFISICAL_TOKEN:-}" ]; then
  if [ -z "${INFISICAL_MACHINE_CLIENT_ID:-}" ] || [ -z "${INFISICAL_MACHINE_CLIENT_SECRET:-}" ]; then
    echo "ERROR: INFISICAL_TOKEN or (INFISICAL_MACHINE_CLIENT_ID + INFISICAL_MACHINE_CLIENT_SECRET) must be set" >&2
    exit 1
  fi
  
  INFISICAL_TOKEN=$(infisical login \
    --method=universal-auth \
    --client-id=$INFISICAL_MACHINE_CLIENT_ID \
    --client-secret=$INFISICAL_MACHINE_CLIENT_SECRET \
    --domain=$INFISICAL_API_URL \
    --plain \
    --silent 2>&1) || {
    echo "ERROR: Infisical login failed" >&2
    echo "Login output: $INFISICAL_TOKEN" >&2
    exit 1
  }
  export INFISICAL_TOKEN
fi

# Preserve Docker-specific infrastructure variables before Infisical injection
# These use Docker service names and should override Infisical values (which may be localhost)
SAVED_DATABASE_HOST="${DATABASE_HOST:-}"
SAVED_DATABASE_PORT="${DATABASE_PORT:-}"
SAVED_REDIS_HOST="${REDIS_HOST:-}"
SAVED_REDIS_PORT="${REDIS_PORT:-}"

# Run the application with Infisical injecting secrets
# Use a wrapper to restore Docker-specific vars after Infisical injection

# Create wrapper script with saved values embedded
WRAPPER_SCRIPT="/tmp/infisical-wrapper-$$.sh"
{
  echo '#!/bin/sh'
  echo 'set -e'
  echo "# Restore Docker-specific infrastructure variables"
  [ -n "$SAVED_DATABASE_HOST" ] && echo "export DATABASE_HOST=\"$SAVED_DATABASE_HOST\""
  [ -n "$SAVED_DATABASE_PORT" ] && echo "export DATABASE_PORT=\"$SAVED_DATABASE_PORT\""
  [ -n "$SAVED_REDIS_HOST" ] && echo "export REDIS_HOST=\"$SAVED_REDIS_HOST\""
  [ -n "$SAVED_REDIS_PORT" ] && echo "export REDIS_PORT=\"$SAVED_REDIS_PORT\""
  echo "# Execute the original command"
  echo 'exec "$@"'
} > "$WRAPPER_SCRIPT"
chmod +x "$WRAPPER_SCRIPT"

# Execute with Infisical - if this fails, the container will exit and show the error
# Use exec to replace the shell process, but capture errors
exec infisical run \
  --token "$INFISICAL_TOKEN" \
  --projectId "$INFISICAL_PROJECT_ID" \
  --env "$INFISICAL_ENV" \
  --domain "$INFISICAL_API_URL" \
  -- "$WRAPPER_SCRIPT" "$@"
