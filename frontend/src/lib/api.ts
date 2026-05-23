import type {
  Host,
  CreateHostDTO,
  UpdateHostDTO,
  Schedule,
  CreateScheduleDTO,
  UpdateScheduleDTO,
  StatusHistory,
  HostStatus,
  WoLResponse,
  SSHResponse,
} from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export async function fetchAPI<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_URL}${endpoint}`;
  
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP error! status: ${response.status}`);
  }

  // For 204 No Content responses
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

// Host API
export const hostAPI = {
  getAll: () => fetchAPI<Host[]>('/hosts'),
  getById: (id: number) => fetchAPI<Host>(`/hosts/${id}`),
  create: (data: CreateHostDTO) => 
    fetchAPI<Host>('/hosts', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: number, data: UpdateHostDTO) =>
    fetchAPI<Host>(`/hosts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (id: number) =>
    fetchAPI<void>(`/hosts/${id}`, {
      method: 'DELETE',
    }),
  sendWoL: (id: number) =>
    fetchAPI<WoLResponse>(`/hosts/${id}/wol`, {
      method: 'POST',
    }),
  shutdown: (id: number) =>
    fetchAPI<SSHResponse>(`/hosts/${id}/shutdown`, {
      method: 'POST',
    }),
  reboot: (id: number) =>
    fetchAPI<SSHResponse>(`/hosts/${id}/reboot`, {
      method: 'POST',
    }),
  getStatus: (id: number) =>
    fetchAPI<HostStatus>(`/hosts/${id}/status`),
  getHistory: (id: number, limit: number = 100) =>
    fetchAPI<StatusHistory[]>(`/hosts/${id}/history?limit=${limit}`),
};

// Schedule API
export const scheduleAPI = {
  getAll: () => fetchAPI<(Schedule & { host_name: string })[]>('/schedules'),
  getById: (id: number) => fetchAPI<Schedule>(`/schedules/${id}`),
  create: (data: CreateScheduleDTO) =>
    fetchAPI<Schedule>('/schedules', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: number, data: UpdateScheduleDTO) =>
    fetchAPI<Schedule>(`/schedules/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (id: number) =>
    fetchAPI<void>(`/schedules/${id}`, {
      method: 'DELETE',
    }),
};

// SSE for real-time updates
export function connectToSSE(onMessage: (event: { type: string; data?: any }) => void): EventSource {
  const eventSource = new EventSource(`${API_URL}/events`);

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      onMessage(data);
    } catch (error) {
      console.error('Failed to parse SSE message:', error);
    }
  };

  eventSource.onerror = (error) => {
    console.error('SSE error:', error);
    eventSource.close();
  };

  return eventSource;
}