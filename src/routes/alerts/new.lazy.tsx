import { createLazyFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { Trans } from '@lingui/react/macro';
import { t } from '@lingui/core/macro';
import { AlertEditorView } from '@/components/alerts/components/AlertEditorView';
import { useAlertDraftStore } from '@/components/alerts/hooks/useAlertDraftStore';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Alert as UiAlert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { createEmptyAlert, AlertSchema, type Alert } from '@/schemas/alerts';
import { useAlertDetail, useSaveAlertMutation } from '@/features/alerts/hooks/useAlertsApi';
import { Analytics } from '@/lib/analytics';
import { toast } from 'sonner';
import { serializeAlertForShare } from '@/lib/alert-links';
import { Link2, Save, Eye } from 'lucide-react';
import { AlertPreviewModal } from '@/features/notifications/components/alerts/AlertPreviewModal';
import { useAuth, AuthSignInButton } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { getSiteUrl } from '@/config/env';

export const Route = createLazyFileRoute('/alerts/new')({
  component: RouteComponent,
});

interface AlertSearch {
  alert?: Partial<Alert>;
  copyFrom?: string;
}

function RouteComponent() {
  const rawSearch = Route.useSearch() as AlertSearch;
  const urlAlert = rawSearch?.alert;
  const copyFrom = rawSearch?.copyFrom;
  const navigate = useNavigate({ from: '/alerts/new' });
  const { isSignedIn, isLoaded } = useAuth();
  const store = useAlertDraftStore();
  const saveMutation = useSaveAlertMutation();
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // If copying from an existing alert, fetch it
  const copyQuery = useAlertDetail(copyFrom ?? '', { enabled: Boolean(copyFrom) && isSignedIn });

  // Initialize alert state in URL on mount or when parameters change
  useEffect(() => {
    // Skip if already initialized in URL
    if (store.alert) return;

    let newAlert: Alert;

    if (urlAlert) {
      // Use alert from URL (shared link)
      const base = createEmptyAlert();
      newAlert = AlertSchema.parse({
        ...base,
        ...urlAlert,
        filter: urlAlert.filter ?? base.filter,
        lastEvaluatedAt: undefined,
      });
    } else if (copyFrom && copyQuery.data) {
      // Copy from existing alert
      const source = copyQuery.data;
      const base = createEmptyAlert();
      newAlert = AlertSchema.parse({
        ...base,
        title: source.title,
        description: source.description,
        isActive: source.isActive,
        filter: source.filter,
        conditions: source.conditions,
      });
      Analytics.capture(Analytics.EVENTS.AlertCloned, { source_id: copyFrom });
    } else if (!copyFrom) {
      // Fresh create (only if not waiting for copyFrom)
      newAlert = createEmptyAlert();
    } else {
      // Still loading copyFrom
      return;
    }

    // Initialize state in URL
    navigate({
      search: {
        alert: newAlert,
        view: 'overview',
      },
      replace: true,
    });
  }, [copyFrom, copyQuery.data, urlAlert, store.alert, navigate]);

  const handleCreate = () => {
    if (!store.alert) return;
    saveMutation.mutate(store.alert, {
      onSuccess: (saved) => {
        Analytics.capture(Analytics.EVENTS.AlertCreated, { alert_id: saved.id });
        navigate({
          to: '/settings/notifications',
          replace: true,
        });
      },
    });
  };

  const handleShare = async () => {
    if (!store.alert) return;
    try {
      const sharedAlert = serializeAlertForShare(store.alert);
      const params = new URLSearchParams();
      params.set('alert', JSON.stringify(sharedAlert));
      const shareUrl = `${window.location.origin}/alerts/new?${params.toString()}`;
      await navigator.clipboard.writeText(shareUrl);
      toast.success(t`Share link copied`);
    } catch (err) {
      toast.error(t`Failed to copy share link`);
    }
  };


  const headerStatus = (() => {
    if (saveMutation.isPending) return t`Creating…`;
    if (saveMutation.isError) return saveMutation.error instanceof Error ? saveMutation.error.message : t`Failed to create`;
    return t`Ready to create`;
  })();

  // Loading states (auth or data)
  const isDataLoading = (copyFrom && copyQuery.isLoading) || !store.alert;
  if (!isLoaded || isDataLoading) {
    const loadingText = !isLoaded ? t`Loading...` : t`Preparing new alert…`;
    return (
      <div className="container max-w-4xl mx-auto py-8 px-4 flex flex-col items-center justify-center min-h-[400px]">
        <LoadingSpinner />
        <p className="text-muted-foreground mt-4">{loadingText}</p>
      </div>
    );
  }

  // Auth required state
  if (!isSignedIn) {
    return (
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <Card>
          <CardHeader>
            <CardTitle>
              <Trans>Sign in required</Trans>
            </CardTitle>
            <CardDescription>
              <Trans>You need to be signed in to create alerts</Trans>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              <Trans>
                Sign in to create and manage alerts for your entities.
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

  // Show error if copy failed
  if (copyFrom && copyQuery.isError) {
    return (
      <div className="container mx-auto px-4 py-12">
        <UiAlert variant="destructive">
          <AlertTitle>{t`Failed to load alert`}</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>{(copyQuery.error as Error)?.message ?? 'Failed to load alert to copy'}</p>
            <Button size="sm" variant="outline" onClick={() => window.history.back()}>
              {t`Back`}
            </Button>
          </AlertDescription>
        </UiAlert>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl px-4">
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b">
        <div className="container mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-3 py-4 px-2 md:px-0">
          <h1 className="text-2xl font-semibold tracking-tight">
            <Trans>Create Alert</Trans>
          </h1>
          <div className="flex flex-col md:flex-row md:items-center gap-3 w-full md:w-auto">
            <span className="text-sm text-muted-foreground md:text-right md:min-w-[140px] order-2 md:order-1">
              {headerStatus}
            </span>
            <div className="flex items-center gap-2 order-1 md:order-2">
              {/* Secondary actions */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsPreviewOpen(true)}
                disabled={saveMutation.isPending}
              >
                <Eye className="h-4 w-4" />
                <span className="ml-2 hidden sm:inline"><Trans>Preview</Trans></span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleShare}
                disabled={saveMutation.isPending}
              >
                <Link2 className="h-4 w-4" />
                <span className="ml-2 hidden sm:inline"><Trans>Share</Trans></span>
              </Button>

              {/* Divider on desktop */}
              <div className="hidden md:block h-6 w-px bg-border mx-1" />

              {/* Primary action */}
              <Button
                size="sm"
                onClick={handleCreate}
                disabled={saveMutation.isPending}
              >
                <Save className="h-4 w-4" />
                <span className="ml-2"><Trans>Create alert</Trans></span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <AlertEditorView
        alert={store.alert}
        serverAlert={undefined}
        onChange={store.updateAlert}
      />

      <AlertPreviewModal
        alert={store.alert}
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
      />
    </div>
  );
}

function buildNewAlertHead() {
  const site = getSiteUrl()
  const canonical = `${site}/alerts/new`
  const title = 'Create Alert'
  return {
    meta: [
      { title },
      { name: 'canonical', content: canonical },
      { name: 'robots', content: 'noindex,follow' },
    ],
  }
}

export function head() {
  return buildNewAlertHead()
}
