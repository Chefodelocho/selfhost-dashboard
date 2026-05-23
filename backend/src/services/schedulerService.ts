import cron from 'node-cron';
import db from '../models/database';
import { WoLService } from './wolService';
import { SSHService } from './sshService';
import { SSHCommandRequest } from '../types';

export class SchedulerService {
  private static tasks: Map<number, any> = new Map();
  private static statusCheckTask: any = null;

  /**
   * Start the scheduler service
   */
  static start(): void {
    // Check schedules every minute
    cron.schedule('* * * * *', () => {
      this.checkSchedules();
    });

    console.log('Scheduler service started');
  }

  /**
   * Check and execute scheduled power on/off
   */
  private static async checkSchedules(): Promise<void> {
    const now = new Date();
    const currentDay = now.getDay(); // 0-6 (Sunday-Saturday)
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM

    // Get all enabled schedules for current day (including daily schedules where day_of_week = 7)
    const schedules = db.prepare(
      `SELECT s.*, h.name, h.mac_address, h.ip_address, h.broadcast_address, h.ssh_username, h.ssh_password, h.ssh_auth_type, h.ssh_port, h.shutdown_command
       FROM schedules s
       JOIN hosts h ON s.host_id = h.id
       WHERE (s.day_of_week = ? OR s.day_of_week = 7) AND s.enabled = 1
       AND (s.power_on_time = ? OR s.power_off_time = ?)`
    ).all(currentDay, currentTime, currentTime) as Array<{
      id: number;
      host_id: number;
      power_on_time: string | null;
      power_off_time: string | null;
      name: string;
      mac_address: string;
      ip_address: string;
      broadcast_address: string | null;
      ssh_username: string | null;
      ssh_password: string | null;
      ssh_auth_type: string | null;
      ssh_port: number;
      shutdown_command: string | null;
    }>;

    for (const schedule of schedules) {
      if (schedule.power_on_time === currentTime) {
        console.log(`Executing scheduled power on for host: ${schedule.name}`);
        await WoLService.sendWoL({
          mac_address: schedule.mac_address,
          ip_address: schedule.ip_address,
          broadcast_address: schedule.broadcast_address || undefined,
        });
      }

      if (schedule.power_off_time === currentTime && schedule.ssh_username) {
        const authType = schedule.ssh_auth_type || 'password';
        if (authType === 'password' && !schedule.ssh_password) {
          console.log(`Skipping scheduled power off for host: ${schedule.name} (no SSH password)`);
          continue;
        }

        console.log(`Executing scheduled power off for host: ${schedule.name}`);
        await SSHService.executeCommand(
          schedule.ip_address,
          schedule.ssh_port,
          schedule.ssh_username,
          authType as 'password' | 'key',
          { command: 'shutdown', custom_command: schedule.shutdown_command || undefined },
          schedule.ssh_password || undefined
        );
      }
    }
  }

  /**
   * Start status monitoring (check every 30 seconds)
   */
  static startStatusMonitoring(callback?: (statuses: any[]) => void): void {
    if (this.statusCheckTask) {
      this.statusCheckTask.stop();
    }

    this.statusCheckTask = cron.schedule('*/30 * * * * *', async () => {
      const { StatusService } = await import('./statusService');
      const statuses = await StatusService.checkAllHosts();
      if (callback) {
        callback(statuses);
      }
    });

    console.log('Status monitoring started');
  }

  /**
   * Stop status monitoring
   */
  static stopStatusMonitoring(): void {
    if (this.statusCheckTask) {
      this.statusCheckTask.stop();
      this.statusCheckTask = null;
      console.log('Status monitoring stopped');
    }
  }

  /**
   * Stop all scheduler tasks
   */
  static stop(): void {
    this.tasks.forEach((task) => task.stop());
    this.tasks.clear();
    this.stopStatusMonitoring();
    console.log('Scheduler service stopped');
  }
}