import { createLazyFileRoute, useNavigate } from '@tanstack/react-router';
import { useCallback, useEffect } from 'react';
import { t } from '@lingui/core/macro';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { usePublicMapViewportUrlSync } from '@/features/advanced-map-analytics/hooks/use-public-map-viewport';
import { AdvancedMapDatasetEditorPage } from '@/features/advanced-map-datasets/components/dataset-editor-page';
import {
  readDatasetEditorSearchString,
  readDatasetEditorValuesView,
} from '@/features/advanced-map-datasets/utils/dataset-editor-route-search';

export const Route = createLazyFileRoute('/maps/datasets/new')({
  component: NewDatasetRouteComponent,
});

function NewDatasetRouteComponent() {
  const navigate = useNavigate({ from: '/maps/datasets/new' });
  const rawSearch = Route.useSearch();
  const draftId = readDatasetEditorSearchString(rawSearch, 'draftId')?.trim() ?? '';
  const cloneRef = readDatasetEditorSearchString(rawSearch, 'cloneRef');
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

  useEffect(() => {
    if (draftId.length > 0) {
      return;
    }

    navigate({
      to: '/maps/datasets/new',
      search: (previousSearch) => ({
        ...previousSearch,
        draftId: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
      }),
      replace: true,
    });
  }, [draftId, navigate]);

  if (draftId.length === 0) {
    return (
      <div className="container mx-auto py-12">
        <LoadingSpinner text={t`Preparing data series draft...`} />
      </div>
    );
  }

  return (
    <AdvancedMapDatasetEditorPage
      mode="new"
      resourceKey={`draft:${draftId}`}
      cloneRef={cloneRef}
      valuesView={valuesView}
      onValuesViewChange={handleValuesViewChange}
      mapZoomOverride={mapZoomOverride}
      mapCenterOverride={mapCenterOverride}
      onMapViewportChange={onMapViewportChange}
    />
  );
}
