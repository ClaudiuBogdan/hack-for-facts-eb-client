import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

const navigateMock = vi.fn();
const linkPropsSpy = vi.fn();

const useAuthMock = vi.fn();
const mapsQueryMock = vi.fn();
const mapQueryMock = vi.fn();
const snapshotsQueryMock = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  Link: (props: Record<string, unknown>) => {
    linkPropsSpy(props);
    return <a>{props.children as string}</a>;
  },
  useNavigate: () => navigateMock,
}));

vi.mock("@/lib/auth", () => ({
  useAuth: () => useAuthMock(),
  AuthSignInButton: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock(
  "@/features/advanced-map-analytics/hooks/use-advanced-map-analytics",
  () => ({
    useAdvancedMapAnalyticsMapsQuery: () => mapsQueryMock(),
    useAdvancedMapAnalyticsMapQuery: () => mapQueryMock(),
    useAdvancedMapAnalyticsSnapshotsQuery: () => snapshotsQueryMock(),
  }),
);

describe("MapAnalyticsListPage", () => {
  beforeEach(() => {
    navigateMock.mockReset();
    linkPropsSpy.mockReset();
    useAuthMock.mockReset();
    mapsQueryMock.mockReset();
    mapQueryMock.mockReset();
    snapshotsQueryMock.mockReset();

    useAuthMock.mockReturnValue({ isLoaded: true, isSignedIn: true });
    mapsQueryMock.mockReturnValue({
      isLoading: false,
      error: null,
      data: [
        {
          id: "map_1",
          title: "Map 1",
          description: null,
          state: "private",
          snapshotCount: 2,
          createdAt: "2026-03-01T10:00:00.000Z",
          updatedAt: "2026-03-01T10:00:00.000Z",
        },
      ],
    });
    mapQueryMock.mockReturnValue({
      isLoading: false,
      error: null,
      data: null,
    });
    snapshotsQueryMock.mockReturnValue({
      isLoading: false,
      error: null,
      data: {
        snapshots: [],
        page: 1,
        pageSize: 20,
        total: 0,
        hasNextPage: false,
      },
    });
  });

  it("open link strips map editor search keys and preserves global keys", async () => {
    const { MapAnalyticsListPage } = await import("./map-analytics-list-page");
    render(<MapAnalyticsListPage />);

    const openLinkProps = linkPropsSpy.mock.calls
      .map((call) => call[0] as Record<string, unknown>)
      .find((props) => props.to === "/maps/editor/$mapId");

    expect(openLinkProps).toBeDefined();
    expect(typeof openLinkProps?.search).toBe("function");
    expect(openLinkProps?.preload).toBe("intent");

    const previousSearch = {
      currency: "EUR",
      inflation_adjusted: true,
      mapName: "Old map",
      activeView: "table",
      mapCenter: [46.5, 24.5],
      mapZoom: 9,
      version: 1,
    };

    const nextSearch = (
      openLinkProps?.search as (
        search: Record<string, unknown>,
      ) => Record<string, unknown>
    )(previousSearch);

    expect(nextSearch).toEqual({
      currency: "EUR",
      inflation_adjusted: true,
    });
  });

  it("moves clone actions behind item options and removes inline delete action", async () => {
    const { MapAnalyticsListPage } = await import("./map-analytics-list-page");
    render(<MapAnalyticsListPage />);

    expect(
      screen.getByRole("button", { name: "Options for Map 1" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Manage custom data series")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Create map" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Clone latest" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Clone snapshot" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Delete" }),
    ).not.toBeInTheDocument();
  });
});
