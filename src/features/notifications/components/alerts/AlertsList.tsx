import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, BarChart3 } from 'lucide-react';
import { Trans } from '@lingui/react/macro';
import { useAlertsList, useSaveAlertMutation, useDeleteAlertMutation } from '@/features/alerts/hooks/useAlertsApi';
import { AlertCard } from './AlertCard';
import { AlertPreviewModal } from './AlertPreviewModal';

export function AlertsList() {
  const navigate = useNavigate();
  const alertsQuery = useAlertsList();
  const toggleAlertMutation = useSaveAlertMutation();
  const deleteAlertMutation = useDeleteAlertMutation();
  const [previewAlertId, setPreviewAlertId] = useState<string | null>(null);

  if (alertsQuery.isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  if (alertsQuery.isError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          <Trans>Failed to load alerts. Please try again.</Trans>
        </AlertDescription>
      </Alert>
    );
  }

  const alerts = alertsQuery.data ?? [];

  if (alerts.length === 0) {
    return (
      <Card className="border-dashed border-2 border-muted-foreground/25">
        <CardContent className="flex flex-col items-center justify-center py-12 px-6 text-center">
          <div className="rounded-full bg-muted p-4 mb-4">
            <BarChart3 className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">
            <Trans>No data series alerts</Trans>
          </h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-md">
            <Trans>You have no data series alerts yet. Create one from a chart series or use the alerts dashboard.</Trans>
          </p>
          <Button
            onClick={() => navigate({ to: '/alerts/new', replace: false })}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            <Trans>Create Alert</Trans>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const previewAlert = alerts.find(a => a.id === previewAlertId) ?? null;

  return (
    <>
      <div className="space-y-3">
        {alerts.map((alert) => {
          const togglingId = toggleAlertMutation.variables?.id;
          const deletingId = deleteAlertMutation.variables;
          const isToggling = toggleAlertMutation.isPending && togglingId === alert.id;
          const isDeleting = deleteAlertMutation.isPending && deletingId === alert.id;

          const handleToggle = (nextValue: boolean) => {
            toggleAlertMutation.mutate({ ...alert, isActive: nextValue });
          };

          const handleDelete = () => {
            if (alert.id) {
              deleteAlertMutation.mutate(alert.id);
            }
          };

          const handleEdit = () => {
            if (alert.id) {
              navigate({
                to: '/alerts/$alertId',
                params: { alertId: alert.id },
                search: { alert, view: 'overview', mode: 'edit' },
                replace: false,
              });
            }
          };

          const handlePreview = () => {
            setPreviewAlertId(alert.id ?? null);
          };

          return (
            <AlertCard
              key={alert.id ?? 'unknown'}
              alert={alert}
              isToggling={isToggling}
              isDeleting={isDeleting}
              onToggle={handleToggle}
              onDelete={handleDelete}
              onEdit={handleEdit}
              onPreview={handlePreview}
            />
          );
        })}
      </div>

      <AlertPreviewModal
        alert={previewAlert}
        isOpen={previewAlertId !== null}
        onClose={() => setPreviewAlertId(null)}
      />
    </>
  );
}
