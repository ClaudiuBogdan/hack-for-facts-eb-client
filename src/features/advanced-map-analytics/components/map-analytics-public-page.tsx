import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { MapAnalyticsPublicView } from '@/features/advanced-map-analytics/components/map-analytics-public-view';
import type { PublicMapViewport } from '@/features/advanced-map-analytics/hooks/use-public-map-viewport';
import { usePublicMapRuntimeState } from '@/features/advanced-map-analytics/hooks/use-public-map-runtime-state';
import { t } from '@lingui/core/macro';

interface MapAnalyticsPublicPageProps {
  publicId: string;
  mapZoomOverride?: number;
  mapCenterOverride?: [number, number];
  onMapViewportChange?: (next: PublicMapViewport) => void;
  selectedSirutaOverride?: string;
  onSelectedSirutaChange?: (nextSiruta: string | undefined) => void;
}

/**
 * Route shell for the public map view: gates on loading/error states and
 * forwards the resolved runtime state to `MapAnalyticsPublicView`. The
 * editor `MapAnalyticsWorkspace` is intentionally not used here; the public
 * surface is its own component tree built around the same data hooks.
 */
export function MapAnalyticsPublicPage({
  publicId,
  mapZoomOverride,
  mapCenterOverride,
  onMapViewportChange,
  selectedSirutaOverride,
  onSelectedSirutaChange,
}: Readonly<MapAnalyticsPublicPageProps>) {
  const {
    publicMapQuery,
    mapState,
    setMapState,
    isRuntimeStateReady,
    mapDescription,
    bundledGroupedSeriesData,
    bundledRemoteBaseSeriesHash,
  } = usePublicMapRuntimeState({
    publicId,
    mapZoomOverride,
    mapCenterOverride,
    onMapViewportChange,
  });

  if (publicMapQuery.isLoading || (!publicMapQuery.error && !isRuntimeStateReady)) {
    return <PublicMapLoadingState />;
  }

  if (publicMapQuery.error) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle>{t`Public map unavailable`}</CardTitle>
            <CardDescription>{publicMapQuery.error.message}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <MapAnalyticsPublicView
      mapState={mapState}
      setMapState={setMapState}
      mapDescription={mapDescription}
      bundledGroupedSeriesData={bundledGroupedSeriesData}
      bundledRemoteBaseSeriesHash={bundledRemoteBaseSeriesHash}
      selectedSirutaOverride={selectedSirutaOverride}
      onSelectedSirutaChange={onSelectedSirutaChange}
    />
  );
}

function PublicMapLoadingState() {
  return (
    <div className="flex h-dvh flex-col bg-background md:flex-row">
      <header className="flex items-center justify-between gap-3 border-b border-border bg-card px-4 py-3 md:hidden">
        <Skeleton className="h-5 w-44" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-9 rounded-full" />
          <Skeleton className="h-9 w-9 rounded-full" />
          <Skeleton className="h-9 w-9 rounded-full" />
        </div>
      </header>

      <aside className="hidden border-r border-border bg-card md:flex md:w-[400px] md:min-w-[400px] md:flex-col">
        <div className="flex flex-col gap-5 p-5">
          <div className="flex flex-col gap-3 pb-1">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-8 w-64" />
            <div className="flex gap-2">
              <Skeleton className="h-9 w-9 rounded-full" />
              <Skeleton className="h-9 w-9 rounded-full" />
              <Skeleton className="h-9 w-9 rounded-full" />
            </div>
          </div>
          <Skeleton className="h-28 w-full rounded-2xl" />
          <Skeleton className="h-20 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-2xl" />
        </div>
      </aside>

      <main className="relative flex min-h-0 flex-1">
        <MapLoadingSurface text={t`Loading public map...`} />
      </main>

      <div className="flex flex-col gap-3 border-t border-border bg-card px-4 py-3 md:hidden">
        <Skeleton className="h-16 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
      </div>
    </div>
  );
}

function MapLoadingSurface({ text }: Readonly<{ text: string }>) {
  return (
    <div className="flex min-h-full w-full items-center justify-center bg-muted/20">
      <LoadingSpinner size="lg" text={text} />
    </div>
  );
}
