import { getHeatmapUATData, HeatmapUATDataPoint } from "@/lib/api/dataDiscovery";
import { createLazyFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import React, { useState } from "react";
import { getPercentileValues, createHeatmapStyleFunction } from "@/components/maps/utils";
import { UatMap } from "@/components/maps/UatMap";
import { UatProperties } from "@/components/maps/interfaces";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useGeoJson } from "@/hooks/useGeoJson";
import { MapFilter } from "@/components/filters/MapFilter";
import { useMapFilter } from "@/lib/hooks/useMapFilterStore";
import { MapLegend } from "@/components/maps/MapLegend";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapIcon, TableIcon, BarChart2Icon } from "lucide-react";
import { UatDataCharts } from "@/components/charts/UatDataCharts";
import {
  SortingState,
  PaginationState,
} from "@tanstack/react-table";
import { HeatmapDataTable } from "@/components/maps/HeatmapDataTable";

export const Route = createLazyFileRoute("/map")({
  component: MapPage,
});

function MapPage() {
  const { heatmapFilterInput, activeView, setActiveView } = useMapFilter();
  const navigate = useNavigate();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 15,
  });

  const {
    data: heatmapData,
    isLoading: isLoadingHeatmap,
    error: heatmapError
  } = useQuery<HeatmapUATDataPoint[], Error>({
    queryKey: ["heatmapUATData", heatmapFilterInput],
    queryFn: () => getHeatmapUATData(heatmapFilterInput),
  });

  const handleUatClick = (properties: UatProperties) => {
    const natCode = properties.natcode;
    const uatCui = heatmapData?.find((data) => data.siruta_code === natCode)?.uat_code;
    if (uatCui) {
      navigate({ to: `/entities/${uatCui}` });
    }
  };

  const {
    data: geoJsonData,
    isLoading: isLoadingGeoJson,
    error: geoJsonError
  } = useGeoJson();

  const { min: minAggregatedValue, max: maxAggregatedValue } = React.useMemo(() => {
    return getPercentileValues(heatmapData, 5, 95);
  }, [heatmapData]);

  const aDynamicGetFeatureStyle = React.useMemo(() => {
    return createHeatmapStyleFunction(heatmapData, minAggregatedValue, maxAggregatedValue);
  }, [heatmapData, minAggregatedValue, maxAggregatedValue]);

  const isLoading = isLoadingHeatmap || isLoadingGeoJson;
  const error = heatmapError || geoJsonError;

  let loadingText = "Loading data...";
  if (isLoadingHeatmap && isLoadingGeoJson) {
    loadingText = "Loading map and heatmap data...";
  } else if (isLoadingHeatmap) {
    loadingText = "Loading heatmap data...";
  } else if (isLoadingGeoJson) {
    loadingText = "Loading map data...";
  }

  return (
    <div className="flex flex-row h-screen bg-background">
      <div className="w-[360px] flex-shrink-0 border-r border-border bg-card text-card-foreground overflow-y-auto">
        <MapFilter />
      </div>
      <div className="flex-grow flex flex-col relative">
        <Tabs
          value={activeView}
          onValueChange={(value) => setActiveView(value as "map" | "table" | "chart")}
          className="flex flex-col flex-grow"
        >
          <TabsList className="absolute top-4 right-16 z-1000 bg-card/90 backdrop-blur-sm p-1 rounded-lg shadow-md">
            <TabsTrigger value="map">
              <MapIcon className="h-4 w-4 mr-2" />
              Map
            </TabsTrigger>
            <TabsTrigger value="table">
              <TableIcon className="h-4 w-4 mr-2" />
              Table
            </TabsTrigger>
            <TabsTrigger value="chart">
              <BarChart2Icon className="h-4 w-4 mr-2" />
              Chart
            </TabsTrigger>
          </TabsList>

          <div className="h-full w-full pt-0">
            {isLoading && !heatmapData ? (
              <div className="flex items-center justify-center h-full w-full" aria-live="polite" aria-busy="true">
                <LoadingSpinner size="lg" text={loadingText} />
              </div>
            ) : error ? (
              <div className="p-4 text-center text-red-500">Error loading data: {error.message}</div>
            ) : !geoJsonData ? (
              <div className="p-4 text-center">Map data not available.</div>
            ) : (
              <>
                <TabsContent value="map" className="h-full w-full m-0 data-[state=inactive]:hidden outline-none ring-0 focus:ring-0 focus-visible:ring-0">
                  <UatMap
                    onUatClick={handleUatClick}
                    getFeatureStyle={aDynamicGetFeatureStyle}
                    heatmapData={heatmapData ?? []}
                    geoJsonData={geoJsonData}
                  />
                  <MapLegend
                    min={minAggregatedValue}
                    max={maxAggregatedValue}
                    className="absolute bottom-4 right-4 z-[1000]"
                    title="Aggregated Value Legend"
                  />
                </TabsContent>
                <TabsContent value="table" className="h-full w-full m-0 data-[state=inactive]:hidden outline-none ring-0 focus:ring-0 focus-visible:ring-0">
                  <div className="p-4 h-full flex flex-col">
                    <h2 className="text-xl font-semibold mb-4 mt-12 shrink-0">Data Table View</h2>
                    {heatmapData ? (
                      <HeatmapDataTable
                        data={heatmapData ?? []}
                        isLoading={isLoadingHeatmap}
                        sorting={sorting}
                        setSorting={setSorting}
                        pagination={pagination}
                        setPagination={setPagination}
                      />
                    ) : isLoadingHeatmap ? (
                      <div className="flex items-center justify-center h-full">
                        <LoadingSpinner size="md" text="Loading table data..." />
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <p className="text-muted-foreground">No data available for the table.</p>
                      </div>
                    )}
                  </div>
                </TabsContent>
                <TabsContent value="chart" className="h-full w-full m-0 data-[state=inactive]:hidden outline-none ring-0 focus:ring-0 focus-visible:ring-0">
                  <div className="h-full w-full p-4 overflow-y-auto mt-12">
                    {heatmapData && geoJsonData ? (
                      <UatDataCharts data={heatmapData} />
                    ) : (
                      <p className="text-center text-muted-foreground">Chart data is loading or not available.</p>
                    )}
                  </div>
                </TabsContent>
              </>
            )}
          </div>
        </Tabs>
      </div>
    </div>
  );
}