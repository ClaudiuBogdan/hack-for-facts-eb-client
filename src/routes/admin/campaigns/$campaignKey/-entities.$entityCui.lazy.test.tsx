import { render, screen } from "@/test/test-utils";
import { existsSync } from "node:fs";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const entityDetailPagePath = new URL(
  "../../../../features/campaigns/buget/admin/components/CampaignAdminEntityDetailPage.tsx",
  import.meta.url,
);
const describeIfEntityDetailPageExists = existsSync(entityDetailPagePath)
  ? describe
  : describe.skip;

const useParamsMock = vi.fn(() => ({
  campaignKey: "funky",
  entityCui: "12345678",
}));
const entityDetailPageMock = vi.fn(
  ({
    campaignKey,
    entityCui,
  }: {
    readonly campaignKey: string;
    readonly entityCui: string;
  }) => (
    <div>
      <div>{campaignKey}</div>
      <div>{entityCui}</div>
    </div>
  ),
);

vi.mock("@tanstack/react-router", () => ({
  createLazyFileRoute: () => (options: Record<string, unknown>) => ({
    ...options,
    options,
    useParams: useParamsMock,
  }),
}));

vi.mock(
  "@/features/campaigns/buget/admin/components/CampaignAdminEntityDetailPage",
  () => ({
    CampaignAdminEntityDetailPage: (props: unknown) =>
      entityDetailPageMock(
        props as {
          readonly campaignKey: string;
          readonly entityCui: string;
        },
      ),
  }),
);

describeIfEntityDetailPageExists("campaign entity detail lazy route", () => {
  beforeEach(() => {
    useParamsMock.mockReset();
    entityDetailPageMock.mockClear();

    useParamsMock.mockReturnValue({
      campaignKey: "funky",
      entityCui: "12345678",
    });
  });

  it("passes the resolved campaign key and entity cui to the detail page", async () => {
    const { Route } = await import("./entities.$entityCui.lazy");
    const RouteComponent = Route.options.component as () => ReactNode;

    render(<RouteComponent />);

    expect(screen.getByText("funky")).toBeInTheDocument();
    expect(screen.getByText("12345678")).toBeInTheDocument();
    expect(entityDetailPageMock).toHaveBeenCalledWith(
      expect.objectContaining({
        campaignKey: "funky",
        entityCui: "12345678",
      }),
    );
  });
});
