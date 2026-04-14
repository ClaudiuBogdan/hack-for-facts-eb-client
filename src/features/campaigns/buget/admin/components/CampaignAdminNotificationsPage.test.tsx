import { fireEvent, render, screen, waitFor, within } from "@/test/test-utils";
import type { ReactNode } from "react";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CampaignAdminNotificationsPage } from "./CampaignAdminNotificationsPage";
import type {
  CampaignAdminNotificationsSearch,
  CampaignAdminNotificationListItem,
  CampaignAdminNotificationTemplateDescriptor,
  CampaignAdminNotificationTriggerDescriptor,
  CampaignAdminNotificationTriggerExecutionResponse,
} from "@/features/campaigns/buget/admin/types";

const useAuthMock = vi.fn();
const useCampaignAdminNotificationsAuditQueryMock = vi.fn();
const useCampaignAdminNotificationTriggersQueryMock = vi.fn();
const useCampaignAdminNotificationTemplatesQueryMock = vi.fn();
const useCampaignAdminNotificationTemplatePreviewQueryMock = vi.fn();
const useExecuteCampaignAdminNotificationTriggerMutationMock = vi.fn();
const useExecuteCampaignAdminNotificationTriggerBulkMutationMock = vi.fn();
const mutateAsyncMock = vi.fn();
const bulkMutateAsyncMock = vi.fn();
const toastSuccessMock = vi.fn();
const toastErrorMock = vi.fn();

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

vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccessMock(...args),
    error: (...args: unknown[]) => toastErrorMock(...args),
  },
}));

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

function createTrigger(
  overrides: Partial<CampaignAdminNotificationTriggerDescriptor> = {},
): CampaignAdminNotificationTriggerDescriptor {
  return {
    triggerId: "public_debate_entity_update.reply_received",
    campaignKey: "funky",
    templateId: "public_debate_entity_update",
    description: "Queue the reply received notification.",
    inputFields: [
      {
        name: "threadId",
        type: "string",
        required: true,
      },
    ],
    targetKind: "thread",
    ...overrides,
  };
}

function createTemplate(
  overrides: Partial<CampaignAdminNotificationTemplateDescriptor> = {},
): CampaignAdminNotificationTemplateDescriptor {
  return {
    templateId: "public_debate_entity_update",
    name: "Entity update",
    version: "3",
    description: "Entity update email",
    requiredFields: [
      {
        name: "threadId",
        type: "string",
        required: true,
      },
    ],
    ...overrides,
  };
}

function createTriggerExecutionResponse(): CampaignAdminNotificationTriggerExecutionResponse {
  return {
    triggerId: "public_debate_entity_update.reply_received",
    campaignKey: "funky",
    templateId: "public_debate_entity_update",
    result: {
      status: "queued",
      createdOutboxIds: ["outbox-1"],
      reusedOutboxIds: [],
      queuedOutboxIds: ["outbox-1"],
      enqueueFailedOutboxIds: [],
    },
  };
}

function mockAuditState(input: {
  readonly items?: readonly CampaignAdminNotificationListItem[];
  readonly error?: { status: number; message: string } | null;
  readonly isLoading?: boolean;
  readonly isFetching?: boolean;
}) {
  useCampaignAdminNotificationsAuditQueryMock.mockReturnValue({
    data:
      input.isLoading && input.items === undefined
        ? undefined
        : {
            items: input.items ?? [],
            page: {
              hasMore: false,
              nextCursor: null,
            },
          },
    error: input.error ?? null,
    isLoading: input.isLoading ?? false,
    isFetching: input.isFetching ?? false,
    refetch: vi.fn(),
  });
}

function renderStatefulPage(initialSearch: CampaignAdminNotificationsSearch) {
  function StatefulPage() {
    const [search, setSearch] =
      useState<CampaignAdminNotificationsSearch>(initialSearch);

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

  return render(<StatefulPage />);
}

describe("CampaignAdminNotificationsPage", () => {
  beforeEach(() => {
    useAuthMock.mockReset();
    useCampaignAdminNotificationsAuditQueryMock.mockReset();
    useCampaignAdminNotificationTriggersQueryMock.mockReset();
    useCampaignAdminNotificationTemplatesQueryMock.mockReset();
    useCampaignAdminNotificationTemplatePreviewQueryMock.mockReset();
    useExecuteCampaignAdminNotificationTriggerMutationMock.mockReset();
    useExecuteCampaignAdminNotificationTriggerBulkMutationMock.mockReset();
    mutateAsyncMock.mockReset();
    bulkMutateAsyncMock.mockReset();
    toastSuccessMock.mockReset();
    toastErrorMock.mockReset();

    useAuthMock.mockReturnValue({ isLoaded: true, isSignedIn: true });
    mockAuditState({ items: [] });
    useCampaignAdminNotificationTriggersQueryMock.mockReturnValue({
      data: [createTrigger()],
      error: null,
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    });
    useCampaignAdminNotificationTemplatesQueryMock.mockReturnValue({
      data: [createTemplate()],
      error: null,
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    });
    useCampaignAdminNotificationTemplatePreviewQueryMock.mockReturnValue({
      data: {
        templateId: "public_debate_entity_update",
        name: "Entity update",
        version: "3",
        description: "Entity update email",
        requiredFields: [
          {
            name: "threadId",
            type: "string",
            required: true,
          },
        ],
        exampleSubject: "Reply received for Oras Test",
        html: "<html><body><h1>Preview</h1></body></html>",
        text: "Preview",
      },
      error: null,
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    });
    useExecuteCampaignAdminNotificationTriggerMutationMock.mockReturnValue({
      mutateAsync: mutateAsyncMock,
      isPending: false,
    });
    useExecuteCampaignAdminNotificationTriggerBulkMutationMock.mockReturnValue({
      mutateAsync: bulkMutateAsyncMock,
      isPending: false,
    });
  });

  it("renders the sign-in gate when the user is signed out", () => {
    useAuthMock.mockReturnValue({ isLoaded: true, isSignedIn: false });

    render(
      <CampaignAdminNotificationsPage
        campaignKey="funky"
        search={{
          tab: "audit",
          sortBy: "createdAt",
          sortOrder: "desc",
          limit: 50,
        }}
        onSearchChange={vi.fn()}
      />,
    );

    expect(screen.getByText("Sign in required")).toBeInTheDocument();
  });

  it("renders the audit loading skeleton state", () => {
    mockAuditState({
      isLoading: true,
    });

    const { container } = render(
      <CampaignAdminNotificationsPage
        campaignKey="funky"
        search={{
          tab: "audit",
          sortBy: "createdAt",
          sortOrder: "desc",
          limit: 50,
        }}
        onSearchChange={vi.fn()}
      />,
    );

    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(
      0,
    );
  });

  it("renders the audit empty state", () => {
    render(
      <CampaignAdminNotificationsPage
        campaignKey="funky"
        search={{
          tab: "audit",
          sortBy: "createdAt",
          sortOrder: "desc",
          limit: 50,
        }}
        onSearchChange={vi.fn()}
      />,
    );

    expect(screen.getByText("No data available")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Clear filters" }),
    ).toBeInTheDocument();
  });

  it("renders the audit error state", () => {
    mockAuditState({
      items: [],
      error: {
        status: 500,
        message: "Audit failed",
      },
    });

    render(
      <CampaignAdminNotificationsPage
        campaignKey="funky"
        search={{
          tab: "audit",
          sortBy: "createdAt",
          sortOrder: "desc",
          limit: 50,
        }}
        onSearchChange={vi.fn()}
      />,
    );

    expect(
      screen.getByText("Failed to load notifications"),
    ).toBeInTheDocument();
    expect(screen.getByText("Audit failed")).toBeInTheDocument();
  });

  it("renders the audit success table", () => {
    mockAuditState({
      items: [createAuditItem()],
    });

    render(
      <CampaignAdminNotificationsPage
        campaignKey="funky"
        search={{
          tab: "audit",
          sortBy: "createdAt",
          sortOrder: "desc",
          limit: 50,
        }}
        onSearchChange={vi.fn()}
      />,
    );

    expect(screen.getByText("Audit log")).toBeInTheDocument();
    expect(screen.getAllByText("Entity update").length).toBeGreaterThan(0);
    expect(screen.getByText("Oras Test")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "user-1" })).toHaveAttribute(
      "href",
      "/admin/campaigns/funky/users/user-1",
    );
    expect(
      screen.getByRole("button", { name: "Preview template" }),
    ).toBeInTheDocument();
  });

  it("executes a trigger from the trigger dialog and shows the result summary", async () => {
    mutateAsyncMock.mockResolvedValue(createTriggerExecutionResponse());

    renderStatefulPage({
      tab: "triggers",
      sortBy: "createdAt",
      sortOrder: "desc",
      limit: 50,
    });

    fireEvent.click(screen.getByRole("button", { name: "Open trigger" }));

    const dialog = await screen.findByRole("dialog", {
      name: "Queue the reply received notification.",
    });

    fireEvent.change(within(dialog).getByLabelText("Thread ID"), {
      target: { value: "thread-1" },
    });
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Execute single" }),
    );

    await waitFor(() => {
      expect(mutateAsyncMock).toHaveBeenCalledWith({
        triggerId: "public_debate_entity_update.reply_received",
        body: {
          threadId: "thread-1",
        },
      });
    });

    expect(toastSuccessMock).toHaveBeenCalled();
    expect(await screen.findByText("Created")).toBeInTheDocument();
    expect(within(dialog).getAllByText("Queued").length).toBeGreaterThan(0);
  });

  it("omits blank optional trigger fields from the execution payload", async () => {
    useCampaignAdminNotificationTriggersQueryMock.mockReturnValue({
      data: [
        createTrigger({
          inputFields: [
            {
              name: "threadId",
              type: "string",
              required: true,
            },
            {
              name: "replyEntryId",
              type: "string",
              required: false,
            },
            {
              name: "retryCount",
              type: "number",
              required: false,
            },
            {
              name: "forceSend",
              type: "boolean",
              required: false,
            },
          ],
        }),
      ],
      error: null,
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    });
    mutateAsyncMock.mockResolvedValue(createTriggerExecutionResponse());

    renderStatefulPage({
      tab: "triggers",
      sortBy: "createdAt",
      sortOrder: "desc",
      limit: 50,
    });

    fireEvent.click(screen.getByRole("button", { name: "Open trigger" }));

    const dialog = await screen.findByRole("dialog", {
      name: "Queue the reply received notification.",
    });

    fireEvent.change(within(dialog).getByLabelText("Thread ID"), {
      target: { value: "thread-1" },
    });
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Execute single" }),
    );

    await waitFor(() => {
      expect(mutateAsyncMock).toHaveBeenCalledWith({
        triggerId: "public_debate_entity_update.reply_received",
        body: {
          threadId: "thread-1",
        },
      });
    });
  });

  it("opens the template preview dialog and renders the isolated preview details", async () => {
    renderStatefulPage({
      tab: "templates",
      sortBy: "createdAt",
      sortOrder: "desc",
      limit: 50,
    });

    fireEvent.click(screen.getByRole("button", { name: "Preview" }));

    expect(
      await screen.findByText("Reply received for Oras Test"),
    ).toBeInTheDocument();
    expect(screen.getByTitle("Entity update HTML preview")).toBeInTheDocument();
    expect(screen.getByText("Text preview")).toBeInTheDocument();
  });

  it("opens the template preview dialog from a trigger item", async () => {
    renderStatefulPage({
      tab: "triggers",
      sortBy: "createdAt",
      sortOrder: "desc",
      limit: 50,
    });

    fireEvent.click(screen.getByRole("button", { name: "Preview template" }));

    expect(
      await screen.findByText("Reply received for Oras Test"),
    ).toBeInTheDocument();
    expect(screen.getByTitle("Entity update HTML preview")).toBeInTheDocument();
  });

  it("lets admins type a template ID outside the current page suggestions", async () => {
    const auditQueryCalls: Array<{
      readonly filters: Record<string, unknown>;
    }> = [];

    useCampaignAdminNotificationsAuditQueryMock.mockImplementation((args) => {
      auditQueryCalls.push({
        filters: args.filters as Record<string, unknown>,
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

    renderStatefulPage({
      tab: "audit",
      sortBy: "createdAt",
      sortOrder: "desc",
      limit: 50,
    });

    fireEvent.click(screen.getByRole("button", { name: "Advanced" }));

    const advancedFiltersDialog = await screen.findByRole("dialog", {
      name: "Advanced filters",
    });
    fireEvent.change(within(advancedFiltersDialog).getByLabelText("Template ID"), {
      target: { value: "rare-template-id" },
    });
    fireEvent.click(
      within(advancedFiltersDialog).getByRole("button", {
        name: "Apply filters",
      }),
    );

    await waitFor(() => {
      expect(auditQueryCalls[auditQueryCalls.length - 1]).toMatchObject({
        filters: {
          templateId: "rare-template-id",
        },
      });
    });
  });
});
