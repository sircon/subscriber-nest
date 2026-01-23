#!/bin/bash
# Debug script to help troubleshoot container issues
# Usage: ./debug-container.sh [container_name]

set -e

CONTAINER_NAME="${1:-api_audience_safe}"

echo "=== Debugging Container: $CONTAINER_NAME ==="
echo ""

# Check if container exists
if ! docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  echo "❌ Container '$CONTAINER_NAME' not found"
  echo ""
  echo "Available containers:"
  docker ps -a --format 'table {{.Names}}\t{{.Status}}\t{{.Image}}'
  exit 1
fi

echo "1. Container Status:"
docker ps -a --filter "name=${CONTAINER_NAME}" --format 'table {{.Names}}\t{{.Status}}\t{{.Image}}\t{{.Ports}}'
echo ""

echo "2. Container Health Status:"
HEALTH=$(docker inspect --format='{{.State.Health.Status}}' "$CONTAINER_NAME" 2>/dev/null || echo "no healthcheck")
echo "   Health: $HEALTH"
echo ""

echo "3. Last 50 lines of logs:"
echo "---"
docker logs --tail 50 "$CONTAINER_NAME" 2>&1 || echo "Could not retrieve logs"
echo "---"
echo ""

echo "4. Environment Variables (non-sensitive):"
docker exec "$CONTAINER_NAME" env 2>/dev/null | grep -E '^(NODE_ENV|DATABASE_|REDIS_|INFISICAL_|API_PORT|PORT)=' | sort || echo "Could not retrieve environment"
echo ""

echo "5. Process List:"
docker exec "$CONTAINER_NAME" ps aux 2>/dev/null || echo "Could not retrieve process list"
echo ""

echo "6. Network Connectivity Test:"
echo "   Testing localhost:4000/health..."
docker exec "$CONTAINER_NAME" sh -c 'wget -q -O- http://localhost:4000/health 2>&1 || curl -s http://localhost:4000/health 2>&1 || node -e "require(\"http\").get(\"http://localhost:4000/health\", (r) => {let d=\"\";r.on(\"data\",c=>d+=c);r.on(\"end\",()=>{console.log(d);process.exit(r.statusCode===200?0:1)})}).on(\"error\",e=>{console.error(e.message);process.exit(1)})" 2>&1' || echo "   Health check failed or service not running"
echo ""

echo "7. Disk Usage:"
docker exec "$CONTAINER_NAME" df -h 2>/dev/null | head -5 || echo "Could not retrieve disk usage"
echo ""

echo "8. Health Check History (if available):"
docker inspect --format='{{range .State.Health.Log}}{{.Output}}{{end}}' "$CONTAINER_NAME" 2>/dev/null | tail -5 || echo "No health check history available"
echo ""

echo "=== Debug Complete ==="
echo ""
echo "To view live logs: docker logs -f $CONTAINER_NAME"
echo "To exec into container: docker exec -it $CONTAINER_NAME sh"
