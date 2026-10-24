'use client';

import { useEffect, useState, use, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { hostAPI, scheduleAPI } from '@/lib/api';
import type { Host, Schedule, EnergyDataPoint } from '@/types';
import { ArrowLeft, Power, PowerOff, RefreshCw, Edit, Calendar, Trash2, Plus, Server, Clock, Monitor, Wifi, WifiOff, ChevronRight, Zap, Terminal } from 'lucide-react';
import EnergyChart from '@/components/EnergyChart';
import ThemeToggle from '@/components/ThemeToggle';
import WakeHostButton from '@/components/WakeHostButton';

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Daily'];

export default function HostDetail({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const hostId = parseInt(resolvedParams.id);
  const [host, setHost] = useState<Host | null>(null);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [energyData, setEnergyData] = useState<EnergyDataPoint[]>([]);
  const [priceData, setPriceData] = useState<EnergyDataPoint[] | undefined>(undefined);
  const [totalKwh, setTotalKwh] = useState<number | undefined>(undefined);
  const [totalCost, setTotalCost] = useState<number | undefined>(undefined);
  const [energyDays, setEnergyDays] = useState(7);
  const [energyLoading, setEnergyLoading] = useState(false);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [scheduleForm, setScheduleForm] = useState({
    day_of_week: 0,
    power_on_time: '',
    power_off_time: '',
    enabled: true,
  });

  useEffect(() => {
    loadHost();
    loadSchedules();
  }, [hostId]);

  const loadEnergyData = useCallback(async (days?: number) => {
    if (!host?.prometheus_metric) return;
    try {
      setEnergyLoading(true);
      const result = await hostAPI.getEnergyData(hostId, days || energyDays);
      setEnergyData(result.data);
      setPriceData(result.price_data);
      setTotalKwh(result.total_kwh);
      setTotalCost(result.total_cost);
      if (days) setEnergyDays(days);
    } catch (error) {
      console.error('Failed to load energy data:', error);
      setEnergyData([]);
      setPriceData(undefined);
      setTotalKwh(undefined);
      setTotalCost(undefined);
    } finally {
      setEnergyLoading(false);
    }
  }, [hostId, host?.prometheus_metric, energyDays]);

  useEffect(() => {
    if (host?.prometheus_metric) {
      setEnergyDays(host.energy_days_range || 7);
      loadEnergyData(host.energy_days_range || 7);
    }
  }, [host?.prometheus_metric]);

  const loadHost = async () => {
    try {
      setLoading(true);
      const data = await hostAPI.getById(hostId);
      setHost(data);
    } catch (error) {
      console.error('Failed to load host:', error);
      router.push('/');
    } finally {
      setLoading(false);
    }
  };

  const loadSchedules = async () => {
    try {
      const data = await scheduleAPI.getAll();
      setSchedules(data.filter((s) => s.host_id === hostId));
    } catch (error) {
      console.error('Failed to load schedules:', error);
    }
  };

  const refreshStatus = async () => {
    try {
      setRefreshing(true);
      const data = await hostAPI.getById(hostId);
      setHost(data);
    } catch (error) {
      console.error('Failed to refresh status:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const shutdownHost = async () => {
    if (!confirm('Are you sure you want to shutdown this host?')) return;
    try {
      setActionLoading(true);
      await hostAPI.shutdown(hostId);
      setTimeout(() => refreshStatus(), 2000);
    } catch (error) {
      console.error('Failed to shutdown host:', error);
      alert('Failed to shutdown host. Make sure SSH credentials are configured.');
    } finally {
      setActionLoading(false);
    }
  };

  const rebootHost = async () => {
    if (!confirm('Are you sure you want to reboot this host?')) return;
    try {
      setActionLoading(true);
      await hostAPI.reboot(hostId);
      setTimeout(() => refreshStatus(), 2000);
    } catch (error) {
      console.error('Failed to reboot host:', error);
      alert('Failed to reboot host. Make sure SSH credentials are configured.');
    } finally {
      setActionLoading(false);
    }
  };

  const [customLoading, setCustomLoading] = useState<number | null>(null);

  const runCustomCommand = async (index: number, name: string) => {
    if (!confirm(`Run "${name}" on this host?`)) return;
    try {
      setCustomLoading(index);
      await hostAPI.runCommand(hostId, index);
      setTimeout(() => refreshStatus(), 2000);
    } catch (error) {
      console.error('Failed to run custom command:', error);
      alert('Failed to run command. Make sure SSH credentials are configured.');
    } finally {
      setCustomLoading(null);
    }
  };

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingSchedule) {
        await scheduleAPI.update(editingSchedule.id, scheduleForm);
      } else {
        await scheduleAPI.create({ ...scheduleForm, host_id: hostId });
      }
      setShowScheduleForm(false);
      setEditingSchedule(null);
      setScheduleForm({ day_of_week: 0, power_on_time: '', power_off_time: '', enabled: true });
      loadSchedules();
    } catch (error) {
      console.error('Failed to save schedule:', error);
      alert('Failed to save schedule');
    }
  };

  const handleEditSchedule = (schedule: Schedule) => {
    setEditingSchedule(schedule);
    setScheduleForm({
      day_of_week: schedule.day_of_week,
      power_on_time: schedule.power_on_time || '',
      power_off_time: schedule.power_off_time || '',
      enabled: schedule.enabled,
    });
    setShowScheduleForm(true);
  };

  const handleDeleteSchedule = async (scheduleId: number) => {
    if (!confirm('Are you sure you want to delete this schedule?')) return;
    try {
      await scheduleAPI.delete(scheduleId);
      loadSchedules();
    } catch (error) {
      console.error('Failed to delete schedule:', error);
      alert('Failed to delete schedule');
    }
  };

  if (loading || !host) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-blue-100 border-t-blue-600 animate-spin dark:border-gray-700 dark:border-t-blue-500"></div>
          <p className="text-sm text-gray-500 font-medium dark:text-gray-400">Loading host...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-10 backdrop-blur-xl bg-white/70 border-b border-gray-200/50 dark:bg-gray-900/70 dark:border-gray-700/50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <button
              onClick={() => router.push('/')}
              className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors text-sm dark:text-gray-400 dark:hover:text-gray-100"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back to Dashboard</span>
              <span className="sm:hidden">Back</span>
            </button>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <button
                onClick={() => router.push(`/hosts/${hostId}/edit`)}
                className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all text-sm shadow-sm dark:bg-gray-800 dark:border-gray-600 dark:hover:bg-gray-700 dark:hover:border-gray-500 dark:text-gray-300"
              >
                <Edit className="w-3.5 h-3.5" />
                Edit
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Host hero section */}
        <div className="animate-fade-in mb-6">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm ${
              host.status === 'online'
                ? 'bg-gradient-to-br from-green-50 to-green-100 text-green-600 dark:from-green-900/30 dark:to-green-900/20 dark:text-green-400'
                : host.status === 'offline'
                ? 'bg-gradient-to-br from-red-50 to-red-100 text-red-500 dark:from-red-900/30 dark:to-red-900/20 dark:text-red-400'
                : 'bg-gradient-to-br from-gray-50 to-gray-100 text-gray-400 dark:from-gray-700 dark:to-gray-700 dark:text-gray-500'
            }`}>
              <Server className="w-7 h-7" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{host.name}</h1>
                <div className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wide ${
                  host.status === 'online' ? 'bg-green-50 text-green-700 ring-1 ring-green-600/20 dark:bg-green-900/30 dark:text-green-400 dark:ring-green-500/30' :
                  host.status === 'offline' ? 'bg-red-50 text-red-700 ring-1 ring-red-600/20 dark:bg-red-900/30 dark:text-red-400 dark:ring-red-500/30' :
                  'bg-gray-100 text-gray-600 ring-1 ring-gray-500/20 dark:bg-gray-700 dark:text-gray-400 dark:ring-gray-500/30'
                }`}>
                  {host.status === 'online' && <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse-online"></div>}
                  {host.status || 'unknown'}
                </div>
              </div>
              <p className="text-sm text-gray-500 mt-0.5 font-mono dark:text-gray-400">{host.ip_address}</p>
            </div>
          </div>
          {host.description && (
            <p className="text-sm text-gray-500 mt-3 ml-[4.5rem] dark:text-gray-400">{host.description}</p>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          {/* Host Info - left column */}
          <div className="lg:col-span-2 space-y-5">
            {/* Info card */}
            <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm animate-slide-up dark:bg-gray-800 dark:border-gray-700/80">
              <div className="p-5">
                <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4 dark:text-gray-100">Host Information</h2>
                <div className="space-y-3">
                  <div className="flex items-center justify-between py-1">
                    <span className="text-sm text-gray-500 dark:text-gray-400">IP Address</span>
                    <span className="text-sm font-medium font-mono text-gray-900 dark:text-gray-200">{host.ip_address}</span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-sm text-gray-500 dark:text-gray-400">MAC Address</span>
                    <span className="text-sm font-medium font-mono text-gray-900 dark:text-gray-200">{host.mac_address}</span>
                  </div>
                  {host.broadcast_address && (
                    <div className="flex items-center justify-between py-1">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Broadcast</span>
                      <span className="text-sm font-medium font-mono text-gray-900 dark:text-gray-200">{host.broadcast_address}</span>
                    </div>
                  )}
                  {host.ssh_username && (
                    <div className="flex items-center justify-between py-1">
                      <span className="text-sm text-gray-500 dark:text-gray-400">SSH User</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-200">{host.ssh_username}</span>
                    </div>
                  )}
                  {host.ssh_username && host.ssh_auth_type && (
                    <div className="flex items-center justify-between py-1">
                      <span className="text-sm text-gray-500 dark:text-gray-400">SSH Auth</span>
                      <span className="text-sm font-medium capitalize text-gray-900 dark:text-gray-200">{host.ssh_auth_type}</span>
                    </div>
                  )}
                  {host.ssh_port && host.ssh_port !== 22 && (
                    <div className="flex items-center justify-between py-1">
                      <span className="text-sm text-gray-500 dark:text-gray-400">SSH Port</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-200">{host.ssh_port}</span>
                    </div>
                  )}
                  {host.last_checked && (
                    <div className="flex items-center justify-between py-1">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Last Checked</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-200">
                        {new Date(host.last_checked).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Actions card */}
            <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm animate-slide-up dark:bg-gray-800 dark:border-gray-700/80" style={{ animationDelay: '80ms' }}>
              <div className="p-5">
                <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4 dark:text-gray-100">Actions</h2>
                <div className="space-y-2">
                  <button
                    onClick={refreshStatus}
                    disabled={refreshing}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 disabled:opacity-50 transition-all text-sm font-medium border border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
                  >
                    <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                    Refresh Status
                  </button>
                  <WakeHostButton
                    key={hostId}
                    host={host}
                    disabled={actionLoading}
                    onOnline={(status) => setHost((current) => current
                      ? { ...current, status: status.status, last_checked: status.last_checked }
                      : current
                    )}
                  />
                  {host.status === 'online' && (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={rebootHost}
                        disabled={actionLoading}
                        className="flex items-center justify-center gap-2 px-3 py-2.5 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50 transition-all text-sm font-medium shadow-sm shadow-amber-500/20"
                      >
                        <RefreshCw className={`w-4 h-4 ${actionLoading ? 'animate-spin' : ''}`} />
                        Reboot
                      </button>
                      <button
                        onClick={shutdownHost}
                        disabled={actionLoading}
                        className="flex items-center justify-center gap-2 px-3 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-all text-sm font-medium shadow-sm shadow-red-600/20"
                      >
                        <PowerOff className="w-4 h-4" />
                        Shutdown
                      </button>
                    </div>
                  )}

                  {host.status === 'online' && host.custom_commands && host.custom_commands.length > 0 && (
                    <div className="pt-2 mt-2 border-t border-gray-100 dark:border-gray-700">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 dark:text-gray-400">Custom Commands</p>
                      <div className="grid grid-cols-2 gap-2">
                        {host.custom_commands.map((cmd, index) => (
                          <button
                            key={index}
                            onClick={() => runCustomCommand(index, cmd.name || `Command ${index + 1}`)}
                            disabled={customLoading === index || actionLoading}
                            title={cmd.command}
                            className="flex items-center justify-center gap-2 px-3 py-2.5 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 disabled:opacity-50 transition-all text-sm font-medium border border-purple-200/60 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800/40 dark:hover:bg-purple-900/50"
                          >
                            <Terminal className={`w-4 h-4 ${customLoading === index ? 'animate-spin' : ''}`} />
                            {cmd.name || `Command ${index + 1}`}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                 </div>
               </div>
             </div>
          </div>

          {/* Schedules - right column (wider) */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm animate-slide-up dark:bg-gray-800 dark:border-gray-700/80" style={{ animationDelay: '120ms' }}>
              <div className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide flex items-center gap-2 dark:text-gray-100">
                    <Calendar className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                    Schedules
                  </h2>
                  <button
                    onClick={() => {
                      setEditingSchedule(null);
                      setScheduleForm({ day_of_week: 0, power_on_time: '', power_off_time: '', enabled: true });
                      setShowScheduleForm(true);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all text-xs font-medium shadow-sm shadow-blue-600/20"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add
                  </button>
                </div>

                {showScheduleForm && (
                  <form onSubmit={handleScheduleSubmit} className="mb-5 p-4 bg-gray-50 rounded-xl border border-gray-200/80 dark:bg-gray-700/50 dark:border-gray-600/80">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1.5 dark:text-gray-300">Day of Week</label>
                        <select
                          value={scheduleForm.day_of_week}
                          onChange={(e) => setScheduleForm({ ...scheduleForm, day_of_week: parseInt(e.target.value) })}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200"
                        >
                          {DAYS_OF_WEEK.map((day, index) => (
                            <option key={day} value={index}>{day}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-end">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={scheduleForm.enabled}
                            onChange={(e) => setScheduleForm({ ...scheduleForm, enabled: e.target.checked })}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600"
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300">Enabled</span>
                        </label>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1.5 dark:text-gray-300">Power On Time</label>
                        <input
                          type="time"
                          value={scheduleForm.power_on_time}
                          onChange={(e) => setScheduleForm({ ...scheduleForm, power_on_time: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm dark:border-gray-600"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1.5 dark:text-gray-300">Power Off Time</label>
                        <input
                          type="time"
                          value={scheduleForm.power_off_time}
                          onChange={(e) => setScheduleForm({ ...scheduleForm, power_off_time: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm dark:border-gray-600"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <button
                        type="submit"
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all text-sm font-medium shadow-sm shadow-blue-600/20"
                      >
                        {editingSchedule ? 'Update' : 'Create'}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setShowScheduleForm(false); setEditingSchedule(null); }}
                        className="px-4 py-2 bg-white text-gray-700 rounded-lg hover:bg-gray-50 transition-all text-sm border border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}

                <div className="space-y-2">
                  {schedules.length === 0 ? (
                    <div className="text-center py-8">
                      <Calendar className="w-8 h-8 mx-auto text-gray-300 mb-2 dark:text-gray-600" />
                      <p className="text-sm text-gray-400 dark:text-gray-500">No schedules configured</p>
                    </div>
                  ) : (
                    schedules.map((schedule) => (
                      <div
                        key={schedule.id}
                        className={`flex items-center justify-between gap-2 p-3 rounded-lg border transition-colors ${
                          schedule.enabled
                            ? 'bg-white border-gray-200/80 hover:border-gray-300 dark:bg-gray-800 dark:border-gray-700/80 dark:hover:border-gray-600'
                            : 'bg-gray-50/50 border-gray-100 opacity-60 dark:bg-gray-800/50 dark:border-gray-700/50'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{DAYS_OF_WEEK[schedule.day_of_week]}</p>
                            <div className="flex items-center gap-3 mt-0.5">
                              {schedule.power_on_time && (
                                <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                                  <Power className="w-3 h-3 text-green-500 dark:text-green-400" />
                                  {schedule.power_on_time}
                                </span>
                              )}
                              {schedule.power_off_time && (
                                <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                                  <PowerOff className="w-3 h-3 text-red-400 dark:text-red-400" />
                                  {schedule.power_off_time}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            onClick={() => handleEditSchedule(schedule)}
                            aria-label="Edit schedule"
                            title="Edit schedule"
                            className="flex h-11 w-11 items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors dark:text-gray-400 dark:hover:text-gray-300 dark:hover:bg-gray-700"
                          >
                            <Edit className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDeleteSchedule(schedule.id)}
                            aria-label="Delete schedule"
                            title="Delete schedule"
                            className="flex h-11 w-11 items-center justify-center text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors dark:text-gray-400 dark:hover:text-red-400 dark:hover:bg-red-900/30"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Energy Monitoring Chart */}
        {host.prometheus_metric && (
          <div className="mt-5 bg-white rounded-xl border border-gray-200/80 shadow-sm animate-slide-up dark:bg-gray-800 dark:border-gray-700/80" style={{ animationDelay: '180ms' }}>
            <div className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center dark:bg-green-900/30">
                  <Zap className="w-4 h-4 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide dark:text-gray-100">Energy Consumption</h2>
                  <p className="text-xs text-gray-400 dark:text-gray-500">Query: <span className="font-mono">{host.prometheus_metric}</span></p>
                </div>
              </div>
              <EnergyChart
                data={energyData}
                days={energyDays}
                onDaysChange={(d) => loadEnergyData(d)}
                loading={energyLoading}
                priceData={priceData}
                totalKwh={totalKwh}
                totalCost={totalCost}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
