"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const hostService_1 = require("../services/hostService");
const wolService_1 = require("../services/wolService");
const sshService_1 = require("../services/sshService");
const statusService_1 = require("../services/statusService");
const database_1 = __importDefault(require("../models/database"));
const router = (0, express_1.Router)();
/**
 * GET /api/hosts
 * Get all hosts
 */
router.get('/', (req, res) => {
    try {
        const hosts = hostService_1.HostService.getAllHosts();
        // Add status to each host
        const hostsWithStatus = hosts.map(host => {
            const status = statusService_1.StatusService.getLatestStatus(host.id);
            return {
                ...host,
                status: status?.status || 'unknown',
                last_checked: status?.last_checked || null,
            };
        });
        res.json(hostsWithStatus);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch hosts' });
    }
});
/**
 * GET /api/hosts/:id
 * Get host by ID
 */
router.get('/:id', (req, res) => {
    try {
        const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
        const host = hostService_1.HostService.getHostById(id);
        if (!host) {
            return res.status(404).json({ error: 'Host not found' });
        }
        const status = statusService_1.StatusService.getLatestStatus(host.id);
        res.json({
            ...host,
            status: status?.status || 'unknown',
            last_checked: status?.last_checked || null,
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch host' });
    }
});
/**
 * POST /api/hosts
 * Create new host
 */
router.post('/', (req, res) => {
    try {
        const data = req.body;
        // Validate required fields
        if (!data.name || !data.ip_address || !data.mac_address) {
            return res.status(400).json({ error: 'Missing required fields: name, ip_address, mac_address' });
        }
        const host = hostService_1.HostService.createHost(data);
        res.status(201).json(host);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to create host' });
    }
});
/**
 * PUT /api/hosts/:id
 * Update host
 */
router.put('/:id', (req, res) => {
    try {
        const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
        const data = req.body;
        const host = hostService_1.HostService.updateHost(id, data);
        if (!host) {
            return res.status(404).json({ error: 'Host not found' });
        }
        res.json(host);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to update host' });
    }
});
/**
 * DELETE /api/hosts/:id
 * Delete host
 */
router.delete('/:id', (req, res) => {
    try {
        const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
        const success = hostService_1.HostService.deleteHost(id);
        if (!success) {
            return res.status(404).json({ error: 'Host not found' });
        }
        res.status(204).send();
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to delete host' });
    }
});
/**
 * POST /api/hosts/:id/wol
 * Send Wake on LAN packet
 */
router.post('/:id/wol', async (req, res) => {
    try {
        const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
        const host = hostService_1.HostService.getHostById(id);
        if (!host) {
            return res.status(404).json({ error: 'Host not found' });
        }
        const result = await wolService_1.WoLService.sendWoL({
            mac_address: host.mac_address,
            ip_address: host.ip_address,
        });
        res.json(result);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to send WoL packet' });
    }
});
/**
 * POST /api/hosts/:id/shutdown
 * Shutdown host via SSH
 */
router.post('/:id/shutdown', async (req, res) => {
    try {
        const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
        const host = hostService_1.HostService.getHostById(id);
        if (!host) {
            return res.status(404).json({ error: 'Host not found' });
        }
        if (!host.ssh_username) {
            return res.status(400).json({ error: 'SSH username not configured for this host' });
        }
        const authType = host.ssh_auth_type || 'password';
        if (authType === 'password' && !host.ssh_password) {
            return res.status(400).json({ error: 'SSH password not configured for this host' });
        }
        const result = await sshService_1.SSHService.executeCommand(host.ip_address, host.ssh_port || 22, host.ssh_username, authType, { command: 'shutdown' }, host.ssh_password);
        res.json(result);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to shutdown host' });
    }
});
/**
 * POST /api/hosts/:id/reboot
 * Reboot host via SSH
 */
router.post('/:id/reboot', async (req, res) => {
    try {
        const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
        const host = hostService_1.HostService.getHostById(id);
        if (!host) {
            return res.status(404).json({ error: 'Host not found' });
        }
        if (!host.ssh_username) {
            return res.status(400).json({ error: 'SSH username not configured for this host' });
        }
        const authType = host.ssh_auth_type || 'password';
        if (authType === 'password' && !host.ssh_password) {
            return res.status(400).json({ error: 'SSH password not configured for this host' });
        }
        const result = await sshService_1.SSHService.executeCommand(host.ip_address, host.ssh_port || 22, host.ssh_username, authType, { command: 'reboot' }, host.ssh_password);
        res.json(result);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to reboot host' });
    }
});
/**
 * GET /api/hosts/:id/status
 * Get current host status
 */
router.get('/:id/status', async (req, res) => {
    try {
        const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
        const host = hostService_1.HostService.getHostById(id);
        if (!host) {
            return res.status(404).json({ error: 'Host not found' });
        }
        const status = await statusService_1.StatusService.checkHostStatus(host.ip_address);
        // Update status history
        database_1.default.prepare('INSERT INTO status_history (host_id, status, checked_at) VALUES (?, ?, CURRENT_TIMESTAMP)').run(id, status);
        res.json({
            host_id: id,
            status,
            last_checked: new Date().toISOString(),
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to check host status' });
    }
});
/**
 * GET /api/hosts/:id/history
 * Get status history for host
 */
router.get('/:id/history', (req, res) => {
    try {
        const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
        const limit = parseInt(req.query.limit) || 100;
        const history = statusService_1.StatusService.getStatusHistory(id, limit);
        res.json(history);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch status history' });
    }
});
exports.default = router;
