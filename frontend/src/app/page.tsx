'use client';

import { useEffect, useState, useCallback } from 'react';
import { hostAPI, scheduleAPI, connectToSSE } from '@/lib/api';
import type { Host, Schedule, EnergyDataPoint } from '@/types';
import Image from 'next/image';
import { Power, PowerOff, RefreshCw, Plus, Server, Wifi, WifiOff, Clock, ChevronRight, Calendar, Zap, LogOut, Terminal } from 'lucide-react';
import EnergySparkline from '@/components/EnergySparkline';
import ThemeToggle from '@/components/ThemeToggle';
import { useAuth } from '@/components/AuthProvider';

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Daily'];

export default function Dashboard() {
  const { authEnabled, logout } = useAuth();
  const [hosts, setHosts] = useState<Host[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [energyData, setEnergyData] = useState<Record<number, { data: EnergyDataPoint[]; avg: number; priceData?: EnergyDataPoint[]; totalKwh?: number; totalCost?: number }>>({});

  useEffect(() => {
    setCurrentTime(new Date());
    loadHosts();

    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    const eventSource = connectToSSE((event) => {
      if (event.type === 'status') {
        setHosts((prevHosts) =>
          prevHosts.map((host) => {
            const statusUpdate = event.data?.find((s: any) => s.host_id === host.id);
            if (statusUpdate) {
              return {
                ...host,
                status: statusUpdate.status,
                last_checked: statusUpdate.last_checked,
              };
            }
            return host;
          })
        );
      }
    });

    return () => {
      clearInterval(timer);
      eventSource.close();
    };
  }, []);

  const loadEnergyForHosts = useCallback(async (hosts: Host[]) => {
    const hostsEnergy = hosts.filter(h => h.prometheus_metric);
    const results: Record<number, { data: EnergyDataPoint[]; avg: number; priceData?: EnergyDataPoint[]; totalKwh?: number; totalCost?: number }> = {};

    await Promise.all(
      hostsEnergy.map(async (host) => {
        try {
          const response = await hostAPI.getEnergyData(host.id, 1);
          const values = response.data.map(d => d.value).filter(v => !isNaN(v));
          const avg = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
          results[host.id] = {
            data: response.data,
            avg,
            priceData: response.price_data,
            totalKwh: response.total_kwh,
            totalCost: response.total_cost,
          };
        } catch {
          // Silently skip if Prometheus is not available
        }
      })
    );

    setEnergyData(results);
  }, []);

  const loadHosts = async () => {
    try {
      setLoading(true);
      const data = await hostAPI.getAll();
      setHosts(data);
      // Load schedules and energy data in parallel
      const [schedData] = await Promise.all([
        scheduleAPI.getAll().catch(() => []),
        loadEnergyForHosts(data),
      ]);
      setSchedules(schedData as Schedule[]);
    } catch (error) {
      console.error('Failed to load hosts:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshStatuses = async () => {
    try {
      setRefreshing(true);
      const data = await hostAPI.getAll();
      setHosts(data);
      loadEnergyForHosts(data);
    } catch (error) {
      console.error('Failed to refresh statuses:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const sendWoL = async (hostId: number) => {
    try {
      setActionLoading(hostId);
      await hostAPI.sendWoL(hostId);
      setTimeout(() => refreshStatuses(), 2000);
    } catch (error) {
      console.error('Failed to send WoL:', error);
      alert('Failed to send Wake on LAN packet');
    } finally {
      setActionLoading(null);
    }
  };

  const shutdownHost = async (hostId: number) => {
    if (!confirm('Are you sure you want to shutdown this host?')) return;
    try {
      setActionLoading(hostId);
      await hostAPI.shutdown(hostId);
      setTimeout(() => refreshStatuses(), 2000);
    } catch (error) {
      console.error('Failed to shutdown host:', error);
      alert('Failed to shutdown host. Make sure SSH credentials are configured.');
    } finally {
      setActionLoading(null);
    }
  };

  const rebootHost = async (hostId: number) => {
    if (!confirm('Are you sure you want to reboot this host?')) return;
    try {
      setActionLoading(hostId);
      await hostAPI.reboot(hostId);
      setTimeout(() => refreshStatuses(), 2000);
    } catch (error) {
      console.error('Failed to reboot host:', error);
      alert('Failed to reboot host. Make sure SSH credentials are configured.');
    } finally {
      setActionLoading(null);
    }
  };

  const [customLoading, setCustomLoading] = useState<string | null>(null);

  const runCustomCommand = async (hostId: number, index: number, name: string) => {
    if (!confirm(`Run "${name}" on this host?`)) return;
    try {
      setCustomLoading(`${hostId}-${index}`);
      await hostAPI.runCommand(hostId, index);
      setTimeout(() => refreshStatuses(), 2000);
    } catch (error) {
      console.error('Failed to run custom command:', error);
      alert('Failed to run command. Make sure SSH credentials are configured.');
    } finally {
      setCustomLoading(null);
    }
  };

  const getHostSchedules = (hostId: number) => schedules.filter(s => s.host_id === hostId && s.enabled);

  const onlineCount = hosts.filter(h => h.status === 'online').length;
  const offlineCount = hosts.filter(h => h.status === 'offline').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-full border-4 border-blue-100 border-t-blue-600 animate-spin dark:border-gray-700 dark:border-t-blue-500"></div>
          </div>
          <p className="text-sm text-gray-500 font-medium dark:text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-10 backdrop-blur-xl bg-white/70 border-b border-gray-200/50 dark:bg-gray-900/70 dark:border-gray-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Image
                src="/icon-192.png"
                alt="SelfHost Dashboard"
                width={32}
                height={32}
                priority
                className="rounded-lg shadow-sm ring-1 ring-black/5 dark:ring-white/10"
              />
              <div>
                <h1 className="text-lg font-bold text-gray-900 leading-tight dark:text-gray-100">SelfHost Dashboard</h1>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              {currentTime && (
                <div className="hidden sm:flex items-center gap-2 text-gray-500 bg-gray-50/80 px-3 py-1.5 rounded-lg border border-gray-200/50 dark:text-gray-400 dark:bg-gray-800/80 dark:border-gray-700/50">
                  <Clock className="w-3.5 h-3.5" />
                  <span className="text-xs font-medium tabular-nums">
                    {currentTime.toLocaleTimeString('es-ES', { timeZone: 'Europe/Madrid', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                  <span className="text-xs text-gray-400 dark:text-gray-500">|</span>
                  <span className="text-xs">
                    {currentTime.toLocaleDateString('es-ES', { timeZone: 'Europe/Madrid', weekday: 'short', day: 'numeric', month: 'short' })}
                  </span>
                </div>
              )}
              <ThemeToggle />
              {authEnabled && (
                <button
                  onClick={logout}
                  title="Sign out"
                  className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all text-sm shadow-sm dark:bg-gray-800 dark:border-gray-600 dark:hover:bg-gray-700 dark:hover:border-gray-500 dark:text-gray-300"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Sign out</span>
                </button>
              )}
              <button
                onClick={refreshStatuses}
                disabled={refreshing}
                className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 disabled:opacity-50 transition-all text-sm shadow-sm dark:bg-gray-800 dark:border-gray-600 dark:hover:bg-gray-700 dark:hover:border-gray-500 dark:text-gray-300"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
              <button
                onClick={() => window.location.href = '/hosts/new'}
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all text-sm shadow-sm shadow-blue-600/20"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Add Host</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Stats bar */}
        {hosts.length > 0 && (
          <div className="flex items-center gap-4 sm:gap-6 mb-6 animate-fade-in">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse-online"></div>
              <span className="text-sm text-gray-600 dark:text-gray-400"><span className="font-semibold text-gray-900 dark:text-gray-100">{onlineCount}</span> online</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-400"></div>
              <span className="text-sm text-gray-600 dark:text-gray-400"><span className="font-semibold text-gray-900 dark:text-gray-100">{offlineCount}</span> offline</span>
            </div>
            <div className="flex items-center gap-2">
              <Server className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
              <span className="text-sm text-gray-600 dark:text-gray-400"><span className="font-semibold text-gray-900 dark:text-gray-100">{hosts.length}</span> total</span>
            </div>
          </div>
        )}

        {/* Empty state */}
        {hosts.length === 0 ? (
          <div className="text-center py-20 animate-fade-in">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center mx-auto mb-6 dark:from-gray-800 dark:to-gray-700">
              <Server className="w-10 h-10 text-blue-500 dark:text-blue-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2 dark:text-gray-100">No hosts configured</h3>
            <p className="text-gray-500 mb-6 max-w-sm mx-auto dark:text-gray-400">Add your first host to start managing your LAN devices with Wake on LAN, shutdown, and reboot.</p>
            <button
              onClick={() => window.location.href = '/hosts/new'}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-sm shadow-blue-600/20 font-medium"
            >
              <Plus className="w-4 h-4" />
              Add Your First Host
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {hosts.map((host, index) => {
              const hostSchedules = getHostSchedules(host.id);
              const hostEnergy = energyData[host.id];

              return (
                <div
                  key={host.id}
                  className="group bg-white rounded-xl border border-gray-200/80 shadow-sm hover:shadow-md hover:border-gray-300/80 transition-all duration-200 animate-slide-up dark:bg-gray-800 dark:border-gray-700/80 dark:hover:border-gray-600/80"
                  style={{ animationDelay: `${index * 60}ms` }}
                >
                  <div className="p-5">
                    {/* Card header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                          host.status === 'online'
                            ? 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                            : host.status === 'offline'
                            ? 'bg-red-50 text-red-500 dark:bg-red-900/30 dark:text-red-400'
                            : 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500'
                        }`}>
                          <Server className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 leading-tight dark:text-gray-100">{host.name}</h3>
                          <p className="text-xs text-gray-500 mt-0.5 font-mono dark:text-gray-400">{host.ip_address}</p>
                        </div>
                      </div>
                      <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wide ${
                        host.status === 'online' ? 'bg-green-50 text-green-700 ring-1 ring-green-600/20 dark:bg-green-900/30 dark:text-green-400 dark:ring-green-500/30' :
                        host.status === 'offline' ? 'bg-red-50 text-red-700 ring-1 ring-red-600/20 dark:bg-red-900/30 dark:text-red-400 dark:ring-red-500/30' :
                        'bg-gray-100 text-gray-600 ring-1 ring-gray-500/20 dark:bg-gray-700 dark:text-gray-400 dark:ring-gray-500/30'
                      }`}>
                        {host.status === 'online' && <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse-online"></div>}
                        {host.status === 'offline' && <WifiOff className="w-3 h-3" />}
                        {host.status === 'unknown' && <div className="w-1.5 h-1.5 rounded-full bg-gray-400"></div>}
                        {host.status || 'unknown'}
                      </div>
                    </div>

                    {/* Description */}
                    {host.description && (
                      <p className="text-sm text-gray-500 mb-3 line-clamp-2 dark:text-gray-400">{host.description}</p>
                    )}

                    {/* Energy sparkline */}
                    {hostEnergy && hostEnergy.data.length > 0 && (
                      <div className="mb-3 p-2.5 bg-blue-50/50 rounded-lg border border-blue-100/50 dark:bg-blue-900/20 dark:border-blue-800/30">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1.5">
                            <Zap className="w-3 h-3 text-blue-500 dark:text-blue-400" />
                            <span className="text-[10px] font-medium text-blue-600 uppercase tracking-wide dark:text-blue-300">Energy (1d)</span>
                          </div>
                          {hostEnergy.totalCost !== undefined && (
                            <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                              {hostEnergy.totalCost.toFixed(2)} €
                            </span>
                          )}
                        </div>
                        <EnergySparkline data={hostEnergy.data} avgWatts={hostEnergy.avg} priceData={hostEnergy.priceData} />
                      </div>
                    )}

                    {/* Schedules */}
                    {hostSchedules.length > 0 && (
                      <div className="mb-3">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <Calendar className="w-3 h-3 text-gray-400 dark:text-gray-500" />
                          <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wide dark:text-gray-400">Schedules</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {hostSchedules.map((s) => (
                            <span
                              key={s.id}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-gray-100 rounded text-[10px] text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                            >
                              {DAYS_OF_WEEK[s.day_of_week]}
                              {s.power_on_time && <span className="text-green-600 dark:text-green-400">↑{s.power_on_time}</span>}
                              {s.power_off_time && <span className="text-red-500 dark:text-red-400">↓{s.power_off_time}</span>}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Meta info */}
                    <div className="flex items-center gap-3 text-[11px] text-gray-400 mb-4 dark:text-gray-500">
                      <span className="font-mono">MAC: {host.mac_address}</span>
                      {host.last_checked && (
                        <>
                          <span>·</span>
                          <span>{new Date(host.last_checked).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</span>
                        </>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2">
                      {host.status === 'offline' && (
                        <button
                          onClick={() => sendWoL(host.id)}
                          disabled={actionLoading === host.id}
                          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all text-sm font-medium disabled:opacity-50 shadow-sm shadow-green-600/20"
                        >
                          <Power className="w-3.5 h-3.5" />
                          Wake
                        </button>
                      )}
                      {host.status === 'online' && (
                        <>
                          <button
                            onClick={() => rebootHost(host.id)}
                            disabled={actionLoading === host.id}
                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-all text-sm font-medium disabled:opacity-50 shadow-sm shadow-amber-500/20"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${actionLoading === host.id ? 'animate-spin' : ''}`} />
                            Reboot
                          </button>
                          <button
                            onClick={() => shutdownHost(host.id)}
                            disabled={actionLoading === host.id}
                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all text-sm font-medium disabled:opacity-50 shadow-sm shadow-red-600/20"
                          >
                            <PowerOff className="w-3.5 h-3.5" />
                            Shutdown
                          </button>
                        </>
                      )}
                    </div>

                    {/* Custom commands */}
                    {host.status === 'online' && host.custom_commands && host.custom_commands.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {host.custom_commands.map((cmd, index) => (
                          <button
                            key={index}
                            onClick={() => runCustomCommand(host.id, index, cmd.name || `Command ${index + 1}`)}
                            disabled={customLoading === `${host.id}-${index}` || actionLoading === host.id}
                            title={cmd.command}
                            className="flex-1 min-w-[80px] flex items-center justify-center gap-1.5 px-2.5 py-1.5 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-all text-xs font-medium disabled:opacity-50 border border-purple-200/60 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800/40 dark:hover:bg-purple-900/50"
                          >
                            <Terminal className={`w-3 h-3 ${customLoading === `${host.id}-${index}` ? 'animate-spin' : ''}`} />
                            {cmd.name || `Command ${index + 1}`}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Card footer */}
                  <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50 rounded-b-xl dark:border-gray-700 dark:bg-gray-800/50">
                    <a
                      href={`/hosts/${host.id}`}
                      className="flex items-center justify-between text-sm text-gray-500 hover:text-blue-600 transition-colors group/link dark:text-gray-400 dark:hover:text-blue-400"
                    >
                      <span>View details</span>
                      <ChevronRight className="w-4 h-4 group-hover/link:translate-x-0.5 transition-transform" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
