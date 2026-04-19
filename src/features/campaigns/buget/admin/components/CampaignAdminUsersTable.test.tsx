import { render, screen } from "@/test/test-utils";
import { describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { CampaignAdminUsersTable } from "./CampaignAdminUsersTable";
import type { CampaignAdminUserListItem } from "@/features/campaigns/buget/admin/types";

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    to,
    params,
    search,
    ...props
  }: {
    readonly children: ReactNode;
    readonly to?: string;
    readonly params?: Record<string, string>;
    readonly search?: Record<string, string | number | boolean | undefined>;
    readonly [key: string]: unknown;
  }) => {
    let href = typeof to === "string" ? to : "";
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        href = href.replace(`$${key}`, value);
      }
    }

    const query = search
      ? new URLSearchParams(
          Object.entries(search)
            .filter(([, value]) => value !== undefined)
            .map(([key, value]) => [key, String(value)]),
        ).toString()
      : "";

    return (
      <a href={query ? `${href}?${query}` : href} {...props}>
        {children}
      </a>
    );
  },
}));

function createItem(
  overrides: Partial<CampaignAdminUserListItem> = {},
): CampaignAdminUserListItem {
  return {
    userId: "user-1",
    interactionCount: 2,
    pendingReviewCount: 1,
    latestUpdatedAt: "2026-04-12T10:00:00.000Z",
    latestInteractionId: "funky:interaction:city_hall_contact",
    latestEntityCui: "12345678",
    latestEntityName: "Oras Test",
    ...overrides,
  };
}

describe("CampaignAdminUsersTable", () => {
  it("keeps the entity line linked when a latest entity CUI is available", () => {
    render(
      <CampaignAdminUsersTable
        campaignKey="funky"
        items={[createItem()]}
      />,
    );

    expect(screen.getByText("City hall contact")).toBeInTheDocument();

    const entityText = screen.getByText("Oras Test · 12345678");
    expect(entityText).toBeInTheDocument();
    expect(entityText.closest("a")).toHaveAttribute(
      "href",
      "/admin/campaigns/funky/entities/12345678?tab=users&limit=50",
    );
  });

  it("renders the latest entity name as plain text when the CUI is missing", () => {
    render(
      <CampaignAdminUsersTable
        campaignKey="funky"
        items={[
          createItem({
            latestEntityCui: null,
            latestEntityName: "Oras Fara CUI",
          }),
        ]}
      />,
    );

    const entityText = screen.getByText("Oras Fara CUI");

    expect(entityText).toBeInTheDocument();
    expect(entityText.closest("a")).toBeNull();
    expect(screen.queryByText("No entity")).not.toBeInTheDocument();
  });

  it("shows the empty-state fallback only when both latest entity fields are absent", () => {
    render(
      <CampaignAdminUsersTable
        campaignKey="funky"
        items={[
          createItem({
            latestEntityCui: null,
            latestEntityName: null,
          }),
        ]}
      />,
    );

    expect(screen.getByText("No entity")).toBeInTheDocument();
  });
});
