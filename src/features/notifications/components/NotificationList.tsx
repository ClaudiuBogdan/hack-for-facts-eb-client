import { useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteNotification } from '../api/notifications';
import { NotificationCard } from './NotificationCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Search, Bell } from 'lucide-react';
import { Trans } from '@lingui/react/macro';
import { t } from '@lingui/core/macro';
import { toast } from 'sonner';
import { useEntityLabel } from '@/hooks/filters/useFilterLabels';
import type { Notification } from '../types';
import { useNavigate } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { AlertsList } from './alerts';

interface Props {
  notifications: Notification[];
  isLoading?: boolean;
  onAddNotification?: () => void;
}

export function NotificationList({ notifications, isLoading, onAddNotification }: Props) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Extract unique entity CUIs from notifications (excluding series alerts)
  const entityCuis = useMemo(() => {
    const unique = new Set<string>();
    for (const n of notifications) {
      if (n.notificationType === 'alert_series_analytics' || n.notificationType === 'alert_series_static') continue;
      const cui = typeof n.entityCui === 'string' ? n.entityCui.trim() : '';
      if (cui) unique.add(cui);
    }
    return Array.from(unique);
  }, [notifications]);

  // Use the entity label hook to fetch and cache entity names
  const entityLabel = useEntityLabel(entityCuis);

  const removeMutation = useMutation({
    mutationFn: (id: string) => deleteNotification(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('Notification deleted successfully');
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error));
    },
  });

  // Enrich notifications with entity names from the label hook (excluding series alerts)
  const enrichedNotifications = useMemo(() => {
    return notifications
      .filter(notification => notification.notificationType !== 'alert_series_analytics' && notification.notificationType !== 'alert_series_static')
      .map(notification => {
        if (notification.entity?.name) {
          return notification;
        }
        if (notification.entityCui) {
          const entityName = entityLabel.map(notification.entityCui);
          // Only add entity if we got a real name (not the fallback id:: format)
          if (typeof entityName === 'string' && !entityName.startsWith('id::')) {
            return {
              ...notification,
              entity: {
                cui: notification.entityCui,
                name: entityName,
              },
            };
          }
        }
        return notification;
      });
  }, [notifications, entityLabel]);

  const grouped = useMemo(() => {
    return enrichedNotifications.reduce((acc, notification) => {
      const key = notification.entityCui || 'global';
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(notification);
      return acc;
    }, {} as Record<string, Notification[]>);
  }, [enrichedNotifications]);


  const renderNotifications = () => {
    if (isLoading) {
      return (
        <div className="space-y-4" aria-busy>
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      );
    }

    if (!enrichedNotifications || enrichedNotifications.length === 0) {
      return (
        <Card className="border-dashed border-2 border-muted-foreground/25">
          <CardContent className="flex flex-col items-center justify-center py-12 px-6 text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <Bell className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">
              <Trans>No active notifications</Trans>
            </h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-md">
              <Trans>
                You have no active notifications. Navigate to an entity page and click the bell icon to subscribe to updates.
              </Trans>
            </p>
            <Button
              onClick={() => onAddNotification?.()}
              className="flex items-center gap-2"
              aria-label={t`Find Entity to Monitor`}
              disabled={!onAddNotification}
            >
              <Search className="h-4 w-4" />
              <Trans>Find Entity to Monitor</Trans>
            </Button>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-4">
        {Object.entries(grouped).map(([entityCui, entityNotifications]) => (
          <NotificationCard
            key={entityCui}
            notifications={entityNotifications}
            onRemove={(id) => removeMutation.mutate(id)}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <section>{renderNotifications()}</section>
      <section className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold"><Trans>Data series alerts</Trans></h2>
            <p className="text-sm text-muted-foreground">
              <Trans>Review and manage alerts created from your custom data series.</Trans>
            </p>
          </div>
          <Button
            variant="outline"
            size="icon"
            className="self-start sm:self-center rounded-full border-primary bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
            onClick={() => navigate({ to: '/alerts/new', replace: false })}
            title={t`Create alert`}
            aria-label={t`Create alert`}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <AlertsList />
      </section>
    </div>
  );
}

function getErrorMessage(error: unknown): string {
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object' && 'message' in error) {
    const maybeMessage = (error as { message?: unknown }).message;
    if (typeof maybeMessage === 'string') return maybeMessage;
  }
  return 'Failed to delete notification';
}
