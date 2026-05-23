import { Router, Request, Response } from 'express';

const router = Router();
const clients: Set<Response> = new Set();

/**
 * GET /api/events
 * SSE endpoint for real-time updates
 */
router.get('/', (req: Request, res: Response) => {
  // Set headers for SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  // Send initial connection message
  res.write('data: {"type":"connected"}\n\n');

  // Add client to set
  clients.add(res);

  // Send current statuses
  const { StatusService } = require('../services/statusService');
  StatusService.checkAllHosts().then((statuses: any[]) => {
    res.write(`data: ${JSON.stringify({ type: 'status', data: statuses })}\n\n`);
  });

  // Remove client on disconnect
  req.on('close', () => {
    clients.delete(res);
  });
});

/**
 * Broadcast event to all connected clients
 */
export function broadcastEvent(event: { type: string; data?: any }): void {
  const message = `data: ${JSON.stringify(event)}\n\n`;
  
  clients.forEach((client) => {
    try {
      client.write(message);
    } catch (error) {
      // Remove disconnected client
      clients.delete(client);
    }
  });
}

export default router;
export { clients };