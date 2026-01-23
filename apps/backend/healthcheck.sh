#!/bin/sh
# Enhanced health check script with better error reporting
# This script checks if the health endpoint is responding

PORT=${1:-4000}
TIMEOUT=${2:-3}

# Use curl if available, otherwise fall back to node
if command -v curl >/dev/null 2>&1; then
  response=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" "http://localhost:${PORT}/health" 2>&1)
  exit_code=$?
  if [ $exit_code -eq 0 ] && [ "$response" = "200" ]; then
    exit 0
  else
    echo "Health check failed: HTTP $response (curl exit code: $exit_code)" >&2
    exit 1
  fi
else
  # Fallback to node
  node -e "
    const http = require('http');
    const req = http.get('http://localhost:${PORT}/health', { timeout: ${TIMEOUT}000 }, (res) => {
      if (res.statusCode === 200) {
        process.exit(0);
      } else {
        console.error('Health check failed: HTTP ' + res.statusCode);
        process.exit(1);
      }
    });
    req.on('error', (err) => {
      console.error('Health check error: ' + err.message);
      process.exit(1);
    });
    req.on('timeout', () => {
      console.error('Health check timeout after ${TIMEOUT}s');
      req.destroy();
      process.exit(1);
    });
  " 2>&1
  exit $?
fi
