import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import hostsRouter from './routes/hosts';
import schedulesRouter from './routes/schedules';
import eventsRouter, { broadcastEvent } from './routes/events';
import authRouter from './routes/auth';
import { requireAuth, isAuthEnabled } from './services/authService';
import { SchedulerService } from './services/schedulerService';
import { StatusService } from './services/statusService';

// Load environment variables
dotenv.config();

// Set timezone for scheduler (defaults to Europe/Madrid)
process.env.TZ = process.env.TZ || 'Europe/Madrid';
console.log(`Timezone set to: ${process.env.TZ}`);
console.log(
  isAuthEnabled()
    ? 'Authentication: ENABLED (login required)'
    : 'Authentication: DISABLED (set AUTH_USERNAME and AUTH_PASSWORD_HASH to enable)'
);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRouter); // public — login endpoints
app.use('/api/hosts', requireAuth, hostsRouter);
app.use('/api/schedules', requireAuth, schedulesRouter);
app.use('/api/events', requireAuth, eventsRouter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start status monitoring with SSE broadcast
SchedulerService.startStatusMonitoring((statuses) => {
  broadcastEvent({ type: 'status', data: statuses });
});

// Start scheduler
SchedulerService.start();

// Start server
app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
  console.log(`API available at http://localhost:${PORT}/api`);
});

// Global error handlers — last line of defense so that a single async error or
// EventEmitter 'error' does not kill the backend process (which previously left
// it dead with no restart). The primary crash sources are handled at their
// origin (see the ssh2 Client error listener in sshService, and the .catch()
// guards on the cron/SSE async paths), so these should rarely fire.
//
// We intentionally LOG AND CONTINUE rather than exit, to maximise uptime for
// this self-hosted dashboard. The start.sh supervisor still guarantees an
// automatic restart if the process ever truly exits (OOM, fatal error, etc.).
process.on('unhandledRejection', (reason, promise) => {
  console.error('[FATAL] Unhandled Promise Rejection (suppressed):', reason);
});

process.on('uncaughtException', (error) => {
  console.error('[FATAL] Uncaught Exception (suppressed):');
  console.error(error?.stack || error);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down gracefully...');
  SchedulerService.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Shutting down gracefully...');
  SchedulerService.stop();
  process.exit(0);
});