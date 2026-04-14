import { fireEvent, render, screen, waitFor } from "@/test/test-utils";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CampaignAdminNotificationsPage } from "./CampaignAdminNotificationsPage";
import type {
  CampaignAdminNotificationsSearch,
  CampaignAdminNotificationListItem,
} from "@/features/campaigns/buget/admin/types";

const useAuthMock = vi.fn();
const useCampaignAdminNotificationsAuditQueryMock = vi.fn();
const useCampaignAdminNotificationTriggersQueryMock = vi.fn();
const useCampaignAdminNotificationTemplatesQueryMock = vi.fn();
const useCampaignAdminNotificationTemplatePreviewQueryMock = vi.fn();
const useExecuteCampaignAdminNotificationTriggerMutationMock = vi.fn();
const useExecuteCampaignAdminNotificationTriggerBulkMutationMock = vi.fn();

vi.mock("@/lib/auth", () => ({
  useAuth: () => useAuthMock(),
  AuthSignInButton: ({ children }: { readonly children: ReactNode }) => (
    <>{children}</>
  ),
}));

vi.mock(
  "@/features/campaigns/buget/admin/hooks/use-campaign-admin-notifications",
  () => ({
    useCampaignAdminNotificationsAuditQuery: (...args: unknown[]) =>
      useCampaignAdminNotificationsAuditQueryMock(...args),
    useCampaignAdminNotificationTriggersQuery: (...args: unknown[]) =>
      useCampaignAdminNotificationTriggersQueryMock(...args),
    useCampaignAdminNotificationTemplatesQuery: (...args: unknown[]) =>
      useCampaignAdminNotificationTemplatesQueryMock(...args),
    useCampaignAdminNotificationTemplatePreviewQuery: (...args: unknown[]) =>
      useCampaignAdminNotificationTemplatePreviewQueryMock(...args),
    useExecuteCampaignAdminNotificationTriggerMutation: (...args: unknown[]) =>
      useExecuteCampaignAdminNotificationTriggerMutationMock(...args),
    useExecuteCampaignAdminNotificationTriggerBulkMutation: (...args: unknown[]) =>
      useExecuteCampaignAdminNotificationTriggerBulkMutationMock(...args),
  }),
);

function createAuditItem(
  overrides: Partial<CampaignAdminNotificationListItem> = {},
): CampaignAdminNotificationListItem {
  return {
    outboxId: "outbox-1",
    campaignKey: "funky",
    notificationType: "funky:outbox:entity_update",
    templateId: "public_debate_entity_update",
    templateName: "Entity update",
    templateVersion: "3",
    status: "delivered",
    createdAt: "2026-04-12T08:00:00.000Z",
    sentAt: "2026-04-12T08:02:00.000Z",
    attemptCount: 1,
    safeError: {
      category: null,
      code: null,
    },
    projection: {
      kind: "public_debate_entity_update",
      userId: "user-1",
      entityCui: "12345678",
      entityName: "Oras Test",
      threadId: "thread-1",
      threadKey: "thread-key-1",
      eventType: "reply_received",
      phase: "awaiting_reply",
      replyEntryId: null,
      basedOnEntryId: null,
      resolutionCode: null,
      triggerSource: "campaign_admin",
    },
    ...overrides,
  };
}

describe("CampaignAdminNotificationsPage routing", () => {
  beforeEach(() => {
    useAuthMock.mockReset();
    useCampaignAdminNotificationsAuditQueryMock.mockReset();
    useCampaignAdminNotificationTriggersQueryMock.mockReset();
    useCampaignAdminNotificationTemplatesQueryMock.mockReset();
    useCampaignAdminNotificationTemplatePreviewQueryMock.mockReset();
    useExecuteCampaignAdminNotificationTriggerMutationMock.mockReset();
    useExecuteCampaignAdminNotificationTriggerBulkMutationMock.mockReset();

    useAuthMock.mockReturnValue({ isLoaded: true, isSignedIn: true });
    useCampaignAdminNotificationTriggersQueryMock.mockReturnValue({
      data: [],
      error: null,
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    });
    useCampaignAdminNotificationTemplatesQueryMock.mockReturnValue({
      data: [],
      error: null,
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    });
    useCampaignAdminNotificationTemplatePreviewQueryMock.mockReturnValue({
      data: undefined,
      error: null,
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    });
    useExecuteCampaignAdminNotificationTriggerMutationMock.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });
    useExecuteCampaignAdminNotificationTriggerBulkMutationMock.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });
  });

  it("drops a stale local cursor when the external route search changes", async () => {
    const auditQueryCalls: Array<{
      readonly filters: Record<string, unknown>;
      readonly cursor: string | null;
      readonly limit: number;
    }> = [];

    useCampaignAdminNotificationsAuditQueryMock.mockImplementation((args) => {
      auditQueryCalls.push({
        filters: args.filters as Record<string, unknown>,
        cursor: args.cursor as string | null,
        limit: args.limit as number,
      });

      return {
        data: {
          items:
            args.cursor === "cursor-1"
              ? [
                  createAuditItem({
                    outboxId: "outbox-2",
                    projection: {
                      kind: "public_debate_entity_update",
                      userId: "user-2",
                      entityCui: "87654321",
                      entityName: "Comuna Test",
                      threadId: "thread-2",
                      threadKey: "thread-key-2",
                      eventType: "thread_failed",
                      phase: "failed",
                      replyEntryId: null,
                      basedOnEntryId: null,
                      resolutionCode: null,
                      triggerSource: "campaign_admin",
                    },
                  }),
                ]
              : [createAuditItem()],
          page: {
            hasMore: true,
            nextCursor: "cursor-1",
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
      readonly initialSearch: CampaignAdminNotificationsSearch;
    }) {
      const [search, setSearch] = useState(initialSearch);

      useEffect(() => {
        setSearch(initialSearch);
      }, [initialSearch]);

      return (
        <CampaignAdminNotificationsPage
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
          tab: "audit",
          sortBy: "createdAt",
          sortOrder: "desc",
          limit: 50,
        }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    await waitFor(() => {
      expect(auditQueryCalls[auditQueryCalls.length - 1]).toMatchObject({
        cursor: "cursor-1",
        filters: {},
      });
    });

    const callCountBeforeExternalChange = auditQueryCalls.length;

    rerender(
      <StatefulPage
        initialSearch={{
          tab: "audit",
          entityCui: "87654321",
          sortBy: "createdAt",
          sortOrder: "desc",
          limit: 50,
        }}
      />,
    );

    await waitFor(() => {
      expect(auditQueryCalls[auditQueryCalls.length - 1]).toMatchObject({
        cursor: null,
        filters: {
          entityCui: "87654321",
          sortBy: "createdAt",
          sortOrder: "desc",
        },
      });
    });

    const externalChangeCalls = auditQueryCalls.slice(
      callCountBeforeExternalChange,
    );
    expect(externalChangeCalls).not.toContainEqual(
      expect.objectContaining({
        cursor: "cursor-1",
        filters: expect.objectContaining({
          entityCui: "87654321",
        }),
      }),
    );
  });

  it("resets pagination and applies header sorting when a sortable column is clicked", async () => {
    const auditQueryCalls: Array<{
      readonly filters: Record<string, unknown>;
      readonly cursor: string | null;
      readonly limit: number;
    }> = [];

    useCampaignAdminNotificationsAuditQueryMock.mockImplementation((args) => {
      auditQueryCalls.push({
        filters: args.filters as Record<string, unknown>,
        cursor: args.cursor as string | null,
        limit: args.limit as number,
      });

      return {
        data: {
          items: [createAuditItem()],
          page: {
            hasMore: false,
            nextCursor: null,
          },
        },
        error: null,
        isLoading: false,
        isFetching: false,
        refetch: vi.fn(),
      };
    });

    function StatefulPage() {
      const [search, setSearch] = useState<CampaignAdminNotificationsSearch>({
        tab: "audit",
        cursor: "cursor-1",
        pageIndex: 2,
        sortBy: "createdAt",
        sortOrder: "desc",
        limit: 50,
      });

      return (
        <CampaignAdminNotificationsPage
          campaignKey="funky"
          search={search}
          onSearchChange={(nextSearch) => {
            setSearch(nextSearch);
          }}
        />
      );
    }

    render(<StatefulPage />);

    fireEvent.click(screen.getByRole("button", { name: "Status sort" }));

    await waitFor(() => {
      expect(auditQueryCalls[auditQueryCalls.length - 1]).toMatchObject({
        cursor: null,
        filters: {
          sortBy: "status",
          sortOrder: "asc",
        },
      });
    });
  });

  it("recovers from a stale audit cursor by clearing pagination state after a 400", async () => {
    const auditQueryCalls: Array<{
      readonly filters: Record<string, unknown>;
      readonly cursor: string | null;
      readonly limit: number;
    }> = [];

    useCampaignAdminNotificationsAuditQueryMock.mockImplementation((args) => {
      auditQueryCalls.push({
        filters: args.filters as Record<string, unknown>,
        cursor: args.cursor as string | null,
        limit: args.limit as number,
      });

      if (args.cursor) {
        return {
          data: undefined,
          error: {
            status: 400,
            message: "Invalid campaign notification cursor",
          },
          isLoading: false,
          isFetching: false,
          refetch: vi.fn(),
        };
      }

      return {
        data: {
          items: [createAuditItem()],
          page: {
            hasMore: false,
            nextCursor: null,
          },
        },
        error: null,
        isLoading: false,
        isFetching: false,
        refetch: vi.fn(),
      };
    });

    function StatefulPage() {
      const [search, setSearch] = useState<CampaignAdminNotificationsSearch>({
        tab: "audit",
        cursor: "cursor-1",
        pageIndex: 2,
        sortBy: "createdAt",
        sortOrder: "desc",
        limit: 50,
      });

      return (
        <CampaignAdminNotificationsPage
          campaignKey="funky"
          search={search}
          onSearchChange={(nextSearch) => {
            setSearch(nextSearch);
          }}
        />
      );
    }

    render(<StatefulPage />);

    await waitFor(() => {
      expect(auditQueryCalls[auditQueryCalls.length - 1]).toMatchObject({
        cursor: null,
        filters: {
          sortBy: "createdAt",
          sortOrder: "desc",
        },
      });
    });

    expect(
      screen.queryByText("Invalid campaign notification cursor"),
    ).not.toBeInTheDocument();
  });
});
