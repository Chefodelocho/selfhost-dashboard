<div align="center">
  <img src="./frontend/public/apple-touch-icon.png" alt="SelfHost Dashboard Logo" width="120" height="120" />
  
  # SelfHost Dashboard
  
  **A modern Progressive Web App (PWA) for managing and monitoring server devices within your LAN.**
  
  Create and configure hosts with IP, MAC, and SSH credentials to perform Wake on LAN, shutdown, reboot, monitor online status, and track energy consumption — all from a clean, responsive dashboard.

  ![Next.js](https://img.shields.io/badge/Next.js-16-blue) 
  ![Express](https://img.shields.io/badge/Express-5-green) 
  ![Docker](https://img.shields.io/badge/Docker-ready-blue)
  ![License](https://img.shields.io/badge/License-ISC-yellow)
  ![Node.js](https://img.shields.io/badge/Node.js-20+-green)

</div>

## 📖 Table of Contents

- [✨ Features](#-features)
- [🚀 Quick Start](#-quick-start)
- [📸 Screenshots](#-screenshots)
- [🏗️ Architecture & Technology Stack](#%EF%B8%8F-architecture--technology-stack)
- [🔗 Related Projects](#-related-projects)
- [📁 Project Structure](#-project-structure)
- [📖 Usage Guide](#-usage-guide)
- [🐳 Docker Reference](#-docker-reference)
- [⚙️ Advanced Configuration](#%EF%B8%8F-advanced-configuration)
- [🔒 Security Notes](#-security-notes)
- [🐛 Troubleshooting](#-troubleshooting)
- [📝 API Endpoints](#-api-endpoints)
- [🤝 Contributing](#-contributing)
- [📄 License](#-license)

## ✨ Features

- **Host Management** — Create, edit, and delete hosts with IP, MAC, and SSH credentials
- **Wake on LAN** — Send magic packets to wake up offline hosts
- **Remote Control** — Shutdown and reboot hosts via SSH (password or key-based auth)
- **Real-time Status** — Live online/offline monitoring with SSE (Server-Sent Events)
- **Energy Monitoring** — Per-host power consumption charts from Prometheus, with sparkline graphs on the dashboard
- **Scheduling** — Configure power on/off schedules per day of week with automatic execution
- **PWA** — Installable on mobile and desktop devices

## 🚀 Quick Start

Choose your preferred installation method:

### Docker (Recommended - 2 Minutes)

The easiest way to get up and running. Perfect for production deployments.

```bash
# 1. Clone and navigate to the project
git clone https://github.com/YOUR_USERNAME/selfhost-dashboard.git
cd selfhost-dashboard

# 2. Copy the environment template
cp .env.docker.example .env.docker

# 3. Generate an encryption key (save this!)
openssl rand -hex 32

# 4. Edit .env.docker and set SSH_ENCRYPTION_KEY with the generated value
nano .env.docker

# 5. Start with Docker Compose
docker compose up -d

# 6. Open your browser
# http://localhost:3000
```

**That's it!** The application is now running. Database will be persisted in `./data/`.

### Local Development (5 Minutes)

For development or testing without Docker.

```bash
# 1. Clone the repository
git clone https://github.com/YOUR_USERNAME/selfhost-dashboard.git
cd selfhost-dashboard

# 2. Install dependencies
cd backend && npm install
cd ../frontend && npm install

# 3. Configure the backend
cd ../backend
cp .env.example .env
# Edit .env and set SSH_ENCRYPTION_KEY
nano .env

# 4. Start in separate terminals
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend
cd frontend && npm run dev

# 5. Open your browser
# http://localhost:3000
```

### Next Steps After Installation

1. **Add Your First Host** — Click "Add Host" and fill in:
   - Host name, IP address, and MAC address
   - SSH credentials (optional, for remote control)
   - Prometheus metric (optional, for energy monitoring)

2. **Enable Wake on LAN** — Ensure your host has WoL enabled in BIOS/UEFI

3. **(Optional) Connect Prometheus** — Set `PROMETHEUS_URL` in your environment for energy tracking

4. **Install as PWA** — Click the install icon in your browser address bar (Chrome/Edge)

## 📸 Screenshots

> **[ADD YOUR SCREENSHOTS HERE]**
> 
> Show off your application with screenshots! Consider including:
> - Dashboard overview with host cards
> - Host detail page with energy charts
> - Add/edit host form
> - Mobile PWA view in action
>
> **How to add:**
> 1. Create a `docs/screenshots/` folder in your repository
> 2. Take screenshots of your application running
> 3. Upload them to the folder (e.g., `docs/screenshots/dashboard.png`)
> 4. Replace this section with:
> ```markdown
> ![Dashboard Overview](docs/screenshots/dashboard.png)
> ![Host Details](docs/screenshots/host-details.png)
> ![Mobile View](docs/screenshots/mobile-view.png)
> ```

## 🏗️ Architecture & Technology Stack

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

## 🔗 Related Projects

Complementary projects and integrations that work well with SelfHost Dashboard:

> **[ADD YOUR RELATED PROJECTS HERE]**
>
> Share projects that complement or extend SelfHost Dashboard:
> - Home server management tools
> - Energy monitoring systems
> - Infrastructure automation projects
> - Similar dashboard applications
>
> **Example format:**
> - **[Project Name]** — Brief description of what it does. [GitHub Link](https://github.com/...)

## 📁 Project Structure

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

## ⚙️ Advanced Configuration

### Environment Variables Reference

#### Backend Configuration (`backend/.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Backend server port |
| `DATABASE_PATH` | `./database/dashboard.db` | SQLite database path |
| `SSH_ENCRYPTION_KEY` | — | **Required.** Key for encrypting stored SSH passwords |
| `TZ` | `Europe/Madrid` | Timezone for scheduler |
| `SSH_PRIVATE_KEY_PATH` | `~/.ssh/id_ed25519` | SSH private key for key-based auth |
| `SSH_AUTH_SOCK` | — | SSH agent socket (for agent forwarding) |
| `PROMETHEUS_URL` | — | Prometheus server URL (leave empty to disable) |

### SSH Key-Based Authentication

To use SSH key authentication instead of passwords:

1. **Mount your SSH key** in `docker-compose.yml`:
```yaml
volumes:
  - /home/youruser/.ssh/id_ed25519:/app/ssh_key:ro
```

2. **Set the path** in `.env.docker`:
```env
SSH_PRIVATE_KEY_PATH=/app/ssh_key
```

> **Note:** Use absolute paths for SSH key mounts. `~` may not expand correctly when using `sudo`.

### Migrating from Local to Docker

If you have an existing database from local development:

```bash
mkdir -p data
cp backend/database/dashboard.db data/dashboard.db
docker compose up -d
```

### Production Build (Local)

```bash
# Backend
cd backend && npm run build && npm start

# Frontend
cd frontend && npm run build && npm start
```

## 📖 Usage Guide

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

## 📝 API Endpoints

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

## 🐳 Docker Reference

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

## 🔒 Security Notes

- **SSH Passwords** — Encrypted at rest using AES-256 with the `SSH_ENCRYPTION_KEY`
- **SSH Keys** — Mounted read-only into the container; never stored in the database
- **No Authentication** — The dashboard has no login system. It is designed for trusted LAN environments
- **Network** — `network_mode: host` is required for WoL (UDP broadcast) and ICMP ping. The app binds to all interfaces

## 🐛 Troubleshooting

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

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

### Getting Started

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make your changes and commit: `git commit -am 'Add your feature'`
4. Push to your fork: `git push origin feature/your-feature`
5. Open a Pull Request

### Code Style

- **Backend**: TypeScript with ESLint
- **Frontend**: TypeScript + React conventions
- Run `npm run lint` in both directories before submitting PR

### Testing

- Write tests for new features when possible
- Ensure existing tests pass: `npm test`
- Test Docker builds: `docker compose build`

### Reporting Issues

- Check existing issues first to avoid duplicates
- Include reproduction steps and environment details
- For security issues, please email privately instead of opening public issues

## 💬 Support

- **Documentation** — See this README and `/plans/architecture.md`
- **Issues** — Open a GitHub issue for bugs or feature requests
- **Discussions** — Use GitHub Discussions for general questions

## 📄 License

ISC
