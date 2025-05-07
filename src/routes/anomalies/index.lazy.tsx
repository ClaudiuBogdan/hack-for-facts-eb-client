import { createLazyFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getAnomalies } from "@/lib/api/anomalies";
import { useAnomalyFilters } from "@/stores/anomalyFilters";
import { AnomalyFilters } from "@/components/anomalies/AnomalyFilters";
import { AnomalyCard } from "@/components/anomalies/AnomalyCard";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createLazyFileRoute("/anomalies/")({
  component: AnomaliesPage,
});

function AnomaliesPage() {
  const { filters } = useAnomalyFilters();

  const {
    data: anomalies,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["anomalies", filters],
    queryFn: () => getAnomalies({ filters }),
  });

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Anomalies</h1>
        <p className="text-muted-foreground">
          Browse and investigate public spending anomalies.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-1">
          <AnomalyFilters />
        </div>

        <div className="md:col-span-3 space-y-4">
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="rounded-lg border border-border p-4">
                  <div className="space-y-3">
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-20 w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-64 rounded-lg border border-border">
              <div className="text-center">
                <h3 className="font-medium">Error loading anomalies</h3>
                <p className="text-muted-foreground">
                  Please try again later or contact support.
                </p>
              </div>
            </div>
          ) : anomalies?.length === 0 ? (
            <div className="flex items-center justify-center h-64 rounded-lg border border-border">
              <div className="text-center">
                <h3 className="font-medium">No anomalies found</h3>
                <p className="text-muted-foreground">
                  Try adjusting your filters or check back later.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {anomalies?.map((anomaly) => (
                <AnomalyCard key={anomaly.id} anomaly={anomaly} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
