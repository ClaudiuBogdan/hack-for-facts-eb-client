import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Link } from '@tanstack/react-router';
import { Building2, Trash2, ExternalLink } from 'lucide-react';
import { Trans } from '@lingui/react/macro';
import type { Notification } from '../types';
import { getNotificationTypeConfig } from '../types';
import { useToggleNotification } from '../hooks/useToggleNotification';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface Props {
  notifications: Notification[];
  onRemove: (id: string) => void;
}

export function NotificationCard({ notifications, onRemove }: Props) {
  const toggleMutation = useToggleNotification();
  const configuredNotifications = notifications.flatMap((notification) => {
    const config = getNotificationTypeConfig(notification.notificationType);
    return config ? [{ notification, config }] : [];
  });

  if (configuredNotifications.length === 0) return null;

  const firstNotification = configuredNotifications[0].notification;
  const entityName = firstNotification.entity?.name || 'Unknown Entity';
  const entityCui = firstNotification.entityCui;

  const handleToggle = (notification: Notification, isActive: boolean) => {
    toggleMutation.mutate({
      entityCui: notification.entityCui,
      notificationType: notification.notificationType,
      isActive,
      notificationId: notification.id,
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex-1 min-w-0">
            {entityCui ? (
              <Link
                to="/entities/$cui"
                params={{ cui: entityCui }}
                className="group"
              >
                <CardTitle className="text-lg flex items-center gap-2 hover:text-primary transition-colors">
                  <Building2 className="h-4 w-4 shrink-0" />
                  <span className="break-words">{entityName}</span>
                  <ExternalLink className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </CardTitle>
              </Link>
            ) : (
              <CardTitle className="text-lg flex items-center gap-2">
                <Building2 className="h-4 w-4 shrink-0" />
                <span className="break-words">{entityName}</span>
              </CardTitle>
            )}
            <CardDescription className="mt-1 ml-6">
              <code className="text-xs">{entityCui}</code>
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {configuredNotifications.map(({ notification, config }, index) => (
            <div key={notification.id}>
              {index > 0 && <Separator className="my-3" />}
              <div className="flex items-center justify-between gap-4 py-2 px-3 rounded-lg hover:bg-secondary/30 transition-colors group">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium mb-0.5">
                    {config.label}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {config.description}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Switch
                    className="cursor-pointer disabled:cursor-pointer transition-all duration-300"
                    checked={notification.isActive}
                    onCheckedChange={(isActive) => handleToggle(notification, isActive)}
                    disabled={toggleMutation.isPending}
                  />
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          <Trans>Delete notification</Trans>
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          <Trans>
                            Are you sure you want to delete this notification? This action cannot be
                            undone.
                          </Trans>
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>
                          <Trans>Cancel</Trans>
                        </AlertDialogCancel>
                        <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => onRemove(notification.id)}>
                          <Trans>Delete</Trans>
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
