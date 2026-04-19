import { fireEvent, render, screen, waitFor } from "@/test/test-utils";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CampaignAdminEntitiesPage } from "./CampaignAdminEntitiesPage";
import type {
  CampaignAdminEntityConfigDetail,
  CampaignAdminEntitiesMetaResponse,
  CampaignAdminEntitiesSearch,
  CampaignAdminEntityListItem,
} from "@/features/campaigns/buget/admin/types";

const useAuthMock = vi.fn();
const useCampaignAdminEntitiesQueryMock = vi.fn();
const useCampaignAdminEntitiesMetaQueryMock = vi.fn();
const useCampaignAdminEntityConfigListQueryMock = vi.fn();
const useCampaignAdminEntityConfigDetailQueryMock = vi.fn();
const useUpdateCampaignAdminEntityConfigMutationMock = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    ...props
  }: {
    readonly children: ReactNode;
    readonly [key: string]: unknown;
  }) => <a {...props}>{children}</a>,
}));

vi.mock("@/lib/auth", () => ({
  useAuth: () => useAuthMock(),
  AuthSignInButton: ({ children }: { readonly children: ReactNode }) => (
    <>{children}</>
  ),
}));

vi.mock(
  "@/features/campaigns/buget/admin/hooks/use-campaign-admin-entities",
  () => ({
    useCampaignAdminEntitiesQuery: (...args: unknown[]) =>
      useCampaignAdminEntitiesQueryMock(...args),
    useCampaignAdminEntitiesMetaQuery: (...args: unknown[]) =>
      useCampaignAdminEntitiesMetaQueryMock(...args),
  }),
);

vi.mock(
  "@/features/campaigns/buget/admin/hooks/use-campaign-admin-entity-config",
  () => ({
    useCampaignAdminEntityConfigListQuery: (...args: unknown[]) =>
      useCampaignAdminEntityConfigListQueryMock(...args),
    useCampaignAdminEntityConfigDetailQuery: (...args: unknown[]) =>
      useCampaignAdminEntityConfigDetailQueryMock(...args),
    useUpdateCampaignAdminEntityConfigMutation: (...args: unknown[]) =>
      useUpdateCampaignAdminEntityConfigMutationMock(...args),
  }),
);

function createEntityItem(
  overrides: Partial<CampaignAdminEntityListItem> = {},
): CampaignAdminEntityListItem {
  return {
    entityCui: "12345678",
    entityName: "Oras Test",
    userCount: 4,
    interactionCount: 11,
    pendingReviewCount: 2,
    notificationSubscriberCount: 3,
    notificationOutboxCount: 5,
    failedNotificationCount: 1,
    latestInteractionAt: "2026-04-12T10:00:00.000Z",
    latestInteractionId: "funky:interaction:public_debate_request",
    latestNotificationAt: "2026-04-12T10:30:00.000Z",
    latestNotificationType: "funky:outbox:entity_update",
    latestNotificationStatus: "failed_permanent",
    hasPendingReviews: true,
    hasSubscribers: true,
    hasNotificationActivity: true,
    hasFailedNotifications: true,
    ...overrides,
  };
}

function createMetaResponse(
  overrides: Partial<CampaignAdminEntitiesMetaResponse> = {},
): CampaignAdminEntitiesMetaResponse {
  return {
    totalEntities: 18,
    entitiesWithPendingReviews: 5,
    entitiesWithSubscribers: 7,
    entitiesWithNotificationActivity: 9,
    entitiesWithFailedNotifications: 2,
    availableInteractionTypes: [
      {
        interactionId: "funky:interaction:public_debate_request",
        label: "Public debate request",
        reviewable: true,
      },
    ],
    ...overrides,
  };
}

function createEntityConfigDetail(
  overrides: Partial<CampaignAdminEntityConfigDetail> = {},
): CampaignAdminEntityConfigDetail {
  return {
    campaignKey: "funky",
    entityCui: "12345678",
    entityName: "Oras Test",
    configured: true,
    isConfigured: true,
    values: {
      budgetPublicationDate: "2026-03-20",
      officialBudgetUrl: "https://oras.test/buget.pdf",
    },
    updatedAt: "2026-04-12T10:00:00.000Z",
    updatedByUserId: "admin-1",
    ...overrides,
  };
}

describe("CampaignAdminEntitiesPage routing", () => {
  beforeEach(() => {
    useAuthMock.mockReset();
    useCampaignAdminEntitiesQueryMock.mockReset();
    useCampaignAdminEntitiesMetaQueryMock.mockReset();
    useCampaignAdminEntityConfigListQueryMock.mockReset();
    useCampaignAdminEntityConfigDetailQueryMock.mockReset();
    useUpdateCampaignAdminEntityConfigMutationMock.mockReset();

    useAuthMock.mockReturnValue({ isLoaded: true, isSignedIn: true });
    useCampaignAdminEntitiesMetaQueryMock.mockReturnValue({
      data: createMetaResponse(),
      error: null,
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    });
    useCampaignAdminEntityConfigListQueryMock.mockReturnValue({
      data: {
        items: [],
        page: {
          limit: 50,
          totalCount: 0,
          hasMore: false,
          nextCursor: null,
          sortBy: "updatedAt",
          sortOrder: "desc",
        },
      },
      error: null,
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    });
    useCampaignAdminEntityConfigDetailQueryMock.mockReturnValue({
      data: null,
      error: null,
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    });
    useUpdateCampaignAdminEntityConfigMutationMock.mockReturnValue({
      mutateAsync: vi.fn(),
      error: null,
      isPending: false,
    });
  });

  it("drops a stale local cursor when the external route search changes", async () => {
    const entitiesQueryCalls: Array<{
      readonly filters: Record<string, unknown>;
      readonly cursor: string | null;
      readonly limit: number;
    }> = [];

    useCampaignAdminEntitiesQueryMock.mockImplementation((args) => {
      entitiesQueryCalls.push({
        filters: args.filters as Record<string, unknown>,
        cursor: args.cursor as string | null,
        limit: args.limit as number,
      });

      return {
        data: {
          items:
            args.cursor === "cursor-1"
              ? [
                  createEntityItem({
                    entityCui: "87654321",
                    entityName: "Comuna Test",
                  }),
                ]
              : [createEntityItem()],
          page: {
            hasMore: true,
            nextCursor: "cursor-1",
            sortBy: "latestInteractionAt",
            sortOrder: "desc",
          },
        },
        error: null,
        isLoading: false,
        isFetching: false,
        refetch: vi.fn(),
      };
    });

    function StatefulPage({
      initialSearch,
    }: {
      readonly initialSearch: CampaignAdminEntitiesSearch;
    }) {
      const [search, setSearch] = useState(initialSearch);

      useEffect(() => {
        setSearch(initialSearch);
      }, [initialSearch]);

      return (
        <CampaignAdminEntitiesPage
          campaignKey="funky"
          search={search}
          onSearchChange={(nextSearch) => {
            setSearch(nextSearch);
          }}
        />
      );
    }

    const { rerender } = render(
      <StatefulPage
        initialSearch={{
          sortBy: "latestInteractionAt",
          sortOrder: "desc",
          limit: 50,
        }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    await waitFor(() => {
      expect(entitiesQueryCalls[entitiesQueryCalls.length - 1]).toMatchObject({
        cursor: "cursor-1",
        filters: {
          sortBy: "latestInteractionAt",
          sortOrder: "desc",
        },
      });
    });

    const callCountBeforeExternalChange = entitiesQueryCalls.length;

    rerender(
      <StatefulPage
        initialSearch={{
          hasPendingReviews: true,
          sortBy: "latestInteractionAt",
          sortOrder: "desc",
          limit: 50,
        }}
      />,
    );

    await waitFor(() => {
      expect(entitiesQueryCalls[entitiesQueryCalls.length - 1]).toMatchObject({
        cursor: null,
        filters: {
          hasPendingReviews: true,
          sortBy: "latestInteractionAt",
          sortOrder: "desc",
        },
      });
    });

    const externalChangeCalls = entitiesQueryCalls.slice(
      callCountBeforeExternalChange,
    );
    expect(externalChangeCalls).not.toContainEqual(
      expect.objectContaining({
        cursor: "cursor-1",
        filters: expect.objectContaining({
          hasPendingReviews: true,
        }),
      }),
    );
  });

  it("resets pagination and applies header sorting when a sortable column is clicked", async () => {
    const entitiesQueryCalls: Array<{
      readonly filters: Record<string, unknown>;
      readonly cursor: string | null;
      readonly limit: number;
    }> = [];

    useCampaignAdminEntitiesQueryMock.mockImplementation((args) => {
      entitiesQueryCalls.push({
        filters: args.filters as Record<string, unknown>,
        cursor: args.cursor as string | null,
        limit: args.limit as number,
      });

      return {
        data: {
          items: [createEntityItem()],
          page: {
            hasMore: true,
            nextCursor: "cursor-1",
            sortBy: "latestInteractionAt",
            sortOrder: "desc",
          },
        },
        error: null,
        isLoading: false,
        isFetching: false,
        refetch: vi.fn(),
      };
    });

    function StatefulPage() {
      const [search, setSearch] = useState<CampaignAdminEntitiesSearch>({
        cursor: "cursor-1",
        pageIndex: 2,
        sortBy: "latestInteractionAt",
        sortOrder: "desc",
        limit: 50,
      });

      return (
        <CampaignAdminEntitiesPage
          campaignKey="funky"
          search={search}
          onSearchChange={(nextSearch) => {
            setSearch(nextSearch);
          }}
        />
      );
    }

    render(<StatefulPage />);

    fireEvent.click(screen.getByRole("button", { name: "Users sort" }));

    await waitFor(() => {
      expect(entitiesQueryCalls[entitiesQueryCalls.length - 1]).toMatchObject({
        cursor: null,
        filters: {
          sortBy: "userCount",
          sortOrder: "desc",
        },
        limit: 50,
      });
    });
  });

  it("preserves config pagination when opening and closing a config sheet", async () => {
    const entityConfigQueryCalls: Array<{
      readonly filters: Record<string, unknown>;
      readonly cursor: string | null;
      readonly limit: number;
    }> = [];

    useCampaignAdminEntitiesQueryMock.mockReturnValue({
      data: {
        items: [],
        page: {
          totalCount: 0,
          hasMore: false,
          nextCursor: null,
          sortBy: "latestInteractionAt",
          sortOrder: "desc",
        },
      },
      error: null,
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    });

    useCampaignAdminEntityConfigListQueryMock.mockImplementation((args) => {
      entityConfigQueryCalls.push({
        filters: args.filters as Record<string, unknown>,
        cursor: args.cursor as string | null,
        limit: args.limit as number,
      });

      return {
        data: {
          items: [createEntityConfigDetail()],
          page: {
            limit: 50,
            totalCount: 1,
            hasMore: false,
            nextCursor: null,
            sortBy: "updatedAt",
            sortOrder: "desc",
          },
        },
        error: null,
        isLoading: false,
        isFetching: false,
        refetch: vi.fn(),
      };
    });

    useCampaignAdminEntityConfigDetailQueryMock.mockReturnValue({
      data: createEntityConfigDetail(),
      error: null,
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    });

    function StatefulPage() {
      const [search, setSearch] = useState<CampaignAdminEntitiesSearch>({
        tab: "config",
        configCursor: "cursor-1",
        configPageIndex: 2,
        configLimit: 50,
        limit: 50,
      });

      return (
        <CampaignAdminEntitiesPage
          campaignKey="funky"
          search={search}
          onSearchChange={(nextSearch) => {
            setSearch(nextSearch);
          }}
        />
      );
    }

    render(<StatefulPage />);

    fireEvent.click(screen.getByRole("button", { name: "Open" }));

    await waitFor(() => {
      expect(
        entityConfigQueryCalls[entityConfigQueryCalls.length - 1],
      ).toMatchObject({
        cursor: "cursor-1",
        limit: 50,
      });
    });

    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    await waitFor(() => {
      expect(
        entityConfigQueryCalls[entityConfigQueryCalls.length - 1],
      ).toMatchObject({
        cursor: "cursor-1",
        limit: 50,
      });
    });
  });
});
