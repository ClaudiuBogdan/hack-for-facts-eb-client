import { render, screen, within } from "@/test/test-utils";
import { describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { CampaignAdminEntitiesTable } from "./CampaignAdminEntitiesTable";
import type { CampaignAdminEntityListItem } from "@/features/campaigns/buget/admin/types";

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

vi.mock("@/hooks/useTablePreferences", () => ({
  useTablePreferences: () => ({
    columnVisibility: {},
    setColumnVisibility: vi.fn(),
  }),
}));

function createItem(
  overrides: Partial<CampaignAdminEntityListItem> = {},
): CampaignAdminEntityListItem {
  return {
    entityCui: "12345678",
    entityName: "Oras Test",
    userCount: 4,
    interactionCount: 11,
    pendingReviewCount: 2,
    notificationSubscriberCount: 3,
    notificationOutboxCount: 5,
    failedNotificationCount: 1,
    latestInteractionAt: "2026-04-12T10:00:00.000Z",
    latestInteractionId: "funky:interaction:public_debate_request",
    latestNotificationAt: "2026-04-12T10:30:00.000Z",
    latestNotificationType: "funky:outbox:entity_update",
    latestNotificationStatus: "failed_permanent",
    hasPendingReviews: true,
    hasSubscribers: true,
    hasNotificationActivity: true,
    hasFailedNotifications: true,
    ...overrides,
  };
}

describe("CampaignAdminEntitiesTable", () => {
  it("renders details, users, interactions, and notifications links for each entity row", () => {
    render(
      <CampaignAdminEntitiesTable
        campaignKey="funky"
        items={[createItem()]}
        onClearFilters={vi.fn()}
      />,
    );

    const row = screen.getByText("Oras Test").closest("tr");
    expect(row).not.toBeNull();

    const rowQueries = within(row!);

    expect(rowQueries.getByRole("link", { name: "Details" })).toHaveAttribute(
      "href",
      "/admin/campaigns/funky/entities/12345678?tab=overview&limit=50",
    );
    expect(rowQueries.getByRole("link", { name: "Users" })).toHaveAttribute(
      "href",
      "/admin/campaigns/funky/users?entityCui=12345678&sortBy=latestUpdatedAt&sortOrder=desc&limit=50",
    );
    expect(
      rowQueries.getByRole("link", { name: "Interactions" }),
    ).toHaveAttribute(
      "href",
      "/admin/campaigns/funky/user-interactions?entityCui=12345678&limit=50",
    );
    expect(
      rowQueries.getByRole("link", { name: "Notifications" }),
    ).toHaveAttribute(
      "href",
      "/admin/campaigns/funky/notifications?tab=audit&entityCui=12345678&sortBy=createdAt&sortOrder=desc&limit=50",
    );
  });
});
