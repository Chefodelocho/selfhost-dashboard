"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScheduleService = void 0;
const database_1 = __importDefault(require("../models/database"));
class ScheduleService {
    /**
     * Get all schedules for a host
     */
    static getSchedulesByHostId(hostId) {
        return database_1.default.prepare('SELECT * FROM schedules WHERE host_id = ? ORDER BY day_of_week').all(hostId);
    }
    /**
     * Get schedule by ID
     */
    static getScheduleById(id) {
        const schedule = database_1.default.prepare('SELECT * FROM schedules WHERE id = ?').get(id);
        return schedule || null;
    }
    /**
     * Create new schedule
     */
    static createSchedule(data) {
        const result = database_1.default.prepare(`INSERT INTO schedules (host_id, day_of_week, power_on_time, power_off_time, enabled)
       VALUES (?, ?, ?, ?, ?)`).run(data.host_id, data.day_of_week, data.power_on_time || null, data.power_off_time || null, data.enabled !== undefined ? data.enabled : 1);
        const schedule = this.getScheduleById(result.lastInsertRowid);
        if (!schedule) {
            throw new Error('Failed to create schedule');
        }
        return schedule;
    }
    /**
     * Update schedule
     */
    static updateSchedule(id, data) {
        const existingSchedule = this.getScheduleById(id);
        if (!existingSchedule) {
            return null;
        }
        const updates = [];
        const values = [];
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
            values.push(data.enabled);
        }
        values.push(id);
        database_1.default.prepare(`UPDATE schedules SET ${updates.join(', ')} WHERE id = ?`).run(...values);
        return this.getScheduleById(id);
    }
    /**
     * Delete schedule
     */
    static deleteSchedule(id) {
        const result = database_1.default.prepare('DELETE FROM schedules WHERE id = ?').run(id);
        return result.changes > 0;
    }
    /**
     * Get all schedules for all hosts
     */
    static getAllSchedules() {
        return database_1.default.prepare(`SELECT s.*, h.name as host_name
       FROM schedules s
       JOIN hosts h ON s.host_id = h.id
       ORDER BY h.name, s.day_of_week`).all();
    }
    /**
     * Delete all schedules for a host
     */
    static deleteSchedulesByHostId(hostId) {
        const result = database_1.default.prepare('DELETE FROM schedules WHERE host_id = ?').run(hostId);
        return result.changes;
    }
}
exports.ScheduleService = ScheduleService;
