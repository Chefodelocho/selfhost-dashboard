import ping from 'ping';
import db from '../models/database';
import { HostStatus } from '../types';

export class StatusService {
  /**
   * Check if a host is online using ping
   */
  static async checkHostStatus(ipAddress: string): Promise<'online' | 'offline'> {
    try {
      const result = await ping.promise.probe(ipAddress, {
        timeout: 2,
        extra: ['-c', '1'],
      });

      return result.alive ? 'online' : 'offline';
    } catch (error) {
      return 'offline';
    }
  }

  /**
   * Check status for all hosts and update database
   */
  static async checkAllHosts(): Promise<HostStatus[]> {
    const hosts = db.prepare('SELECT id, ip_address FROM hosts').all() as Array<{
      id: number;
      ip_address: string;
    }>;

    const statuses: HostStatus[] = [];

    for (const host of hosts) {
      const status = await this.checkHostStatus(host.ip_address);
      
      // Update status history
      db.prepare(
        'INSERT INTO status_history (host_id, status, checked_at) VALUES (?, ?, CURRENT_TIMESTAMP)'
      ).run(host.id, status);

      statuses.push({
        host_id: host.id,
        status,
        last_checked: new Date().toISOString(),
      });
    }

    return statuses;
  }

  /**
   * Get latest status for a specific host
   */
  static getLatestStatus(hostId: number): HostStatus | null {
    const row = db.prepare(
      `SELECT host_id, status, checked_at as last_checked
       FROM status_history
       WHERE host_id = ?
       ORDER BY checked_at DESC
       LIMIT 1`
    ).get(hostId) as HostStatus | undefined;

    return row || null;
  }

  /**
   * Get status history for a host
   */
  static getStatusHistory(hostId: number, limit: number = 100): Array<{
    id: number;
    host_id: number;
    status: string;
    checked_at: string;
  }> {
    return db.prepare(
      `SELECT id, host_id, status, checked_at
       FROM status_history
       WHERE host_id = ?
       ORDER BY checked_at DESC
       LIMIT ?`
    ).all(hostId, limit) as Array<{
      id: number;
      host_id: number;
      status: string;
      checked_at: string;
    }>;
  }

  /**
   * Clean up old status history (older than 30 days)
   */
  static cleanupOldHistory(): number {
    const result = db.prepare(
      `DELETE FROM status_history
       WHERE checked_at < datetime('now', '-30 days')`
    ).run();

    return result.changes;
  }
}