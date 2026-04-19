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
  it("defines no-store route metadata and validates detail search state", async () => {
    const { Route } = await import("./entities.$entityCui");
    const search = (
      Route.options.validateSearch as { parse: (value: unknown) => unknown }
    ).parse({
      tab: "threads",
      threadsSelectedThreadId: "thread-1",
      threadsLimit: "20",
    });

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
    expect(search).toEqual({
      tab: "threads",
      limit: 50,
      threadsSelectedThreadId: "thread-1",
      threadsLimit: 20,
    });
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
