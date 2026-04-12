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

describe("campaign entity detail route", () => {
  it("defines no-store route metadata without detail search state", async () => {
    const { Route } = await import("./entities.$entityCui");

    const head = (
      Route.options.head as (input: {
        params: { campaignKey: string; entityCui: string };
      }) => {
        meta: Array<{ name?: string; title?: string; content?: string }>;
      }
    )({
      params: {
        campaignKey: "funky",
        entityCui: "12/34 56",
      },
    });

    expect(Route.options.ssr).toBe(false);
    expect(Route.options.validateSearch).toBeUndefined();
    expect(head.meta).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: "Campaign entity page - Transparenta.eu",
        }),
        expect.objectContaining({
          name: "canonical",
          content:
            "https://example.com/admin/campaigns/funky/entities/12%2F34%2056",
        }),
        expect.objectContaining({
          name: "robots",
          content: "noindex,follow",
        }),
      ]),
    );
  });
});
