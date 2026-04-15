import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@/test/test-utils";
import type { ReactNode } from "react";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CampaignAdminApiError } from "@/features/campaigns/buget/admin/api/campaign-admin-user-interactions";
import type {
  CampaignAdminNotificationPlanResponse,
  CampaignAdminNotificationPlanSendResponse,
  CampaignAdminNotificationTemplatePreview,
  CampaignAdminNotificationsListResponse,
  CampaignAdminNotificationsSearch,
  CampaignAdminRunnableTemplateDescriptor,
} from "@/features/campaigns/buget/admin/types";
import { createTestQueryClient } from "@/test/test-utils";
import { CampaignAdminNotificationsPage } from "./CampaignAdminNotificationsPage";

const useAuthMock = vi.fn();
const listCampaignAdminNotificationsMock = vi.fn();
const getCampaignAdminNotificationsMetaMock = vi.fn();
const listCampaignAdminNotificationTemplatesMock = vi.fn();
const getCampaignAdminNotificationTemplatePreviewMock = vi.fn();
const listCampaignAdminNotificationTriggersMock = vi.fn();
const executeCampaignAdminNotificationTriggerMock = vi.fn();
const executeCampaignAdminNotificationTriggerBulkMock = vi.fn();
const listCampaignAdminRunnableTemplatesMock = vi.fn();
const createCampaignAdminNotificationDryRunPlanMock = vi.fn();
const getCampaignAdminNotificationPlanPageMock = vi.fn();
const sendCampaignAdminNotificationPlanMock = vi.fn();

vi.mock("@/lib/auth", () => ({
  useAuth: () => useAuthMock(),
  AuthSignInButton: ({ children }: { readonly children: ReactNode }) => (
    <>{children}</>
  ),
}));

vi.mock(
  "@/features/campaigns/buget/admin/api/campaign-admin-notifications",
  () => ({
    listCampaignAdminNotifications: (...args: unknown[]) =>
      listCampaignAdminNotificationsMock(...args),
    getCampaignAdminNotificationsMeta: (...args: unknown[]) =>
      getCampaignAdminNotificationsMetaMock(...args),
    listCampaignAdminNotificationTemplates: (...args: unknown[]) =>
      listCampaignAdminNotificationTemplatesMock(...args),
    getCampaignAdminNotificationTemplatePreview: (...args: unknown[]) =>
      getCampaignAdminNotificationTemplatePreviewMock(...args),
    listCampaignAdminNotificationTriggers: (...args: unknown[]) =>
      listCampaignAdminNotificationTriggersMock(...args),
    executeCampaignAdminNotificationTrigger: (...args: unknown[]) =>
      executeCampaignAdminNotificationTriggerMock(...args),
    executeCampaignAdminNotificationTriggerBulk: (...args: unknown[]) =>
      executeCampaignAdminNotificationTriggerBulkMock(...args),
    listCampaignAdminRunnableTemplates: (...args: unknown[]) =>
      listCampaignAdminRunnableTemplatesMock(...args),
    createCampaignAdminNotificationDryRunPlan: (...args: unknown[]) =>
      createCampaignAdminNotificationDryRunPlanMock(...args),
    getCampaignAdminNotificationPlanPage: (...args: unknown[]) =>
      getCampaignAdminNotificationPlanPageMock(...args),
    sendCampaignAdminNotificationPlan: (...args: unknown[]) =>
      sendCampaignAdminNotificationPlanMock(...args),
  }),
);

function createRunnableTemplate(
  overrides: Partial<CampaignAdminRunnableTemplateDescriptor> = {},
): CampaignAdminRunnableTemplateDescriptor {
  return {
    runnableId: "admin_reviewed_user_interaction",
    campaignKey: "funky",
    templateId: "admin_reviewed_user_interaction",
    templateVersion: "1",
    description: "Reviewed interaction admin email",
    targetKind: "user",
    selectors: [
      { name: "userId", type: "string", required: false },
      { name: "entityCui", type: "string", required: false },
      { name: "recordKey", type: "string", required: false },
    ],
    filters: [
      { name: "reviewStatus", type: "enum", required: false },
      { name: "interactionId", type: "string", required: false },
      { name: "updatedAtFrom", type: "datetime", required: false },
      { name: "updatedAtTo", type: "datetime", required: false },
      { name: "submittedAtFrom", type: "datetime", required: false },
      { name: "submittedAtTo", type: "datetime", required: false },
    ],
    dryRunRequired: true,
    maxPlanRowCount: 500,
    defaultPageSize: 25,
    maxPageSize: 100,
    ...overrides,
  };
}

function createPlanResponse(
  overrides: Omit<
    Partial<CampaignAdminNotificationPlanResponse>,
    "page" | "summary"
  > & {
    page?: Partial<CampaignAdminNotificationPlanResponse["page"]>;
    summary?: Partial<CampaignAdminNotificationPlanResponse["summary"]>;
  } = {},
): CampaignAdminNotificationPlanResponse {
  const { page: pageOverrides, summary: summaryOverrides, ...restOverrides } =
    overrides;
  const summary = {
    totalRowCount: 4,
    willSendCount: 2,
    alreadySentCount: 1,
    alreadyPendingCount: 0,
    ineligibleCount: 1,
    missingDataCount: 0,
    ...summaryOverrides,
  };

  return {
    planId: "plan-1",
    runnableId: "admin_reviewed_user_interaction",
    templateId: "admin_reviewed_user_interaction",
    watermark: "2026-04-14T12:00:00.000Z",
    summary,
    rows: [
      {
        rowKey: "row-1",
        userId: "user-1",
        entityCui: "12345678",
        entityName: "Entity One",
        recordKey: "record-1",
        interactionId: "budget_document",
        interactionLabel: "Budget document",
        reviewStatus: "approved",
        reviewedAt: "2026-04-12T08:00:00.000Z",
        status: "will_send",
        reasonCode: "eligible",
        statusMessage: "Matches all conditions and is ready to send.",
        hasExistingDelivery: false,
        existingDeliveryStatus: null,
        sendMode: "create",
      },
      {
        rowKey: "row-2",
        userId: "user-2",
        entityCui: "87654321",
        entityName: "Entity Two",
        recordKey: "record-2",
        interactionId: "budget_status",
        interactionLabel: "Budget status",
        reviewStatus: "rejected",
        reviewedAt: "2026-04-13T08:00:00.000Z",
        status: "already_sent",
        reasonCode: "already_sent",
        statusMessage: "This notification was already sent before.",
        hasExistingDelivery: true,
        existingDeliveryStatus: "delivered",
        sendMode: null,
      },
    ],
    page: {
      totalCount: summary.totalRowCount,
      nextCursor: "cursor-2",
      hasMore: true,
      ...pageOverrides,
    },
    ...restOverrides,
  };
}

function createSendResponse(
  overrides: Partial<CampaignAdminNotificationPlanSendResponse> = {},
): CampaignAdminNotificationPlanSendResponse {
  return {
    planId: "plan-1",
    runnableId: "admin_reviewed_user_interaction",
    templateId: "admin_reviewed_user_interaction",
    evaluatedCount: 4,
    queuedCount: 2,
    alreadySentCount: 1,
    alreadyPendingCount: 0,
    ineligibleCount: 1,
    missingDataCount: 0,
    enqueueFailedCount: 1,
    ...overrides,
  };
}

function createTemplatePreview(): CampaignAdminNotificationTemplatePreview {
  return {
    templateId: "admin_reviewed_user_interaction",
    name: "Admin reviewed interaction",
    version: "1",
    description: "Preview",
    requiredFields: [],
    exampleSubject: "Subject preview",
    html: "<html><body><h1>Preview</h1></body></html>",
    text: "Preview text body",
  };
}

function createAuditResponse(
  overrides: Omit<Partial<CampaignAdminNotificationsListResponse>, "page"> & {
    page?: Partial<CampaignAdminNotificationsListResponse["page"]>;
  } = {},
): CampaignAdminNotificationsListResponse {
  const { page: pageOverrides, ...restOverrides } = overrides;

  return {
    items: [],
    page: {
      totalCount: 0,
      nextCursor: null,
      hasMore: false,
      ...pageOverrides,
    },
    ...restOverrides,
  };
}

function renderStatefulPage(initialSearch?: Partial<CampaignAdminNotificationsSearch>) {
  function StatefulPage() {
    const [search, setSearch] = useState<CampaignAdminNotificationsSearch>({
      tab: "run",
      sortBy: "createdAt",
      sortOrder: "desc",
      limit: 50,
      ...initialSearch,
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

  return render(<StatefulPage />, {
    queryClient: createTestQueryClient(),
  });
}

describe("CampaignAdminNotificationsPage", () => {
  beforeEach(() => {
    useAuthMock.mockReset();
    listCampaignAdminNotificationsMock.mockReset();
    getCampaignAdminNotificationsMetaMock.mockReset();
    listCampaignAdminNotificationTemplatesMock.mockReset();
    getCampaignAdminNotificationTemplatePreviewMock.mockReset();
    listCampaignAdminNotificationTriggersMock.mockReset();
    executeCampaignAdminNotificationTriggerMock.mockReset();
    executeCampaignAdminNotificationTriggerBulkMock.mockReset();
    listCampaignAdminRunnableTemplatesMock.mockReset();
    createCampaignAdminNotificationDryRunPlanMock.mockReset();
    getCampaignAdminNotificationPlanPageMock.mockReset();
    sendCampaignAdminNotificationPlanMock.mockReset();

    useAuthMock.mockReturnValue({ isLoaded: true, isSignedIn: true });
    listCampaignAdminNotificationsMock.mockResolvedValue(createAuditResponse());
    getCampaignAdminNotificationsMetaMock.mockResolvedValue({
      pendingDeliveryCount: 0,
      failedDeliveryCount: 0,
      replyReceivedCount: 0,
    });
    listCampaignAdminNotificationTemplatesMock.mockResolvedValue([]);
    getCampaignAdminNotificationTemplatePreviewMock.mockResolvedValue(
      createTemplatePreview(),
    );
    listCampaignAdminNotificationTriggersMock.mockResolvedValue([]);
    executeCampaignAdminNotificationTriggerMock.mockResolvedValue({});
    executeCampaignAdminNotificationTriggerBulkMock.mockResolvedValue({});
    listCampaignAdminRunnableTemplatesMock.mockResolvedValue([
      createRunnableTemplate(),
    ]);
    createCampaignAdminNotificationDryRunPlanMock.mockResolvedValue(
      createPlanResponse(),
    );
    getCampaignAdminNotificationPlanPageMock.mockResolvedValue(
      createPlanResponse({
        rows: [
          {
            rowKey: "row-3",
            userId: "user-3",
            entityCui: "44556677",
            entityName: "Entity Three",
            recordKey: "record-3",
            interactionId: "budget_status",
            interactionLabel: "Budget status",
            reviewStatus: "approved",
            reviewedAt: "2026-04-14T08:00:00.000Z",
            status: "missing_data",
            reasonCode: "missing_subject",
            statusMessage: "Missing subject data for this notification.",
            hasExistingDelivery: false,
            existingDeliveryStatus: null,
            sendMode: null,
          },
        ],
        page: {
          nextCursor: null,
          hasMore: false,
        },
      }),
    );
    sendCampaignAdminNotificationPlanMock.mockResolvedValue(
      createSendResponse(),
    );
  });

  it("renders the sign-in gate when signed out", () => {
    useAuthMock.mockReturnValue({ isLoaded: true, isSignedIn: false });

    renderStatefulPage();

    expect(screen.getByText("Sign in required")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
  });

  it("renders the audit tab for an empty result set", async () => {
    renderStatefulPage({ tab: "audit" });

    expect(await screen.findByText("Audit log")).toBeInTheDocument();
    // Verify the empty state toolbar is rendered (no pager for empty results)
    expect(await screen.findByRole("button", { name: /refresh/i })).toBeInTheDocument();
  });

  it("renders the forbidden run state from the backend", async () => {
    listCampaignAdminRunnableTemplatesMock.mockRejectedValue(
      new CampaignAdminApiError("Forbidden", 403),
    );

    renderStatefulPage();

    expect(
      await screen.findByText("You do not have access to notifications"),
    ).toBeInTheDocument();
  });

  it("renders a sign-in recovery action when runnable templates return 401", async () => {
    listCampaignAdminRunnableTemplatesMock.mockRejectedValue(
      new CampaignAdminApiError("Session expired", 401),
    );

    renderStatefulPage();

    expect(await screen.findByText("Session expired")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Sign in again" }),
    ).toBeInTheDocument();
  });

  it("loads the redesigned notification type and conditions surface and opens template preview", async () => {
    renderStatefulPage();

    expect(await screen.findByText("Send notifications")).toBeInTheDocument();
    expect(screen.getByText("Notification type")).toBeInTheDocument();
    expect(screen.getByText("Conditions")).toBeInTheDocument();
    expect(screen.getByText("All conditions must match.")).toBeInTheDocument();
    expect(screen.getAllByText("Reviewed interaction").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "Preview template" }));

    expect(
      await screen.findByText("Subject preview"),
    ).toBeInTheDocument();
    expect(getCampaignAdminNotificationTemplatePreviewMock).toHaveBeenCalledWith(
      {
        campaignKey: "funky",
        templateId: "admin_reviewed_user_interaction",
      },
    );
  });

  it("builds a preview payload from conditions and renders preview results", async () => {
    renderStatefulPage();

    await screen.findByText("Send notifications");

    fireEvent.click(screen.getByRole("button", { name: "Add condition" }));
    fireEvent.change(screen.getByLabelText("Condition value"), {
      target: { value: "user-99" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Preview matches" }));

    await waitFor(() => {
      expect(createCampaignAdminNotificationDryRunPlanMock).toHaveBeenCalledWith(
        {
          campaignKey: "funky",
          runnableId: "admin_reviewed_user_interaction",
          body: {
            selectors: {
              userId: "user-99",
            },
          },
        },
      );
    });

    expect(
      await screen.findByRole("generic", {
        name: "Notification preview summary",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Preview matches" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Showing 2 of 4")).toBeInTheDocument();
    expect(screen.getAllByText("Ready to send").length).toBeGreaterThan(0);
    expect(screen.getByText("Entity One")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Ready\s*1/ }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Already sent").length).toBeGreaterThan(0);
  });

  it("allows a preview with no conditions", async () => {
    renderStatefulPage();

    await screen.findByText("Send notifications");

    fireEvent.click(screen.getByRole("button", { name: "Preview matches" }));

    await waitFor(() => {
      expect(createCampaignAdminNotificationDryRunPlanMock).toHaveBeenCalledWith(
        {
          campaignKey: "funky",
          runnableId: "admin_reviewed_user_interaction",
          body: {},
        },
      );
    });
  });

  it("invalidates the visible preview when conditions change", async () => {
    renderStatefulPage();

    await screen.findByText("Send notifications");
    fireEvent.click(screen.getByRole("button", { name: "Preview matches" }));
    expect(await screen.findByText("Entity One")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Add condition" }));
    fireEvent.change(screen.getByLabelText("Condition value"), {
      target: { value: "user-2" },
    });

    expect(screen.queryByText("Entity One")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Send 2 notifications" }),
    ).not.toBeInTheDocument();
  });

  it("ignores a stale preview response after the conditions change", async () => {
    let resolvePreview:
      | ((value: CampaignAdminNotificationPlanResponse) => void)
      | undefined;

    createCampaignAdminNotificationDryRunPlanMock.mockImplementation(
      () =>
        new Promise<CampaignAdminNotificationPlanResponse>((resolve) => {
          resolvePreview = resolve;
        }),
    );

    renderStatefulPage();

    await screen.findByText("Send notifications");
    fireEvent.click(screen.getByRole("button", { name: "Add condition" }));
    fireEvent.change(screen.getByLabelText("Condition value"), {
      target: { value: "user-1" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Preview matches" }));

    fireEvent.change(screen.getByLabelText("Condition value"), {
      target: { value: "user-2" },
    });

    resolvePreview?.(createPlanResponse());

    await waitFor(() => {
      expect(screen.getByDisplayValue("user-2")).toBeInTheDocument();
    });
    expect(screen.queryByText("Entity One")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Send 2 notifications" }),
    ).not.toBeInTheDocument();
  });

  it("shows invalid condition payload failures from preview", async () => {
    createCampaignAdminNotificationDryRunPlanMock.mockRejectedValue(
      new CampaignAdminApiError("Invalid filter payload", 400),
    );

    renderStatefulPage();

    await screen.findByText("Send notifications");
    fireEvent.click(screen.getByRole("button", { name: "Preview matches" }));

    expect(await screen.findByText("Preview failed")).toBeInTheDocument();
    expect(screen.getByText("Invalid filter payload")).toBeInTheDocument();
  });

  it("restores preview state from URL and clears an invalid preview id gracefully", async () => {
    getCampaignAdminNotificationPlanPageMock.mockRejectedValue(
      new CampaignAdminApiError("Preview expired for this actor", 400),
    );

    renderStatefulPage({
      runNotificationType: "admin_reviewed_user_interaction",
      runConditions: "userId:is:user-1",
      previewId: "stale-preview",
      previewCursor: "cursor-2",
      previewPageIndex: 2,
      previewTrail: "%5Bnull%5D",
      previewFilter: "ready",
    });

    expect(getCampaignAdminNotificationPlanPageMock).toHaveBeenCalledWith({
      campaignKey: "funky",
      planId: "stale-preview",
      cursor: "cursor-2",
      limit: 25,
    });
    expect(
      await screen.findByText(
        "Preview expired for this actor Run preview again to refresh the matches.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText("Entity One")).not.toBeInTheDocument();
  });

  it("restores preview page and result filter state from the URL", async () => {
    getCampaignAdminNotificationPlanPageMock.mockResolvedValue(createPlanResponse());

    renderStatefulPage({
      runNotificationType: "admin_reviewed_user_interaction",
      runConditions: "userId:is:user-1",
      previewId: "plan-1",
      previewCursor: "cursor-2",
      previewPageIndex: 2,
      previewTrail: "%5Bnull%2C%22cursor-1%22%5D",
      previewFilter: "ready",
    });

    expect(await screen.findByText("Entity One")).toBeInTheDocument();
    expect(screen.queryByText("Entity Two")).not.toBeInTheDocument();
    expect(screen.getByText("Page 2")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Ready\s*1/ })).toBeInTheDocument();
  });

  it("restores preview state from URL and clears it when conditions change", async () => {
    getCampaignAdminNotificationPlanPageMock.mockResolvedValue(
      createPlanResponse(),
    );

    renderStatefulPage({
      runNotificationType: "admin_reviewed_user_interaction",
      runConditions: "userId:is:user-1",
      previewId: "plan-1",
    });

    expect(await screen.findByText("Entity One")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Add condition" }));

    expect(screen.queryByText("Entity One")).not.toBeInTheDocument();
  });

  it("shows a retryable preview-page error without dropping preview state", async () => {
    getCampaignAdminNotificationPlanPageMock
      .mockRejectedValueOnce(
        new CampaignAdminApiError("Temporary backend failure", 503),
      )
      .mockResolvedValueOnce(createPlanResponse());

    renderStatefulPage({
      runNotificationType: "admin_reviewed_user_interaction",
      runConditions: "userId:is:user-1",
      previewId: "plan-1",
    });

    expect(await screen.findByText("Server error")).toBeInTheDocument();
    expect(
      screen.getByText("Temporary backend failure"),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    await waitFor(() => {
      expect(getCampaignAdminNotificationPlanPageMock).toHaveBeenCalledTimes(2);
    });
    expect(await screen.findByText("Entity One")).toBeInTheDocument();
  });

  it("disables send when no notifications are ready and shows status-message explanations", async () => {
    createCampaignAdminNotificationDryRunPlanMock.mockResolvedValue(
      createPlanResponse({
        summary: {
          totalRowCount: 2,
          willSendCount: 0,
          alreadySentCount: 0,
          alreadyPendingCount: 1,
          ineligibleCount: 1,
          missingDataCount: 0,
        },
        rows: [
          {
            rowKey: "row-10",
            userId: "user-10",
            entityCui: "12345678",
            entityName: "Entity Ten",
            recordKey: "record-10",
            interactionId: "budget_document",
            interactionLabel: "Budget document",
            reviewStatus: "approved",
            reviewedAt: "2026-04-12T08:00:00.000Z",
            status: "ineligible",
            reasonCode: "missing_preference",
            statusMessage: "The user has not opted in to this notification.",
            hasExistingDelivery: false,
            existingDeliveryStatus: null,
            sendMode: null,
          },
          {
            rowKey: "row-11",
            userId: "user-11",
            entityCui: "87654321",
            entityName: "Entity Eleven",
            recordKey: "record-11",
            interactionId: "budget_status",
            interactionLabel: "Budget status",
            reviewStatus: "approved",
            reviewedAt: "2026-04-12T08:00:00.000Z",
            status: "already_pending",
            reasonCode: "already_pending",
            statusMessage: "This notification is already queued to send.",
            hasExistingDelivery: true,
            existingDeliveryStatus: "pending",
            sendMode: "reuse_claimable",
          },
        ],
        page: {
          nextCursor: null,
          hasMore: false,
        },
      }),
    );

    renderStatefulPage();

    await screen.findByText("Send notifications");
    fireEvent.click(screen.getByRole("button", { name: "Preview matches" }));

    expect(
      (await screen.findAllByText(
        "The user has not opted in to this notification.",
      )).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText("This notification is already queued to send.").length,
    ).toBeGreaterThan(0);
    expect(
      screen.getByRole("button", { name: "Send 0 notifications" }),
    ).toBeDisabled();
    expect(
      screen.getByText("No notifications in this preview are ready to send."),
    ).toBeInTheDocument();
  });

  it("sends notifications from the preview and renders mixed outcome counts", async () => {
    renderStatefulPage();

    await screen.findByText("Send notifications");
    fireEvent.click(screen.getByRole("button", { name: "Preview matches" }));

    expect(await screen.findByText("Entity One")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Send 2 notifications" }));
    const sendDialog = await screen.findByRole("alertdialog");
    fireEvent.click(
      within(sendDialog).getByRole("button", { name: "Send 2 notifications" }),
    );

    expect(
      await screen.findByText("Notification send completed"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Queued 2, already sent 1, already pending 0, not eligible 1, missing data 0, enqueue failed 1.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "This preview is now consumed. Run preview again before sending anything else.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Run preview again to create a fresh result set before sending.",
      ),
    ).toBeInTheDocument();
  });

  it("prevents duplicate send submissions from the confirmation dialog", async () => {
    let resolveSend:
      | ((value: CampaignAdminNotificationPlanSendResponse) => void)
      | undefined;

    sendCampaignAdminNotificationPlanMock.mockImplementation(
      () =>
        new Promise<CampaignAdminNotificationPlanSendResponse>((resolve) => {
          resolveSend = resolve;
        }),
    );

    renderStatefulPage();

    await screen.findByText("Send notifications");
    fireEvent.click(screen.getByRole("button", { name: "Preview matches" }));
    expect(await screen.findByText("Entity One")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Send 2 notifications" }));
    const sendDialog = await screen.findByRole("alertdialog");
    const dialogSendButton = within(sendDialog).getByRole("button", {
      name: "Send 2 notifications",
    });

    fireEvent.click(dialogSendButton);
    fireEvent.click(dialogSendButton);

    await waitFor(() => {
      expect(sendCampaignAdminNotificationPlanMock).toHaveBeenCalledTimes(1);
    });

    resolveSend?.(createSendResponse());

    expect(
      await screen.findByText("Notification send completed"),
    ).toBeInTheDocument();
  });

  it("clears the preview when send fails because the preview is no longer valid", async () => {
    sendCampaignAdminNotificationPlanMock.mockRejectedValue(
      new CampaignAdminApiError("Preview consumed by another admin", 400),
    );

    renderStatefulPage();

    await screen.findByText("Send notifications");
    fireEvent.click(screen.getByRole("button", { name: "Preview matches" }));
    expect(await screen.findByText("Entity One")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Send 2 notifications" }));
    const sendDialog = await screen.findByRole("alertdialog");
    fireEvent.click(
      within(sendDialog).getByRole("button", { name: "Send 2 notifications" }),
    );

    expect(
      await screen.findByText(
        "Preview consumed by another admin Run preview again to refresh the matches.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText("Entity One")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Send 2 notifications" }),
    ).not.toBeInTheDocument();
  });

  it("shows notification type server failures clearly", async () => {
    listCampaignAdminRunnableTemplatesMock.mockRejectedValue(
      new CampaignAdminApiError("Database unavailable", 500),
    );

    renderStatefulPage();

    expect(
      await screen.findByText("Failed to load notification types"),
    ).toBeInTheDocument();
    expect(screen.getByText("Database unavailable")).toBeInTheDocument();
  });
});
