'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { hostAPI, scheduleAPI } from '@/lib/api';
import type { Host, Schedule } from '@/types';
import { ArrowLeft, Power, PowerOff, RefreshCw, Edit, Calendar, Trash2, Plus } from 'lucide-react';

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Daily'];

export default function HostDetail({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const hostId = parseInt(resolvedParams.id);
  const [host, setHost] = useState<Host | null>(null);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
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

  const loadHost = async () => {
    try {
      setLoading(true);
      const data = await hostAPI.getById(hostId);
      setHost(data);
    } catch (error) {
      console.error('Failed to load host:', error);
      alert('Failed to load host');
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

  const sendWoL = async () => {
    try {
      await hostAPI.sendWoL(hostId);
      alert('Wake on LAN packet sent');
      setTimeout(() => refreshStatus(), 2000);
    } catch (error) {
      console.error('Failed to send WoL:', error);
      alert('Failed to send Wake on LAN packet');
    }
  };

  const shutdownHost = async () => {
    if (!confirm('Are you sure you want to shutdown this host?')) {
      return;
    }
    try {
      await hostAPI.shutdown(hostId);
      alert('Shutdown command sent successfully');
      setTimeout(() => refreshStatus(), 2000);
    } catch (error) {
      console.error('Failed to shutdown host:', error);
      alert('Failed to shutdown host. Make sure SSH credentials are configured.');
    }
  };

  const rebootHost = async () => {
    if (!confirm('Are you sure you want to reboot this host?')) {
      return;
    }
    try {
      await hostAPI.reboot(hostId);
      alert('Reboot command sent successfully');
      setTimeout(() => refreshStatus(), 2000);
    } catch (error) {
      console.error('Failed to reboot host:', error);
      alert('Failed to reboot host. Make sure SSH credentials are configured.');
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
    if (!confirm('Are you sure you want to delete this schedule?')) {
      return;
    }
    try {
      await scheduleAPI.delete(scheduleId);
      loadSchedules();
    } catch (error) {
      console.error('Failed to delete schedule:', error);
      alert('Failed to delete schedule');
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

  if (loading || !host) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{host.name}</h1>
              <p className="text-gray-600 mt-1">{host.ip_address}</p>
            </div>
            <button
              onClick={() => router.push(`/hosts/${hostId}/edit`)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Edit className="w-4 h-4" />
              Edit
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Host Info */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Host Information</h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Status</span>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${getStatusColor(host.status || 'unknown')}`} />
                  <span className="text-sm font-medium capitalize">{host.status || 'unknown'}</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">IP Address</span>
                <span className="text-sm font-medium">{host.ip_address}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">MAC Address</span>
                <span className="text-sm font-medium">{host.mac_address}</span>
              </div>
              
              {host.ssh_username && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">SSH Username</span>
                  <span className="text-sm font-medium">{host.ssh_username}</span>
                </div>
              )}
              
              {host.ssh_username && host.ssh_auth_type && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">SSH Auth Type</span>
                  <span className="text-sm font-medium capitalize">{host.ssh_auth_type}</span>
                </div>
              )}
              
              {host.ssh_port && host.ssh_port !== 22 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">SSH Port</span>
                  <span className="text-sm font-medium">{host.ssh_port}</span>
                </div>
              )}
              
              {host.last_checked && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Last Checked</span>
                  <span className="text-sm font-medium">{new Date(host.last_checked).toLocaleString()}</span>
                </div>
              )}
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Actions</h3>
              <div className="flex gap-2">
                <button
                  onClick={refreshStatus}
                  disabled={refreshing}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 text-sm"
                >
                  <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
                {host.status === 'offline' && (
                  <button
                    onClick={sendWoL}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                  >
                    <Power className="w-4 h-4" />
                    Wake
                  </button>
                )}
                {host.status === 'online' && (
                  <>
                    <button
                      onClick={rebootHost}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 text-sm"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Reboot
                    </button>
                    <button
                      onClick={shutdownHost}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                    >
                      <PowerOff className="w-4 h-4" />
                      Shutdown
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Schedules */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Schedules
              </h2>
              <button
                onClick={() => {
                  setEditingSchedule(null);
                  setScheduleForm({ day_of_week: 0, power_on_time: '', power_off_time: '', enabled: true });
                  setShowScheduleForm(true);
                }}
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
            </div>

            {showScheduleForm && (
              <form onSubmit={handleScheduleSubmit} className="mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Day of Week</label>
                    <select
                      value={scheduleForm.day_of_week}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, day_of_week: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {DAYS_OF_WEEK.map((day, index) => (
                        <option key={day} value={index}>{day}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Power On Time</label>
                    <input
                      type="time"
                      value={scheduleForm.power_on_time}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, power_on_time: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Power Off Time</label>
                    <input
                      type="time"
                      value={scheduleForm.power_off_time}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, power_off_time: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="enabled"
                      checked={scheduleForm.enabled}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, enabled: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="enabled" className="text-sm text-gray-700">Enabled</label>
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      {editingSchedule ? 'Update' : 'Create'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowScheduleForm(false);
                        setEditingSchedule(null);
                      }}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </form>
            )}

            <div className="space-y-3">
              {schedules.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No schedules configured</p>
              ) : (
                schedules.map((schedule) => (
                  <div
                    key={schedule.id}
                    className={`p-3 rounded-lg border ${schedule.enabled ? 'bg-white' : 'bg-gray-50 opacity-60'}`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{DAYS_OF_WEEK[schedule.day_of_week]}</p>
                        <div className="text-sm text-gray-600 mt-1">
                          {schedule.power_on_time && (
                            <span className="flex items-center gap-1">
                              <Power className="w-3 h-3 text-green-600" />
                              On: {schedule.power_on_time}
                            </span>
                          )}
                          {schedule.power_on_time && schedule.power_off_time && <span className="mx-2">|</span>}
                          {schedule.power_off_time && (
                            <span className="flex items-center gap-1">
                              <PowerOff className="w-3 h-3 text-red-600" />
                              Off: {schedule.power_off_time}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleEditSchedule(schedule)}
                          className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteSchedule(schedule.id)}
                          className="p-1.5 text-red-600 hover:text-red-900 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}