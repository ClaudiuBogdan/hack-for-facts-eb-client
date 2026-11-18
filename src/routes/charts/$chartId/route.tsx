import { createFileRoute, Outlet } from "@tanstack/react-router";
import { chartUrlStateSchema } from "@/schemas/chart-search";

type GetChartsStore = typeof import("@/components/charts/chartsStore").getChartsStore;

/** The charts store, once loaded: the loader brings it alongside the editor's code, so entering never waits on it. */
let getChartsStore: GetChartsStore | undefined;

export const Route = createFileRoute("/charts/$chartId")({
    ssr: false,
    validateSearch: chartUrlStateSchema,
    component: RouteComponent,
    // In parallel with the editor's chunk, and only until the store has arrived: an edit (a search change) does not wait on it.
    loader: async () => {
        if (getChartsStore || typeof window === "undefined") return;
        ({ getChartsStore } = await import("@/components/charts/chartsStore"));
    },
    // After the loader: the URL's chart is saved before the first edit. A preload never saves.
    onEnter: ({ params, search }) => {
        if (search.chart.id !== params.chartId) {
            search.chart.id = params.chartId;
        }

        getChartsStore?.().saveChartToLocalStorage(search.chart);

        return {
            ...search,
        }
    },
});

function RouteComponent() {
    return <Outlet />
}
