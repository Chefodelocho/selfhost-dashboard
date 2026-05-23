import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import hostsRouter from './routes/hosts';
import schedulesRouter from './routes/schedules';
import eventsRouter, { broadcastEvent } from './routes/events';
import { SchedulerService } from './services/schedulerService';
import { StatusService } from './services/statusService';

// Load environment variables
dotenv.config();

// Set timezone for scheduler (defaults to Europe/Madrid)
process.env.TZ = process.env.TZ || 'Europe/Madrid';
console.log(`Timezone set to: ${process.env.TZ}`);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/hosts', hostsRouter);
app.use('/api/schedules', schedulesRouter);
app.use('/api/events', eventsRouter);

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