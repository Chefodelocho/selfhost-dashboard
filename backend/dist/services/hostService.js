"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HostService = void 0;
const database_1 = __importDefault(require("../models/database"));
class HostService {
    /**
     * Get all hosts
     */
    static getAllHosts() {
        return database_1.default.prepare('SELECT * FROM hosts ORDER BY name').all();
    }
    /**
     * Get host by ID
     */
    static getHostById(id) {
        const host = database_1.default.prepare('SELECT * FROM hosts WHERE id = ?').get(id);
        return host || null;
    }
    /**
     * Create new host
     */
    static createHost(data) {
        const result = database_1.default.prepare(`INSERT INTO hosts (name, ip_address, mac_address, ssh_username, ssh_password, ssh_auth_type, ssh_port, description)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(data.name, data.ip_address, data.mac_address, data.ssh_username || null, data.ssh_password || null, data.ssh_auth_type || 'password', data.ssh_port || 22, data.description || null);
        const host = this.getHostById(result.lastInsertRowid);
        if (!host) {
            throw new Error('Failed to create host');
        }
        return host;
    }
    /**
     * Update host
     */
    static updateHost(id, data) {
        const existingHost = this.getHostById(id);
        if (!existingHost) {
            return null;
        }
        const updates = [];
        const values = [];
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
        if (data.description !== undefined) {
            updates.push('description = ?');
            values.push(data.description);
        }
        updates.push('updated_at = CURRENT_TIMESTAMP');
        values.push(id);
        database_1.default.prepare(`UPDATE hosts SET ${updates.join(', ')} WHERE id = ?`).run(...values);
        return this.getHostById(id);
    }
    /**
     * Delete host
     */
    static deleteHost(id) {
        const result = database_1.default.prepare('DELETE FROM hosts WHERE id = ?').run(id);
        return result.changes > 0;
    }
    /**
     * Get host with schedules
     */
    static getHostWithSchedules(id) {
        const host = this.getHostById(id);
        if (!host) {
            return null;
        }
        const schedules = database_1.default.prepare('SELECT * FROM schedules WHERE host_id = ? ORDER BY day_of_week').all(id);
        return {
            ...host,
            schedules,
        };
    }
}
exports.HostService = HostService;
