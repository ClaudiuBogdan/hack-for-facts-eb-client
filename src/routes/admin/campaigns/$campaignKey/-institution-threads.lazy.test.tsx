import { fireEvent, render, screen } from "@/test/test-utils";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const navigateMock = vi.fn();
const useParamsMock = vi.fn(() => ({ campaignKey: "funky" }));
const useSearchMock = vi.fn(() => ({
  stateGroup: "open",
  limit: 50,
}));
const useLocationMock = vi.fn(() => ({
  pathname: "/admin/campaigns/funky/institution-threads",
}));
const pageMock = vi.fn(
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
      <div>{String(search.stateGroup)}</div>
      <button
        type="button"
        onClick={() =>
          onSearchChange(
            {
              stateGroup: "closed",
              threadState: "resolved",
              query: "reply",
              selectedThreadId: "thread-1",
              limit: 25,
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
  Outlet: () => <div>Institution thread detail outlet</div>,
  useLocation: () => useLocationMock(),
  useNavigate: () => navigateMock,
}));

vi.mock(
  "@/features/campaigns/buget/admin/components/CampaignAdminInstitutionThreadsPage",
  () => ({
    CampaignAdminInstitutionThreadsPage: (props: unknown) =>
      pageMock(
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

describe("campaign institution threads lazy route", () => {
  beforeEach(() => {
    navigateMock.mockReset();
    useLocationMock.mockReset();
    pageMock.mockClear();

    useLocationMock.mockReturnValue({
      pathname: "/admin/campaigns/funky/institution-threads",
    });
  });

  it("passes the resolved campaign key and routes search changes through navigate", async () => {
    const { Route } = await import("./institution-threads.lazy");
    const RouteComponent = Route.options.component as () => ReactNode;

    render(<RouteComponent />);

    expect(screen.getByText("funky")).toBeInTheDocument();
    expect(screen.getByText("open")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Change search" }));

    expect(navigateMock).toHaveBeenCalledWith({
      search: {
        stateGroup: "closed",
        threadState: "resolved",
        responseStatus: undefined,
        query: "reply",
        entityCui: undefined,
        updatedAtFrom: undefined,
        updatedAtTo: undefined,
        latestResponseAtFrom: undefined,
        latestResponseAtTo: undefined,
        selectedThreadId: "thread-1",
        cursor: undefined,
        pageIndex: undefined,
        limit: 25,
      },
      replace: true,
    });
  });

  it("renders the outlet for nested detail routes", async () => {
    useLocationMock.mockReturnValue({
      pathname: "/admin/campaigns/funky/institution-threads/thread-1",
    });

    const { Route } = await import("./institution-threads.lazy");
    const RouteComponent = Route.options.component as () => ReactNode;

    render(<RouteComponent />);

    expect(screen.getByText("Institution thread detail outlet")).toBeInTheDocument();
    expect(pageMock).not.toHaveBeenCalled();
  });
});
