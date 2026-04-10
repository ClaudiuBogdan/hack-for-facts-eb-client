import { createLazyFileRoute, useNavigate } from '@tanstack/react-router';
import { useCallback } from 'react';
import { usePublicMapViewportUrlSync } from '@/features/advanced-map-analytics/hooks/use-public-map-viewport';
import { AdvancedMapDatasetEditorPage } from '@/features/advanced-map-datasets/components/dataset-editor-page';
import { readDatasetEditorValuesView } from '@/features/advanced-map-datasets/utils/dataset-editor-route-search';

export const Route = createLazyFileRoute('/maps/datasets/$datasetId')({
  component: DatasetDetailRouteComponent,
});

function DatasetDetailRouteComponent() {
  const params = Route.useParams();
  const rawSearch = Route.useSearch();
  const navigate = useNavigate({ from: '/maps/datasets/$datasetId' });
  const valuesView = readDatasetEditorValuesView(rawSearch);

  const updateDatasetSearch = useCallback(
    (searchUpdater: (previousSearch: Record<string, unknown>) => Record<string, unknown>) => {
      navigate({
        search: searchUpdater,
        replace: true,
        resetScroll: false,
      });
    },
    [navigate]
  );

  const { mapZoomOverride, mapCenterOverride, onMapViewportChange } = usePublicMapViewportUrlSync({
    rawSearch,
    updatePublicMapSearch: updateDatasetSearch,
  });

  const handleValuesViewChange = useCallback(
    (nextValuesView: 'table' | 'map') => {
      updateDatasetSearch((previousSearch) => {
        if (previousSearch.valuesView === nextValuesView) {
          return previousSearch;
        }

        return {
          ...previousSearch,
          valuesView: nextValuesView,
        };
      });
    },
    [updateDatasetSearch]
  );

  return (
    <AdvancedMapDatasetEditorPage
      mode="edit"
      resourceKey={`dataset:${params.datasetId}`}
      datasetId={params.datasetId}
      valuesView={valuesView}
      onValuesViewChange={handleValuesViewChange}
      mapZoomOverride={mapZoomOverride}
      mapCenterOverride={mapCenterOverride}
      onMapViewportChange={onMapViewportChange}
    />
  );
}
