# SelfHost Dashboard

A modern Progressive Web App (PWA) for managing and monitoring server devices within your LAN. Create and configure hosts with IP, MAC, and SSH credentials to perform Wake on LAN, shutdown, reboot, monitor online status, and track energy consumption — all from a clean, responsive dashboard.

![Dashboard](https://img.shields.io/badge/Next.js-16-blue) ![Backend](https://img.shields.io/badge/Express-5-green) ![Docker](https://img.shields.io/badge/Docker-ready-blue)

## Features

- **Host Management** — Create, edit, and delete hosts with IP, MAC, and SSH credentials
- **Wake on LAN** — Send magic packets to wake up offline hosts
- **Remote Control** — Shutdown and reboot hosts via SSH (password or key-based auth)
- **Real-time Status** — Live online/offline monitoring with SSE (Server-Sent Events)
- **Energy Monitoring** — Per-host power consumption charts from Prometheus, with sparkline graphs on the dashboard
- **Scheduling** — Configure power on/off schedules per day of week with automatic execution
- **PWA** — Installable on mobile and desktop devices

## Technology Stack

### Frontend
- **Framework**: Next.js 16 (React 19)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4 + shadcn components
- **Charts**: Recharts 3 (area charts, sparklines)
- **Icons**: Lucide React
- **Real-time**: Server-Sent Events (SSE)

### Backend
- **Runtime**: Node.js 20+
- **Framework**: Express.js 5
- **Language**: TypeScript
- **Database**: SQLite (better-sqlite3)
- **SSH**: node-ssh (password + key-based authentication)
- **Network**: dgram (WoL), ping (status checks)
- **Scheduling**: node-cron
- **Energy**: Prometheus query_range API

## Project Structure

```
selfhost-dashboard/
├── Dockerfile                    # Multi-stage Docker build
├── docker-compose.yml            # Docker Compose with env_file
├── .env.docker.example           # Docker environment template
├── backend/
│   ├── src/
│   │   ├── index.ts              # Express server entry point
│   │   ├── routes/
│   │   │   ├── hosts.ts          # Host + energy endpoints
│   │   │   ├── schedules.ts      # Schedule CRUD endpoints
│   │   │   └── events.ts         # SSE for real-time updates
│   │   ├── services/
│   │   │   ├── hostService.ts    # Host database operations
│   │   │   ├── wolService.ts     # Wake on LAN magic packets
│   │   │   ├── sshService.ts     # SSH command execution
│   │   │   ├── statusService.ts  # Ping-based status checks
│   │   │   ├── scheduleService.ts # Schedule CRUD operations
│   │   │   ├── schedulerService.ts # Cron-based schedule execution
│   │   │   └── prometheusService.ts # Prometheus energy queries
│   │   ├── models/
│   │   │   └── database.ts       # SQLite connection & migrations
│   │   └── types/
│   │       └── index.ts          # TypeScript interfaces
│   ├── database/
│   │   └── dashboard.db          # SQLite database (auto-created)
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx          # Dashboard (cards + sparklines)
│   │   │   ├── layout.tsx        # Root layout
│   │   │   └── hosts/
│   │   │       ├── new/page.tsx  # Create/edit host form
│   │   │       └── [id]/
│   │   │           ├── page.tsx  # Host detail + energy chart
│   │   │           └── edit/page.tsx
│   │   ├── components/
│   │   │   ├── EnergyChart.tsx   # Full energy area chart
│   │   │   ├── EnergySparkline.tsx # Mini sparkline for cards
│   │   │   └── ui/button.tsx    # shadcn button component
│   │   ├── lib/
│   │   │   ├── api.ts           # API client
│   │   │   └── utils.ts         # Utility functions
│   │   └── types/
│   │       └── index.ts         # TypeScript interfaces
│   └── public/
│       ├── manifest.json        # PWA manifest
│       ├── icon-192.png         # PWA icon
│       └── icon-512.png         # PWA icon
└── plans/
    └── architecture.md          # Architecture documentation
```

## Getting Started

### Option A: Docker (Recommended)

The easiest way to run SelfHost Dashboard. Uses `network_mode: host` for Wake-on-LAN and ICMP ping support.

```bash
# 1. Copy the environment template
cp .env.docker.example .env.docker

# 2. Generate an encryption key and edit .env.docker
openssl rand -hex 32
# Set SSH_ENCRYPTION_KEY in .env.docker

# 3. Build and start
docker compose up -d

# 4. Open http://localhost:3000
```

**Migrating from local development?** Copy your existing database:
```bash
mkdir -p data
cp backend/database/dashboard.db data/dashboard.db
```

**SSH key authentication?** Mount your private key and set the path in `.env.docker`:
```yaml
# docker-compose.yml — uncomment and adjust the SSH key volume:
- /home/youruser/.ssh/id_ed25519:/app/ssh_key:ro
```
```env
# .env.docker
SSH_PRIVATE_KEY_PATH=/app/ssh_key
```

> **Note:** Use absolute paths for SSH key mounts. `~` may not expand correctly when using `sudo`.

### Option B: Local Development

#### Prerequisites

- Node.js 20+
- npm

#### Installation

```bash
# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd ../frontend && npm install
```

#### Configuration

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env`:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Backend server port |
| `DATABASE_PATH` | `./database/dashboard.db` | SQLite database path |
| `SSH_ENCRYPTION_KEY` | — | Key for encrypting stored SSH passwords |
| `TZ` | `Europe/Madrid` | Timezone for scheduler |
| `SSH_PRIVATE_KEY_PATH` | `~/.ssh/id_ed25519` | SSH private key for key-based auth |
| `SSH_AUTH_SOCK` | — | SSH agent socket (for agent forwarding) |
| `PROMETHEUS_URL` | — | Prometheus server URL (leave empty to disable) |

#### Running

```bash
# Terminal 1 — Backend
cd backend && npm run dev

# Terminal 2 — Frontend
cd frontend && npm run dev
```

Open `http://localhost:3000`. The frontend proxies `/api/*` requests to the backend automatically.

#### Production Build

```bash
# Backend
cd backend && npm run build && npm start

# Frontend
cd frontend && npm run build && npm start
```

## Usage

### Adding a Host

1. Click **"Add Host"** on the dashboard
2. Fill in the required fields:
   - **Name** — A friendly name for the host
   - **IP Address** — The host's LAN IP address
   - **MAC Address** — For Wake on LAN
3. Optionally configure SSH:
   - **SSH Auth Type** — Password or Key
   - **SSH Username** / **Password** — For password auth
   - **SSH Port** — Default 22
   - **Shutdown/Reboot Commands** — Custom commands (defaults provided)
4. Optionally configure energy monitoring:
   - **Prometheus Metric** — Full PromQL expression (e.g., `cem_active_power_watts{phase="l1"}`)
   - **Days Range** — Default time window for the chart (1–15 days)

### Controlling Hosts

| Action | Button | Requirement |
|--------|--------|-------------|
| Wake on LAN | **Wake** (offline hosts) | MAC address configured |
| Reboot | **Reboot** (online hosts) | SSH credentials configured |
| Shutdown | **Shutdown** (online hosts) | SSH credentials configured |

### Energy Monitoring

When a host has a Prometheus metric configured:
- The **dashboard card** shows a sparkline graph with 1-day average power consumption
- The **host detail page** shows a full interactive chart with day range selector (1d/3d/7d/15d) and statistics (avg/max/min watts)

Requires a Prometheus instance accessible from the backend with the configured `PROMETHEUS_URL`.

### Scheduling

1. Open a host's detail page
2. In the **Schedules** section, click **"Add"**
3. Configure:
   - **Day of Week** — Or "Daily" for every day
   - **Power On Time** — Auto wake via WoL
   - **Power Off Time** — Auto shutdown via SSH
   - **Enabled** — Toggle on/off
4. Schedules are shown as compact badges on the dashboard cards

### PWA Installation

1. Open the app in Chrome, Edge, or Safari
2. Click the **"Install"** icon in the address bar
3. The app installs to your home screen/desktop

## API Endpoints

### Hosts

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/hosts` | List all hosts with status |
| `GET` | `/api/hosts/:id` | Get host by ID |
| `POST` | `/api/hosts` | Create host |
| `PUT` | `/api/hosts/:id` | Update host |
| `DELETE` | `/api/hosts/:id` | Delete host |
| `POST` | `/api/hosts/:id/wol` | Send Wake on LAN |
| `POST` | `/api/hosts/:id/shutdown` | Shutdown via SSH |
| `POST` | `/api/hosts/:id/reboot` | Reboot via SSH |
| `GET` | `/api/hosts/:id/status` | Check current status |
| `GET` | `/api/hosts/:id/history` | Get status history |
| `GET` | `/api/hosts/:id/energy?days=7` | Get energy data from Prometheus |

### Schedules

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/schedules` | List all schedules |
| `GET` | `/api/schedules/:id` | Get schedule by ID |
| `POST` | `/api/schedules` | Create schedule |
| `PUT` | `/api/schedules/:id` | Update schedule |
| `DELETE` | `/api/schedules/:id` | Delete schedule |

### Events

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/events` | SSE stream for real-time status updates |

## Docker Reference

### Architecture

The Docker image uses a multi-stage build:

1. **frontend-builder** — Compiles Next.js with `output: "standalone"` and `NEXT_PUBLIC_API_URL=/api`
2. **backend-builder** — Compiles TypeScript and prunes devDependencies
3. **Production** — Alpine-based image (~324MB) with `dumb-init` as PID 1

The container runs both services:
- **Backend** on port 3001 (internal only)
- **Frontend** on port 3000 (exposed) — proxies `/api/*` to the backend via Next.js rewrites

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `TZ` | `Europe/Madrid` | Container timezone |
| `SSH_ENCRYPTION_KEY` | — | **Required.** Key for encrypting SSH passwords |
| `PROMETHEUS_URL` | — | Prometheus URL (empty = disabled) |
| `SSH_PRIVATE_KEY_PATH` | — | Path to mounted SSH private key |
| `DATABASE_PATH` | `/data/dashboard.db` | SQLite database path |
| `BACKEND_URL` | `http://localhost:3001` | Backend URL for Next.js rewrites |

### Volumes

| Host path | Container path | Description |
|-----------|---------------|-------------|
| `./data` | `/data` | Persistent SQLite database |
| SSH key file | `/app/ssh_key` | SSH private key (read-only) |

## Security Notes

- **SSH Passwords** — Encrypted at rest using AES-256 with the `SSH_ENCRYPTION_KEY`
- **SSH Keys** — Mounted read-only into the container; never stored in the database
- **No Authentication** — The dashboard has no login system. It is designed for trusted LAN environments
- **Network** — `network_mode: host` is required for WoL (UDP broadcast) and ICMP ping. The app binds to all interfaces

## Troubleshooting

### Backend won't start
- Check if port 3001 is already in use
- Verify Node.js version is 20+
- Check `SSH_ENCRYPTION_KEY` is set

### Frontend can't reach backend (Docker)
- Check both services started: `docker compose logs`
- Verify the health check passed: logs should show "Backend is ready"
- The frontend proxies `/api/*` to the backend — no CORS configuration needed

### Wake on LAN not working
- Verify the MAC address is correct (format: `AA:BB:CC:DD:EE:FF`)
- Ensure the target host supports and has WoL enabled in BIOS/UEFI
- `network_mode: host` is required — bridge mode won't allow UDP broadcast

### SSH commands failing
- **Password auth**: Verify credentials and that the user has sudo privileges
- **Key auth**: Check the key file is mounted correctly (`ls -la /app/ssh_key` should show a file, not a directory)
- **Agent forwarding**: Set `SSH_AUTH_SOCK` in the environment
- Check the host's SSH server is running and accessible

### Energy charts empty
- Verify `PROMETHEUS_URL` is set and reachable from the container
- Check the PromQL metric expression is correct (test in Prometheus UI first)
- The metric field should be the full expression: `cem_active_power_watts{phase="l1"}`

## License

ISC
