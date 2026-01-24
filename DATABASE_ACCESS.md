# Database Access via SSH Tunnel

This guide explains how to securely access your production PostgreSQL database from your local machine using an SSH tunnel.

## Overview

An SSH tunnel creates an encrypted connection between your local machine and the Coolify server, forwarding database traffic securely. The database never needs to be exposed to the internet.

**Server IP:** `46.225.15.238`  
**Database Port:** `5434` (default, check `DATABASE_PORT` env var in Coolify)  
**Local Tunnel Port:** `5433`

---

## Quick Start

### 1. Create SSH Tunnel

Run this command on your local machine:

```bash
ssh -f -N -L 5433:localhost:5434 root@46.225.15.238
```

**Explanation:**
- `-f` - Run in background
- `-N` - Don't execute remote commands (just forward ports)
- `-L 5433:localhost:5434` - Forward local port 5433 to remote port 5434
- `root@46.225.15.238` - Your SSH credentials and server address

### 2. Connect Your SQL Client

Use these connection settings:

- **Host:** `localhost` (or `127.0.0.1`)
- **Port:** `5433`
- **Database:** `audience_safe` (or your `DATABASE_NAME` from Infisical)
- **Username:** `postgres` (or your `DATABASE_USER` from Infisical)
- **Password:** Your `DATABASE_PASSWORD` from Infisical

### 3. Test Connection

Test with `psql`:

```bash
psql -h localhost -p 5433 -U postgres -d audience_safe
```

Or test with a simple connection string:

```bash
psql postgresql://postgres:YOUR_PASSWORD@localhost:5433/audience_safe
```

---

## Detailed Instructions

### Starting the SSH Tunnel

**Option A: Background Mode (Recommended)**

```bash
ssh -f -N -L 5433:localhost:5434 root@46.225.15.238
```

This runs the tunnel in the background, allowing you to continue using your terminal.

**Option B: Foreground Mode (For Debugging)**

```bash
ssh -L 5433:localhost:5434 root@46.225.15.238
```

This keeps the tunnel in the foreground. Press `Ctrl+C` to stop it.

**Option C: With SSH Config (Most Convenient)**

Add this to your `~/.ssh/config`:

```
Host coolify-db
    HostName 46.225.15.238
    User root
    LocalForward 5433 localhost:5434
    ServerAliveInterval 60
    ServerAliveCountMax 3
```

Then simply run:

```bash
ssh -f -N coolify-db
```

### Stopping the SSH Tunnel

**Method 1: Kill by Process (Recommended)**

```bash
# Find and kill the tunnel
pkill -f "ssh.*5433:localhost:5434"
```

**Method 2: Find PID and Kill**

```bash
# Find the process
ps aux | grep "ssh.*5433:localhost:5434" | grep -v grep

# Kill using the PID (second number in output)
kill <PID>
```

**Method 3: Kill by Port**

```bash
# Find what's using port 5433
lsof -i :5433

# Kill using the PID shown
kill <PID>
```

**Method 4: Kill All SSH Tunnels**

```bash
pkill -f "ssh.*-L.*5433"
```

### Verify Tunnel Status

Check if the tunnel is running:

```bash
# Check if port 5433 is in use
lsof -i :5433

# Or check SSH processes
ps aux | grep "ssh.*5433" | grep -v grep
```

---

## SQL Client Configuration

### pgAdmin

1. Right-click "Servers" → "Create" → "Server"
2. **General Tab:**
   - Name: `AudienceSafe Production`
3. **Connection Tab:**
   - Host: `localhost`
   - Port: `5433`
   - Database: `audience_safe`
   - Username: `postgres`
   - Password: (your database password)

### DBeaver

1. New Database Connection → PostgreSQL
2. **Main Tab:**
   - Host: `localhost`
   - Port: `5433`
   - Database: `audience_safe`
   - Username: `postgres`
   - Password: (your database password)
3. Test Connection → Finish

### TablePlus

1. Create New Connection → PostgreSQL
2. **Connection Settings:**
   - Host: `localhost`
   - Port: `5433`
   - Database: `audience_safe`
   - User: `postgres`
   - Password: (your database password)
3. Test → Connect

### DataGrip / IntelliJ

1. Database → Data Source → PostgreSQL
2. **Connection Settings:**
   - Host: `localhost`
   - Port: `5433`
   - Database: `audience_safe`
   - User: `postgres`
   - Password: (your database password)
3. Test Connection → OK

### VS Code (PostgreSQL Extension)

1. Open Command Palette (`Cmd+Shift+P`)
2. "PostgreSQL: Add Connection"
3. Enter:
   - Host: `localhost`
   - Port: `5433`
   - Database: `audience_safe`
   - Username: `postgres`
   - Password: (your database password)

---

## Connection String Format

### Standard PostgreSQL Connection String

```
postgresql://postgres:YOUR_PASSWORD@localhost:5433/audience_safe
```

### With SSL (if configured)

```
postgresql://postgres:YOUR_PASSWORD@localhost:5433/audience_safe?sslmode=require
```

---

## Troubleshooting

### Problem: "Connection refused" or "Connection timeout"

**Solutions:**
1. Verify the tunnel is running:
   ```bash
   lsof -i :5433
   ```

2. Check if the database port is correct. Verify in Coolify:
   - Check `DATABASE_PORT` environment variable
   - Default is `5434`, but it might be different

3. Test connection from the server:
   ```bash
   ssh root@46.225.15.238
   docker exec -it postgres_audience_safe psql -U postgres -d audience_safe
   ```

4. Try connecting to the database port directly from the server:
   ```bash
   ssh root@46.225.15.238
   netstat -tlnp | grep 5434
   # or
   ss -tlnp | grep 5434
   ```

### Problem: "Authentication failed"

**Solutions:**
1. Verify your database credentials in Infisical:
   - `DATABASE_USER`
   - `DATABASE_PASSWORD`
   - `DATABASE_NAME`

2. Test credentials directly on the server:
   ```bash
   ssh root@46.225.15.238
   docker exec -it postgres_audience_safe psql -U postgres -d audience_safe
   ```

### Problem: Tunnel disconnects frequently

**Solutions:**
1. Add keep-alive settings to your SSH config:
   ```
   Host coolify-db
       HostName 46.225.15.238
       User root
       LocalForward 5433 localhost:5434
       ServerAliveInterval 60
       ServerAliveCountMax 3
       TCPKeepAlive yes
   ```

2. Use `autossh` for automatic reconnection:
   ```bash
   # Install autossh (macOS)
   brew install autossh
   
   # Use autossh instead of ssh
   autossh -M 20000 -f -N -L 5433:localhost:5434 root@46.225.15.238
   ```

### Problem: "Address already in use" (port 5433)

**Solutions:**
1. Kill the existing tunnel:
   ```bash
   pkill -f "ssh.*5433:localhost:5434"
   ```

2. Use a different local port:
   ```bash
   ssh -f -N -L 5435:localhost:5434 root@46.225.15.238
   ```
   Then connect to port `5435` instead of `5433`.

### Problem: SSH connection fails

**Solutions:**
1. Verify SSH access works:
   ```bash
   ssh root@46.225.15.238
   ```

2. Check if you need to use a different SSH key:
   ```bash
   ssh -i ~/.ssh/your-key.pem -f -N -L 5433:localhost:5434 root@46.225.15.238
   ```

3. Check if the server's IP has changed (verify in Coolify dashboard)

---

## Best Practices

1. **Always use SSH tunnel** - Never expose the database port directly to the internet
2. **Use strong passwords** - Ensure your database password is complex
3. **Kill tunnels when done** - Don't leave tunnels running unnecessarily
4. **Use SSH keys** - Set up SSH key authentication instead of passwords
5. **Monitor connections** - Regularly check active database connections
6. **Document credentials securely** - Store database credentials in Infisical, not in code

---

## Quick Reference Commands

```bash
# Start tunnel (background)
ssh -f -N -L 5433:localhost:5434 root@46.225.15.238

# Stop tunnel
pkill -f "ssh.*5433:localhost:5434"

# Check tunnel status
lsof -i :5433

# Test connection
psql -h localhost -p 5433 -U postgres -d audience_safe

# View tunnel logs (if running in foreground)
ssh -v -L 5433:localhost:5434 root@46.225.15.238
```

---

## Environment Variables Reference

These are stored in Infisical and used by the application:

- `DATABASE_HOST` - Database hostname (usually `postgres` for Docker)
- `DATABASE_PORT` - Database port (usually `5432` internally, `5434` externally)
- `DATABASE_USER` - Database username (usually `postgres`)
- `DATABASE_PASSWORD` - Database password
- `DATABASE_NAME` - Database name (usually `audience_safe`)

**Note:** For SSH tunnel access, you connect to `localhost:5433` locally, which forwards to the server's `localhost:5434`, which maps to the container's `5432`.

---

## Next Steps

1. Set up SSH key authentication (if not already done)
2. Add SSH config entry for convenience
3. Test connection with your preferred SQL client
4. Document any custom configurations for your team
