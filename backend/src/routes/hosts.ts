import { Router, Request, Response } from 'express';
import { HostService } from '../services/hostService';
import { WoLService } from '../services/wolService';
import { SSHService } from '../services/sshService';
import { StatusService } from '../services/statusService';
import { PrometheusService } from '../services/prometheusService';
import { CreateHostDTO, UpdateHostDTO, SSHCommandRequest } from '../types';
import db from '../models/database';

const router = Router();

/**
 * GET /api/hosts
 * Get all hosts
 */
router.get('/', (req: Request, res: Response) => {
  try {
    const hosts = HostService.getAllHosts();
    
    // Add status to each host
    const hostsWithStatus = hosts.map(host => {
      const status = StatusService.getLatestStatus(host.id);
      return {
        ...host,
        status: status?.status || 'unknown',
        last_checked: status?.last_checked || null,
      };
    });

    res.json(hostsWithStatus);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch hosts' });
  }
});

/**
 * GET /api/hosts/:id
 * Get host by ID
 */
router.get('/:id', (req: Request, res: Response) => {
  try {
    const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
    const host = HostService.getHostById(id);

    if (!host) {
      return res.status(404).json({ error: 'Host not found' });
    }

    const status = StatusService.getLatestStatus(host.id);

    res.json({
      ...host,
      status: status?.status || 'unknown',
      last_checked: status?.last_checked || null,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch host' });
  }
});

/**
 * POST /api/hosts
 * Create new host
 */
router.post('/', (req: Request, res: Response) => {
  try {
    const data: CreateHostDTO = req.body;
    
    // Validate required fields
    if (!data.name || !data.ip_address || !data.mac_address) {
      return res.status(400).json({ error: 'Missing required fields: name, ip_address, mac_address' });
    }

    const host = HostService.createHost(data);
    res.status(201).json(host);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create host' });
  }
});

/**
 * PUT /api/hosts/:id
 * Update host
 */
router.put('/:id', (req: Request, res: Response) => {
  try {
    const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
    const data: UpdateHostDTO = req.body;

    const host = HostService.updateHost(id, data);

    if (!host) {
      return res.status(404).json({ error: 'Host not found' });
    }

    res.json(host);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update host' });
  }
});

/**
 * DELETE /api/hosts/:id
 * Delete host
 */
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
    const success = HostService.deleteHost(id);

    if (!success) {
      return res.status(404).json({ error: 'Host not found' });
    }

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete host' });
  }
});

/**
 * POST /api/hosts/:id/wol
 * Send Wake on LAN packet
 */
router.post('/:id/wol', async (req: Request, res: Response) => {
  const timestamp = new Date().toISOString();
  console.log(`\n[${timestamp}] [WoL] POST /api/hosts/${req.params.id}/wol`);

  try {
    const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
    const host = HostService.getHostById(id);

    if (!host) {
      console.log(`[WoL] Host with id=${id} not found`);
      return res.status(404).json({ error: 'Host not found' });
    }

    console.log(`[WoL] Host: ${host.name} (${host.ip_address}), id=${host.id}`);
    console.log(`[WoL] MAC: ${host.mac_address}, Broadcast: ${host.broadcast_address || '(none)'}`);

    const result = await WoLService.sendWoL({
      mac_address: host.mac_address,
      ip_address: host.ip_address,
      broadcast_address: host.broadcast_address || undefined,
    });

    console.log(`[WoL] Result: success=${result.success}, message="${result.message}"`);
    res.json(result);
  } catch (error) {
    console.error(`[WoL] Unhandled error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    if (error instanceof Error && error.stack) {
      console.error(`[WoL] Stack trace: ${error.stack}`);
    }
    res.status(500).json({ error: 'Failed to send WoL packet' });
  }
});

/**
 * POST /api/hosts/:id/shutdown
 * Shutdown host via SSH
 */
router.post('/:id/shutdown', async (req: Request, res: Response) => {
  const timestamp = new Date().toISOString();
  console.log(`\n[${timestamp}] [SHUTDOWN] POST /api/hosts/${req.params.id}/shutdown`);

  try {
    const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
    const host = HostService.getHostById(id);

    if (!host) {
      console.log(`[SHUTDOWN] Host with id=${id} not found`);
      return res.status(404).json({ error: 'Host not found' });
    }

    console.log(`[SHUTDOWN] Host: ${host.name} (${host.ip_address}), id=${host.id}`);

    if (!host.ssh_username) {
      console.log(`[SHUTDOWN] No SSH username configured for host id=${id}`);
      return res.status(400).json({ error: 'SSH username not configured for this host' });
    }

    const authType = host.ssh_auth_type || 'password';
    console.log(`[SHUTDOWN] Auth type: ${authType}, SSH port: ${host.ssh_port || 22}`);
    console.log(`[SHUTDOWN] Shutdown command: ${host.shutdown_command || 'sudo shutdown -h now (default)'}`);

    if (authType === 'password' && !host.ssh_password) {
      console.log(`[SHUTDOWN] No SSH password configured for host id=${id}`);
      return res.status(400).json({ error: 'SSH password not configured for this host' });
    }

    const result = await SSHService.executeCommand(
      host.ip_address,
      host.ssh_port || 22,
      host.ssh_username,
      authType,
      { command: 'shutdown', custom_command: host.shutdown_command || undefined },
      host.ssh_password
    );

    console.log(`[SHUTDOWN] Result: success=${result.success}, message="${result.message}"`);
    res.json(result);
  } catch (error) {
    console.error(`[SHUTDOWN] Unhandled error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    if (error instanceof Error && error.stack) {
      console.error(`[SHUTDOWN] Stack trace: ${error.stack}`);
    }
    res.status(500).json({ error: 'Failed to shutdown host' });
  }
});

/**
 * POST /api/hosts/:id/reboot
 * Reboot host via SSH
 */
router.post('/:id/reboot', async (req: Request, res: Response) => {
  const timestamp = new Date().toISOString();
  console.log(`\n[${timestamp}] [REBOOT] POST /api/hosts/${req.params.id}/reboot`);

  try {
    const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
    const host = HostService.getHostById(id);

    if (!host) {
      console.log(`[REBOOT] Host with id=${id} not found`);
      return res.status(404).json({ error: 'Host not found' });
    }

    console.log(`[REBOOT] Host: ${host.name} (${host.ip_address}), id=${host.id}`);

    if (!host.ssh_username) {
      console.log(`[REBOOT] No SSH username configured for host id=${id}`);
      return res.status(400).json({ error: 'SSH username not configured for this host' });
    }

    const authType = host.ssh_auth_type || 'password';
    console.log(`[REBOOT] Auth type: ${authType}, SSH port: ${host.ssh_port || 22}`);
    console.log(`[REBOOT] Reboot command: ${host.reboot_command || 'sudo reboot (default)'}`);

    if (authType === 'password' && !host.ssh_password) {
      console.log(`[REBOOT] No SSH password configured for host id=${id}`);
      return res.status(400).json({ error: 'SSH password not configured for this host' });
    }

    const result = await SSHService.executeCommand(
      host.ip_address,
      host.ssh_port || 22,
      host.ssh_username,
      authType,
      { command: 'reboot', custom_command: host.reboot_command || undefined },
      host.ssh_password
    );

    console.log(`[REBOOT] Result: success=${result.success}, message="${result.message}"`);
    res.json(result);
  } catch (error) {
    console.error(`[REBOOT] Unhandled error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    if (error instanceof Error && error.stack) {
      console.error(`[REBOOT] Stack trace: ${error.stack}`);
    }
    res.status(500).json({ error: 'Failed to reboot host' });
  }
});

/**
 * POST /api/hosts/:id/command
 * Run a custom command (configured in host's custom_commands list) via SSH.
 * The request body identifies the command by its index in the custom_commands
 * array: { index: number }. The host must be configured with SSH credentials.
 */
router.post('/:id/command', async (req: Request, res: Response) => {
  const timestamp = new Date().toISOString();
  console.log(`\n[${timestamp}] [CUSTOM CMD] POST /api/hosts/${req.params.id}/command`);

  try {
    const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
    const host = HostService.getHostById(id);

    if (!host) {
      console.log(`[CUSTOM CMD] Host with id=${id} not found`);
      return res.status(404).json({ error: 'Host not found' });
    }

    console.log(`[CUSTOM CMD] Host: ${host.name} (${host.ip_address}), id=${host.id}`);

    if (!host.ssh_username) {
      console.log(`[CUSTOM CMD] No SSH username configured for host id=${id}`);
      return res.status(400).json({ error: 'SSH username not configured for this host' });
    }

    const authType = host.ssh_auth_type || 'password';
    if (authType === 'password' && !host.ssh_password) {
      console.log(`[CUSTOM CMD] No SSH password configured for host id=${id}`);
      return res.status(400).json({ error: 'SSH password not configured for this host' });
    }

    const customCommands = host.custom_commands || [];
    const index = typeof req.body.index === 'number' ? req.body.index : parseInt(req.body.index);
    if (isNaN(index) || index < 0 || index >= customCommands.length) {
      console.log(`[CUSTOM CMD] Invalid command index ${index} for host id=${id}`);
      return res.status(400).json({ error: 'Invalid command index' });
    }

    const customCommand = customCommands[index];
    console.log(`[CUSTOM CMD] Auth type: ${authType}, SSH port: ${host.ssh_port || 22}`);
    console.log(`[CUSTOM CMD] Running custom command "${customCommand.name}": ${customCommand.command}`);

    const result = await SSHService.executeCommand(
      host.ip_address,
      host.ssh_port || 22,
      host.ssh_username,
      authType,
      { command: 'custom', custom_command: customCommand.command },
      host.ssh_password
    );

    console.log(`[CUSTOM CMD] Result: success=${result.success}, message="${result.message}"`);
    res.json(result);
  } catch (error) {
    console.error(`[CUSTOM CMD] Unhandled error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    if (error instanceof Error && error.stack) {
      console.error(`[CUSTOM CMD] Stack trace: ${error.stack}`);
    }
    res.status(500).json({ error: 'Failed to run custom command' });
  }
});

/**
 * GET /api/hosts/:id/status
 * Get current host status
 */
router.get('/:id/status', async (req: Request, res: Response) => {
  try {
    const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
    const host = HostService.getHostById(id);

    if (!host) {
      return res.status(404).json({ error: 'Host not found' });
    }

    const status = await StatusService.checkHostStatus(host.ip_address);

    // Update status history
    db.prepare(
      'INSERT INTO status_history (host_id, status, checked_at) VALUES (?, ?, CURRENT_TIMESTAMP)'
    ).run(id, status);

    res.json({
      host_id: id,
      status,
      last_checked: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to check host status' });
  }
});

/**
 * GET /api/hosts/:id/history
 * Get status history for host
 */
router.get('/:id/history', (req: Request, res: Response) => {
  try {
    const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
    const limit = parseInt(req.query.limit as string) || 100;

    const history = StatusService.getStatusHistory(id, limit);
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch status history' });
  }
});

/**
 * GET /api/hosts/:id/energy
 * Get energy consumption data from Prometheus
 */
router.get('/:id/energy', async (req: Request, res: Response) => {
  const timestamp = new Date().toISOString();
  console.log(`\n[${timestamp}] [ENERGY] GET /api/hosts/${req.params.id}/energy`);

  try {
    const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
    const host = HostService.getHostById(id);

    if (!host) {
      console.log(`[ENERGY] Host with id=${id} not found`);
      return res.status(404).json({ error: 'Host not found' });
    }

    if (!host.prometheus_metric) {
      console.log(`[ENERGY] No prometheus_metric configured for host id=${id}`);
      return res.status(400).json({ error: 'Energy monitoring not configured for this host. Set a Prometheus metric in host settings.' });
    }

    const days = parseInt(req.query.days as string) || host.energy_days_range || 7;
    console.log(`[ENERGY] Host: ${host.name} (${host.ip_address}), Metric: ${host.prometheus_metric}, Days: ${days}`);

    const result = await PrometheusService.queryEnergyMetric(
      id,
      host.prometheus_metric,
      host.ip_address,
      days,
      host.energy_price_metric || undefined
    );

    console.log(`[ENERGY] Returning ${result.data.length} data points`);
    res.json(result);
  } catch (error) {
    console.error(`[ENERGY] Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    if (error instanceof Error && error.stack) {
      console.error(`[ENERGY] Stack trace: ${error.stack}`);
    }
    res.status(500).json({ error: `Failed to fetch energy data: ${error instanceof Error ? error.message : 'Unknown error'}` });
  }
});

export default router;