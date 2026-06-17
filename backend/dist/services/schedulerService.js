"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SchedulerService = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const database_1 = __importDefault(require("../models/database"));
const wolService_1 = require("./wolService");
const sshService_1 = require("./sshService");
class SchedulerService {
    /**
     * Start the scheduler service
     */
    static start() {
        // Check schedules every minute. checkSchedules() is async — wrap it so a
        // rejection (SSH/WoL/DB error) never becomes an unhandled rejection.
        node_cron_1.default.schedule('* * * * *', () => {
            this.checkSchedules().catch((err) => {
                console.error('[Scheduler] Error checking schedules:', err);
            });
        });
        // Clean up old status history daily at 03:00 to prevent unbounded DB
        // growth (status_history gains ~1 row/host every 30s). This method existed
        // but was never invoked.
        node_cron_1.default.schedule('0 3 * * *', () => {
            try {
                const { StatusService } = require('./statusService');
                const deleted = StatusService.cleanupOldHistory();
                if (deleted > 0) {
                    console.log(`[Scheduler] Cleaned up ${deleted} old status history entries`);
                }
            }
            catch (err) {
                console.error('[Scheduler] Error cleaning up status history:', err);
            }
        });
        console.log('Scheduler service started');
    }
    /**
     * Check and execute scheduled power on/off
     */
    static async checkSchedules() {
        const now = new Date();
        const currentDay = now.getDay(); // 0-6 (Sunday-Saturday)
        const currentTime = now.toTimeString().slice(0, 5); // HH:MM
        // Get all enabled schedules for current day (including daily schedules where day_of_week = 7)
        const schedules = database_1.default.prepare(`SELECT s.*, h.name, h.mac_address, h.ip_address, h.broadcast_address, h.ssh_username, h.ssh_password, h.ssh_auth_type, h.ssh_port, h.shutdown_command
       FROM schedules s
       JOIN hosts h ON s.host_id = h.id
       WHERE (s.day_of_week = ? OR s.day_of_week = 7) AND s.enabled = 1
       AND (s.power_on_time = ? OR s.power_off_time = ?)`).all(currentDay, currentTime, currentTime);
        for (const schedule of schedules) {
            if (schedule.power_on_time === currentTime) {
                console.log(`Executing scheduled power on for host: ${schedule.name}`);
                await wolService_1.WoLService.sendWoL({
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
                await sshService_1.SSHService.executeCommand(schedule.ip_address, schedule.ssh_port, schedule.ssh_username, authType, { command: 'shutdown', custom_command: schedule.shutdown_command || undefined }, schedule.ssh_password || undefined);
            }
        }
    }
    /**
     * Start status monitoring (check every 30 seconds)
     */
    static startStatusMonitoring(callback) {
        if (this.statusCheckTask) {
            this.statusCheckTask.stop();
        }
        this.statusCheckTask = node_cron_1.default.schedule('*/30 * * * * *', async () => {
            try {
                const { StatusService } = await Promise.resolve().then(() => __importStar(require('./statusService')));
                const statuses = await StatusService.checkAllHosts();
                if (callback) {
                    callback(statuses);
                }
            }
            catch (err) {
                // A transient ping/DB error here must never crash the backend.
                console.error('[StatusMonitor] Error during status check:', err);
            }
        });
        console.log('Status monitoring started');
    }
    /**
     * Stop status monitoring
     */
    static stopStatusMonitoring() {
        if (this.statusCheckTask) {
            this.statusCheckTask.stop();
            this.statusCheckTask = null;
            console.log('Status monitoring stopped');
        }
    }
    /**
     * Stop all scheduler tasks
     */
    static stop() {
        this.tasks.forEach((task) => task.stop());
        this.tasks.clear();
        this.stopStatusMonitoring();
        console.log('Scheduler service stopped');
    }
}
exports.SchedulerService = SchedulerService;
SchedulerService.tasks = new Map();
SchedulerService.statusCheckTask = null;
