# Coolify: Frontend not reachable at https://audiencesafe.com

## Root cause (most likely)

**"Domains for frontend" is empty in the Coolify UI.**

Coolify discovers services from your compose and **assigns routing via the "Domains for …" UI**. For the API, `https://api.audiencesafe.com:4000` is set, so Coolify adds Traefik labels and routing works. For the frontend, the field is empty, so Coolify does **not** configure the proxy for it.

Your custom Traefik labels in `docker-compose.yml` may be:

- Ignored or overwritten when Coolify generates labels for services that have a domain in the UI (only `api` has one).
- Kept as-is but never merged with Coolify’s proxy/network setup (e.g. `traefik.docker.network`, expected router/service names).

So even if the container runs and has `traefik.enable=true`, Coolify’s Traefik might not be fully configured for `audiencesafe.com` because the domain was never set in the UI.

---

## 1. Fix in Coolify UI (do this first)

In **Configuration → Domains** for `audience-safe-prod`:

- **Domains for frontend:** set  
  `https://audiencesafe.com:3000`  

  (`:3000` tells Coolify the container port; the proxy will still serve on 80/443.)

Then **Save** and **Redeploy**.

If Coolify’s UI only allows a host without port, try `https://audiencesafe.com` and ensure the frontend service is configured to use container port `3000` in Coolify (if there’s a port field for that service).

---

## 2. Optional: adjust `docker-compose.yml` so Coolify + Traefik work well

If you prefer to keep control in the compose (e.g. for Raw Compose / advanced use), you can:

- Ensure the frontend is on the `coolify` network (you already have it).
- Tell Traefik which network to use to reach the frontend (avoids ambiguity when the container is on several networks):

```yaml
# Under frontend.labels add:
- "traefik.docker.network=coolify"
```

- Optionally add `www` and HTTP→HTTPS redirect so they match the API behavior:

```yaml
# Example: add/merge these with your existing traefik labels
- "traefik.http.middlewares.redirect-to-https.redirectscheme.scheme=https"
- "traefik.http.routers.audiencesafe-http.rule=Host(`audiencesafe.com`) || Host(`www.audiencesafe.com`)"
- "traefik.http.routers.audiencesafe-http.entrypoints=http"
- "traefik.http.routers.audiencesafe-http.middlewares=redirect-to-https"
- "traefik.http.routers.audiencesafe-http.service=audiencesafe"
- "traefik.http.routers.audiencesafe-https.rule=Host(`audiencesafe.com`) || Host(`www.audiencesafe.com`)"
- "traefik.http.routers.audiencesafe-https.entrypoints=https"
- "traefik.http.routers.audiencesafe-https.tls=true"
- "traefik.http.routers.audiencesafe-https.tls.certresolver=letsencrypt"
- "traefik.http.routers.audiencesafe-https.service=audiencesafe"
- "traefik.http.services.audiencesafe.loadbalancer.server.port=3000"
- "traefik.docker.network=coolify"
```

**Important:** Coolify may still overwrite or ignore these if "Domains for frontend" is empty. The UI domain is the primary lever.

---

## 3. `network coolify declared as external, but could not be found`

That message appears when you run `docker compose` **locally**; the `coolify` network is created by Coolify’s proxy on the **server**. On the Coolify host it should exist. If a deploy fails with that error, the proxy (and its `coolify` network) may not be running. Ensure the Coolify proxy stack is up on that host.

---

## 4. Debug commands

Run these on the **Coolify server** (where the app and `coolify-proxy` run).

### Proxy (Traefik)

```bash
# Container running?
docker ps --filter "name=coolify-proxy"

# Logs (errors, which routers/services are registered)
docker logs coolify-proxy 2>&1 | tail -100

# Ping
docker exec coolify-proxy wget -qO- http://localhost:80/ping

# Routers Traefik knows (if API is on; may need to run from inside the proxy)
docker exec coolify-proxy wget -qO- http://localhost:8080/api/http/routers 2>/dev/null || true
```

### Frontend

```bash
# Container running?
docker ps --filter "name=frontend"

# Logs
docker logs $(docker ps -q --filter "name=frontend-aowwgg4ok844o8kc4c44k4cs" | head -1) 2>&1 | tail -80

# Networks and Traefik-related labels
docker inspect $(docker ps -q --filter "name=frontend-aowwgg4ok844o8kc4c44k4cs" | head -1) \
  --format '{{json .NetworkSettings.Networks}}' | jq .
docker inspect $(docker ps -q --filter "name=frontend-aowwgg4ok844o8kc4c44k4cs" | head -1) \
  --format '{{json .Config.Labels}}' | jq 'with_entries(select(.key | startswith("traefik")))'

# Reachability from host (Traefik on :80) – should be routed to frontend if config is correct
curl -sS -o /dev/null -w "%{http_code}" -H "Host: audiencesafe.com" http://127.0.0.1:80/
curl -sS -o /dev/null -w "%{http_code}" -k -H "Host: audiencesafe.com" https://127.0.0.1:443/
```

### From inside the `coolify` network (proxy can reach frontend?)

```bash
# Frontend container name (adjust if your naming differs)
FRONTEND_NAME=$(docker ps --filter "name=frontend-aowwgg4ok844o8kc4c44k4cs" --format "{{.Names}}" | head -1)

# Run a throwaway container on the same network and curl the frontend
docker run --rm --network coolify curlimages/curl:latest curl -sS -o /dev/null -w "%{http_code}" "http://${FRONTEND_NAME}:3000/"
```

If this returns `200` or `404`, the frontend is reachable on the `coolify` network. If it fails, the problem is network/routing between proxy and frontend.

### DNS and TLS

```bash
# DNS for audiencesafe.com
dig +short audiencesafe.com

# Optional: check if port 80/443 are open on the server
ss -tlnp | grep -E ':80|:443'
```

---

## 5. Checklist

| Check | Command / place |
|-------|------------------|
| "Domains for frontend" set in Coolify | UI → audience-safe-prod → Configuration → Domains |
| `coolify-proxy` running | `docker ps --filter "name=coolify-proxy"` |
| `coolify` network exists on server | `docker network ls \| grep coolify` |
| Frontend container running | `docker ps --filter "name=frontend"` |
| Frontend on `coolify` network | `docker inspect <frontend_id> --format '{{.NetworkSettings.Networks}}'` |
| Frontend responds on 3000 | `curl -sS -o /dev/null -w "%{http_code}" http://<frontend_ip_or_name>:3000/` |
| Traefik routes `Host(audiencesafe.com)` | Traefik logs / ` /api/http/routers` and UI domain config |

---

## 6. References

- [Coolify – Docker Compose (Domains, Raw Compose)](https://coolify.io/docs/knowledge-base/docker/compose#raw-docker-compose-deployment)
- [Coolify – Making services available (Domains, ports)](https://coolify.io/docs/knowledge-base/docker/compose#making-services-available-to-the-outside-world)
