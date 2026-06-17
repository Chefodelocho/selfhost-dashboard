# ============================================================
# Stage 1: Build Frontend (Next.js)
# ============================================================
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

# Install dependencies first (layer caching)
COPY frontend/package*.json ./
RUN npm ci

# Copy source and build
COPY frontend/ .
ENV NEXT_PUBLIC_API_URL=/api
RUN npm run build

# ============================================================
# Stage 2: Build Backend (TypeScript)
# ============================================================
FROM node:20-alpine AS backend-builder

# better-sqlite3 requires native compilation
RUN apk add --no-cache python3 make g++

WORKDIR /app/backend

# Install dependencies
COPY backend/package*.json ./
RUN npm ci

# Copy source and build
COPY backend/tsconfig.json ./
COPY backend/src/ ./src/
RUN npm run build

# Prune devDependencies for production
RUN npm prune --production

# ============================================================
# Stage 3: Production Image
# ============================================================
FROM node:20-alpine

# dumb-init handles PID 1 signal forwarding properly
RUN apk add --no-cache dumb-init

WORKDIR /app

# --- Backend ---
COPY --from=backend-builder /app/backend/dist ./backend/dist
COPY --from=backend-builder /app/backend/node_modules ./backend/node_modules
COPY --from=backend-builder /app/backend/package.json ./backend/

# --- Frontend (standalone) ---
COPY --from=frontend-builder /app/frontend/.next/standalone ./frontend/
COPY --from=frontend-builder /app/frontend/.next/static ./frontend/.next/static
COPY --from=frontend-builder /app/frontend/public ./frontend/public

# Create data directory for SQLite database
RUN mkdir -p /data

# Environment defaults
ENV NODE_ENV=production
ENV BACKEND_URL=http://localhost:3001
ENV DATABASE_PATH=/data/dashboard.db
ENV TZ=Europe/Madrid

# Entrypoint script: starts backend then frontend
COPY <<'SCRIPT' /app/start.sh
#!/bin/sh
# Supervisor for SelfHost Dashboard.
#
# Starts the backend and frontend, and automatically RESTARTS the backend if
# it ever crashes. Previously the backend ran as a bare background process with
# a single `wait`, so when it died nothing restarted it: the container kept
# reporting "up" (because the frontend was still alive) while the backend
# stayed dead permanently. If the frontend dies here, the container exits so
# Docker's "restart: unless-stopped" policy restarts the whole stack.

echo "Starting SelfHost Dashboard..."

start_backend() {
  echo "  → Backend starting (port 3001)"
  ( cd /app/backend && PORT=3001 exec node dist/index.js ) &
  BACKEND_PID=$!
}

start_frontend() {
  echo "  → Frontend starting (port 3000)"
  ( cd /app/frontend && HOSTNAME=0.0.0.0 PORT=3000 exec node server.js ) &
  FRONTEND_PID=$!
}

start_backend
start_frontend

# Wait for backend to be ready (best-effort, non-blocking)
echo "  → Waiting for backend..."
for i in $(seq 1 30); do
  if wget -q -O /dev/null http://localhost:3001/api/health 2>/dev/null; then
    echo "  → Backend is ready"
    break
  fi
  sleep 0.5
done

# Clean shutdown on container signals (docker stop / restart)
cleanup() {
  echo "[supervisor] Shutting down..."
  kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null
  exit 0
}
trap cleanup TERM INT

# Supervisor loop: restart the backend if it dies, bail out if the frontend dies.
RESTART_DELAY=3
while true; do
  if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
    echo "[supervisor] Backend (PID $BACKEND_PID) died. Restarting in ${RESTART_DELAY}s..."
    sleep "$RESTART_DELAY"
    start_backend
  fi

  if ! kill -0 "$FRONTEND_PID" 2>/dev/null; then
    echo "[supervisor] Frontend (PID $FRONTEND_PID) died. Exiting container."
    kill "$BACKEND_PID" 2>/dev/null || true
    exit 1
  fi

  sleep 5
done
SCRIPT
RUN chmod +x /app/start.sh

EXPOSE 3000

# Volume for persistent database
VOLUME ["/data"]

ENTRYPOINT ["dumb-init", "--"]
CMD ["/app/start.sh"]
