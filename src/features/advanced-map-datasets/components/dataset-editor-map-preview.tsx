import { readMapDecimal } from '@/lib/map-series/decimal';
import { useMemo } from 'react';
import { t } from '@lingui/core/macro';
import { MapAnalyticsWorkspace } from '@/features/advanced-map-analytics/components/map-analytics-workspace';
import { useMapPreviewRuntimeState } from '@/features/advanced-map-analytics/hooks/use-map-preview-runtime-state';
import type { PublicMapViewport } from '@/features/advanced-map-analytics/hooks/use-public-map-viewport';
import {
  AdvancedMapAnalyticsUrlStateSchema,
  type AdvancedMapAnalyticsUrlState,
} from '@/schemas/advanced-map-analytics';
import type { AdvancedMapDatasetDraftRow } from '@/features/advanced-map-datasets/types';

const DATASET_PREVIEW_SERIES_ID = 'dataset-draft-preview-series';
const DATASET_PREVIEW_BINS_ID = 'dataset-draft-preview-bins';

interface DatasetEditorMapPreviewProps {
  resourceKey: string;
  title: string;
  unit: string;
  rows: AdvancedMapDatasetDraftRow[];
  mapZoomOverride?: number;
  mapCenterOverride?: [number, number];
  onMapViewportChange?: (nextViewport: PublicMapViewport) => void;
  onSelectSirutaCode: (sirutaCode: string) => void;
}

function createDatasetPreviewMapState(
  title: string,
  unit: string
): AdvancedMapAnalyticsUrlState {
  const resolvedTitle = title.trim() || t`Dataset map preview`;
  const resolvedSeriesLabel = title.trim() || t`Dataset values`;
  const resolvedLegendTitle = title.trim() || t`Values`;
  const resolvedNoDataLabel = t`No data`;

  return AdvancedMapAnalyticsUrlStateSchema.parse({
    mapName: resolvedTitle,
    activeSeriesId: DATASET_PREVIEW_SERIES_ID,
    activeView: 'map',
    mapLayers: {
      countyBoundaries: true,
    },
    series: [
      {
        id: DATASET_PREVIEW_SERIES_ID,
        type: 'geojson-dataset-series',
        enabled: true,
        label: resolvedSeriesLabel,
        unit,
        datasetKey: 'insPop2021',
        countyFilterIds: [],
        regionFilterIds: [],
        config: {
          showDataLabels: false,
          color: '#2563eb',
        },
      },
    ],
    binsPresets: [
      {
        id: DATASET_PREVIEW_BINS_ID,
        label: t`Gradient`,
        config: {
          title: resolvedLegendTitle,
          intervalMode: 'continuous',
          colorMode: 'gradient',
          gradient: {
            startColor: '#fff7bc',
            endColor: '#d7301f',
          },
          noData: {
            label: resolvedNoDataLabel,
            color: '#d1d5db',
            showInTooltip: true,
          },
        },
      },
    ],
    activeBinPresetId: DATASET_PREVIEW_BINS_ID,
  });
}

export function DatasetEditorMapPreview({
  resourceKey,
  title,
  unit,
  rows,
  mapZoomOverride,
  mapCenterOverride,
  onMapViewportChange,
  onSelectSirutaCode,
}: Readonly<DatasetEditorMapPreviewProps>) {
  const mapStateDefinition = useMemo(
    () => createDatasetPreviewMapState(title, unit),
    [title, unit]
  );
  const { mapState, setMapState } = useMapPreviewRuntimeState({
    mapKey: `dataset-editor-map-preview:${resourceKey}`,
    mapStateDefinition,
    forceMapActiveView: true,
  });

  const localValuesBySeriesId = useMemo(() => {
    const vector = new Map<string, string | undefined>();

    for (const row of rows) {
      const value = readMapDecimal(row.valueNumber ?? row.valueText) ?? readMapDecimal(row.parsedNumericValue);
      if (value !== undefined) vector.set(row.sirutaCode, value);
    }

    return new Map([[DATASET_PREVIEW_SERIES_ID, vector]]);
  }, [rows]);

  const localUnitsBySeriesId = useMemo(
    () => {
      const trimmedUnit = unit.trim();
      return trimmedUnit.length > 0
        ? new Map([[DATASET_PREVIEW_SERIES_ID, trimmedUnit]])
        : new Map<string, string | undefined>();
    },
    [unit]
  );

  const displayUnitOverridesBySeriesId = useMemo(
    () =>
      new Map<string, string | null>([
        [DATASET_PREVIEW_SERIES_ID, unit.trim().length > 0 ? unit.trim() : null],
      ]),
    [unit]
  );

  return (
    <MapAnalyticsWorkspace
      mode="owner"
      layout="preview"
      mapState={mapState}
      setMapState={setMapState}
      mapDescription=""
      capabilities={{ readOnly: true }}
      previewContainerClassName="h-[28rem] sm:h-[34rem]"
      localValuesBySeriesId={localValuesBySeriesId}
      localUnitsBySeriesId={localUnitsBySeriesId}
      displayUnitOverridesBySeriesId={displayUnitOverridesBySeriesId}
      mapZoomOverride={mapZoomOverride}
      mapCenterOverride={mapCenterOverride}
      onMapViewportChange={onMapViewportChange}
      onMapFeatureSelect={(properties) => {
        const sirutaCode = String(properties.natcode ?? '').trim();
        if (sirutaCode.length === 0) {
          return;
        }

        onSelectSirutaCode(sirutaCode);
      }}
    />
  );
}
