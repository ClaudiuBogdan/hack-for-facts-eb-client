import { createFileRoute, Outlet } from "@tanstack/react-router";
import { chartUrlStateSchema } from "@/schemas/chart-search";

export const Route = createFileRoute("/charts/$chartId")({
    ssr: false,
    validateSearch: chartUrlStateSchema,
    component: RouteComponent,
    // Resolve the store before entry so the first edit always sees the saved chart.
    beforeLoad: async () => {
        if (typeof window === "undefined") return { getChartsStore: undefined };
        const { getChartsStore } = await import("@/components/charts/chartsStore");
        return { getChartsStore };
    },
    onEnter: ({ context, params, search }) => {
        if (search.chart.id !== params.chartId) {
            search.chart.id = params.chartId;
        }

        context.getChartsStore?.().saveChartToLocalStorage(search.chart);

        return {
            ...search,
        }
    },
});

function RouteComponent() {
    return <Outlet />
}
