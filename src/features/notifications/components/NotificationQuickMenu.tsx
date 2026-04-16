import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { t } from '@lingui/core/macro';
import { toast } from 'sonner';
import { createNotification, updateNotification } from '../api/notifications';
import { useToggleNotification } from '../hooks/useToggleNotification';
import { useAllNotifications } from '../hooks/useAllNotifications';
import { Trans } from '@lingui/react/macro';
import { ArrowRight } from 'lucide-react';
import type { Notification, NotificationType } from '../types';
import { getNotificationTypeConfig } from '../types';
import { NotificationLegalNotice } from './NotificationLegalNotice';
import {
  FUNKY_CAMPAIGN_KEY,
  FUNKY_NOTIFICATION_ENTITY_UPDATES,
  FUNKY_NOTIFICATION_GLOBAL,
} from '../campaign-notification-keys';

const NEWSLETTER_TYPES: NotificationType[] = [
  'newsletter_entity_monthly',
  'newsletter_entity_quarterly',
  'newsletter_entity_yearly',
];

interface Props {
  cui: string;
  entityName: string;
  notifications: Notification[];
  notificationTypes?: readonly NotificationType[];
  managePath?: string;
  manageSearch?: Record<string, string>;
  onClose?: () => void;
}

function buildHref(path: string, search?: Record<string, string>): string {
  if (!search || Object.keys(search).length === 0) {
    return path
  }

  const params = new URLSearchParams(search)
  const query = params.toString()
  return query ? `${path}?${query}` : path
}

export function NotificationQuickMenu({
  cui,
  entityName,
  notifications,
  notificationTypes = NEWSLETTER_TYPES,
  managePath = '/settings/notifications',
  manageSearch,
  onClose,
}: Props) {
  const toggleMutation = useToggleNotification();
  const {
    data: allNotifications,
    refetch: refetchAllNotifications,
  } = useAllNotifications();

  const ensureCampaignGlobalEnabled = async () => {
    const notifications =
      allNotifications ?? (await refetchAllNotifications()).data ?? [];

    const globalPreference =
      notifications.find(
        (notification) =>
          notification.notificationType === FUNKY_NOTIFICATION_GLOBAL &&
          notification.campaignKey === FUNKY_CAMPAIGN_KEY
      ) ?? null;

    if (globalPreference === null) {
      await createNotification({
        entityCui: null,
        notificationType: FUNKY_NOTIFICATION_GLOBAL,
      });
      return;
    }

    if (!globalPreference.isActive) {
      await updateNotification(globalPreference.id, { isActive: true });
    }
  };

  const handleToggle = async (type: NotificationType, isChecked: boolean) => {
    if (toggleMutation.isPending) return;

    const notification = notifications.find(
      (item) => item.notificationType === type && item.entityCui === cui
    );

    try {
      if (type === FUNKY_NOTIFICATION_ENTITY_UPDATES && isChecked) {
        await ensureCampaignGlobalEnabled();
      }

      toggleMutation.mutate({
        entityCui: cui,
        notificationType: type,
        isActive: isChecked,
        notificationId: notification?.id,
      });
    } catch (error) {
      console.error('Failed to update notification:', error);
      toast.error(t`Failed to update notification`);
    }
  };

  const getNotificationStatus = (type: NotificationType) => {
    const notification = notifications.find(
      n => n.notificationType === type && n.entityCui === cui
    );
    return notification?.isActive ?? false;
  };
  const showCampaignTerms = notificationTypes.includes(FUNKY_NOTIFICATION_ENTITY_UPDATES);
  const showGeneralTerms = notificationTypes.some((type) => NEWSLETTER_TYPES.includes(type));
  const configuredNotificationTypes = notificationTypes.flatMap((type) => {
    const config = getNotificationTypeConfig(type);
    return config ? [{ type, config }] : [];
  });
  const manageHref = buildHref(managePath, manageSearch)

  return (
    <div className="flex w-full min-h-[24rem] flex-col space-y-5 p-2">
      <div className="space-y-1">
        <h3 className="font-semibold text-xl">
          <Trans>Get updates about</Trans>
        </h3>
        <p className="text-base text-muted-foreground truncate">{entityName}</p>
      </div>

      <Separator />

      <div className="space-y-1 flex-1">
        {configuredNotificationTypes.map(({ type, config }) => {
          const isActive = getNotificationStatus(type);

          return (
            <div
              key={type}
              className="flex items-center justify-between gap-4 px-3 py-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group"
              onClick={() => {
                void handleToggle(type, !isActive);
              }}
            >
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium group-hover:text-foreground transition-colors">
                  {config.label}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 break-words">
                  {config.description}
                </p>
              </div>
              <Switch
                className="cursor-pointer disabled:cursor-pointer"
                checked={isActive}
                onCheckedChange={(checked) => {
                  void handleToggle(type, checked);
                }}
                disabled={toggleMutation.isPending}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          );
        })}
      </div>

      <NotificationLegalNotice
        showCampaignTerms={showCampaignTerms}
        showGeneralTerms={showGeneralTerms}
      />

      <a href={manageHref} onClick={onClose} className="block">
        <Button
          variant="default"
          size="lg"
          className="w-full justify-between group hover:bg-primary hover:text-primary-foreground"
        >
          <Trans>Manage all notifications</Trans>
          <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
        </Button>
      </a>
    </div>
  );
}
