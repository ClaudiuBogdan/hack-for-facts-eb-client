import { fireEvent, render, screen, waitFor } from "@/test/test-utils";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CampaignAdminEntitiesPage } from "./CampaignAdminEntitiesPage";
import type {
  CampaignAdminEntityConfigDetail,
  CampaignAdminEntitiesMetaResponse,
  CampaignAdminEntitiesSearch,
  CampaignAdminEntityListItem,
} from "@/features/campaigns/buget/admin/types";

const invalidateQueriesMock = vi.fn(() => Promise.resolve());
const useQueryClientMock = vi.fn(() => ({
  invalidateQueries: invalidateQueriesMock,
}));
const useAuthMock = vi.fn();
const useCampaignAdminEntitiesQueryMock = vi.fn();
const useCampaignAdminEntitiesMetaQueryMock = vi.fn();
const useCampaignAdminEntityConfigListQueryMock = vi.fn();
const useCampaignAdminEntityConfigDetailQueryMock = vi.fn();
const useUpdateCampaignAdminEntityConfigMutationMock = vi.fn();
const downloadCampaignAdminEntitiesCsvMock = vi.fn();
const downloadCampaignAdminEntityConfigCsvMock = vi.fn();
const toastSuccessMock = vi.fn();
const toastErrorMock = vi.fn();
const institutionThreadsSectionMock = vi.fn(
  ({
    search,
    detailAction,
  }: {
    readonly search: Record<string, unknown>;
    readonly detailAction?: (item: {
      readonly id: string;
      readonly entityCui: string;
    }) => ReactNode;
  }) => (
    <div data-testid="institution-threads-section">
      {String(search.stateGroup)}:{String(search.limit)}
      {detailAction?.({
        id: "thread-7",
        entityCui: "87654321",
      })}
    </div>
  ),
);

vi.mock("@tanstack/react-query", async () => {
  const actual = await vi.importActual<typeof import("@tanstack/react-query")>(
    "@tanstack/react-query",
  );

  return {
    ...actual,
    useQueryClient: () => useQueryClientMock(),
  };
});

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    to,
    params,
    search,
    ...props
  }: {
    readonly children: ReactNode;
    readonly to?: string;
    readonly params?: Record<string, string>;
    readonly search?: Record<string, string | number | boolean | undefined>;
    readonly [key: string]: unknown;
  }) => {
    let href = typeof to === "string" ? to : "";
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        href = href.replace(`$${key}`, value);
      }
    }

    const query = search
      ? new URLSearchParams(
          Object.entries(search)
            .filter(([, value]) => value !== undefined)
            .map(([key, value]) => [key, String(value)]),
        ).toString()
      : "";

    return (
      <a href={query ? `${href}?${query}` : href} {...props}>
        {children}
      </a>
    );
  },
}));

vi.mock("@/lib/auth", () => ({
  useAuth: () => useAuthMock(),
  AuthSignInButton: ({ children }: { readonly children: ReactNode }) => (
    <>{children}</>
  ),
}));

vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccessMock(...args),
    error: (...args: unknown[]) => toastErrorMock(...args),
  },
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

vi.mock("@/features/campaigns/buget/admin/api/campaign-admin-entities", () => ({
  downloadCampaignAdminEntitiesCsv: (...args: unknown[]) =>
    downloadCampaignAdminEntitiesCsvMock(...args),
}));

vi.mock("@/features/campaigns/buget/admin/api/campaign-admin-entity-config", () => ({
  downloadCampaignAdminEntityConfigCsv: (...args: unknown[]) =>
    downloadCampaignAdminEntityConfigCsvMock(...args),
}));

vi.mock(
  "@/features/campaigns/buget/admin/components/CampaignAdminInstitutionThreadsSection",
  () => ({
    CampaignAdminInstitutionThreadsSection: (props: unknown) =>
      institutionThreadsSectionMock(props as { readonly search: Record<string, unknown> }),
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

function createEntitiesMetaResponse(
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

function mockEntitiesState(input: {
  readonly items?: readonly CampaignAdminEntityListItem[];
  readonly error?: { status: number; message: string } | null;
  readonly isLoading?: boolean;
  readonly isFetching?: boolean;
  readonly totalCount?: number;
}) {
  useCampaignAdminEntitiesQueryMock.mockReturnValue({
    data:
      input.isLoading && input.items === undefined
        ? undefined
        : {
            items: input.items ?? [],
            page: {
              totalCount: input.totalCount ?? (input.items ?? []).length,
              hasMore: false,
              nextCursor: null,
              sortBy: "latestInteractionAt",
              sortOrder: "desc",
            },
          },
    error: input.error ?? null,
    isLoading: input.isLoading ?? false,
    isFetching: input.isFetching ?? false,
    refetch: vi.fn(),
  });
}

describe("CampaignAdminEntitiesPage", () => {
  beforeEach(() => {
    useAuthMock.mockReset();
    useCampaignAdminEntitiesQueryMock.mockReset();
    useCampaignAdminEntitiesMetaQueryMock.mockReset();
    useCampaignAdminEntityConfigListQueryMock.mockReset();
    useCampaignAdminEntityConfigDetailQueryMock.mockReset();
    useUpdateCampaignAdminEntityConfigMutationMock.mockReset();
    downloadCampaignAdminEntitiesCsvMock.mockReset();
    downloadCampaignAdminEntityConfigCsvMock.mockReset();
    toastSuccessMock.mockReset();
    toastErrorMock.mockReset();
    institutionThreadsSectionMock.mockClear();
    invalidateQueriesMock.mockClear();
    useQueryClientMock.mockClear();

    useAuthMock.mockReturnValue({ isLoaded: true, isSignedIn: true });
    mockEntitiesState({ items: [] });
    useCampaignAdminEntitiesMetaQueryMock.mockReturnValue({
      data: createEntitiesMetaResponse(),
      error: null,
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    });
    useCampaignAdminEntityConfigListQueryMock.mockReturnValue({
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
    });
    useCampaignAdminEntityConfigDetailQueryMock.mockReturnValue({
      data: createEntityConfigDetail(),
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

  it("renders the sign-in gate when the user is signed out", () => {
    useAuthMock.mockReturnValue({ isLoaded: true, isSignedIn: false });

    render(
      <CampaignAdminEntitiesPage
        campaignKey="funky"
        search={{ limit: 50 }}
        onSearchChange={vi.fn()}
      />,
    );

    expect(screen.getByText("Sign in required")).toBeInTheDocument();
  });

  it("renders the migrated threads tab with the mapped thread search state", () => {
    render(
      <CampaignAdminEntitiesPage
        campaignKey="funky"
        search={{
          tab: "threads",
          limit: 50,
          threadsStateGroup: "open",
          threadsLimit: 20,
        }}
        onSearchChange={vi.fn()}
      />,
    );

    expect(
      screen.getByTestId("institution-threads-section"),
    ).toHaveTextContent("open:20");
    expect(institutionThreadsSectionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        campaignKey: "funky",
        search: expect.objectContaining({
          stateGroup: "open",
          limit: 20,
        }),
      }),
    );
  });

  it("clears thread pagination when building entity thread detail links", () => {
    render(
      <CampaignAdminEntitiesPage
        campaignKey="funky"
        search={{
          tab: "threads",
          limit: 50,
          threadsStateGroup: "open",
          threadsLimit: 20,
          threadsCursor: "cursor-9",
          threadsPageIndex: 3,
        }}
        onSearchChange={vi.fn()}
      />,
    );

    const detailLink = screen.getByRole("link", { name: "Details" });

    expect(detailLink).toHaveAttribute(
      "href",
      expect.stringContaining(
        "/admin/campaigns/funky/entities/87654321?tab=threads",
      ),
    );
    expect(detailLink).toHaveAttribute(
      "href",
      expect.stringContaining("threadsSelectedThreadId=thread-7"),
    );
    expect(detailLink).toHaveAttribute(
      "href",
      expect.stringContaining("threadsLimit=20"),
    );
    expect(detailLink).not.toHaveAttribute(
      "href",
      expect.stringContaining("threadsCursor="),
    );
    expect(detailLink).not.toHaveAttribute(
      "href",
      expect.stringContaining("threadsPageIndex="),
    );
  });

  it("invalidates institution thread queries from the page refresh button on the threads tab", () => {
    render(
      <CampaignAdminEntitiesPage
        campaignKey="funky"
        search={{
          tab: "threads",
          limit: 50,
          threadsStateGroup: "open",
          threadsLimit: 20,
        }}
        onSearchChange={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));

    expect(invalidateQueriesMock).toHaveBeenCalledWith({
      queryKey: ["campaign-admin", "funky", "institution-threads"],
    });
  });

  it("exports CSV with the current entity filters", async () => {
    mockEntitiesState({ items: [createEntityItem()] });
    downloadCampaignAdminEntitiesCsvMock.mockResolvedValue({
      blob: new Blob(["csv"]),
      filename: "entities.csv",
    });

    const createObjectURLMock = vi.fn(() => "blob:entities");
    const revokeObjectURLMock = vi.fn();
    const originalCreateObjectURL = URL.createObjectURL;
    const originalRevokeObjectURL = URL.revokeObjectURL;
    const clickMock = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});

    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: createObjectURLMock,
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: revokeObjectURLMock,
    });

    try {
      render(
        <CampaignAdminEntitiesPage
          campaignKey="funky"
          search={{
            query: "12345678",
            hasPendingReviews: true,
            sortBy: "userCount",
            sortOrder: "asc",
            limit: 25,
          }}
          onSearchChange={vi.fn()}
        />,
      );

      fireEvent.pointerDown(screen.getAllByRole("button", { name: "Table actions" })[0]);
      fireEvent.click(await screen.findByRole("menuitem", { name: "Export CSV" }));

      await waitFor(() => {
        expect(downloadCampaignAdminEntitiesCsvMock).toHaveBeenCalledWith({
          campaignKey: "funky",
          filters: {
            query: "12345678",
            hasPendingReviews: true,
            sortBy: "userCount",
            sortOrder: "asc",
          },
        });
      });

      expect(createObjectURLMock).toHaveBeenCalledTimes(1);
      expect(clickMock).toHaveBeenCalledTimes(1);
      expect(revokeObjectURLMock).toHaveBeenCalledWith("blob:entities");
      expect(toastSuccessMock).toHaveBeenCalledWith("CSV exported");
    } finally {
      clickMock.mockRestore();
      Object.defineProperty(URL, "createObjectURL", {
        configurable: true,
        value: originalCreateObjectURL,
      });
      Object.defineProperty(URL, "revokeObjectURL", {
        configurable: true,
        value: originalRevokeObjectURL,
      });
    }
  });

  it("renders the loading skeleton state", () => {
    useAuthMock.mockReturnValue({ isLoaded: false, isSignedIn: false });

    const { container } = render(
      <CampaignAdminEntitiesPage
        campaignKey="funky"
        search={{ limit: 50 }}
        onSearchChange={vi.fn()}
      />,
    );

    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(
      0,
    );
  });

  it("renders the forbidden state when the server denies access", () => {
    mockEntitiesState({
      items: [],
      error: {
        status: 403,
        message: "Forbidden",
      },
    });

    render(
      <CampaignAdminEntitiesPage
        campaignKey="funky"
        search={{ limit: 50 }}
        onSearchChange={vi.fn()}
      />,
    );

    expect(
      screen.getByText("You do not have access to entities"),
    ).toBeInTheDocument();
  });

  it("renders the empty state when no entities match", () => {
    render(
      <CampaignAdminEntitiesPage
        campaignKey="funky"
        search={{ limit: 50 }}
        onSearchChange={vi.fn()}
      />,
    );

    expect(
      screen.getByText("No entities matched the current filters"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Clear filters" }),
    ).toBeInTheDocument();
  });

  it("renders a generic error alert without hiding the entity tools", () => {
    mockEntitiesState({
      items: [],
      error: {
        status: 502,
        message: "Temporary failure",
      },
    });

    render(
      <CampaignAdminEntitiesPage
        campaignKey="funky"
        search={{ limit: 50 }}
        onSearchChange={vi.fn()}
      />,
    );

    expect(screen.getByText("Failed to load entities")).toBeInTheDocument();
    expect(screen.getByText("Temporary failure")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  it("renders entity rows, summary stats, and row action links", () => {
    mockEntitiesState({
      items: [
        createEntityItem(),
        createEntityItem({
          entityCui: "87654321",
          entityName: "Comuna Test",
          latestNotificationStatus: "delivered",
          failedNotificationCount: 0,
          hasFailedNotifications: false,
        }),
      ],
      totalCount: 23,
    });

    render(
      <CampaignAdminEntitiesPage
        campaignKey="funky"
        search={{
          sortBy: "latestInteractionAt",
          sortOrder: "desc",
          limit: 50,
        }}
        onSearchChange={vi.fn()}
      />,
    );

    expect(screen.getByRole("heading", { name: "Entities" })).toBeInTheDocument();
    expect(screen.getByText("18")).toBeInTheDocument();
    expect(screen.getAllByText("Showing 2 of 23")[0]).toBeInTheDocument();
    expect(screen.getByText("Oras Test")).toBeInTheDocument();
    expect(screen.getByText("Comuna Test")).toBeInTheDocument();

    const interactionsLinks = screen.getAllByRole("link", {
      name: "Interactions",
    });
    const notificationsLinks = screen.getAllByRole("link", {
      name: "Notifications",
    });

    expect(interactionsLinks[0]).toHaveAttribute(
      "href",
      "/admin/campaigns/funky/user-interactions?entityCui=12345678&limit=50",
    );
    expect(notificationsLinks[0]).toHaveAttribute(
      "href",
      "/admin/campaigns/funky/notifications?tab=audit&entityCui=12345678&sortBy=createdAt&sortOrder=desc&limit=50",
    );
  });

  it("renders the config tab and exports config CSV with supported filters only", async () => {
    downloadCampaignAdminEntityConfigCsvMock.mockResolvedValue({
      blob: new Blob(["csv"]),
      filename: "entity-config.csv",
    });
    const clickMock = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});
    const originalCreateObjectURL = URL.createObjectURL;
    const originalRevokeObjectURL = URL.revokeObjectURL;
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: vi.fn(() => "blob:entity-config"),
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: vi.fn(),
    });

    try {
      render(
        <CampaignAdminEntitiesPage
          campaignKey="funky"
          search={{
            tab: "config",
            configEntityCui: "12345678",
            configUpdatedAtFrom: "2026-04-10T00:00:00.000Z",
            configUpdatedAtTo: "2026-04-12T23:59:59.999Z",
            configLimit: 25,
            limit: 50,
          }}
          onSearchChange={vi.fn()}
        />,
      );

      expect(screen.getByRole("tab", { name: "Config" })).toHaveAttribute(
        "data-state",
        "active",
      );
      expect(screen.getByText("Campaign entity config")).toBeInTheDocument();
      expect(screen.getByText("Oras Test")).toBeInTheDocument();
      expect(screen.getByText("Budget publication date")).toBeInTheDocument();

      fireEvent.pointerDown(
        screen.getByRole("button", { name: "Table actions" }),
      );
      fireEvent.click(await screen.findByRole("menuitem", { name: "Export CSV" }));

      await waitFor(() => {
        expect(downloadCampaignAdminEntityConfigCsvMock).toHaveBeenCalledWith({
          campaignKey: "funky",
          filters: {
            entityCui: "12345678",
            updatedAtFrom: "2026-04-10T00:00:00.000Z",
            updatedAtTo: "2026-04-12T23:59:59.999Z",
          },
        });
      });
    } finally {
      clickMock.mockRestore();
      Object.defineProperty(URL, "createObjectURL", {
        configurable: true,
        value: originalCreateObjectURL,
      });
      Object.defineProperty(URL, "revokeObjectURL", {
        configurable: true,
        value: originalRevokeObjectURL,
      });
    }
  });

  it("preserves the typed entity CUI when opening create mode from the config toolbar", async () => {
    const onSearchChange = vi.fn();

    render(
      <CampaignAdminEntitiesPage
        campaignKey="funky"
        search={{
          tab: "config",
          limit: 50,
          configLimit: 25,
        }}
        onSearchChange={onSearchChange}
      />,
    );

    fireEvent.change(screen.getByLabelText("Entity CUI"), {
      target: { value: "12345678" },
    });
    fireEvent.pointerDown(screen.getByRole("button", { name: "Table actions" }));
    fireEvent.click(await screen.findByRole("menuitem", { name: "Create config" }));

    expect(onSearchChange).toHaveBeenCalledWith(
      expect.objectContaining<Partial<CampaignAdminEntitiesSearch>>({
        tab: "config",
        configEntityCui: "12345678",
        selectedEntityCui: "12345678",
        configCreate: true,
      }),
      { replace: true },
    );
  });

  it.each([
    {
      status: 401,
      message: "Config auth expired",
      title: "Session expired",
    },
    {
      status: 403,
      message: "Forbidden",
      title: "You do not have access to entity config",
    },
    {
      status: 404,
      message: "Unavailable",
      title: "Campaign entity config unavailable",
    },
  ])(
    "renders the config-specific unavailable state for status $status",
    ({ status, message, title }) => {
      useCampaignAdminEntityConfigListQueryMock.mockReturnValue({
        data: undefined,
        error: {
          status,
          message,
        },
        isLoading: false,
        isFetching: false,
        refetch: vi.fn(),
      });

      render(
        <CampaignAdminEntitiesPage
          campaignKey="funky"
          search={{
            tab: "config",
            limit: 50,
          }}
          onSearchChange={vi.fn()}
        />,
      );

      expect(screen.getByText(title)).toBeInTheDocument();
      expect(
        screen.queryByText("No configured rows matched the current filters"),
      ).not.toBeInTheDocument();
    },
  );
});
