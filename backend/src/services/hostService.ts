import db from '../models/database';
import { Host, CreateHostDTO, UpdateHostDTO } from '../types';

export class HostService {
  /**
   * Get all hosts
   */
  static getAllHosts(): Host[] {
    return db.prepare('SELECT * FROM hosts ORDER BY name').all() as Host[];
  }

  /**
   * Get host by ID
   */
  static getHostById(id: number): Host | null {
    const host = db.prepare('SELECT * FROM hosts WHERE id = ?').get(id) as Host | undefined;
    return host || null;
  }

  /**
   * Create new host
   */
  static createHost(data: CreateHostDTO): Host {
    const result = db.prepare(
      `INSERT INTO hosts (name, ip_address, mac_address, broadcast_address, ssh_username, ssh_password, ssh_auth_type, ssh_port, shutdown_command, reboot_command, description, prometheus_metric, energy_days_range)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      data.name,
      data.ip_address,
      data.mac_address,
      data.broadcast_address || null,
      data.ssh_username || null,
      data.ssh_password || null,
      data.ssh_auth_type || 'password',
      data.ssh_port || 22,
      data.shutdown_command || 'sudo shutdown -h now',
      data.reboot_command || 'sudo reboot',
      data.description || null,
      data.prometheus_metric || null,
      data.energy_days_range || 7
    );

    const host = this.getHostById(result.lastInsertRowid as number);
    if (!host) {
      throw new Error('Failed to create host');
    }

    return host;
  }

  /**
   * Update host
   */
  static updateHost(id: number, data: UpdateHostDTO): Host | null {
    const existingHost = this.getHostById(id);
    if (!existingHost) {
      return null;
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (data.name !== undefined) {
      updates.push('name = ?');
      values.push(data.name);
    }
    if (data.ip_address !== undefined) {
      updates.push('ip_address = ?');
      values.push(data.ip_address);
    }
    if (data.mac_address !== undefined) {
      updates.push('mac_address = ?');
      values.push(data.mac_address);
    }
    if (data.broadcast_address !== undefined) {
      updates.push('broadcast_address = ?');
      values.push(data.broadcast_address);
    }
    if (data.ssh_username !== undefined) {
      updates.push('ssh_username = ?');
      values.push(data.ssh_username);
    }
    if (data.ssh_password !== undefined) {
      updates.push('ssh_password = ?');
      values.push(data.ssh_password);
    }
    if (data.ssh_auth_type !== undefined) {
      updates.push('ssh_auth_type = ?');
      values.push(data.ssh_auth_type);
    }
    if (data.ssh_port !== undefined) {
      updates.push('ssh_port = ?');
      values.push(data.ssh_port);
    }
    if (data.shutdown_command !== undefined) {
      updates.push('shutdown_command = ?');
      values.push(data.shutdown_command);
    }
    if (data.reboot_command !== undefined) {
      updates.push('reboot_command = ?');
      values.push(data.reboot_command);
    }
    if (data.description !== undefined) {
      updates.push('description = ?');
      values.push(data.description);
    }
    if (data.prometheus_metric !== undefined) {
      updates.push('prometheus_metric = ?');
      values.push(data.prometheus_metric);
    }
    if (data.energy_days_range !== undefined) {
      updates.push('energy_days_range = ?');
      values.push(data.energy_days_range);
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    db.prepare(`UPDATE hosts SET ${updates.join(', ')} WHERE id = ?`).run(...values);

    return this.getHostById(id);
  }

  /**
   * Delete host
   */
  static deleteHost(id: number): boolean {
    const result = db.prepare('DELETE FROM hosts WHERE id = ?').run(id);
    return result.changes > 0;
  }

  /**
   * Get host with schedules
   */
  static getHostWithSchedules(id: number): (Host & { schedules: any[] }) | null {
    const host = this.getHostById(id);
    if (!host) {
      return null;
    }

    const schedules = db.prepare(
      'SELECT * FROM schedules WHERE host_id = ? ORDER BY day_of_week'
    ).all(id);

    return {
      ...host,
      schedules,
    };
  }
}