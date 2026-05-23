import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_DIR = path.join(__dirname, '../../database');
const DB_PATH = path.join(DB_DIR, 'dashboard.db');

// Ensure database directory exists
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const db = new Database(DB_PATH);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS hosts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    ip_address TEXT NOT NULL,
    mac_address TEXT NOT NULL,
    broadcast_address TEXT,
    ssh_username TEXT,
    ssh_password TEXT,
    ssh_auth_type TEXT DEFAULT 'password',
    ssh_port INTEGER DEFAULT 22,
    shutdown_command TEXT DEFAULT 'sudo shutdown -h now',
    reboot_command TEXT DEFAULT 'sudo reboot',
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
} catch (e) {
  // Column already exists
}

// Drop ssh_private_key column if it exists (from previous implementation)
try {
  db.exec(`ALTER TABLE hosts DROP COLUMN ssh_private_key`);
} catch (e) {
  // Column doesn't exist or can't be dropped
}

// Add shutdown_command and reboot_command columns if they don't exist
try {
  db.exec(`ALTER TABLE hosts ADD COLUMN shutdown_command TEXT DEFAULT 'sudo shutdown -h now'`);
} catch (e) {
  // Column already exists
}

try {
  db.exec(`ALTER TABLE hosts ADD COLUMN reboot_command TEXT DEFAULT 'sudo reboot'`);
} catch (e) {
  // Column already exists
}

// Add broadcast_address column if it doesn't exist
try {
  db.exec(`ALTER TABLE hosts ADD COLUMN broadcast_address TEXT`);
} catch (e) {
  // Column already exists
}

export default db;