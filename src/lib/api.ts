const TOKEN_KEY = 'carepulse_auth_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  data: any;
  code?: string;

  constructor(message: string, status: number, data: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
    this.code = data?.code;
  }
}

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

export async function apiRequest<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const contentType = response.headers.get('content-type');
  const isJson = contentType && contentType.includes('application/json');
  const data = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const errorMsg =
      (typeof data === 'object' && (data?.error || data?.message)) ||
      `Request failed with status ${response.status}`;
    throw new ApiError(errorMsg, response.status, data);
  }

  return data as T;
}

export const api = {
  // Auth
  register: (body: any) => apiRequest('/api/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body: any) => apiRequest('/api/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  logout: () => apiRequest('/api/auth/logout', { method: 'POST' }),
  getMe: () => apiRequest('/api/auth/me'),
  simulateIdle: () => apiRequest('/api/auth/simulate-idle', { method: 'POST' }),
  resetLock: (email: string) => apiRequest('/api/auth/reset-lock', { method: 'POST', body: JSON.stringify({ email }) }),

  // Doctors & Availability
  getDepartments: () => apiRequest('/api/doctors/departments'),
  getDoctors: (department?: string) =>
    apiRequest(`/api/doctors${department ? `?department=${encodeURIComponent(department)}` : ''}`),
  getDoctorAvailability: (doctorId: string) => apiRequest(`/api/doctors/${doctorId}/availability`),
  toggleDoctorDateAvailability: (date: string) =>
    apiRequest('/api/doctors/my-availability/toggle-date', {
      method: 'POST',
      body: JSON.stringify({ date }),
    }),

  // Appointments
  getAppointments: () => apiRequest('/api/appointments'),
  getAppointment: (id: string) => apiRequest(`/api/appointments/${id}`),
  bookAppointment: (data: { doctorId: string; date: string; timeSlot: string; notes?: string }) =>
    apiRequest('/api/appointments', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getCancelPreview: (id: string) => apiRequest(`/api/appointments/${id}/cancel-preview`),
  cancelAppointment: (id: string, reason?: string) =>
    apiRequest(`/api/appointments/${id}/cancel`, {
      method: 'PATCH',
      body: JSON.stringify({ reason }),
    }),
  rescheduleAppointment: (id: string, newDate: string, newTimeSlot: string) =>
    apiRequest(`/api/appointments/${id}/reschedule`, {
      method: 'PATCH',
      body: JSON.stringify({ newDate, newTimeSlot }),
    }),

  // EHR
  getPatientRecords: (patientId: string) => apiRequest(`/api/ehr/patients/${patientId}/records`),
  getRecordById: (recordId: string) => apiRequest(`/api/ehr/records/${recordId}`),
  addEHRRecord: (patientId: string, recordData: any) =>
    apiRequest(`/api/ehr/patients/${patientId}/records`, {
      method: 'POST',
      body: JSON.stringify(recordData),
    }),
  updateEHRRecord: (recordId: string, recordData: any) =>
    apiRequest(`/api/ehr/records/${recordId}`, {
      method: 'PUT',
      body: JSON.stringify(recordData),
    }),
  getPatientsList: () => apiRequest('/api/ehr/patients-list'),

  // Notifications
  getNotifications: () => apiRequest('/api/notifications'),
  markAllNotificationsRead: () => apiRequest('/api/notifications/mark-all-read', { method: 'PATCH' }),
  markNotificationRead: (id: string) => apiRequest(`/api/notifications/${id}/read`, { method: 'PATCH' }),
};
