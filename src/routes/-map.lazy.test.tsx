import { fireEvent, render, screen } from "@/test/test-utils";
import type { ComponentType } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AdvancedMapAnalyticsUrlState } from "@/schemas/advanced-map-analytics";

const navigateMock = vi.fn();
const workspaceMock = vi.fn();
let search: Record<string, unknown> = {};

vi.mock("@tanstack/react-router", () => ({
  createLazyFileRoute: () => (options: Record<string, unknown>) => ({
    options,
    useSearch: () => search,
  }),
  useNavigate: () => navigateMock,
}));
vi.mock("@/lib/hooks/useUserCurrency", () => ({
  useUserCurrency: () => ["RON", vi.fn()],
}));
vi.mock("@/lib/hooks/useUserInflationAdjusted", () => ({
  useUserInflationAdjusted: () => [true, vi.fn()],
}));
vi.mock("@/components/filters/MapFilter", () => ({
  MapFilter: ({ presetMode }: { presetMode: boolean }) => (
    <div>{presetMode ? "Preset scope filters" : "Custom budget filters"}</div>
  ),
}));
vi.mock(
  "@/features/advanced-map-analytics/components/map-analytics-workspace",
  () => ({
    MapAnalyticsWorkspace: (props: {
      mapState: AdvancedMapAnalyticsUrlState;
      setMapState: (
        updater: (
          previous: AdvancedMapAnalyticsUrlState,
        ) => AdvancedMapAnalyticsUrlState,
      ) => void;
      onMapViewportChange: (viewport: {
        mapCenter: [number, number];
        mapZoom: number;
      }) => void;
    }) => {
      workspaceMock(props);
      return (
        <>
          <button
            onClick={() =>
              props.setMapState((previous) => ({
                ...previous,
                activeView: "table",
              }))
            }
          >
            Table view
          </button>
          <button
            onClick={() =>
              props.setMapState((previous) => ({
                ...previous,
                activeView: "analytics",
              }))
            }
          >
            Analytics view
          </button>
          <button
            onClick={() =>
              props.onMapViewportChange({
                mapCenter: [46.12346, 24.98765],
                mapZoom: 7.3,
              })
            }
          >
            Move map
          </button>
        </>
      );
    },
  }),
);

async function renderMap() {
  const { Route } = await import("./map.lazy");
  const Component = Route.options.component as ComponentType;
  return render(<Component />);
}
function latestWorkspace() {
  return workspaceMock.mock.calls[workspaceMock.mock.calls.length - 1]?.[0];
}
function latestNavigation() {
  return navigateMock.mock.calls[navigateMock.mock.calls.length - 1]?.[0];
}

describe("standalone advanced map route", () => {
  beforeEach(() => {
    navigateMock.mockReset();
    workspaceMock.mockReset();
    search = {};
  });
  it("uses the full read-only workspace with exact legacy geometry and view", async () => {
    search = {
      activeView: "chart",
      mapViewType: "County",
      mapCenter: [46, 24],
      mapZoom: 7,
    };
    await renderMap();
    expect(latestWorkspace()).toMatchObject({
      mode: "public",
      capabilities: { readOnly: true },
      mapState: { activeView: "analytics", mapViewType: "County" },
      mapCenterOverride: [46, 24],
      mapZoomOverride: 7,
    });
    expect(latestWorkspace().layout).toBe("standalone");
    expect(navigateMock).not.toHaveBeenCalled();
  });
  it.each([
    ["total_euro", "total"],
    ["per_capita_euro", "per_capita"],
  ] as const)(
    "preserves legacy %s links and their EUR currency",
    async (normalization, expected) => {
      search = {
        filters: { account_category: "ch", normalization, currency: "USD" },
      };
      await renderMap();
      expect(latestWorkspace().mapState.series[0].filter).toMatchObject({
        normalization: expected,
        currency: "EUR",
        inflation_adjusted: true,
      });
    },
  );
  it("respects explicit currency and disables inflation for GDP percentages", async () => {
    search = {
      filters: {
        account_category: "ch",
        normalization: "percent_gdp",
        currency: "EUR",
        inflation_adjusted: true,
      },
    };
    await renderMap();
    expect(latestWorkspace().mapState.series[0].filter).toMatchObject({
      currency: "EUR",
      inflation_adjusted: false,
    });
  });
  it("applies changed global URL controls over stored filters without remounting the page", async () => {
    search = { filters: { account_category: "ch", currency: "RON", inflation_adjusted: false } };
    const view = await renderMap();
    expect(latestWorkspace().mapState.series[0].filter).toMatchObject({currency: "RON", inflation_adjusted: false});
    search = { ...search, currency: "EUR", inflation_adjusted: "true" };
    const { Route } = await import("./map.lazy");
    const Component = Route.options.component as ComponentType;
    view.rerender(<Component />);
    expect(latestWorkspace().mapState.series[0].filter).toMatchObject({currency: "EUR", inflation_adjusted: true});
    search = { ...search, currency: "USD", inflation_adjusted: "false" };
    view.rerender(<Component />);
    expect(latestWorkspace().mapState.series[0].filter).toMatchObject({currency: "USD", inflation_adjusted: false});
  });
  it("writes table, legacy chart and viewport state without dropping scope or preset", async () => {
    search = {
      preset: "income",
      filters: { account_category: "vn", county_codes: ["CJ"] },
    };
    await renderMap();
    fireEvent.click(screen.getByRole("button", { name: "Table view" }));
    expect(latestNavigation().search(search)).toEqual({
      ...search,
      activeView: "table",
    });
    fireEvent.click(screen.getByRole("button", { name: "Analytics view" }));
    expect(latestNavigation().search(search)).toEqual({
      ...search,
      activeView: "chart",
    });
    fireEvent.click(screen.getByRole("button", { name: "Move map" }));
    expect(latestNavigation()).toMatchObject({
      replace: true,
      resetScroll: false,
    });
    expect(latestNavigation().search(search)).toEqual({
      ...search,
      mapCenter: [46.12346, 24.98765],
      mapZoom: 7.3,
    });
  });
  it("persists the selected preset and keeps its shared filters accessible", async () => {
    search = {
      preset: "income",
      mapCenter: [46, 24],
      filters: { account_category: "vn", county_codes: ["CJ"] },
    };
    await renderMap();
    fireEvent.change(
      screen.getByRole("combobox", { name: "Map configuration" }),
      { target: { value: "balance" } },
    );
    expect(latestNavigation().search(search)).toEqual({
      ...search,
      preset: "balance",
    });
    fireEvent.click(screen.getByRole("button", { name: "Filters" }));
    expect(screen.getByText("Preset scope filters")).toBeInTheDocument();
  });
});
