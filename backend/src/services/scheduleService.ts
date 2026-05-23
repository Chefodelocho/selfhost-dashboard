import db from '../models/database';
import { Schedule, CreateScheduleDTO, UpdateScheduleDTO } from '../types';

export class ScheduleService {
  /**
   * Get all schedules for a host
   */
  static getSchedulesByHostId(hostId: number): Schedule[] {
    return db.prepare(
      'SELECT * FROM schedules WHERE host_id = ? ORDER BY day_of_week'
    ).all(hostId) as Schedule[];
  }

  /**
   * Get schedule by ID
   */
  static getScheduleById(id: number): Schedule | null {
    const schedule = db.prepare('SELECT * FROM schedules WHERE id = ?').get(id) as Schedule | undefined;
    return schedule || null;
  }

  /**
   * Create new schedule
   */
  static createSchedule(data: CreateScheduleDTO): Schedule {
    const result = db.prepare(
      `INSERT INTO schedules (host_id, day_of_week, power_on_time, power_off_time, enabled)
       VALUES (?, ?, ?, ?, ?)`
    ).run(
      data.host_id,
      data.day_of_week,
      data.power_on_time || null,
      data.power_off_time || null,
      data.enabled !== undefined ? (data.enabled ? 1 : 0) : 1
    );

    const schedule = this.getScheduleById(result.lastInsertRowid as number);
    if (!schedule) {
      throw new Error('Failed to create schedule');
    }

    return schedule;
  }

  /**
   * Update schedule
   */
  static updateSchedule(id: number, data: UpdateScheduleDTO): Schedule | null {
    const existingSchedule = this.getScheduleById(id);
    if (!existingSchedule) {
      return null;
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (data.day_of_week !== undefined) {
      updates.push('day_of_week = ?');
      values.push(data.day_of_week);
    }
    if (data.power_on_time !== undefined) {
      updates.push('power_on_time = ?');
      values.push(data.power_on_time);
    }
    if (data.power_off_time !== undefined) {
      updates.push('power_off_time = ?');
      values.push(data.power_off_time);
    }
    if (data.enabled !== undefined) {
      updates.push('enabled = ?');
      values.push(data.enabled ? 1 : 0);
    }

    values.push(id);

    db.prepare(`UPDATE schedules SET ${updates.join(', ')} WHERE id = ?`).run(...values);

    return this.getScheduleById(id);
  }

  /**
   * Delete schedule
   */
  static deleteSchedule(id: number): boolean {
    const result = db.prepare('DELETE FROM schedules WHERE id = ?').run(id);
    return result.changes > 0;
  }

  /**
   * Get all schedules for all hosts
   */
  static getAllSchedules(): (Schedule & { host_name: string })[] {
    return db.prepare(
      `SELECT s.*, h.name as host_name
       FROM schedules s
       JOIN hosts h ON s.host_id = h.id
       ORDER BY h.name, s.day_of_week`
    ).all() as (Schedule & { host_name: string })[];
  }

  /**
   * Delete all schedules for a host
   */
  static deleteSchedulesByHostId(hostId: number): number {
    const result = db.prepare('DELETE FROM schedules WHERE host_id = ?').run(hostId);
    return result.changes;
  }
}