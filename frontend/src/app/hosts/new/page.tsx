'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { hostAPI } from '@/lib/api';
import type { CreateHostDTO, UpdateHostDTO, Host } from '@/types';
import { ArrowLeft, Save, Trash2 } from 'lucide-react';

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
      alert('Failed to load host');
      router.push('/');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
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
    if (!confirm('Are you sure you want to delete this host? This action cannot be undone.')) {
      return;
    }

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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>
          <h1 className="text-3xl font-bold text-gray-900">
            {hostId ? 'Edit Host' : 'Add New Host'}
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6">
          <div className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Home Server"
              />
            </div>

            <div>
              <label htmlFor="ip_address" className="block text-sm font-medium text-gray-700 mb-1">
                IP Address <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="ip_address"
                name="ip_address"
                value={formData.ip_address}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., 192.168.1.100"
              />
            </div>

            <div>
              <label htmlFor="mac_address" className="block text-sm font-medium text-gray-700 mb-1">
                MAC Address <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="mac_address"
                name="mac_address"
                value={formData.mac_address}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., 00:11:22:33:44:55"
              />
              <p className="text-xs text-gray-500 mt-1">
                Used for Wake on LAN
              </p>
            </div>

            <div>
              <label htmlFor="broadcast_address" className="block text-sm font-medium text-gray-700 mb-1">
                Broadcast Address
              </label>
              <input
                type="text"
                id="broadcast_address"
                name="broadcast_address"
                value={formData.broadcast_address}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., 192.168.1.255"
              />
              <p className="text-xs text-gray-500 mt-1">
                Subnet broadcast address for Wake on LAN (e.g., 192.168.1.255). Defaults to 255.255.255.255 if not set.
              </p>
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Optional description of the host"
              />
            </div>

            <div className="border-t border-gray-200 pt-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">SSH Configuration</h2>
              <p className="text-sm text-gray-600 mb-4">
                Required for shutdown and reboot commands
              </p>

              <div className="space-y-4">
                <div>
                  <label htmlFor="ssh_auth_type" className="block text-sm font-medium text-gray-700 mb-1">
                    Authentication Type
                  </label>
                  <select
                    id="ssh_auth_type"
                    name="ssh_auth_type"
                    value={formData.ssh_auth_type}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="password">Password</option>
                    <option value="key">SSH Key (Agent)</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="ssh_username" className="block text-sm font-medium text-gray-700 mb-1">
                    SSH Username
                  </label>
                  <input
                    type="text"
                    id="ssh_username"
                    name="ssh_username"
                    value={formData.ssh_username}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., root"
                  />
                </div>

                {formData.ssh_auth_type === 'password' ? (
                  <div>
                    <label htmlFor="ssh_password" className="block text-sm font-medium text-gray-700 mb-1">
                      SSH Password
                    </label>
                    <input
                      type="password"
                      id="ssh_password"
                      name="ssh_password"
                      value={formData.ssh_password}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="SSH password"
                    />
                  </div>
                ) : (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>SSH Key Authentication:</strong> The SSH key must be configured on the server running this dashboard. The SSH agent will be used to authenticate with the remote host.
                    </p>
                    <p className="text-xs text-blue-600 mt-2">
                      Make sure your SSH key is added to the SSH agent with: <code className="bg-blue-100 px-1 rounded">ssh-add</code>
                    </p>
                  </div>
                )}

                <div>
                  <label htmlFor="ssh_port" className="block text-sm font-medium text-gray-700 mb-1">
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="shutdown_command" className="block text-sm font-medium text-gray-700 mb-1">
                    Shutdown Command
                  </label>
                  <input
                    type="text"
                    id="shutdown_command"
                    name="shutdown_command"
                    value={formData.shutdown_command}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                    placeholder="sudo shutdown -h now"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Command sent via SSH to shut down the host
                  </p>
                </div>

                <div>
                  <label htmlFor="reboot_command" className="block text-sm font-medium text-gray-700 mb-1">
                    Reboot Command
                  </label>
                  <input
                    type="text"
                    id="reboot_command"
                    name="reboot_command"
                    value={formData.reboot_command}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                    placeholder="sudo reboot"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Command sent via SSH to reboot the host
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {loading ? 'Saving...' : hostId ? 'Update Host' : 'Create Host'}
            </button>
            {hostId && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}