import { useMemo, useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { AuthSignInButton, useAuth } from '@/lib/auth';
import {
  useAdvancedMapAnalyticsMapQuery,
  useAdvancedMapAnalyticsMapsQuery,
  useAdvancedMapAnalyticsSnapshotsQuery,
  useDeleteAdvancedMapAnalyticsMapMutation,
} from '@/features/advanced-map-analytics/hooks/use-advanced-map-analytics';
import type { AdvancedMapAnalyticsApiError } from '@/features/advanced-map-analytics/api/advanced-map-analytics-api';

export function MapAnalyticsListPage() {
  const navigate = useNavigate();
  const { isLoaded, isSignedIn } = useAuth();
  const [cloneSourceMapId, setCloneSourceMapId] = useState<string | null>(null);
  const [cloneSnapshotMapId, setCloneSnapshotMapId] = useState<string | null>(null);
  const deleteMapMutation = useDeleteAdvancedMapAnalyticsMapMutation();

  const mapsQuery = useAdvancedMapAnalyticsMapsQuery();

  const cloneLatestQuery = useAdvancedMapAnalyticsMapQuery(
    cloneSourceMapId ?? '',
    Boolean(cloneSourceMapId)
  );

  const cloneSnapshotsQuery = useAdvancedMapAnalyticsSnapshotsQuery(
    cloneSnapshotMapId ?? '',
    1,
    20,
    Boolean(cloneSnapshotMapId)
  );

  const forbiddenError = useMemo(() => {
    if (!mapsQuery.error) {
      return null;
    }

    const error = mapsQuery.error as AdvancedMapAnalyticsApiError;
    return error.status === 403 ? error : null;
  }, [mapsQuery.error]);

  const createMapFromState = (state?: unknown) => {
    navigate({
      to: '/maps/editor/new',
      search: state ? { state } : {},
    });
  };

  const handleCloneLatest = (mapId: string) => {
    setCloneSourceMapId(mapId);
  };

  const handleCloneSnapshot = (mapId: string) => {
    setCloneSnapshotMapId(mapId);
  };

  const completeCloneLatest = () => {
    if (!cloneLatestQuery.data) {
      return;
    }

    createMapFromState(cloneLatestQuery.data.lastSnapshot.config);
    setCloneSourceMapId(null);
  };

  const handleDelete = async (mapId: string) => {
    if (!window.confirm('Delete this map?')) {
      return;
    }

    try {
      await deleteMapMutation.mutateAsync({ mapId });
      toast.success('Map deleted');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete map';
      toast.error(message);
    }
  };

  if (!isLoaded || mapsQuery.isLoading) {
    return (
      <div className="container mx-auto py-12">
        <LoadingSpinner text="Loading maps..." />
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle>Sign in required</CardTitle>
            <CardDescription>You need to be signed in to access map editor.</CardDescription>
          </CardHeader>
          <CardContent>
            <AuthSignInButton>
              <Button>Sign In</Button>
            </AuthSignInButton>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (forbiddenError) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle>Access denied</CardTitle>
            <CardDescription>{forbiddenError.message}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (mapsQuery.error) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle>Failed to load maps</CardTitle>
            <CardDescription>{mapsQuery.error.message}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const maps = mapsQuery.data ?? [];

  return (
    <div className="container mx-auto space-y-4 py-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Map editor</h1>
          <p className="text-sm text-muted-foreground">Manage your advanced map analytics maps.</p>
        </div>
        <Button onClick={() => createMapFromState()}>Create map</Button>
      </div>

      {maps.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-sm text-muted-foreground">
            No maps yet. Create your first map to get started.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {maps.map((map) => (
            <Card key={map.id}>
              <CardHeader>
                <CardTitle className="text-base">{map.title}</CardTitle>
                <CardDescription>
                  {map.state} · {map.snapshotCount} snapshots · updated {new Date(map.updatedAt).toLocaleString()}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center gap-2">
                <Button asChild size="sm" variant="default">
                  <Link to="/maps/editor/$mapId" params={{ mapId: map.id }}>
                    Open
                  </Link>
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleCloneLatest(map.id)}>
                  Clone latest
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleCloneSnapshot(map.id)}>
                  Clone snapshot
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleDelete(map.id)}
                  disabled={deleteMapMutation.isPending}
                >
                  Delete
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={cloneSourceMapId !== null} onOpenChange={(open) => !open && setCloneSourceMapId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clone latest snapshot</DialogTitle>
            <DialogDescription>Create a new map using the latest saved snapshot.</DialogDescription>
          </DialogHeader>

          {cloneLatestQuery.isLoading ? (
            <LoadingSpinner text="Loading latest snapshot..." />
          ) : cloneLatestQuery.error ? (
            <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {cloneLatestQuery.error.message}
            </div>
          ) : (
            <div className="flex justify-end">
              <Button onClick={completeCloneLatest}>Create from latest</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={cloneSnapshotMapId !== null} onOpenChange={(open) => !open && setCloneSnapshotMapId(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Clone from snapshot</DialogTitle>
            <DialogDescription>Select a snapshot to clone into a new map.</DialogDescription>
          </DialogHeader>

          {cloneSnapshotsQuery.isLoading ? (
            <LoadingSpinner text="Loading snapshots..." />
          ) : cloneSnapshotsQuery.error ? (
            <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {cloneSnapshotsQuery.error.message}
            </div>
          ) : (
            <div className="max-h-[360px] space-y-2 overflow-y-auto">
              {(cloneSnapshotsQuery.data?.snapshots ?? []).map((snapshot) => (
                <article key={snapshot.snapshotId} className="flex items-center justify-between rounded border p-3">
                  <div>
                    <p className="text-sm font-semibold">{snapshot.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(snapshot.createdAt).toLocaleString()} · {snapshot.stateAtSave}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => {
                      createMapFromState(snapshot.config);
                      setCloneSnapshotMapId(null);
                    }}
                  >
                    Clone
                  </Button>
                </article>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
