import { useState } from 'react';
import { Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AdvancedMapAnalyticsDescriptionModal } from '@/components/maps/advanced-map-analytics/advanced-map-analytics-description-modal';
import { MapAnalyticsWorkspace } from '@/features/advanced-map-analytics/components/map-analytics-workspace';
import {
  useMapPreviewRuntimeState,
} from '@/features/advanced-map-analytics/hooks/use-map-preview-runtime-state';
import type { PublicMapViewport } from '@/features/advanced-map-analytics/hooks/use-public-map-viewport';
import type { MapEntitySelection } from '@/features/advanced-map-analytics/types/map-entity-selection';
import type { AdvancedMapAnalyticsUrlState } from '@/schemas/advanced-map-analytics';
import type {
  Currency,
  ReportPeriodInputZ,
  SeriesConfiguration,
} from '@/schemas/charts';
import { t } from '@lingui/core/macro';

interface MapAnalyticsPublicPreviewCardProps {
  mapKey: string;
  mapDescription: string;
  mapStateDefinition: AdvancedMapAnalyticsUrlState;
  reportPeriodOverride?: ReportPeriodInputZ;
  selectedYearOverride?: number;
  reportTypeOverride?: SeriesConfiguration['filter']['report_type'];
  normalizationOverride?: 'total' | 'per_capita';
  currencyOverride?: Currency;
  inflationAdjustedOverride?: boolean;
  mapNameOverride?: string;
  mapZoomOverride?: number;
  mapCenterOverride?: [number, number];
  onMapViewportChange?: (nextViewport: PublicMapViewport) => void;
  onEntityCuiSelect?: (selection: MapEntitySelection) => void;
}

export function MapAnalyticsPublicPreviewCard({
  mapKey,
  mapDescription,
  mapStateDefinition,
  reportPeriodOverride,
  selectedYearOverride,
  reportTypeOverride,
  normalizationOverride,
  currencyOverride,
  inflationAdjustedOverride,
  mapNameOverride,
  mapZoomOverride,
  mapCenterOverride,
  onMapViewportChange,
  onEntityCuiSelect,
}: Readonly<MapAnalyticsPublicPreviewCardProps>) {
  const [isDescriptionModalOpen, setIsDescriptionModalOpen] = useState(false);
  const {
    mapState,
    setMapState,
  } = useMapPreviewRuntimeState({
    mapKey,
    mapStateDefinition,
    reportPeriodOverride,
    selectedYearOverride,
    reportTypeOverride,
    normalizationOverride,
    currencyOverride,
    inflationAdjustedOverride,
    mapNameOverride,
    forceMapActiveView: true,
    mapZoomOverride,
    mapCenterOverride,
    onMapViewportChange,
  });

  const hasMapDescription = mapDescription.trim().length > 0;

  return (
    <>
      <Card className="overflow-hidden rounded-[28px] border-border/50">
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div>
            <CardTitle className="text-xl font-black tracking-tight">
              {mapState.mapName || t`Untitled map`}
            </CardTitle>
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="shrink-0 rounded-full"
            onClick={() => setIsDescriptionModalOpen(true)}
            disabled={!hasMapDescription}
            aria-label={t`Open map description`}
          >
            <Info className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <MapAnalyticsWorkspace
            mode="public"
            layout="preview"
            mapState={mapState}
            setMapState={setMapState}
            mapDescription={mapDescription}
            capabilities={{ readOnly: true }}
            mobileControlsDefaultCollapsed={true}
            onEntityCuiSelect={onEntityCuiSelect}
          />
        </CardContent>
      </Card>

      <AdvancedMapAnalyticsDescriptionModal
        open={isDescriptionModalOpen}
        onOpenChange={setIsDescriptionModalOpen}
        description={mapDescription}
        mode="preview"
      />
    </>
  );
}
