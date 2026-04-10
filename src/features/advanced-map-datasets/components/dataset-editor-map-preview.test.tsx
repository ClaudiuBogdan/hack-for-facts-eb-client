import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mapPreviewRuntimeStateMock = vi.fn();
const workspaceMock = vi.fn();

vi.mock('@/features/advanced-map-analytics/hooks/use-map-preview-runtime-state', () => ({
  useMapPreviewRuntimeState: (...args: unknown[]) => mapPreviewRuntimeStateMock(...args),
}));

vi.mock('@/features/advanced-map-analytics/components/map-analytics-workspace', () => ({
  MapAnalyticsWorkspace: (props: unknown) => {
    workspaceMock(props);
    return <div data-testid="map-analytics-workspace" />;
  },
}));

describe('DatasetEditorMapPreview', () => {
  beforeEach(() => {
    mapPreviewRuntimeStateMock.mockReset();
    workspaceMock.mockReset();

    mapPreviewRuntimeStateMock.mockImplementation(({ mapStateDefinition }: { mapStateDefinition: unknown }) => ({
      mapState: mapStateDefinition,
      setMapState: vi.fn(),
    }));
  });

  it('preserves an explicit blank unit as a display override', async () => {
    const { DatasetEditorMapPreview } = await import('./dataset-editor-map-preview');

    render(
      <DatasetEditorMapPreview
        resourceKey="draft:test"
        title="Draft dataset"
        unit=""
        rows={[
          {
            uatId: '1',
            sirutaCode: '1001',
            cui: '123',
            name: 'Test UAT',
            countyName: 'Cluj',
            valueNumber: '42',
            valueJson: null,
            value: '42',
            rawValue: '42',
            valueText: '42',
            parsedNumericValue: 42,
          },
        ]}
        onSelectSirutaCode={vi.fn()}
      />
    );

    const props = workspaceMock.mock.calls[0]?.[0] as {
      localValuesBySeriesId: Map<string, Map<string, number | undefined>>;
      localUnitsBySeriesId: Map<string, string | undefined>;
      displayUnitOverridesBySeriesId: Map<string, string | null>;
    };

    const seriesId = [...props.localValuesBySeriesId.keys()][0];
    expect(seriesId).toBeDefined();
    expect(props.localValuesBySeriesId.get(seriesId)?.get('1001')).toBe(42);
    expect(props.localUnitsBySeriesId.size).toBe(0);
    expect(props.displayUnitOverridesBySeriesId.get(seriesId)).toBeNull();
  });

  it('passes the dataset unit through both local and display overrides when present', async () => {
    const { DatasetEditorMapPreview } = await import('./dataset-editor-map-preview');

    render(
      <DatasetEditorMapPreview
        resourceKey="draft:test"
        title="Draft dataset"
        unit="RON"
        rows={[]}
        onSelectSirutaCode={vi.fn()}
      />
    );

    const props = workspaceMock.mock.calls[0]?.[0] as {
      localUnitsBySeriesId: Map<string, string | undefined>;
      displayUnitOverridesBySeriesId: Map<string, string | null>;
    };

    const seriesId = [...props.displayUnitOverridesBySeriesId.keys()][0];
    expect(seriesId).toBeDefined();
    expect(props.localUnitsBySeriesId.get(seriesId)).toBe('RON');
    expect(props.displayUnitOverridesBySeriesId.get(seriesId)).toBe('RON');
  });

  it('forwards viewport overrides and change handler into preview runtime state', async () => {
    const onMapViewportChange = vi.fn();
    const { DatasetEditorMapPreview } = await import('./dataset-editor-map-preview');

    render(
      <DatasetEditorMapPreview
        resourceKey="draft:test"
        title="Draft dataset"
        unit="RON"
        rows={[]}
        mapZoomOverride={8.4}
        mapCenterOverride={[46.77, 23.59]}
        onMapViewportChange={onMapViewportChange}
        onSelectSirutaCode={vi.fn()}
      />
    );

    expect(mapPreviewRuntimeStateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        forceMapActiveView: true,
      })
    );

    expect(workspaceMock).toHaveBeenCalledWith(
      expect.objectContaining({
        mapZoomOverride: 8.4,
        mapCenterOverride: [46.77, 23.59],
        onMapViewportChange,
      })
    );
  });

  it('forwards map feature selection using the clicked natcode', async () => {
    const onSelectSirutaCode = vi.fn();
    const { DatasetEditorMapPreview } = await import('./dataset-editor-map-preview');

    render(
      <DatasetEditorMapPreview
        resourceKey="draft:test"
        title="Draft dataset"
        unit="RON"
        rows={[]}
        onSelectSirutaCode={onSelectSirutaCode}
      />
    );

    const props = workspaceMock.mock.calls[0]?.[0] as {
      onMapFeatureSelect: (properties: { natcode?: string | number | null }) => void;
    };

    props.onMapFeatureSelect({ natcode: '1005' });
    props.onMapFeatureSelect({ natcode: 2001 });
    props.onMapFeatureSelect({});

    expect(onSelectSirutaCode).toHaveBeenCalledTimes(2);
    expect(onSelectSirutaCode).toHaveBeenNthCalledWith(1, '1005');
    expect(onSelectSirutaCode).toHaveBeenNthCalledWith(2, '2001');
  });
});
