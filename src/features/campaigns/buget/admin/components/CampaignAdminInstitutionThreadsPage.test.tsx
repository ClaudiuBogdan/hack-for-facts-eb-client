import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { type ReactNode, useState } from "react";
import { CampaignAdminInstitutionThreadsPage } from "./CampaignAdminInstitutionThreadsPage";
import type {
  CampaignAdminInstitutionThreadDetail,
  CampaignAdminInstitutionThreadListItem,
  CampaignAdminInstitutionThreadsSearch,
} from "@/features/campaigns/buget/admin/types";

const useAuthMock = vi.fn();
const useCampaignAdminInstitutionThreadsListQueryMock = vi.fn();
const useCampaignAdminInstitutionThreadDetailQueryMock = vi.fn();
const useAppendCampaignAdminInstitutionThreadResponseMutationMock = vi.fn();
const mutateAsyncMock = vi.fn();
const resetMutationMock = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    to,
  }: {
    readonly children: ReactNode;
    readonly to?: string;
  }) => <a href={to}>{children}</a>,
}));

vi.mock("@/lib/auth", () => ({
  useAuth: () => useAuthMock(),
  AuthSignInButton: ({ children }: { readonly children: ReactNode }) => <>{children}</>,
}));

vi.mock(
  "@/features/campaigns/buget/admin/hooks/use-campaign-admin-institution-threads",
  () => ({
    useCampaignAdminInstitutionThreadsListQuery: (...args: unknown[]) =>
      useCampaignAdminInstitutionThreadsListQueryMock(...args),
    useCampaignAdminInstitutionThreadDetailQuery: (...args: unknown[]) =>
      useCampaignAdminInstitutionThreadDetailQueryMock(...args),
    useAppendCampaignAdminInstitutionThreadResponseMutation: (...args: unknown[]) =>
      useAppendCampaignAdminInstitutionThreadResponseMutationMock(...args),
  }),
);

function createThreadItem(
  overrides: Partial<CampaignAdminInstitutionThreadListItem> = {},
): CampaignAdminInstitutionThreadListItem {
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
    ...overrides,
  };
}

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
        messageContent: "Received registration number",
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
        textBody: "Line one\n<script>alert(1)</script>",
        attachments: [],
        occurredAt: "2026-04-12T09:00:00.000Z",
      },
    ],
    ...overrides,
  };
}

function renderStatefulPage(
  initialSearch: CampaignAdminInstitutionThreadsSearch = { limit: 50, stateGroup: "open" },
) {
  function StatefulPage() {
    const [search, setSearch] = useState<CampaignAdminInstitutionThreadsSearch>(
      initialSearch,
    );

    return (
      <CampaignAdminInstitutionThreadsPage
        campaignKey="funky"
        search={search}
        onSearchChange={(nextSearch) => setSearch(nextSearch)}
      />
    );
  }

  return render(<StatefulPage />);
}

describe("CampaignAdminInstitutionThreadsPage", () => {
  beforeEach(() => {
    useAuthMock.mockReset();
    useCampaignAdminInstitutionThreadsListQueryMock.mockReset();
    useCampaignAdminInstitutionThreadDetailQueryMock.mockReset();
    useAppendCampaignAdminInstitutionThreadResponseMutationMock.mockReset();
    mutateAsyncMock.mockReset();
    resetMutationMock.mockReset();

    useAuthMock.mockReturnValue({ isLoaded: true, isSignedIn: true });
    useAppendCampaignAdminInstitutionThreadResponseMutationMock.mockReturnValue({
      mutateAsync: mutateAsyncMock,
      reset: resetMutationMock,
      isPending: false,
      error: null,
    });
    useCampaignAdminInstitutionThreadDetailQueryMock.mockImplementation((args) => ({
      data: args.threadId ? createThreadDetail({ id: args.threadId as string }) : undefined,
      error: null,
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    }));
    useCampaignAdminInstitutionThreadsListQueryMock.mockImplementation(() => ({
      data: {
        items: [createThreadItem()],
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
    }));
  });

  it("renders the sign-in required state", () => {
    useAuthMock.mockReturnValue({ isLoaded: true, isSignedIn: false });

    renderStatefulPage();

    expect(screen.getByText("Sign in required")).toBeInTheDocument();
  });

  it("renders the empty list state", () => {
    useCampaignAdminInstitutionThreadsListQueryMock.mockReturnValue({
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

    renderStatefulPage();

    expect(
      screen.getByText("No institution threads matched these filters"),
    ).toBeInTheDocument();
  });

  it("renders the list, applies filters, and opens the side sheet", async () => {
    const listCalls: Array<Record<string, unknown>> = [];
    useCampaignAdminInstitutionThreadsListQueryMock.mockImplementation((args) => {
      listCalls.push(args as Record<string, unknown>);

      return {
        data: {
          items: [createThreadItem()],
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

    renderStatefulPage();

    expect(screen.getByText("Oras Test")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Search"), {
      target: { value: "contact" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Apply filters" }));

    await waitFor(() => {
      expect(
        listCalls.some((call) => (call.filters as Record<string, unknown>)?.query === "contact"),
      ).toBe(true);
    });

    fireEvent.click(screen.getByText("Oras Test"));

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Review the latest correspondence and record a manual institution response.")).toBeInTheDocument();
    expect(screen.getByText(/<script>alert\(1\)<\/script>/)).toBeInTheDocument();
  });

  it("opens and closes sheet selection without replace history state", async () => {
    const onSearchChange = vi.fn();
    const { rerender } = render(
      <CampaignAdminInstitutionThreadsPage
        campaignKey="funky"
        search={{ limit: 50, stateGroup: "open" }}
        onSearchChange={onSearchChange}
      />,
    );

    fireEvent.click(screen.getByText("Oras Test"));

    expect(onSearchChange).toHaveBeenCalledWith(
      expect.objectContaining({
        limit: 50,
        stateGroup: "open",
        selectedThreadId: "thread-1",
      }),
      undefined,
    );

    onSearchChange.mockClear();

    rerender(
      <CampaignAdminInstitutionThreadsPage
        campaignKey="funky"
        search={{ limit: 50, stateGroup: "open", selectedThreadId: "thread-1" }}
        onSearchChange={onSearchChange}
      />,
    );

    fireEvent.click(await screen.findByRole("button", { name: "Close" }));

    expect(onSearchChange).toHaveBeenCalledWith(
      expect.objectContaining({
        limit: 50,
        stateGroup: "open",
        selectedThreadId: undefined,
      }),
      undefined,
    );
  });

  it("submits a manual response from the side sheet", async () => {
    mutateAsyncMock.mockResolvedValue(undefined);

    renderStatefulPage({
      limit: 50,
      stateGroup: "open",
      selectedThreadId: "thread-1",
    });

    fireEvent.change(screen.getByLabelText("Message content"), {
      target: { value: "  Confirmed request  " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Record response" }));

    await waitFor(() => {
      expect(mutateAsyncMock).toHaveBeenCalledWith(
        expect.objectContaining({
          expectedUpdatedAt: "2026-04-12T10:00:00.000Z",
          messageContent: "Confirmed request",
          responseStatus: "registration_number_received",
          responseDate: expect.any(String),
        }),
      );
    });
  });

  it("surfaces append-response conflicts from the side sheet", async () => {
    mutateAsyncMock.mockRejectedValue(new Error("Thread already changed"));

    renderStatefulPage({
      limit: 50,
      stateGroup: "open",
      selectedThreadId: "thread-1",
    });

    fireEvent.change(screen.getByLabelText("Message content"), {
      target: { value: "Conflict message" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Record response" }));

    expect(await screen.findByText("Thread already changed")).toBeInTheDocument();
  });

  it("resets append-response mutation state when the selected thread changes or closes", () => {
    const onSearchChange = vi.fn();
    const { rerender } = render(
      <CampaignAdminInstitutionThreadsPage
        campaignKey="funky"
        search={{ limit: 50, stateGroup: "open", selectedThreadId: "thread-1" }}
        onSearchChange={onSearchChange}
      />,
    );

    resetMutationMock.mockClear();

    rerender(
      <CampaignAdminInstitutionThreadsPage
        campaignKey="funky"
        search={{ limit: 50, stateGroup: "open", selectedThreadId: "thread-2" }}
        onSearchChange={onSearchChange}
      />,
    );

    expect(resetMutationMock).toHaveBeenCalledTimes(1);

    resetMutationMock.mockClear();

    rerender(
      <CampaignAdminInstitutionThreadsPage
        campaignKey="funky"
        search={{ limit: 50, stateGroup: "open" }}
        onSearchChange={onSearchChange}
      />,
    );

    expect(resetMutationMock).toHaveBeenCalledTimes(1);
  });
});
