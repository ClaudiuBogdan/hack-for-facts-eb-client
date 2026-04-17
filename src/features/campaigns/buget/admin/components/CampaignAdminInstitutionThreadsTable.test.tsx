import { fireEvent, render, screen } from "@testing-library/react";
import type {
  KeyboardEventHandler,
  MouseEventHandler,
  ReactNode,
} from "react";
import { describe, expect, it, vi } from "vitest";
import { CampaignAdminInstitutionThreadsTable } from "./CampaignAdminInstitutionThreadsTable";
import type { CampaignAdminInstitutionThreadListItem } from "@/features/campaigns/buget/admin/types";

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    to,
    onClick,
    onKeyDown,
  }: {
    readonly children: ReactNode;
    readonly to?: string;
    readonly onClick?: MouseEventHandler<HTMLAnchorElement>;
    readonly onKeyDown?: KeyboardEventHandler<HTMLAnchorElement>;
  }) => (
    <a href={to} onClick={onClick} onKeyDown={onKeyDown}>
      {children}
    </a>
  ),
}));

function createThreadItem(
  overrides: Partial<CampaignAdminInstitutionThreadListItem> = {},
): CampaignAdminInstitutionThreadListItem {
  return {
    id: "thread-1",
    entityCui: "12345678",
    entityName: "Oras Test",
    campaignKey: "funky",
    submissionPath: "platform_send",
    ownerUserId: "user-1",
    institutionEmail: "contact@primarie.ro",
    subject: "Public debate request",
    threadState: "pending",
    currentResponseStatus: "registration_number_received",
    createdAt: "2026-04-10T10:00:00.000Z",
    updatedAt: "2026-04-12T10:00:00.000Z",
    latestResponseAt: "2026-04-12T09:00:00.000Z",
    responseEventCount: 1,
    notificationAudience: {
      requesterCount: 1,
      subscriberCount: 2,
      eligibleRequesterCount: 1,
      eligibleSubscriberCount: 1,
    },
    ...overrides,
  };
}

describe("CampaignAdminInstitutionThreadsTable", () => {
  it("opens the sheet when a row is clicked", () => {
    const onOpenThread = vi.fn();

    render(
      <CampaignAdminInstitutionThreadsTable
        campaignKey="funky"
        items={[createThreadItem()]}
        search={{ limit: 50, stateGroup: "open" }}
        onOpenThread={onOpenThread}
        onClearFilters={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByText("Oras Test"));

    expect(onOpenThread).toHaveBeenCalledWith("thread-1");
  });

  it("keeps explicit row actions from triggering the row click handler twice", () => {
    const onOpenThread = vi.fn();

    render(
      <CampaignAdminInstitutionThreadsTable
        campaignKey="funky"
        items={[createThreadItem()]}
        search={{ limit: 50, stateGroup: "open" }}
        onOpenThread={onOpenThread}
        onClearFilters={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Open panel" }));

    expect(onOpenThread).toHaveBeenCalledTimes(1);
    expect(onOpenThread).toHaveBeenCalledWith("thread-1");

    onOpenThread.mockClear();

    fireEvent.click(screen.getByRole("link", { name: "Open details" }));

    expect(onOpenThread).not.toHaveBeenCalled();
  });
});
