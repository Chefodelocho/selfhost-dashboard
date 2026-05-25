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
set -e

echo "Starting SelfHost Dashboard..."

# Start backend in background (explicitly on port 3001)
echo "  → Backend (port 3001)"
cd /app/backend
PORT=3001 node dist/index.js &

# Wait for backend to be ready
echo "  → Waiting for backend..."
for i in $(seq 1 30); do
  if wget -q -O /dev/null http://localhost:3001/api/health 2>/dev/null; then
    echo "  → Backend is ready"
    break
  fi
  sleep 0.5
done

# Start frontend in foreground (explicitly on port 3000)
echo "  → Frontend (port 3000)"
cd /app/frontend
HOSTNAME=0.0.0.0 PORT=3000 node server.js &

# Wait for any process to exit
wait
SCRIPT
RUN chmod +x /app/start.sh

EXPOSE 3000

# Volume for persistent database
VOLUME ["/data"]

ENTRYPOINT ["dumb-init", "--"]
CMD ["/app/start.sh"]
