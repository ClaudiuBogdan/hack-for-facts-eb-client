import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { AuthSignInButton, useAuth } from '@/lib/auth';
import type { AdvancedMapAnalyticsUrlState } from '@/schemas/advanced-map-analytics';
import { MapAnalyticsWorkspace } from '@/features/advanced-map-analytics/components/map-analytics-workspace';
import { MapAnalyticsOwnerConfigModal } from '@/features/advanced-map-analytics/components/map-analytics-owner-config-modal';
import { useAdvancedMapAnalyticsMapQuery } from '@/features/advanced-map-analytics/hooks/use-advanced-map-analytics';
import type { AdvancedMapAnalyticsApiError } from '@/features/advanced-map-analytics/api/advanced-map-analytics-api';

interface MapAnalyticsEditorPageProps {
  mapId: string;
  mapState: AdvancedMapAnalyticsUrlState;
  setMapState: (
    updater:
      | AdvancedMapAnalyticsUrlState
      | ((previousState: AdvancedMapAnalyticsUrlState) => AdvancedMapAnalyticsUrlState)
  ) => void;
}

const MAP_SEARCH_KEYS = [
  'version',
  'series',
  'activeSeriesId',
  'valueFilters',
  'activeView',
  'mapName',
  'seriesPanelCollapsed',
  'configPanelCollapsed',
  'valueFiltersPanelCollapsed',
  'binsPanelCollapsed',
  'binsPresets',
  'activeBinPresetId',
  'tableBinFiltersByPresetId',
  'mapCenter',
  'mapZoom',
] as const;

function hasMapSearchParams(search: string): boolean {
  const params = new URLSearchParams(search);
  return MAP_SEARCH_KEYS.some((key) => params.has(key));
}

export function MapAnalyticsEditorPage({ mapId, mapState, setMapState }: Readonly<MapAnalyticsEditorPageProps>) {
  const { isLoaded, isSignedIn } = useAuth();
  const navigate = useNavigate();
  const [isOwnerConfigModalOpen, setIsOwnerConfigModalOpen] = useState(false);
  const hasHydratedFromApiRef = useRef(false);

  const mapQuery = useAdvancedMapAnalyticsMapQuery(mapId, isLoaded && isSignedIn);

  useEffect(() => {
    if (!mapQuery.data || hasHydratedFromApiRef.current) {
      return;
    }

    if (typeof window !== 'undefined' && !hasMapSearchParams(window.location.search)) {
      setMapState(mapQuery.data.lastSnapshot.config);
    }

    hasHydratedFromApiRef.current = true;
  }, [mapQuery.data, setMapState]);

  const forbiddenError = useMemo(() => {
    if (!mapQuery.error) {
      return null;
    }

    const error = mapQuery.error as AdvancedMapAnalyticsApiError;
    return error.status === 403 ? error : null;
  }, [mapQuery.error]);

  if (!isLoaded || (mapQuery.isLoading && isSignedIn)) {
    return (
      <div className="container mx-auto py-12">
        <LoadingSpinner text="Loading map editor..." />
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

  if (mapQuery.error) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle>Failed to load map</CardTitle>
            <CardDescription>{mapQuery.error.message}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!mapQuery.data) {
    return null;
  }

  return (
    <>
      <MapAnalyticsWorkspace
        mode="owner"
        mapState={mapState}
        setMapState={setMapState}
        capabilities={{ readOnly: false }}
        onOpenOwnerConfig={() => setIsOwnerConfigModalOpen(true)}
      />

      <MapAnalyticsOwnerConfigModal
        open={isOwnerConfigModalOpen}
        mapId={mapId}
        currentMapState={mapState}
        mapName={mapState.mapName}
        currentTitle={mapQuery.data.title}
        currentVisibility={mapQuery.data.state}
        onOpenChange={setIsOwnerConfigModalOpen}
        onMapNameChange={(nextMapName) => {
          setMapState((previousState) => ({
            ...previousState,
            mapName: nextMapName,
          }));
        }}
        onLoadSnapshot={(nextMapState) => {
          setMapState(nextMapState);
        }}
        onDeleted={() => {
          navigate({ to: '/maps/editor' });
        }}
      />
    </>
  );
}
