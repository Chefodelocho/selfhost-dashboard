# SelfHost Dashboard

A Progressive Web App (PWA) for managing server devices within your LAN. The dashboard allows you to create and configure hosts with IP, MAC, and SSH credentials to perform Wake on LAN, shutdown, reboot, and monitor status with scheduling capabilities.

## Features

- **Host Management**: Create, edit, and delete hosts with IP, MAC, and SSH credentials
- **Wake on LAN**: Send magic packets to wake up offline hosts
- **Remote Control**: Shutdown and reboot hosts via SSH
- **Status Monitoring**: Real-time status monitoring with automatic refresh
- **Scheduling**: Configure power on/off schedules for each host
- **PWA**: Installable on mobile devices with offline support

## Technology Stack

### Frontend
- **Framework**: Next.js 14+ (React)
- **Language**: TypeScript
- **UI**: Tailwind CSS + Lucide Icons
- **Real-time**: Server-Sent Events (SSE)

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: SQLite (better-sqlite3)
- **SSH**: node-ssh
- **Network**: dgram (WoL), ping (status checks)
- **Scheduling**: node-cron

## Project Structure

```
selfhost-dashboard/
├── backend/
│   ├── src/
│   │   ├── index.ts          # Express server entry point
│   │   ├── routes/           # API routes
│   │   │   ├── hosts.ts      # Host management endpoints
│   │   │   ├── schedules.ts  # Schedule management endpoints
│   │   │   └── events.ts     # SSE for real-time updates
│   │   ├── services/         # Business logic
│   │   │   ├── hostService.ts
│   │   │   ├── wolService.ts
│   │   │   ├── sshService.ts
│   │   │   ├── statusService.ts
│   │   │   ├── scheduleService.ts
│   │   │   └── schedulerService.ts
│   │   ├── models/
│   │   │   └── database.ts   # SQLite connection & schema
│   │   └── types/
│   │       └── index.ts      # TypeScript types
│   ├── database/
│   │   └── dashboard.db      # SQLite database (auto-created)
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx              # Dashboard home
│   │   │   ├── layout.tsx            # Root layout
│   │   │   └── hosts/
│   │   │       ├── new/page.tsx      # Create host form
│   │   │       └── [id]/
│   │   │           ├── page.tsx      # Host detail with schedules
│   │   │           └── edit/page.tsx # Edit host form
│   │   ├── lib/
│   │   │   ├── api.ts        # API client
│   │   │   └── utils.ts      # Utility functions
│   │   └── types/
│   │       └── index.ts      # TypeScript types
│   ├── public/
│   │   └── manifest.json     # PWA manifest
│   └── package.json
└── plans/
    └── architecture.md       # Detailed architecture documentation
```

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. **Clone the repository** (or navigate to the project directory):
```bash
cd selfhost-dashboard
```

2. **Install backend dependencies**:
```bash
cd backend
npm install
```

3. **Install frontend dependencies**:
```bash
cd ../frontend
npm install
```

### Configuration

1. **Backend configuration**:
```bash
cd backend
cp .env.example .env
```

Edit `.env` if needed (default values should work for local development):
```env
PORT=3001
DATABASE_PATH=./database/dashboard.db
SSH_ENCRYPTION_KEY=your-secret-key-here
```

2. **Frontend configuration**:
```bash
cd frontend
cp .env.local.example .env.local
```

Edit `.env.local` if the backend is running on a different port:
```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

### Running the Application

1. **Start the backend server**:
```bash
cd backend
npm run dev
```

The backend will start on `http://localhost:3001`

2. **Start the frontend development server** (in a new terminal):
```bash
cd frontend
npm run dev
```

The frontend will start on `http://localhost:3000`

3. **Open your browser** and navigate to `http://localhost:3000`

### Production Build

1. **Build the backend**:
```bash
cd backend
npm run build
npm start
```

2. **Build the frontend**:
```bash
cd frontend
npm run build
npm start
```

## Usage

### Adding a Host

1. Click "Add Host" on the dashboard
2. Fill in the required fields:
   - **Name**: A friendly name for the host
   - **IP Address**: The host's IP address on your LAN
   - **MAC Address**: The host's MAC address (for Wake on LAN)
3. Optionally add SSH credentials for remote control:
   - **SSH Username**: Username for SSH connection
   - **SSH Password**: Password for SSH connection
   - **SSH Port**: SSH port (default: 22)
4. Click "Create Host"

### Controlling Hosts

- **Wake on LAN**: Click the "Wake" button on an offline host
- **Reboot**: Click the "Reboot" button on an online host
- **Shutdown**: Click the "Shutdown" button on an online host

### Managing Schedules

1. Click on a host to view its details
2. In the Schedules section, click "Add"
3. Configure the schedule:
   - **Day of Week**: Select the day
   - **Power On Time**: Set the time to automatically wake the host
   - **Power Off Time**: Set the time to automatically shutdown the host
   - **Enabled**: Toggle the schedule on/off
4. Click "Create"

### PWA Installation

1. Open the app in a supported browser (Chrome, Edge, Safari)
2. Look for the "Install" icon in the address bar
3. Click "Install" to add the app to your home screen

## API Endpoints

### Hosts
- `GET /api/hosts` - Get all hosts
- `GET /api/hosts/:id` - Get host by ID
- `POST /api/hosts` - Create new host
- `PUT /api/hosts/:id` - Update host
- `DELETE /api/hosts/:id` - Delete host
- `POST /api/hosts/:id/wol` - Send Wake on LAN packet
- `POST /api/hosts/:id/shutdown` - Shutdown host
- `POST /api/hosts/:id/reboot` - Reboot host
- `GET /api/hosts/:id/status` - Get host status
- `GET /api/hosts/:id/history` - Get status history

### Schedules
- `GET /api/schedules` - Get all schedules
- `GET /api/schedules/:id` - Get schedule by ID
- `POST /api/schedules` - Create new schedule
- `PUT /api/schedules/:id` - Update schedule
- `DELETE /api/schedules/:id` - Delete schedule

### Events
- `GET /api/events` - SSE endpoint for real-time updates

## Security Considerations

- **SSH Credentials**: Stored in plain text in the SQLite database. For production use, consider encryption.
- **LAN Only**: No authentication is implemented. The app is designed for use within a trusted LAN.
- **CORS**: Configured to allow requests from the frontend.

## Troubleshooting

### Backend won't start
- Check if port 3001 is already in use
- Verify Node.js version is 18+
- Try deleting `node_modules` and reinstalling

### Frontend can't connect to backend
- Verify the backend is running on port 3001
- Check `NEXT_PUBLIC_API_URL` in `.env.local`
- Check browser console for CORS errors

### Wake on LAN not working
- Verify the MAC address is correct
- Ensure the host supports Wake on LAN
- Check that the host and dashboard are on the same network
- Verify WoL is enabled in the host's BIOS/UEFI settings

### SSH commands not working
- Verify SSH credentials are correct
- Ensure the host has SSH enabled
- Check that the user has sudo privileges (required for shutdown/reboot)
- Verify the SSH port is correct

## License

ISC

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.