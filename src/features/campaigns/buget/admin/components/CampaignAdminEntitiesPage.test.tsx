import { fireEvent, render, screen, waitFor } from "@/test/test-utils";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CampaignAdminEntitiesPage } from "./CampaignAdminEntitiesPage";
import type {
  CampaignAdminEntitiesMetaResponse,
  CampaignAdminEntityListItem,
} from "@/features/campaigns/buget/admin/types";

const useAuthMock = vi.fn();
const useCampaignAdminEntitiesQueryMock = vi.fn();
const useCampaignAdminEntitiesMetaQueryMock = vi.fn();
const downloadCampaignAdminEntitiesCsvMock = vi.fn();
const toastSuccessMock = vi.fn();
const toastErrorMock = vi.fn();

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

vi.mock("@/features/campaigns/buget/admin/api/campaign-admin-entities", () => ({
  downloadCampaignAdminEntitiesCsv: (...args: unknown[]) =>
    downloadCampaignAdminEntitiesCsvMock(...args),
}));

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
    downloadCampaignAdminEntitiesCsvMock.mockReset();
    toastSuccessMock.mockReset();
    toastErrorMock.mockReset();

    useAuthMock.mockReturnValue({ isLoaded: true, isSignedIn: true });
    mockEntitiesState({ items: [] });
    useCampaignAdminEntitiesMetaQueryMock.mockReturnValue({
      data: createEntitiesMetaResponse(),
      error: null,
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
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
});
