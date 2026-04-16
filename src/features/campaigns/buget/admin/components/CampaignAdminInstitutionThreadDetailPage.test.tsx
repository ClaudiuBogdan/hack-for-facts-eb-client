import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { type ReactNode } from "react";
import { CampaignAdminInstitutionThreadDetailPage } from "./CampaignAdminInstitutionThreadDetailPage";
import type { CampaignAdminInstitutionThreadDetail } from "@/features/campaigns/buget/admin/types";

const useAuthMock = vi.fn();
const useCampaignAdminInstitutionThreadDetailQueryMock = vi.fn();
const useAppendCampaignAdminInstitutionThreadResponseMutationMock = vi.fn();
const mutateAsyncMock = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { readonly children: ReactNode }) => <a>{children}</a>,
}));

vi.mock("@/lib/auth", () => ({
  useAuth: () => useAuthMock(),
  AuthSignInButton: ({ children }: { readonly children: ReactNode }) => <>{children}</>,
}));

vi.mock(
  "@/features/campaigns/buget/admin/hooks/use-campaign-admin-institution-threads",
  () => ({
    useCampaignAdminInstitutionThreadDetailQuery: (...args: unknown[]) =>
      useCampaignAdminInstitutionThreadDetailQueryMock(...args),
    useAppendCampaignAdminInstitutionThreadResponseMutation: (...args: unknown[]) =>
      useAppendCampaignAdminInstitutionThreadResponseMutationMock(...args),
  }),
);

function createThreadDetail(
  overrides: Partial<CampaignAdminInstitutionThreadDetail> = {},
): CampaignAdminInstitutionThreadDetail {
  return {
    id: "thread-1",
    entityCui: "12345678",
    entityName: "Oras Test",
    campaignKey: "funky",
    submissionPath: "platform_send",
    ownerUserId: "user-1",
    institutionEmail: "contact@primarie.ro",
    subject: "Public debate request",
    threadState: "pending",
    currentResponseStatus: "registration_number_received",
    createdAt: "2026-04-10T10:00:00.000Z",
    updatedAt: "2026-04-12T10:00:00.000Z",
    latestResponseAt: "2026-04-12T09:00:00.000Z",
    responseEventCount: 1,
    requesterOrganizationName: "Asociatia Test",
    budgetPublicationDate: "2026-03-20",
    consentCapturedAt: "2026-04-10T08:00:00.000Z",
    contestationDeadlineAt: "2026-04-20T00:00:00.000Z",
    responseEvents: [
      {
        id: "event-1",
        responseDate: "2026-04-12T09:00:00.000Z",
        messageContent: "<b>Received</b>",
        responseStatus: "registration_number_received",
        actorUserId: "admin-1",
        createdAt: "2026-04-12T09:05:00.000Z",
        source: "campaign_admin_api",
      },
    ],
    correspondence: [
      {
        id: "corr-1",
        direction: "inbound",
        source: "institution_reply",
        fromAddress: "contact@primarie.ro",
        subject: "Reply",
        textBody: "<script>alert(1)</script>\nplain text",
        attachments: [
          {
            id: "attachment-1",
            filename: "reply.pdf",
            contentType: "application/pdf",
            contentDisposition: null,
            contentId: null,
          },
        ],
        occurredAt: "2026-04-12T09:00:00.000Z",
      },
    ],
    ...overrides,
  };
}

describe("CampaignAdminInstitutionThreadDetailPage", () => {
  beforeEach(() => {
    useAuthMock.mockReset();
    useCampaignAdminInstitutionThreadDetailQueryMock.mockReset();
    useAppendCampaignAdminInstitutionThreadResponseMutationMock.mockReset();
    mutateAsyncMock.mockReset();

    useAuthMock.mockReturnValue({ isLoaded: true, isSignedIn: true });
    useCampaignAdminInstitutionThreadDetailQueryMock.mockReturnValue({
      data: createThreadDetail(),
      error: null,
      isLoading: false,
      refetch: vi.fn(),
    });
    useAppendCampaignAdminInstitutionThreadResponseMutationMock.mockReturnValue({
      mutateAsync: mutateAsyncMock,
      isPending: false,
      error: null,
    });
  });

  it("renders response events and correspondence as plain text", () => {
    render(
      <CampaignAdminInstitutionThreadDetailPage
        campaignKey="funky"
        threadId="thread-1"
        search={{ stateGroup: "open", limit: 50 }}
      />,
    );

    expect(screen.getByText("<b>Received</b>")).toBeInTheDocument();
    expect(screen.getByText(/<script>alert\(1\)<\/script>/)).toBeInTheDocument();
    expect(screen.getByText("reply.pdf")).toBeInTheDocument();
  });

  it("keeps appended response events in record order even when backfilled", () => {
    useCampaignAdminInstitutionThreadDetailQueryMock.mockReturnValue({
      data: createThreadDetail({
        responseEvents: [
          {
            id: "event-1",
            responseDate: "2026-04-12T09:00:00.000Z",
            messageContent: "Received registration number",
            responseStatus: "registration_number_received",
            actorUserId: "admin-1",
            createdAt: "2026-04-12T09:05:00.000Z",
            source: "campaign_admin_api",
          },
          {
            id: "event-2",
            responseDate: "2026-04-11T08:00:00.000Z",
            messageContent: "Backfilled denial",
            responseStatus: "request_denied",
            actorUserId: "admin-2",
            createdAt: "2026-04-13T10:00:00.000Z",
            source: "campaign_admin_api",
          },
        ],
        correspondence: [],
      }),
      error: null,
      isLoading: false,
      refetch: vi.fn(),
    });

    render(
      <CampaignAdminInstitutionThreadDetailPage
        campaignKey="funky"
        threadId="thread-1"
        search={{ stateGroup: "open", limit: 50 }}
      />,
    );

    const firstEvent = screen.getByText("Received registration number");
    const secondEvent = screen.getByText("Backfilled denial");

    expect(
      firstEvent.compareDocumentPosition(secondEvent) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("disables append-response actions for resolved threads", () => {
    useCampaignAdminInstitutionThreadDetailQueryMock.mockReturnValue({
      data: createThreadDetail({
        threadState: "resolved",
        currentResponseStatus: "request_confirmed",
      }),
      error: null,
      isLoading: false,
      refetch: vi.fn(),
    });

    render(
      <CampaignAdminInstitutionThreadDetailPage
        campaignKey="funky"
        threadId="thread-1"
        search={{ stateGroup: "closed", threadState: "resolved", limit: 50 }}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Thread resolved — no further responses",
      }),
    );

    expect(screen.getByRole("button", { name: "Record response" })).toBeDisabled();
  });

  it("surfaces append-response conflicts on the detail page", async () => {
    mutateAsyncMock.mockRejectedValue(new Error("Thread already changed"));

    render(
      <CampaignAdminInstitutionThreadDetailPage
        campaignKey="funky"
        threadId="thread-1"
        search={{ stateGroup: "open", limit: 50 }}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Record institution response" }),
    );
    fireEvent.change(screen.getByLabelText("Message content"), {
      target: { value: "Conflict message" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Record response" }));

    await waitFor(() => {
      expect(screen.getByText("Thread already changed")).toBeInTheDocument();
    });
  });
});
