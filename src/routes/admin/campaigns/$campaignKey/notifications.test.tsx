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

describe("campaign notifications route", () => {
  it("defines no-store route metadata and validates notifications search", async () => {
    const { Route } = await import("./notifications");

    const search = (
      Route.options.validateSearch as { parse: (value: unknown) => unknown }
    ).parse({
      limit: "25",
    });
    const head = (
      Route.options.head as (input: { params: { campaignKey: string } }) => {
        meta: Array<{ name?: string; title?: string; content?: string }>;
      }
    )({
      params: {
        campaignKey: "funky",
      },
    });

    expect(Route.options.ssr).toBe(false);
    expect(search).toEqual({
      limit: 25,
    });
    expect(head.meta).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: "Campaign notifications - Transparenta.eu",
        }),
        expect.objectContaining({
          name: "canonical",
          content: "https://example.com/admin/campaigns/funky/notifications",
        }),
      ]),
    );
  });
});
