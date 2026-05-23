"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatusService = void 0;
const ping_1 = __importDefault(require("ping"));
const database_1 = __importDefault(require("../models/database"));
class StatusService {
    /**
     * Check if a host is online using ping
     */
    static async checkHostStatus(ipAddress) {
        try {
            const result = await ping_1.default.promise.probe(ipAddress, {
                timeout: 2,
                extra: ['-c', '1'],
            });
            return result.alive ? 'online' : 'offline';
        }
        catch (error) {
            return 'offline';
        }
    }
    /**
     * Check status for all hosts and update database
     */
    static async checkAllHosts() {
        const hosts = database_1.default.prepare('SELECT id, ip_address FROM hosts').all();
        const statuses = [];
        for (const host of hosts) {
            const status = await this.checkHostStatus(host.ip_address);
            // Update status history
            database_1.default.prepare('INSERT INTO status_history (host_id, status, checked_at) VALUES (?, ?, CURRENT_TIMESTAMP)').run(host.id, status);
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
    static getLatestStatus(hostId) {
        const row = database_1.default.prepare(`SELECT host_id, status, checked_at as last_checked
       FROM status_history
       WHERE host_id = ?
       ORDER BY checked_at DESC
       LIMIT 1`).get(hostId);
        return row || null;
    }
    /**
     * Get status history for a host
     */
    static getStatusHistory(hostId, limit = 100) {
        return database_1.default.prepare(`SELECT id, host_id, status, checked_at
       FROM status_history
       WHERE host_id = ?
       ORDER BY checked_at DESC
       LIMIT ?`).all(hostId, limit);
    }
    /**
     * Clean up old status history (older than 30 days)
     */
    static cleanupOldHistory() {
        const result = database_1.default.prepare(`DELETE FROM status_history
       WHERE checked_at < datetime('now', '-30 days')`).run();
        return result.changes;
    }
}
exports.StatusService = StatusService;
