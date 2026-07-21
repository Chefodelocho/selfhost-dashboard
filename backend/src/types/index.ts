export interface CustomCommand {
  name: string;
  command: string;
}

export interface Host {
  id: number;
  name: string;
  ip_address: string;
  mac_address: string;
  broadcast_address?: string;
  ssh_username?: string;
  ssh_password?: string;
  ssh_auth_type?: 'password' | 'key';
  ssh_port?: number;
  shutdown_command?: string;
  reboot_command?: string;
  custom_commands?: CustomCommand[];
  description?: string;
  prometheus_metric?: string;
  energy_price_metric?: string;
  energy_days_range?: number;
  created_at: string;
  updated_at: string;
}

export interface CreateHostDTO {
  name: string;
  ip_address: string;
  mac_address: string;
  broadcast_address?: string;
  ssh_username?: string;
  ssh_password?: string;
  ssh_auth_type?: 'password' | 'key';
  ssh_port?: number;
  shutdown_command?: string;
  reboot_command?: string;
  custom_commands?: CustomCommand[];
  description?: string;
  prometheus_metric?: string;
  energy_price_metric?: string;
  energy_days_range?: number;
}

export interface UpdateHostDTO {
  name?: string;
  ip_address?: string;
  mac_address?: string;
  broadcast_address?: string;
  ssh_username?: string;
  ssh_password?: string;
  ssh_auth_type?: 'password' | 'key';
  ssh_port?: number;
  shutdown_command?: string;
  reboot_command?: string;
  custom_commands?: CustomCommand[];
  description?: string;
  prometheus_metric?: string;
  energy_price_metric?: string;
  energy_days_range?: number;
}

export interface Schedule {
  id: number;
  host_id: number;
  day_of_week: number; // 0-6 (Sunday-Saturday), 7 (Daily)
  power_on_time?: string; // HH:MM format
  power_off_time?: string; // HH:MM format
  enabled: boolean;
}

export interface CreateScheduleDTO {
  host_id: number;
  day_of_week: number;
  power_on_time?: string;
  power_off_time?: string;
  enabled?: boolean;
}

export interface UpdateScheduleDTO {
  day_of_week?: number;
  power_on_time?: string;
  power_off_time?: string;
  enabled?: boolean;
}

export interface StatusHistory {
  id: number;
  host_id: number;
  status: 'online' | 'offline';
  checked_at: string;
}

export interface HostStatus {
  host_id: number;
  status: 'online' | 'offline';
  last_checked: string;
}

export interface WoLRequest {
  mac_address: string;
  ip_address?: string;
  broadcast_address?: string;
}

export interface SSHCommandRequest {
  command: 'shutdown' | 'reboot' | 'custom';
  custom_command?: string;
}