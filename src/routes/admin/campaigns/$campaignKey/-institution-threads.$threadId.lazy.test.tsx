import { render, screen } from "@/test/test-utils";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const useParamsMock = vi.fn(() => ({
  campaignKey: "funky",
  threadId: "thread-1",
}));
const useSearchMock = vi.fn(() => ({
  stateGroup: "open",
  limit: 50,
}));
const detailPageMock = vi.fn(
  ({
    campaignKey,
    threadId,
    search,
  }: {
    readonly campaignKey: string;
    readonly threadId: string;
    readonly search: Record<string, unknown>;
  }) => (
    <div>
      <div>{campaignKey}</div>
      <div>{threadId}</div>
      <div>{String(search.stateGroup)}</div>
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
}));

vi.mock(
  "@/features/campaigns/buget/admin/components/CampaignAdminInstitutionThreadDetailPage",
  () => ({
    CampaignAdminInstitutionThreadDetailPage: (props: unknown) =>
      detailPageMock(
        props as {
          readonly campaignKey: string;
          readonly threadId: string;
          readonly search: Record<string, unknown>;
        },
      ),
  }),
);

describe("campaign institution thread detail lazy route", () => {
  beforeEach(() => {
    useParamsMock.mockReset();
    useSearchMock.mockReset();
    detailPageMock.mockClear();

    useParamsMock.mockReturnValue({
      campaignKey: "funky",
      threadId: "thread-1",
    });
    useSearchMock.mockReturnValue({
      stateGroup: "open",
      limit: 50,
    });
  });

  it("passes campaign key, thread id, and parent search to the detail page", async () => {
    const { Route } = await import("./institution-threads.$threadId.lazy");
    const RouteComponent = Route.options.component as () => ReactNode;

    render(<RouteComponent />);

    expect(screen.getByText("funky")).toBeInTheDocument();
    expect(screen.getByText("thread-1")).toBeInTheDocument();
    expect(screen.getByText("open")).toBeInTheDocument();
    expect(detailPageMock).toHaveBeenCalledWith(
      expect.objectContaining({
        campaignKey: "funky",
        threadId: "thread-1",
        search: expect.objectContaining({
          stateGroup: "open",
          limit: 50,
        }),
      }),
    );
  });
});
