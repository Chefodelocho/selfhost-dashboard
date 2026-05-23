"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const DB_DIR = path_1.default.join(__dirname, '../../database');
const DB_PATH = path_1.default.join(DB_DIR, 'dashboard.db');
// Ensure database directory exists
if (!fs_1.default.existsSync(DB_DIR)) {
    fs_1.default.mkdirSync(DB_DIR, { recursive: true });
}
const db = new better_sqlite3_1.default(DB_PATH);
// Enable foreign keys
db.pragma('foreign_keys = ON');
// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS hosts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    ip_address TEXT NOT NULL,
    mac_address TEXT NOT NULL,
    ssh_username TEXT,
    ssh_password TEXT,
    ssh_auth_type TEXT DEFAULT 'password',
    ssh_port INTEGER DEFAULT 22,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS schedules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    host_id INTEGER NOT NULL,
    day_of_week INTEGER NOT NULL,
    power_on_time TEXT,
    power_off_time TEXT,
    enabled BOOLEAN DEFAULT 1,
    FOREIGN KEY (host_id) REFERENCES hosts(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS status_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    host_id INTEGER NOT NULL,
    status TEXT NOT NULL,
    checked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (host_id) REFERENCES hosts(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_schedules_host_id ON schedules(host_id);
  CREATE INDEX IF NOT EXISTS idx_status_history_host_id ON status_history(host_id);
  CREATE INDEX IF NOT EXISTS idx_status_history_checked_at ON status_history(checked_at);
`);
// Add ssh_auth_type column if it doesn't exist (for existing databases)
try {
    db.exec(`ALTER TABLE hosts ADD COLUMN ssh_auth_type TEXT DEFAULT 'password'`);
}
catch (e) {
    // Column already exists
}
// Drop ssh_private_key column if it exists (from previous implementation)
try {
    db.exec(`ALTER TABLE hosts DROP COLUMN ssh_private_key`);
}
catch (e) {
    // Column doesn't exist or can't be dropped
}
exports.default = db;
