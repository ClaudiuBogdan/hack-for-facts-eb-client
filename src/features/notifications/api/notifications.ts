import { getAuthToken } from '@/lib/auth';
import { getApiBaseUrl } from '@/config/env';
import { t } from '@lingui/core/macro';
import type { Notification, NotificationType } from '../types';

const getApiUrl = () => getApiBaseUrl();
const AUTH_REQUIRED_MESSAGE = t`Sign in required to manage notifications`;

interface ApiResponse<T> {
  ok: boolean;
  data?: T;
  error?: string;
  message?: string;
}

async function requireAuthToken(): Promise<string> {
  const token = await getAuthToken();
  if (!token) {
    throw new Error(AUTH_REQUIRED_MESSAGE);
  }
  return token;
}

// Fetch all user notifications
export async function getUserNotifications(): Promise<Notification[]> {
  const endpoint = `${getApiUrl()}/api/v1/notifications`;
  const token = await getAuthToken();

  const headers: Record<string, string> = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const response = await fetch(endpoint, { headers });

  if (!response.ok) {
    const error: ApiResponse<never> = await response.json().catch(() => ({ ok: false, error: response.statusText }));
    throw new Error(error.error || `Failed to fetch notifications: ${response.statusText}`);
  }

  const result: ApiResponse<Notification[]> = await response.json();
  return result.data || [];
}

// Fetch notifications for specific entity
export async function getEntityNotifications(cui: string): Promise<Notification[]> {
  const endpoint = `${getApiUrl()}/api/v1/notifications/entity/${cui}`;
  const token = await getAuthToken();

  const headers: Record<string, string> = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const response = await fetch(endpoint, { headers });

  if (!response.ok) {
    const error: ApiResponse<never> = await response.json().catch(() => ({ ok: false, error: response.statusText }));
    throw new Error(error.error || `Failed to fetch entity notifications: ${response.statusText}`);
  }

  const result: ApiResponse<Notification[]> = await response.json();
  return result.data || [];
}

// Create a notification (subscribe)
export async function createNotification(data: {
  entityCui: string | null;
  notificationType: NotificationType;
  config?: Record<string, unknown>;
}): Promise<Notification> {
  const token = await requireAuthToken();
  const endpoint = `${getApiUrl()}/api/v1/notifications`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      notificationType: data.notificationType,
      entityCui: data.entityCui,
      config: data.config ?? undefined,
    }),
  });

  if (!response.ok) {
    const error: ApiResponse<never> = await response.json().catch(() => ({ ok: false, error: response.statusText }));
    throw new Error(error.error || `Failed to create notification: ${response.statusText}`);
  }

  const result: ApiResponse<Notification> = await response.json();
  if (!result.data) {
    throw new Error('No data returned from create');
  }

  return result.data;
}

// Deactivate a notification (isActive: false)
export async function unsubscribeNotification(id: string): Promise<Notification> {
  return updateNotification(id, { isActive: false });
}

// Unsubscribe via token (public, no auth) - used from email links
export async function unsubscribeViaToken(token: string): Promise<{
  success: boolean;
}> {
  const endpoint = `${getApiUrl()}/api/v1/notifications/unsubscribe/${token}`;

  const response = await fetch(endpoint, {
    method: 'GET',
  });

  if (!response.ok) {
    const error: ApiResponse<never> = await response.json().catch(() => ({ ok: false, error: response.statusText }));
    throw new Error(error.error || `Failed to unsubscribe: ${response.statusText}`);
  }

  const result: ApiResponse<never> & { message?: string } = await response.json();

  return {
    success: result.ok,
  };
}

// Delete notification completely
export async function deleteNotification(id: string): Promise<void> {
  const endpoint = `${getApiUrl()}/api/v1/notifications/${id}`;
  const token = await requireAuthToken();

  const headers: Record<string, string> = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const response = await fetch(endpoint, {
    method: 'DELETE',
    headers,
  });

  if (!response.ok) {
    const error: ApiResponse<never> = await response.json().catch(() => ({ ok: false, error: response.statusText }));
    throw new Error(error.error || `Failed to delete notification: ${response.statusText}`);
  }

  const result: ApiResponse<never> = await response.json();
  if (!result.ok) {
    throw new Error('Failed to delete notification');
  }
}

// Update notification (isActive and/or config)
export async function updateNotification(id: string, updates: { isActive?: boolean; config?: Record<string, unknown> }): Promise<Notification> {
  const endpoint = `${getApiUrl()}/api/v1/notifications/${id}`;
  const token = await requireAuthToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const response = await fetch(endpoint, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    const error: ApiResponse<never> = await response.json().catch(() => ({ ok: false, error: response.statusText }));
    throw new Error(error.error || `Failed to update notification: ${response.statusText}`);
  }

  const result: ApiResponse<Notification> = await response.json();
  if (!result.data) {
    throw new Error('No data returned from update');
  }

  return result.data;
}
