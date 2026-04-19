import { fireEvent, render, screen } from "@/test/test-utils";
import { existsSync } from "node:fs";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const entityDetailPagePath = new URL(
  "../../../../features/campaigns/buget/admin/components/CampaignAdminEntityDetailPage.tsx",
  import.meta.url,
);
const describeIfEntityDetailPageExists = existsSync(entityDetailPagePath)
  ? describe
  : describe.skip;

const navigateMock = vi.fn();
const useParamsMock = vi.fn(() => ({
  campaignKey: "funky",
  entityCui: "12345678",
}));
const useSearchMock = vi.fn(() => ({
  tab: "threads",
  limit: 50,
  threadsStateGroup: "open",
  threadsSelectedThreadId: "thread-1",
  threadsLimit: 20,
}));
const entityDetailPageMock = vi.fn(
  ({
    campaignKey,
    entityCui,
    search,
    onSearchChange,
  }: {
    readonly campaignKey: string;
    readonly entityCui: string;
    readonly search: Record<string, unknown>;
    readonly onSearchChange: (
      search: Record<string, unknown>,
      options?: { readonly replace?: boolean },
    ) => void;
  }) => (
    <div>
      <div>{campaignKey}</div>
      <div>{entityCui}</div>
      <div>{String(search.tab)}</div>
      <button
        type="button"
        onClick={() =>
          onSearchChange(
            {
              tab: "threads",
              limit: 25,
              threadsStateGroup: "closed",
              threadsSelectedThreadId: "thread-9",
              threadsLimit: 10,
            },
            { replace: true },
          )
        }
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
  useNavigate: () => navigateMock,
}));

vi.mock(
  "@/features/campaigns/buget/admin/components/CampaignAdminEntityDetailPage",
  () => ({
    CampaignAdminEntityDetailPage: (props: unknown) =>
      entityDetailPageMock(
        props as {
          readonly campaignKey: string;
          readonly entityCui: string;
          readonly search: Record<string, unknown>;
          readonly onSearchChange: (
            search: Record<string, unknown>,
            options?: { readonly replace?: boolean },
          ) => void;
        },
      ),
  }),
);

describeIfEntityDetailPageExists("campaign entity detail lazy route", () => {
  beforeEach(() => {
    navigateMock.mockReset();
    useParamsMock.mockReset();
    useSearchMock.mockReset();
    entityDetailPageMock.mockClear();

    useParamsMock.mockReturnValue({
      campaignKey: "funky",
      entityCui: "12345678",
    });
    useSearchMock.mockReturnValue({
      tab: "threads",
      limit: 50,
      threadsStateGroup: "open",
      threadsSelectedThreadId: "thread-1",
      threadsLimit: 20,
    });
  });

  it("passes the resolved campaign key, detail search, and navigate callback", async () => {
    const { Route } = await import("./entities.$entityCui.lazy");
    const RouteComponent = Route.options.component as () => ReactNode;

    render(<RouteComponent />);

    expect(screen.getByText("funky")).toBeInTheDocument();
    expect(screen.getByText("12345678")).toBeInTheDocument();
    expect(screen.getByText("threads")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Change search" }));

    expect(entityDetailPageMock).toHaveBeenCalledWith(
      expect.objectContaining({
        campaignKey: "funky",
        entityCui: "12345678",
        search: expect.objectContaining({
          tab: "threads",
          threadsSelectedThreadId: "thread-1",
        }),
      }),
    );
    expect(navigateMock).toHaveBeenCalledWith({
      search: {
        tab: "threads",
        query: undefined,
        interactionId: undefined,
        hasPendingReviews: undefined,
        hasSubscribers: undefined,
        hasNotificationActivity: undefined,
        hasFailedNotifications: undefined,
        latestNotificationType: undefined,
        latestNotificationStatus: undefined,
        sortBy: undefined,
        sortOrder: undefined,
        cursor: undefined,
        pageIndex: undefined,
        limit: 25,
        configEntityCui: undefined,
        configUpdatedAtFrom: undefined,
        configUpdatedAtTo: undefined,
        configSortBy: undefined,
        configSortOrder: undefined,
        configCursor: undefined,
        configPageIndex: undefined,
        configLimit: undefined,
        selectedEntityCui: undefined,
        configCreate: undefined,
        threadsStateGroup: "closed",
        threadsThreadState: undefined,
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
  });
});
