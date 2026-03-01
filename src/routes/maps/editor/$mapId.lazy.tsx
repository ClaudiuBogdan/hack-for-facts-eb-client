import { createLazyFileRoute, useNavigate } from '@tanstack/react-router';
import { AdvancedMapAnalyticsUrlStateSchema } from '@/schemas/advanced-map-analytics';
import { MapAnalyticsEditorPage } from '@/features/advanced-map-analytics/components/map-analytics-editor-page';
import { stripMapEditorSearchParams } from '@/features/advanced-map-analytics/map-editor-search';

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
            const preservedGlobalSearch = stripMapEditorSearchParams(
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
