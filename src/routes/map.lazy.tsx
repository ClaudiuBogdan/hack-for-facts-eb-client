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
import { MapIcon, TableIcon, BarChart2Icon, Filter as FilterIcon, X, HelpCircleIcon } from "lucide-react";
import { UatDataCharts } from "@/components/charts/UatDataCharts";
import {
  SortingState,
  PaginationState,
} from "@tanstack/react-table";
import { HeatmapDataTable } from "@/components/maps/HeatmapDataTable";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";

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
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isLegendModalOpen, setIsLegendModalOpen] = useState(false);

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
    <div className="flex flex-col md:flex-row md:h-screen bg-background">
      <div className="hidden md:flex md:flex-col w-[320px] lg:w-[360px] flex-shrink-0 border-r border-border bg-card text-card-foreground overflow-y-auto">
        <MapFilter />
      </div>
      <div className="flex-grow flex flex-col relative">
        <Tabs
          value={activeView}
          onValueChange={(value) => setActiveView(value as "map" | "table" | "chart")}
          className="flex flex-col flex-grow"
        >
          <TabsList className="m-2 md:m-4 md:ml-auto md:mr-4 p-1 rounded-lg shadow-md bg-card/90 backdrop-blur-sm overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
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

          <div className="flex-grow overflow-hidden">
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
                <TabsContent value="map" className="h-full w-full m-0 data-[state=inactive]:hidden outline-none ring-0 focus:ring-0 focus-visible:ring-0 relative">
                  <UatMap
                    onUatClick={handleUatClick}
                    getFeatureStyle={aDynamicGetFeatureStyle}
                    heatmapData={heatmapData ?? []}
                    geoJsonData={geoJsonData}
                  />
                  <MapLegend
                    min={minAggregatedValue}
                    max={maxAggregatedValue}
                    className="absolute bottom-4 right-4 z-10 hidden md:block"
                    title="Aggregated Value Legend"
                  />
                  <Dialog open={isLegendModalOpen} onOpenChange={setIsLegendModalOpen}>
                    <DialogTrigger asChild>
                      <Button
                        variant="secondary"
                        size="icon"
                        className="absolute top-4 right-4 md:hidden rounded-full shadow-lg w-14 h-14 z-50"
                      >
                        <HelpCircleIcon className="w-6 h-6" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent hideCloseButton={true} className="p-0 m-0 w-full max-w-full h-full max-h-full sm:h-[calc(100%-2rem)] sm:max-h-[calc(100%-2rem)] sm:w-[calc(100%-2rem)] sm:max-w-md sm:rounded-lg flex flex-col">
                      <DialogHeader className="p-4 border-b flex flex-row justify-between items-center shrink-0">
                        <DialogTitle className="text-lg font-semibold">Legend</DialogTitle>
                        <DialogClose asChild>
                          <Button variant="ghost" size="icon" className="rounded-full">
                            <X className="h-5 w-5" />
                          </Button>
                        </DialogClose>
                      </DialogHeader>
                      <div className="p-4 overflow-y-auto">
                        <MapLegend
                          min={minAggregatedValue}
                          max={maxAggregatedValue}
                          title="Aggregated Value Legend"
                          isInModal={true}
                        />
                      </div>
                    </DialogContent>
                  </Dialog>
                </TabsContent>
                <TabsContent value="table" className="h-full w-full m-0 data-[state=inactive]:hidden outline-none ring-0 focus:ring-0 focus-visible:ring-0">
                  <div className="p-4 h-full flex flex-col">
                    <h2 className="text-xl font-semibold mb-4 shrink-0">Data Table View</h2>
                    <div className="flex-grow overflow-x-auto w-screen">
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
                  </div>
                </TabsContent>
                <TabsContent value="chart" className="h-full w-full m-0 data-[state=inactive]:hidden outline-none ring-0 focus:ring-0 focus-visible:ring-0">
                  <div className="h-full w-full p-4 overflow-y-auto">
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

      <div className="md:hidden fixed right-6 bottom-[5.75rem] z-50 flex flex-col items-end gap-3">

        <Dialog open={isFilterModalOpen} onOpenChange={setIsFilterModalOpen}>
          <DialogTrigger asChild>
            <Button
              variant="default"
              size="icon"
              className="rounded-full shadow-lg w-14 h-14"
            >
              <FilterIcon className="w-6 h-6" />
            </Button>
          </DialogTrigger>
          <DialogContent hideCloseButton={true} className="p-0 m-0 w-full max-w-full h-full max-h-full sm:h-[calc(100%-2rem)] sm:max-h-[calc(100%-2rem)] sm:w-[calc(100%-2rem)] sm:max-w-md sm:rounded-lg flex flex-col">
            <DialogHeader className="p-4 border-b flex flex-row justify-between items-center shrink-0">
              <DialogTitle className="text-lg font-semibold">Filters</DialogTitle>
              <DialogClose asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <X className="h-5 w-5" />
                </Button>
              </DialogClose>
            </DialogHeader>
            <div className="flex-grow overflow-y-auto">
              <MapFilter />
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}