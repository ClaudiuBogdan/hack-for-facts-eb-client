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

describe("campaign institution thread detail route", () => {
  it("defines no-store route metadata without detail search validation", async () => {
    const { Route } = await import("./institution-threads.$threadId");

    const head = (
      Route.options.head as (input: {
        params: { campaignKey: string; threadId: string };
      }) => {
        meta: Array<{ name?: string; title?: string; content?: string }>;
      }
    )({
      params: {
        campaignKey: "funky",
        threadId: "thread/1",
      },
    });

    expect(Route.options.ssr).toBe(false);
    expect(Route.options.validateSearch).toBeUndefined();
    expect(head.meta).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: "Institution thread - Transparenta.eu",
        }),
        expect.objectContaining({
          name: "canonical",
          content:
            "https://example.com/admin/campaigns/funky/institution-threads/thread%2F1",
        }),
      ]),
    );
  });
});
