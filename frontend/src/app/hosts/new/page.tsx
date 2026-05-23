'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { hostAPI } from '@/lib/api';
import type { CreateHostDTO, UpdateHostDTO, Host } from '@/types';
import { ArrowLeft, Save, Trash2, Server, Shield, Wifi, Key, Terminal } from 'lucide-react';

export default function HostForm({ hostId }: { hostId?: number }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formData, setFormData] = useState<CreateHostDTO>({
    name: '',
    ip_address: '',
    mac_address: '',
    broadcast_address: '',
    ssh_username: '',
    ssh_password: '',
    ssh_auth_type: 'password',
    ssh_port: 22,
    shutdown_command: 'sudo shutdown -h now',
    reboot_command: 'sudo reboot',
    description: '',
  });

  useEffect(() => {
    if (hostId) {
      loadHost(hostId);
    }
  }, [hostId]);

  const loadHost = async (id: number) => {
    try {
      setLoading(true);
      const host = await hostAPI.getById(id);
      setFormData({
        name: host.name,
        ip_address: host.ip_address,
        mac_address: host.mac_address,
        broadcast_address: host.broadcast_address || '',
        ssh_username: host.ssh_username || '',
        ssh_password: host.ssh_password || '',
        ssh_auth_type: host.ssh_auth_type || 'password',
        ssh_port: host.ssh_port || 22,
        shutdown_command: host.shutdown_command || 'sudo shutdown -h now',
        reboot_command: host.reboot_command || 'sudo reboot',
        description: host.description || '',
      });
    } catch (error) {
      console.error('Failed to load host:', error);
      router.push('/');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.ip_address || !formData.mac_address) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      if (hostId) {
        await hostAPI.update(hostId, formData as UpdateHostDTO);
      } else {
        await hostAPI.create(formData);
      }
      router.push('/');
    } catch (error) {
      console.error('Failed to save host:', error);
      alert('Failed to save host');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!hostId) return;
    if (!confirm('Are you sure you want to delete this host? This action cannot be undone.')) return;

    try {
      setDeleting(true);
      await hostAPI.delete(hostId);
      router.push('/');
    } catch (error) {
      console.error('Failed to delete host:', error);
      alert('Failed to delete host');
    } finally {
      setDeleting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'ssh_port' ? (value ? parseInt(value) : 22) : value,
    }));
  };

  if (loading && hostId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-blue-100 border-t-blue-600 animate-spin"></div>
          <p className="text-sm text-gray-500 font-medium">Loading host...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-10 backdrop-blur-xl bg-white/70 border-b border-gray-200/50">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <button
              onClick={() => router.push('/')}
              className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back to Dashboard</span>
              <span className="sm:hidden">Back</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="mb-6 animate-fade-in">
          <h1 className="text-2xl font-bold text-gray-900">
            {hostId ? 'Edit Host' : 'Add New Host'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {hostId ? 'Update host configuration' : 'Configure a new device to manage'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Basic Info Section */}
          <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm animate-slide-up">
            <div className="p-5">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Server className="w-4 h-4 text-blue-600" />
                </div>
                <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Basic Information</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                    placeholder="e.g., Home Server"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="ip_address" className="block text-sm font-medium text-gray-700 mb-1.5">
                      IP Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="ip_address"
                      name="ip_address"
                      value={formData.ip_address}
                      onChange={handleChange}
                      required
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm font-mono"
                      placeholder="192.168.1.100"
                    />
                  </div>
                  <div>
                    <label htmlFor="mac_address" className="block text-sm font-medium text-gray-700 mb-1.5">
                      MAC Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="mac_address"
                      name="mac_address"
                      value={formData.mac_address}
                      onChange={handleChange}
                      required
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm font-mono"
                      placeholder="00:11:22:33:44:55"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="broadcast_address" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Broadcast Address <span className="text-xs text-gray-400 font-normal">(optional)</span>
                  </label>
                  <input
                    type="text"
                    id="broadcast_address"
                    name="broadcast_address"
                    value={formData.broadcast_address}
                    onChange={handleChange}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm font-mono"
                    placeholder="192.168.1.255"
                  />
                  <p className="text-xs text-gray-400 mt-1">Defaults to 255.255.255.255 if not set</p>
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Description <span className="text-xs text-gray-400 font-normal">(optional)</span>
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows={2}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm resize-none"
                    placeholder="Optional description"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SSH Configuration Section */}
          <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm animate-slide-up" style={{ animationDelay: '80ms' }}>
            <div className="p-5">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                  <Shield className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">SSH Configuration</h2>
                  <p className="text-xs text-gray-400">Required for shutdown and reboot commands</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="ssh_auth_type" className="block text-sm font-medium text-gray-700 mb-1.5">
                      Authentication Type
                    </label>
                    <select
                      id="ssh_auth_type"
                      name="ssh_auth_type"
                      value={formData.ssh_auth_type}
                      onChange={handleChange}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm bg-white"
                    >
                      <option value="password">Password</option>
                      <option value="key">SSH Key</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="ssh_port" className="block text-sm font-medium text-gray-700 mb-1.5">
                      SSH Port
                    </label>
                    <input
                      type="number"
                      id="ssh_port"
                      name="ssh_port"
                      value={formData.ssh_port}
                      onChange={handleChange}
                      min="1"
                      max="65535"
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="ssh_username" className="block text-sm font-medium text-gray-700 mb-1.5">
                    SSH Username
                  </label>
                  <input
                    type="text"
                    id="ssh_username"
                    name="ssh_username"
                    value={formData.ssh_username}
                    onChange={handleChange}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                    placeholder="e.g., root"
                  />
                </div>

                {formData.ssh_auth_type === 'password' ? (
                  <div>
                    <label htmlFor="ssh_password" className="block text-sm font-medium text-gray-700 mb-1.5">
                      SSH Password
                    </label>
                    <input
                      type="password"
                      id="ssh_password"
                      name="ssh_password"
                      value={formData.ssh_password}
                      onChange={handleChange}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                      placeholder="SSH password"
                    />
                  </div>
                ) : (
                  <div className="p-3 bg-blue-50 border border-blue-200/80 rounded-lg">
                    <div className="flex items-start gap-2">
                      <Key className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm text-blue-800 font-medium">SSH Key Authentication</p>
                        <p className="text-xs text-blue-600 mt-1">
                          The SSH key must be configured on the server running this dashboard. Set <code className="bg-blue-100 px-1 rounded text-[11px]">SSH_PRIVATE_KEY_PATH</code> in the backend <code className="bg-blue-100 px-1 rounded text-[11px]">.env</code> file.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Commands Section */}
          <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm animate-slide-up" style={{ animationDelay: '120ms' }}>
            <div className="p-5">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
                  <Terminal className="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Commands</h2>
                  <p className="text-xs text-gray-400">Customize shutdown and reboot commands</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label htmlFor="shutdown_command" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Shutdown Command
                  </label>
                  <input
                    type="text"
                    id="shutdown_command"
                    name="shutdown_command"
                    value={formData.shutdown_command}
                    onChange={handleChange}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm font-mono"
                    placeholder="sudo shutdown -h now"
                  />
                </div>

                <div>
                  <label htmlFor="reboot_command" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Reboot Command
                  </label>
                  <input
                    type="text"
                    id="reboot_command"
                    name="reboot_command"
                    value={formData.reboot_command}
                    onChange={handleChange}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm font-mono"
                    placeholder="sudo reboot"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Submit buttons */}
          <div className="flex gap-3 animate-slide-up" style={{ animationDelay: '160ms' }}>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-all font-medium shadow-sm shadow-blue-600/20"
            >
              <Save className="w-4 h-4" />
              {loading ? 'Saving...' : hostId ? 'Update Host' : 'Create Host'}
            </button>
            {hostId && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-2 px-4 py-2.5 bg-white text-red-600 rounded-xl hover:bg-red-50 hover:text-red-700 disabled:opacity-50 transition-all border border-red-200 font-medium"
              >
                <Trash2 className="w-4 h-4" />
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            )}
          </div>
        </form>
      </main>
    </div>
  );
}
