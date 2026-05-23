'use client';

import { useEffect, useState } from 'react';
import { hostAPI, connectToSSE } from '@/lib/api';
import type { Host } from '@/types';
import { Power, PowerOff, RefreshCw, Plus, Server, Wifi, WifiOff, Clock } from 'lucide-react';

export default function Dashboard() {
  const [hosts, setHosts] = useState<Host[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);

  useEffect(() => {
    // Initialize clock on client side only (avoids hydration mismatch)
    setCurrentTime(new Date());
    loadHosts();
    
    // Update clock every second
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    
    // Connect to SSE for real-time updates
    const eventSource = connectToSSE((event) => {
      if (event.type === 'status') {
        // Update host statuses
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

  const loadHosts = async () => {
    try {
      console.log('[Dashboard] Loading hosts...');
      setLoading(true);
      const data = await hostAPI.getAll();
      console.log('[Dashboard] Hosts loaded:', data.length);
      setHosts(data);
    } catch (error) {
      console.error('[Dashboard] Failed to load hosts:', error);
    } finally {
      console.log('[Dashboard] Setting loading to false');
      setLoading(false);
    }
  };

  const refreshStatuses = async () => {
    try {
      setRefreshing(true);
      const data = await hostAPI.getAll();
      setHosts(data);
    } catch (error) {
      console.error('Failed to refresh statuses:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const sendWoL = async (hostId: number) => {
    try {
      await hostAPI.sendWoL(hostId);
      // Refresh status after a short delay
      setTimeout(() => refreshStatuses(), 2000);
    } catch (error) {
      console.error('Failed to send WoL:', error);
      alert('Failed to send Wake on LAN packet');
    }
  };

  const shutdownHost = async (hostId: number) => {
    if (!confirm('Are you sure you want to shutdown this host?')) {
      return;
    }
    try {
      await hostAPI.shutdown(hostId);
      alert('Shutdown command sent successfully');
      // Refresh status after a short delay
      setTimeout(() => refreshStatuses(), 2000);
    } catch (error) {
      console.error('Failed to shutdown host:', error);
      alert('Failed to shutdown host. Make sure SSH credentials are configured.');
    }
  };

  const rebootHost = async (hostId: number) => {
    if (!confirm('Are you sure you want to reboot this host?')) {
      return;
    }
    try {
      await hostAPI.reboot(hostId);
      alert('Reboot command sent successfully');
      // Refresh status after a short delay
      setTimeout(() => refreshStatuses(), 2000);
    } catch (error) {
      console.error('Failed to reboot host:', error);
      alert('Failed to reboot host. Make sure SSH credentials are configured.');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'bg-green-500';
      case 'offline':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
        return <Wifi className="w-4 h-4" />;
      case 'offline':
        return <WifiOff className="w-4 h-4" />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">SelfHost Dashboard</h1>
            <p className="text-gray-600 mt-1">Manage your LAN devices</p>
          </div>
          <div className="flex items-center gap-4">
            {currentTime && (
            <div className="flex items-center gap-2 text-gray-600 bg-white px-4 py-2 rounded-lg border border-gray-200">
              <Clock className="w-4 h-4" />
              <span className="text-sm font-medium tabular-nums">
                {currentTime.toLocaleTimeString('es-ES', { timeZone: 'Europe/Madrid', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
              <span className="text-xs text-gray-400">|</span>
              <span className="text-sm">
                {currentTime.toLocaleDateString('es-ES', { timeZone: 'Europe/Madrid', weekday: 'short', day: 'numeric', month: 'short' })}
              </span>
            </div>
            )}
            <div className="flex gap-3">
            <button
              onClick={refreshStatuses}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={() => window.location.href = '/hosts/new'}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              Add Host
            </button>
            </div>
          </div>
        </div>

        {hosts.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <Server className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No hosts configured</h3>
            <p className="text-gray-600 mb-4">Add your first host to get started</p>
            <button
              onClick={() => window.location.href = '/hosts/new'}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              Add Host
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {hosts.map((host) => (
              <div key={host.id} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{host.name}</h3>
                      <p className="text-sm text-gray-600">{host.ip_address}</p>
                    </div>
                    <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                      host.status === 'online' ? 'bg-green-100 text-green-800' :
                      host.status === 'offline' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {getStatusIcon(host.status || 'unknown')}
                      {host.status || 'unknown'}
                    </div>
                  </div>

                  {host.description && (
                    <p className="text-sm text-gray-600 mb-4">{host.description}</p>
                  )}

                  <div className="text-xs text-gray-500 mb-4">
                    <p>MAC: {host.mac_address}</p>
                    {host.last_checked && (
                      <p>Last checked: {new Date(host.last_checked).toLocaleString()}</p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    {host.status === 'offline' && (
                      <button
                        onClick={() => sendWoL(host.id)}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                      >
                        <Power className="w-4 h-4" />
                        Wake
                      </button>
                    )}
                    {host.status === 'online' && (
                      <>
                        <button
                          onClick={() => rebootHost(host.id)}
                          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 text-sm"
                        >
                          <RefreshCw className="w-4 h-4" />
                          Reboot
                        </button>
                        <button
                          onClick={() => shutdownHost(host.id)}
                          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                        >
                          <PowerOff className="w-4 h-4" />
                          Shutdown
                        </button>
                      </>
                    )}
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <a
                      href={`/hosts/${host.id}`}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      View Details &rarr;
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
