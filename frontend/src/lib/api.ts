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
  EnergyDataResponse,
} from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

const TOKEN_STORAGE_KEY = 'selfhost_auth_token';

/** Retrieve the stored session token (if any). */
export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

/** Persist (or clear) the session token. */
export function setAuthToken(token: string | null): void {
  if (typeof window === 'undefined') return;
  if (token) {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
}

/**
 * Error thrown when a request is rejected due to missing/invalid auth. The
 * AuthProvider listens for this to redirect the user to the login page.
 */
export class UnauthorizedError extends Error {
  constructor() {
    super('Unauthorized');
    this.name = 'UnauthorizedError';
  }
}

export async function fetchAPI<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_URL}${endpoint}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };

  // Attach the bearer token when one is available so protected routes are
  // accessible after logging in.
  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    // Drop any stale token and signal the caller.
    setAuthToken(null);
    throw new UnauthorizedError();
  }

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
  getEnergyData: (id: number, days?: number) =>
    fetchAPI<EnergyDataResponse>(`/hosts/${id}/energy${days ? `?days=${days}` : ''}`),
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

// Auth API
export interface AuthStatus {
  enabled: boolean;
  authenticated: boolean;
}

export const authAPI = {
  getStatus: () => fetchAPI<AuthStatus>('/auth/status'),
  login: (username: string, password: string) =>
    fetchAPI<{ enabled: boolean; token: string | null }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
  logout: () =>
    fetchAPI<{ success: boolean }>('/auth/logout', {
      method: 'POST',
    }),
};

// SSE for real-time updates
export function connectToSSE(onMessage: (event: { type: string; data?: any }) => void): EventSource {
  // EventSource cannot set custom headers, so pass the token as a query
  // parameter when authentication is active.
  const token = getAuthToken();
  const tokenQuery = token ? `?token=${encodeURIComponent(token)}` : '';
  const eventSource = new EventSource(`${API_URL}/events${tokenQuery}`);

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