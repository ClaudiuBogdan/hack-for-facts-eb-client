import { fireEvent, render, screen } from "@/test/test-utils";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

const navigateMock = vi.fn();
const useParamsMock = vi.fn(() => ({ campaignKey: "funky" }));
const useSearchMock = vi.fn(() => ({
  tab: "audit",
  sortBy: "createdAt",
  sortOrder: "desc",
  limit: 50,
}));
const notificationsPageMock = vi.fn(
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
      <div>{String(search.tab)}</div>
      <button
        type="button"
        onClick={() => {
          onSearchChange(
            {
              tab: "templates",
              sortBy: "createdAt",
              sortOrder: "desc",
              limit: 50,
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
  useNavigate: () => navigateMock,
}));

vi.mock(
  "@/features/campaigns/buget/admin/components/CampaignAdminNotificationsPage",
  () => ({
    CampaignAdminNotificationsPage: (props: unknown) =>
      notificationsPageMock(
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

describe("campaign notifications lazy route", () => {
  it("passes the resolved campaign key and routes search changes through navigate", async () => {
    const { Route } = await import("./notifications.lazy");
    const RouteComponent = Route.options.component as () => ReactNode;

    render(<RouteComponent />);

    expect(screen.getByText("funky")).toBeInTheDocument();
    expect(screen.getByText("audit")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Change search" }));

    expect(navigateMock).toHaveBeenCalledWith({
      search: {
        tab: "templates",
        notificationType: undefined,
        templateId: undefined,
        userId: undefined,
        status: undefined,
        eventType: undefined,
        entityCui: undefined,
        threadId: undefined,
        source: undefined,
        sortBy: "createdAt",
        sortOrder: "desc",
        cursor: undefined,
        pageIndex: undefined,
        limit: 50,
      },
      replace: true,
    });
    expect(notificationsPageMock).toHaveBeenCalled();
  });
});
