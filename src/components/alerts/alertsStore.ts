import { Alert, AlertSchema } from '@/schemas/alerts';
import { z } from 'zod';

const isBrowser = typeof window !== 'undefined';

const alertsKey = 'saved-alerts';

const isQuotaExceededError = (error: unknown): boolean => {
  if (error instanceof DOMException) {
    return error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED';
  }
  return false;
};

const storedAlertSchema = AlertSchema.extend({
  deleted: z.boolean().optional().default(false),
});

export type StoredAlert = z.infer<typeof storedAlertSchema>;

export const getAlertsStore = () => {
  const loadSavedAlerts = ({ filterDeleted = false }: { filterDeleted?: boolean } = {}): StoredAlert[] => {
    if (!isBrowser) return [];

    const raw = localStorage.getItem(alertsKey);
    if (!raw) {
      return [];
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (error) {
      console.error('Failed to parse alerts from localStorage', error);
      return [];
    }

    if (!Array.isArray(parsed)) {
      return [];
    }

    const validAlerts = parsed
      .map((entry) => {
        const result = storedAlertSchema.safeParse(entry);
        if (result.success) {
          return result.data;
        }
        console.warn('Discarding invalid alert from localStorage', result.error.flatten());
        return null;
      })
      .filter((alert): alert is StoredAlert => alert !== null);

    const filtered = filterDeleted ? validAlerts.filter((alert) => !alert.deleted) : validAlerts;

    return filtered;
  };

  const persistAlerts = (alerts: readonly StoredAlert[]) => {
    if (!isBrowser) return;
    try {
      localStorage.setItem(alertsKey, JSON.stringify(alerts));
    } catch (error) {
      if (isQuotaExceededError(error)) {
        console.warn('localStorage quota exceeded. Alerts will not be persisted.');
      } else {
        console.error('Failed to persist alerts:', error);
      }
    }
  };

  const upsertAlert = (alert: Alert) => {
    const current = loadSavedAlerts();
    const result = AlertSchema.safeParse(alert);
    if (!result.success) {
      console.error('Attempted to save invalid alert', result.error.flatten());
      return;
    }

    const existingIndex = current.findIndex((entry) => entry.id === result.data.id);
    const stored: StoredAlert = {
      ...result.data,
      deleted: existingIndex === -1 ? false : current[existingIndex].deleted ?? false,
    };

    if (existingIndex === -1) {
      persistAlerts([stored, ...current]);
      return;
    }

    const next = [...current];
    next[existingIndex] = stored;
    persistAlerts(next);
  };

  const deleteAlert = (alertId: string) => {
    const current = loadSavedAlerts();
    const next = current.map((entry) =>
      entry.id === alertId
        ? {
            ...entry,
            deleted: true,
            updatedAt: new Date().toISOString(),
          }
        : entry
    );
    persistAlerts(next);
  };

  const removeAlert = (alertId: string) => {
    const current = loadSavedAlerts();
    persistAlerts(current.filter((entry) => entry.id !== alertId));
  };

  return {
    loadSavedAlerts,
    upsertAlert,
    deleteAlert,
    removeAlert,
  };
};
