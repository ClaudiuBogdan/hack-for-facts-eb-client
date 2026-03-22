import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { t } from '@lingui/core/macro';
import {
  deleteNotification,
  getUserNotifications,
  createNotification,
  updateNotification,
  unsubscribeNotification,
} from '@/features/notifications/api/notifications';
import type { Notification } from '@/features/notifications/types';
import { Alert, AlertSchema } from '@/schemas/alerts';

export function mapNotificationToAlert(entry: Notification): Alert {
  const raw = (entry.config ?? {}) as Record<string, unknown>;
  // Remove fields that commonly cause schema mismatches or are managed client-side
  const { id: rawId, createdAt: _c1, updatedAt: _c2, lastEvaluatedAt: _c3, ...rest } = raw as Record<string, unknown>;

  // Build a base input without id to avoid uuid validation failures
  const baseInput = {
    ...rest,
    isActive: entry.isActive,
    notificationType: (entry.notificationType === 'alert_series_static' ? 'alert_series_static' : 'alert_series_analytics'),
  };

  const parsed = AlertSchema.safeParse(baseInput);
  const baseAlert = parsed.success
    ? parsed.data
    : AlertSchema.parse({
        isActive: entry.isActive,
        notificationType: (entry.notificationType === 'alert_series_static' ? 'alert_series_static' : 'alert_series_analytics'),
      });

  // Assign an id post-parse to avoid runtime validation rejecting non-uuid ids
  const idCandidate = typeof rawId === 'string' && rawId.trim().length > 0
    ? rawId
    : String(entry.id);

  const alert: Alert = {
    ...baseAlert,
    id: idCandidate,
    notificationType: (entry.notificationType === 'alert_series_static' ? 'alert_series_static' : 'alert_series_analytics'),
    // If config contains datasetId, consider it a static alert; otherwise analytics
    seriesType: typeof (rest as any).datasetId === 'string' && (rest as any).datasetId.trim().length > 0 ? 'static' : 'analytics',
  };

  return alert;
}

function buildAlertConfigPayload(alert: Alert): Record<string, unknown> {
  const base = {
    id: alert.id,
    title: alert.title,
    description: alert.description,
    conditions: alert.conditions,
  } as Record<string, unknown>;

  if (alert.seriesType === 'static') {
    return { ...base, datasetId: alert.datasetId };
  }

  // Default to analytics
  return { ...base, filter: alert.filter };
}

export const alertsKeys = {
  all: ['alerts'] as const,
  detail: (alertId: string) => ['alerts', alertId] as const,
};

export function useAlertsList() {
  return useQuery({
    queryKey: alertsKeys.all,
    queryFn: async () => {
      const notifications = await getUserNotifications();
      const alerts = notifications
        .filter((n) => n.notificationType === 'alert_series_analytics' || n.notificationType === 'alert_series_static')
        .map(mapNotificationToAlert);
      return alerts;
    },
    staleTime: 60_000,
  });
}

export function useAlertDetail(alertId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: alertsKeys.detail(alertId),
    queryFn: async () => {
      const notifications = await getUserNotifications();
      const target = notifications.find((n) => {
        if (n.notificationType !== 'alert_series_analytics' && n.notificationType !== 'alert_series_static') return false;
        const cfg = n.config ?? {};
        const configId = typeof cfg === 'object' && cfg !== null && 'id' in cfg ? (cfg as { id?: unknown }).id : undefined;
        return configId === alertId || String(n.id) === alertId;
      });
      if (!target) {
        throw new Error('Alert not found');
      }
      return mapNotificationToAlert(target);
    },
    enabled: options?.enabled ?? true,
  });
}

export function useSaveAlertMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (alert: Alert) => {
      const configPayload = buildAlertConfigPayload(alert);

      // Find existing notification to get its server id
      const notifications = await getUserNotifications();
      const existing = notifications.find((n) => {
        if (n.notificationType !== 'alert_series_analytics' && n.notificationType !== 'alert_series_static') return false;
        const cfg = n.config ?? {};
        const configId = typeof cfg === 'object' && cfg !== null && 'id' in cfg ? (cfg as { id?: unknown }).id : undefined;
        return (configId && configId === alert.id) || String(n.id) === alert.id;
      });

      // Deactivate
      if (!alert.isActive) {
        if (existing && existing.isActive) {
          return unsubscribeNotification(existing.id);
        }
        // If not existing or already inactive, ensure it exists to keep consistent behavior
        return existing ?? (await createNotification({ entityCui: null, notificationType: alert.seriesType === 'static' ? 'alert_series_static' : 'alert_series_analytics', config: { ...configPayload, id: undefined } }));
      }

      // Activate or update
      if (existing) {
        return updateNotification(existing.id, { isActive: true, config: configPayload });
      }

      // Create active alert
      return createNotification({ entityCui: null, notificationType: alert.seriesType === 'static' ? 'alert_series_static' : 'alert_series_analytics', config: { ...configPayload, id: undefined } });
    },
    onSuccess: (savedNotification) => {
      const savedAlert = mapNotificationToAlert(savedNotification);
      if (savedAlert.id) {
        queryClient.setQueryData(alertsKeys.detail(savedAlert.id), savedAlert);
      }
      queryClient.invalidateQueries({ queryKey: alertsKeys.all });
      toast.success(t`Alert saved successfully`);
    },
    onError: (error: Error) => {
      toast.error(error.message || t`Failed to save alert`);
    },
  });
}

export function useDeleteAlertMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (alertId: string) => {
      const notifications = await getUserNotifications();
      const target = notifications.find((n) => {
        if (n.notificationType !== 'alert_series_analytics' && n.notificationType !== 'alert_series_static') return false;
        const cfg = n.config ?? {};
        const configId = typeof cfg === 'object' && cfg !== null && 'id' in cfg ? (cfg as { id?: unknown }).id : undefined;
        return configId === alertId || String(n.id) === alertId;
      });
      if (!target) {
        throw new Error('Alert not found');
      }
      await deleteNotification(target.id);
      return alertId;
    },
    onSuccess: (_, alertId) => {
      queryClient.invalidateQueries({ queryKey: alertsKeys.all });
      queryClient.removeQueries({ queryKey: alertsKeys.detail(alertId) });
      toast.success(t`Alert deleted`);
    },
    onError: (error: Error) => toast.error(error.message || t`Failed to delete alert`),
  });
}
