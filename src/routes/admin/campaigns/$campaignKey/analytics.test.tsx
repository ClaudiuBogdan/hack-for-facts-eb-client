import { describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: Record<string, unknown>) => ({
    ...options,
    options,
  }),
}));

vi.mock("@/config/env", () => ({
  getSiteUrl: () => "https://example.com",
}));

describe("campaign analytics route", () => {
  it("defines no-store route metadata for analytics", async () => {
    const { Route } = await import("./analytics");

    const head = (
      Route.options.head as (input: { params: { campaignKey: string } }) => {
        meta: Array<{ name?: string; title?: string; content?: string }>;
      }
    )({
      params: {
        campaignKey: "funky",
      },
    });
    const headers = (Route.options.headers as () => Record<string, string>)();

    expect(Route.options.ssr).toBe(false);
    expect(headers).toEqual({
      "Cache-Control": "no-store",
    });
    expect(head.meta).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: "Campaign analytics - Transparenta.eu",
        }),
        expect.objectContaining({
          name: "canonical",
          content: "https://example.com/admin/campaigns/funky/analytics",
        }),
        expect.objectContaining({
          name: "robots",
          content: "noindex,follow",
        }),
      ]),
    );
  });
});
