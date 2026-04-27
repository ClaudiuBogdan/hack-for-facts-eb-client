import { useEffect, useMemo, useRef } from 'react';
import { createLazyFileRoute, useNavigate } from '@tanstack/react-router';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { MapAnalyticsEditorPage } from '@/features/advanced-map-analytics/components/map-analytics-editor-page';
import {
  hasMapEditorSearchParams,
  stripMapEditorSearchParams,
} from '@/features/advanced-map-analytics/map-editor-search';
import { useMapEditorStorageFallbackWarning } from '@/features/advanced-map-analytics/hooks/use-map-editor-storage-fallback-warning';
import { useMapEditorDraftStore } from '@/features/advanced-map-analytics/store/map-editor-draft-store';
import { AdvancedMapAnalyticsUrlStateSchema } from '@/schemas/advanced-map-analytics';
import { Analytics } from '@/lib/analytics';
import { t } from '@lingui/core/macro';

export const Route = createLazyFileRoute('/maps/editor/$mapId')({
  component: MapEditorRouteComponent,
});

export function MapEditorRouteComponent() {
  const params = Route.useParams();
  const rawSearch = Route.useSearch();
  const mapId = params.mapId;
  const navigate = useNavigate({ from: '/maps/editor/$mapId' });
  const hasProcessedLegacySearchRef = useRef(false);

  useMapEditorStorageFallbackWarning();

  const mapState = useMapEditorDraftStore(mapId, (state) => state.mapState);
  const mapDescription = useMapEditorDraftStore(mapId, (state) => state.mapDescription);
  const updateMapState = useMapEditorDraftStore(mapId, (state) => state.updateMapState);
  const replaceDraft = useMapEditorDraftStore(mapId, (state) => state.replaceDraft);

  useEffect(() => {
    hasProcessedLegacySearchRef.current = false;
  }, [mapId]);

  const hasLegacyEditorSearch = useMemo(() => {
    if (typeof window === 'undefined') {
      return false;
    }

    return hasMapEditorSearchParams(window.location.search);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawSearch]);

  const parsedLegacyMapState = useMemo(() => {
    if (!hasLegacyEditorSearch) {
      return null;
    }

    const parsedState = AdvancedMapAnalyticsUrlStateSchema.safeParse(rawSearch);
    return parsedState.success ? parsedState.data : null;
  }, [hasLegacyEditorSearch, rawSearch]);

  useEffect(() => {
    if (
      !hasLegacyEditorSearch ||
      hasProcessedLegacySearchRef.current ||
      typeof mapId !== 'string' ||
      mapId.trim().length === 0
    ) {
      return;
    }

    hasProcessedLegacySearchRef.current = true;

    if (parsedLegacyMapState) {
      replaceDraft({
        mapState: parsedLegacyMapState,
        mapDescription,
      });
      Analytics.capture(Analytics.EVENTS.AdvancedMapAnalyticsLegacyEditorUrlMigrated, {
        map_id: mapId,
      });
    }

    navigate({
      to: '/maps/editor/$mapId',
      params: { mapId },
      search: (previousSearch) =>
        stripMapEditorSearchParams(previousSearch as Record<string, unknown>),
      replace: true,
      resetScroll: false,
    });
  }, [hasLegacyEditorSearch, mapDescription, mapId, navigate, parsedLegacyMapState, replaceDraft]);

  if (hasLegacyEditorSearch) {
    return (
      <div className="container mx-auto py-12">
        <LoadingSpinner text={t`Migrating map editor link...`} />
      </div>
    );
  }

  return (
    <MapAnalyticsEditorPage
      mapId={mapId}
      mapState={mapState}
      setMapState={updateMapState}
    />
  );
}
