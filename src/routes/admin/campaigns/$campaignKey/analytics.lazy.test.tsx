import { render, screen } from "@/test/test-utils";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

const useParamsMock = vi.fn(() => ({ campaignKey: "funky" }));
const analyticsPageMock = vi.fn(
  ({ campaignKey }: { readonly campaignKey: string }) => (
    <div>{campaignKey}</div>
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
  "@/features/campaigns/buget/admin/components/CampaignAdminAnalyticsPage",
  () => ({
    CampaignAdminAnalyticsPage: (props: unknown) =>
      analyticsPageMock(
        props as {
          readonly campaignKey: string;
        },
      ),
  }),
);

describe("campaign analytics lazy route", () => {
  it("passes the resolved campaign key to the analytics page", async () => {
    const { Route } = await import("./analytics.lazy");
    const RouteComponent = Route.options.component as () => ReactNode;

    render(<RouteComponent />);

    expect(screen.getByText("funky")).toBeInTheDocument();
    expect(analyticsPageMock).toHaveBeenCalledWith({
      campaignKey: "funky",
    });
  });

  it("throws when the campaign key is unsupported", async () => {
    useParamsMock.mockReturnValueOnce({ campaignKey: "other" });
    const { Route } = await import("./analytics.lazy");
    const RouteComponent = Route.options.component as () => ReactNode;

    expect(() => RouteComponent()).toThrowError(
      "Unsupported campaign admin key: other",
    );
  });
});
