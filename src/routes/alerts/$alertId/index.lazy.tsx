import { useEffect, useMemo, useRef, useState } from 'react';
import { createLazyFileRoute, useParams, useNavigate, useBlocker } from '@tanstack/react-router';
import { AlertEditorView } from '@/components/alerts/components/AlertEditorView';
import { useAlertStore, areAlertsEqual } from '@/components/alerts/hooks/useAlertStore';
import { useAlertDetail, useSaveAlertMutation, useDeleteAlertMutation, mapNotificationToAlert } from '@/features/alerts/hooks/useAlertsApi';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Alert as UiAlert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Trans } from '@lingui/react/macro';
import { t } from '@lingui/core/macro';
import { Analytics } from '@/lib/analytics';
import { toast } from 'sonner';
import { serializeAlertForShare } from '@/lib/alert-links';
import { Link2, Save, RotateCcw, Trash2, Eye } from 'lucide-react';
import { UnsavedChangesDialog } from '@/components/alerts/components/UnsavedChangesDialog';
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AlertPreviewModal } from '@/features/notifications/components/alerts/AlertPreviewModal';
import { useAuth, AuthSignInButton } from '@/lib/auth';
import { getSiteUrl } from '@/config/env';
//

export const Route = createLazyFileRoute('/alerts/$alertId/')({
  component: AlertEditorPage,
});

function AlertEditorPage() {
  const params = useParams({ from: '/alerts/$alertId/' });
  // Use the exact route path for navigate context (with trailing slash)
  const navigate = useNavigate({ from: '/alerts/$alertId/' });
  const { isSignedIn, isLoaded } = useAuth();
  const { alert, setAlert, view, mode, updateAlert } = useAlertStore();
  const saveMutation = useSaveAlertMutation();
  const deleteMutation = useDeleteAlertMutation();
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const isCreateMode = mode === 'create' || params.alertId === 'new';
  const detailQuery = useAlertDetail(params.alertId, { enabled: !isCreateMode && isSignedIn });
  const serverAlert = detailQuery.data;

  const initialDraftRef = useRef(alert);

  useEffect(() => {
    if (alert.id) {
      Analytics.capture(Analytics.EVENTS.AlertOpened, { alert_id: alert.id });
    }
  }, [alert.id]);

  useEffect(() => {
    if (alert.id) {
      Analytics.capture(Analytics.EVENTS.AlertViewChanged, { alert_id: alert.id, view });
    }
  }, [alert.id, view]);

  useEffect(() => {
    if (!serverAlert) return;
    // Only sync from server when we switch to a different alert ID
    if (alert.id !== serverAlert.id) {
      setAlert(serverAlert, { mode: 'edit' });
    }
  }, [alert.id, serverAlert, setAlert]);

  useEffect(() => {
    if (serverAlert) {
      initialDraftRef.current = serverAlert;
    }
  }, [serverAlert]);

  const baselineAlert = serverAlert ?? initialDraftRef.current;
  const isDirty = useMemo(() => !areAlertsEqual(alert, baselineAlert), [alert, baselineAlert]);

  const blocker = useBlocker({
    shouldBlockFn: ({ current, next }) => isDirty && next.pathname !== current.pathname,
    withResolver: true,
    enableBeforeUnload: false,
  });

  const showUnsavedDialog = blocker.status === 'blocked' && isDirty;

  const handleSave = () => {
    const wasCreate = isCreateMode;
    saveMutation.mutate(alert, {
      onSuccess: (savedNotification) => {
        const savedAlert = mapNotificationToAlert(savedNotification);
        setAlert(savedAlert, { mode: 'edit' });
        if (wasCreate) {
          navigate({ to: '/settings/notifications', replace: false });
        }
      },
    });
  };

  const handleShare = async () => {
    try {
      const sharedAlert = serializeAlertForShare(alert);
      const params = new URLSearchParams();
      params.set('alert', JSON.stringify(sharedAlert));
      const shareUrl = `${window.location.origin}/alerts/new?${params.toString()}`;
      await navigator.clipboard.writeText(shareUrl);
      toast.success(t`Share link copied`);
    } catch {
      toast.error(t`Failed to copy share link`);
    }
  };

  const handleDelete = () => {
    if (!serverAlert?.id) return;
    deleteMutation.mutate(serverAlert.id, {
      onSuccess: () => navigate({ to: '/settings/notifications', replace: false }),
    });
  };

  const headerStatus = (() => {
    if (saveMutation.isPending) return t`Saving…`;
    if (saveMutation.isError) return saveMutation.error instanceof Error ? saveMutation.error.message : t`Failed to save`;
    if (detailQuery.isFetching && !detailQuery.isError) return t`Syncing…`;
    if (isDirty) return t`Unsaved changes`;
    return t`All changes saved`;
  })();

  // Loading states (auth or data)
  if (!isLoaded || (detailQuery.isLoading && !serverAlert && !isCreateMode)) {
    const loadingText = !isLoaded ? t`Loading...` : t`Loading alert…`;
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
              <Trans>You need to be signed in to edit alerts</Trans>
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

  if (detailQuery.isError && !serverAlert && !isCreateMode) {
    const errorMessage = (detailQuery.error as Error)?.message ?? 'Unknown error';
    const isNotFound = errorMessage.toLowerCase().includes('not found');

    return (
      <div className="container mx-auto px-4 py-12">
        <UiAlert variant="destructive">
          <AlertTitle>
            {isNotFound ? <Trans>Alert not found</Trans> : <Trans>Failed to load alert</Trans>}
          </AlertTitle>
          <AlertDescription className="space-y-3">
            <p>
              {isNotFound
                ? t`This alert doesn't exist or you don't have permission to view it.`
                : errorMessage
              }
            </p>
            <div className="flex gap-2">
              {!isNotFound && (
                <Button size="sm" variant="outline" onClick={() => detailQuery.refetch()}>
                  <Trans>Try again</Trans>
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={() => navigate({ to: '/settings/notifications' })}>
                <Trans>View all alerts</Trans>
              </Button>
              <Button size="sm" onClick={() => navigate({ to: '/alerts/new' })}>
                <Trans>Create new alert</Trans>
              </Button>
            </div>
          </AlertDescription>
        </UiAlert>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl px-4">
      <UnsavedChangesDialog
        open={showUnsavedDialog}
        isSaving={saveMutation.isPending}
        onStay={() => blocker.reset?.()}
        onLeave={() => blocker.proceed?.()}
      />

      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b">
        <div className="container mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-3 py-4 px-2 md:px-0">
          <h1 className="text-2xl font-semibold tracking-tight">
            {isCreateMode ? <Trans>Create Alert</Trans> : <Trans>Edit Alert</Trans>}
          </h1>
          <div className="flex flex-col md:flex-row md:items-center gap-3 w-full md:w-auto">
            {!isCreateMode && (
              <span className="text-sm text-muted-foreground md:text-right md:min-w-[140px] order-2 md:order-1">
                {headerStatus}
              </span>
            )}
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
              {(serverAlert && isDirty) && (
                <div className="hidden md:block h-6 w-px bg-border mx-1" />
              )}

              {/* Primary actions */}
              {serverAlert && isDirty ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => serverAlert && setAlert(serverAlert)}
                  disabled={saveMutation.isPending}
                >
                  <RotateCcw className="h-4 w-4" />
                  <span className="ml-2"><Trans>Revert</Trans></span>
                </Button>
              ) : null}
              <Button
                size="sm"
                onClick={handleSave}
                disabled={(!isDirty && !!serverAlert) || saveMutation.isPending}
              >
                <Save className="h-4 w-4" />
                <span className="ml-2"><Trans>Save</Trans></span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <AlertEditorView
        alert={alert}
        serverAlert={serverAlert}
        onChange={updateAlert}
      />

      <div className="pb-8">
        <Card>
          <CardHeader>
            <CardTitle>
              <Trans>Danger Zone</Trans>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  className="w-full gap-2"
                  disabled={!serverAlert || deleteMutation.isPending}
                >
                  <Trash2 className="h-4 w-4" />
                  <Trans>Delete alert</Trans>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    <Trans>Delete alert</Trans>
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    <Trans>
                      Are you sure you want to delete this alert? This action cannot be undone.
                    </Trans>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>
                    <Trans>Cancel</Trans>
                  </AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={handleDelete}
                  >
                    <Trans>Delete</Trans>
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </div>

      <AlertPreviewModal
        alert={alert}
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
      />
    </div>
  );
}

function buildEditAlertHead() {
  const site = getSiteUrl()
  const canonical = `${site}/alerts/`
  const title = 'Edit Alert'
  return {
    meta: [
      { title },
      { name: 'canonical', content: canonical },
      { name: 'robots', content: 'noindex,follow' },
    ],
  }
}

export function head() {
  return buildEditAlertHead()
}

// mapNotificationToAlert is imported from useAlertsApi to avoid duplication