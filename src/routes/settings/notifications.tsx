import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { NotificationList } from '@/features/notifications/components/NotificationList';
import { NotificationLegalNotice } from '@/features/notifications/components/NotificationLegalNotice';
import { FloatingEntitySearch } from '@/components/entities/FloatingEntitySearch';
import { useAllNotifications } from '@/features/notifications/hooks/useAllNotifications';
import { FUNKY_NOTIFICATION_GLOBAL } from '@/features/notifications/campaign-notification-keys';
import { CAMPAIGN_NOTIFICATIONS_PATH } from '@/features/campaigns/buget/constants';
import { useAuth, AuthSignInButton } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Trans } from '@lingui/react/macro';
import { Link } from '@tanstack/react-router';
import { t } from '@lingui/core/macro';
import { getSiteUrl } from '@/config/env';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { AlertTriangle, Plus } from 'lucide-react';

export const Route = createFileRoute('/settings/notifications')({
  component: NotificationsSettingsPage,
});

function NotificationsSettingsPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const { data: notifications, isLoading, isError, error, refetch } = useAllNotifications();
  const [isEntitySearchOpen, setIsEntitySearchOpen] = useState(false);

  if (!isLoaded) {
    return <LoadingState />;
  }

  if (!isSignedIn) {
    return <SignInRequired />;
  }

  const errorMessage = isError ? getErrorMessage(error) : null;
  const generalNotifications =
    (notifications ?? []).filter(
      (notification) => notification.notificationType !== FUNKY_NOTIFICATION_GLOBAL,
    );

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4 space-y-6">
      <h1 className="text-3xl font-bold mb-2">
        <Trans>Notifications Settings</Trans>
      </h1>

      {errorMessage && (
        <ErrorBanner message={errorMessage} onRetry={refetch} />
      )}

      <div className="space-y-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold"><Trans>Entity Notifications</Trans></h2>
            <p className="text-sm text-muted-foreground">
              <Trans>Manage your newsletter and alert subscriptions</Trans>
            </p>
            <NotificationLegalNotice
              showCampaignTerms
              showGeneralTerms
              className="mt-3"
            />
            <p className="mt-3 text-sm text-muted-foreground">
              <Trans>
                Manage campaign-wide preferences on the{' '}
                <Link
                  to={CAMPAIGN_NOTIFICATIONS_PATH}
                  className="font-medium underline underline-offset-2 transition-colors hover:text-foreground"
                >
                  campaign notifications page
                </Link>
                .
              </Trans>
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              className="self-start sm:self-center rounded-full border-primary bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
              onClick={() => setIsEntitySearchOpen(true)}
              title={t`Add entity notification`}
              aria-label={t`Add entity notification`}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <NotificationList
          notifications={generalNotifications}
          isLoading={isLoading}
          onAddNotification={() => setIsEntitySearchOpen(true)}
        />
      </div>

      <FloatingEntitySearch
        externalOpen={isEntitySearchOpen}
        onOpenChange={setIsEntitySearchOpen}
        openNotificationModal
      />
    </div>
  );
}

function buildNotificationsHead() {
  const site = getSiteUrl()
  const canonical = `${site}/settings/notifications`
  const title = 'Entity Notification Settings'
  return {
    meta: [
      { title },
      { name: 'canonical', content: canonical },
    ],
  }
}

export function head() {
  return buildNotificationsHead()
}

function LoadingState() {
  return (
    <div className="container max-w-4xl mx-auto py-8 px-4 flex flex-col items-center justify-center min-h-[400px]">
      <LoadingSpinner />
      <p className="text-muted-foreground mt-4">
        <Trans>Loading...</Trans>
      </p>
    </div>
  );
}

function SignInRequired() {
  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <Card>
        <CardHeader>
          <CardTitle>
            <Trans>Sign in required</Trans>
          </CardTitle>
          <CardDescription>
            <Trans>You need to be signed in to manage notifications</Trans>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            <Trans>
              Sign in to receive updates about the entities you care about.
            </Trans>
          </p>
          <NotificationLegalNotice showCampaignTerms showGeneralTerms />
          <p className="text-sm text-muted-foreground">
            <Trans>
              Manage campaign-wide preferences on the{' '}
              <Link
                to={CAMPAIGN_NOTIFICATIONS_PATH}
                className="font-medium underline underline-offset-2 transition-colors hover:text-foreground"
              >
                campaign notifications page
              </Link>
              .
            </Trans>
          </p>
          <AuthSignInButton>
            <Button>
              <Trans>Sign In</Trans>
            </Button>
          </AuthSignInButton>
        </CardContent>
      </Card>
    </div>
  );
}

function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Alert variant="destructive">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>
        <Trans>Error loading notifications</Trans>
      </AlertTitle>
      <AlertDescription className="space-y-2">
        <p>
          <Trans>
            There was a problem loading your notifications. Please try again.
          </Trans>
        </p>
        {message && (
          <p className="text-xs font-mono">{message}</p>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="mt-2"
        >
          <Trans>Try Again</Trans>
        </Button>
      </AlertDescription>
    </Alert>
  );
}

function getErrorMessage(error: unknown): string {
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object' && 'message' in error) {
    const maybeMessage = (error as { message?: unknown }).message;
    if (typeof maybeMessage === 'string') return maybeMessage;
  }
  return 'An unexpected error occurred';
}
