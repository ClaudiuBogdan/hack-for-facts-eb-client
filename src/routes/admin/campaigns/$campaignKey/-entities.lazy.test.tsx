import { fireEvent, render, screen } from "@/test/test-utils";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const navigateMock = vi.fn();
const useParamsMock = vi.fn(() => ({ campaignKey: "funky" }));
const useSearchMock = vi.fn(() => ({
  tab: "overview",
  sortBy: "latestInteractionAt",
  sortOrder: "desc",
  limit: 50,
}));
const useLocationMock = vi.fn(() => ({
  pathname: "/admin/campaigns/funky/entities",
}));
const entitiesPageMock = vi.fn(
  ({
    campaignKey,
    search,
    onSearchChange,
  }: {
    readonly campaignKey: string;
    readonly search: Record<string, unknown>;
    readonly onSearchChange: (
      search: Record<string, unknown>,
      options?: { readonly replace?: boolean },
    ) => void;
  }) => (
    <div>
      <div>{campaignKey}</div>
      <div>{String(search.sortBy)}</div>
      <button
        type="button"
        onClick={() => {
          onSearchChange(
            {
              tab: "config",
              query: "Oras Test",
              sortBy: "userCount",
              sortOrder: "asc",
              limit: 25,
              configEntityCui: "12345678",
              configSortBy: "updatedAt",
              configSortOrder: "desc",
              configLimit: 25,
              selectedEntityCui: "12345678",
              threadsStateGroup: "open",
              threadsThreadState: "pending",
              threadsSelectedThreadId: "thread-9",
              threadsLimit: 10,
            },
            { replace: true },
          );
        }}
      >
        Change search
      </button>
    </div>
  ),
);

vi.mock("@tanstack/react-router", () => ({
  createLazyFileRoute: () => (options: Record<string, unknown>) => ({
    ...options,
    options,
    useParams: useParamsMock,
    useSearch: useSearchMock,
  }),
  Outlet: () => <div>Entity detail outlet</div>,
  useLocation: () => useLocationMock(),
  useNavigate: () => navigateMock,
}));

vi.mock(
  "@/features/campaigns/buget/admin/components/CampaignAdminEntitiesPage",
  () => ({
    CampaignAdminEntitiesPage: (props: unknown) =>
      entitiesPageMock(
        props as {
          readonly campaignKey: string;
          readonly search: Record<string, unknown>;
          readonly onSearchChange: (
            search: Record<string, unknown>,
            options?: { readonly replace?: boolean },
          ) => void;
        },
      ),
  }),
);

describe("campaign entities lazy route", () => {
  beforeEach(() => {
    navigateMock.mockReset();
    useLocationMock.mockReset();
    entitiesPageMock.mockClear();

    useLocationMock.mockReturnValue({
      pathname: "/admin/campaigns/funky/entities",
    });
  });

  it("passes the resolved campaign key and routes search changes through navigate", async () => {
    const { Route } = await import("./entities.lazy");
    const RouteComponent = Route.options.component as () => ReactNode;

    render(<RouteComponent />);

    expect(screen.getByText("funky")).toBeInTheDocument();
    expect(screen.getByText("latestInteractionAt")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Change search" }));

    expect(navigateMock).toHaveBeenCalledWith({
      search: {
        query: "Oras Test",
        interactionId: undefined,
        hasPendingReviews: undefined,
        hasSubscribers: undefined,
        hasNotificationActivity: undefined,
        hasFailedNotifications: undefined,
        latestNotificationType: undefined,
        latestNotificationStatus: undefined,
        tab: "config",
        sortBy: "userCount",
        sortOrder: "asc",
        cursor: undefined,
        pageIndex: undefined,
        limit: 25,
        configEntityCui: "12345678",
        configUpdatedAtFrom: undefined,
        configUpdatedAtTo: undefined,
        configSortBy: "updatedAt",
        configSortOrder: "desc",
        configCursor: undefined,
        configPageIndex: undefined,
        configLimit: 25,
        selectedEntityCui: "12345678",
        threadsStateGroup: "open",
        threadsThreadState: "pending",
        threadsResponseStatus: undefined,
        threadsQuery: undefined,
        threadsEntityCui: undefined,
        threadsUpdatedAtFrom: undefined,
        threadsUpdatedAtTo: undefined,
        threadsLatestResponseAtFrom: undefined,
        threadsLatestResponseAtTo: undefined,
        threadsSelectedThreadId: "thread-9",
        threadsCursor: undefined,
        threadsPageIndex: undefined,
        threadsLimit: 10,
      },
      replace: true,
    });
    expect(entitiesPageMock).toHaveBeenCalled();
  });

  it("renders the outlet for nested entity detail routes", async () => {
    useLocationMock.mockReturnValue({
      pathname: "/admin/campaigns/funky/entities/12345678",
    });

    const { Route } = await import("./entities.lazy");
    const RouteComponent = Route.options.component as () => ReactNode;

    render(<RouteComponent />);

    expect(screen.getByText("Entity detail outlet")).toBeInTheDocument();
    expect(entitiesPageMock).not.toHaveBeenCalled();
    expect(navigateMock).not.toHaveBeenCalled();
  });
});
