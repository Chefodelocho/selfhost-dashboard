"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clients = void 0;
exports.broadcastEvent = broadcastEvent;
const express_1 = require("express");
const router = (0, express_1.Router)();
const clients = new Set();
exports.clients = clients;
/**
 * GET /api/events
 * SSE endpoint for real-time updates
 */
router.get('/', (req, res) => {
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
    StatusService.checkAllHosts().then((statuses) => {
        res.write(`data: ${JSON.stringify({ type: 'status', data: statuses })}\n\n`);
    }).catch((err) => {
        // Prevent an unhandled rejection here from crashing the backend. This runs
        // on every SSE connection, so a transient DB/ping error must be contained.
        console.error('[SSE] Error sending initial statuses:', err);
    });
    // Remove client on disconnect
    req.on('close', () => {
        clients.delete(res);
    });
});
/**
 * Broadcast event to all connected clients
 */
function broadcastEvent(event) {
    const message = `data: ${JSON.stringify(event)}\n\n`;
    clients.forEach((client) => {
        try {
            client.write(message);
        }
        catch (error) {
            // Remove disconnected client
            clients.delete(client);
        }
    });
}
exports.default = router;
