import { createLazyFileRoute, useNavigate } from '@tanstack/react-router';
import { AdvancedMapAnalyticsUrlStateSchema } from '@/schemas/advanced-map-analytics';
import { MapAnalyticsEditorPage } from '@/features/advanced-map-analytics/components/map-analytics-editor-page';

const MAP_SEARCH_KEYS_TO_REPLACE = new Set([
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
]);

export const Route = createLazyFileRoute('/maps/editor/$mapId')({
  component: MapEditorRouteComponent,
});

export function MapEditorRouteComponent() {
  const params = Route.useParams();
  const rawSearch = Route.useSearch();
  const mapState = AdvancedMapAnalyticsUrlStateSchema.parse(rawSearch);
  const navigate = useNavigate({ from: '/maps/editor/$mapId' });

  return (
    <MapAnalyticsEditorPage
      mapId={params.mapId}
      mapState={mapState}
      setMapState={(updater) => {
        navigate({
          search: (previousSearch) => {
            const parsedMapState = AdvancedMapAnalyticsUrlStateSchema.parse(previousSearch);

            const nextMapState =
              typeof updater === 'function'
                ? (updater as (previousState: typeof parsedMapState) => typeof parsedMapState)(
                    parsedMapState
                  )
                : updater;
            const normalizedMapState = AdvancedMapAnalyticsUrlStateSchema.parse(nextMapState);
            const preservedGlobalSearch = stripMapSearchParams(
              previousSearch as Record<string, unknown>
            );
            return {
              ...preservedGlobalSearch,
              ...normalizedMapState,
            };
          },
          replace: true,
          resetScroll: false,
        });
      }}
    />
  );
}

function stripMapSearchParams(search: Record<string, unknown>): Record<string, unknown> {
  const preservedSearch: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(search)) {
    if (MAP_SEARCH_KEYS_TO_REPLACE.has(key)) {
      continue;
    }
    preservedSearch[key] = value;
  }

  return preservedSearch;
}
