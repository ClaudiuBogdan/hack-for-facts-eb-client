import { fireEvent, render, screen, within } from "@/test/test-utils";
import { describe, expect, it } from "vitest";
import { CampaignAdminNotificationPlanTable } from "./CampaignAdminNotificationPlanTable";

describe("CampaignAdminNotificationPlanTable", () => {
  it("renders scan-friendly row statuses and fallbacks", () => {
    render(
      <CampaignAdminNotificationPlanTable
        activeFilter="all"
        onFilterChange={() => {}}
        rows={[
          {
            rowKey: "row-1",
            userId: "clerk_user_1234567890abcdef",
            entityCui: "12345678",
            entityName: "Entity One",
            recordKey: "record-1",
            interactionId: "interaction-1",
            interactionLabel: "Budget report",
            reviewStatus: "approved",
            reviewedAt: "2026-04-12T08:00:00.000Z",
            status: "will_send",
            reasonCode: "eligible",
            statusMessage: "Matches all conditions and is ready to send.",
            hasExistingDelivery: false,
            existingDeliveryStatus: null,
            sendMode: "create",
          },
          {
            rowKey: "row-2",
            userId: "user-2",
            entityCui: null,
            entityName: null,
            recordKey: null,
            interactionId: null,
            interactionLabel: null,
            reviewStatus: null,
            reviewedAt: null,
            status: "already_sent",
            reasonCode: "already_sent",
            statusMessage: "This notification was already sent before.",
            hasExistingDelivery: true,
            existingDeliveryStatus: "delivered",
            sendMode: null,
          },
          {
            rowKey: "row-3",
            userId: "user-3",
            entityCui: null,
            entityName: "Entity Three",
            recordKey: null,
            interactionId: "interaction-3",
            interactionLabel: null,
            reviewStatus: "rejected",
            reviewedAt: null,
            status: "already_pending",
            reasonCode: "already_pending",
            statusMessage: "This notification is already queued to send.",
            hasExistingDelivery: true,
            existingDeliveryStatus: "pending",
            sendMode: "reuse_claimable",
          },
          {
            rowKey: "row-4",
            userId: "user-4",
            entityCui: null,
            entityName: "Entity Four",
            recordKey: null,
            interactionId: "interaction-4",
            interactionLabel: null,
            reviewStatus: null,
            reviewedAt: null,
            status: "ineligible",
            reasonCode: "no_email",
            statusMessage: "The user is not eligible to receive this notification.",
            hasExistingDelivery: false,
            existingDeliveryStatus: null,
            sendMode: null,
          },
          {
            rowKey: "row-5",
            userId: "user-5",
            entityCui: null,
            entityName: "Entity Five",
            recordKey: null,
            interactionId: "interaction-5",
            interactionLabel: null,
            reviewStatus: null,
            reviewedAt: null,
            status: "missing_data",
            reasonCode: "missing_subject",
            statusMessage: "Missing subject data for this notification.",
            hasExistingDelivery: false,
            existingDeliveryStatus: null,
            sendMode: null,
          },
        ]}
      />,
    );

    expect(
      screen.getByRole("button", { name: /All\s*5/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Ready\s*1/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Already sent\s*1/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Not ready\s*3/ }),
    ).toBeInTheDocument();
    expect(screen.getByText("clerk_us…cdef")).toBeInTheDocument();
    expect(screen.getByText("Ready to send")).toBeInTheDocument();
    expect(screen.getAllByText("Already sent").length).toBeGreaterThan(0);
    expect(screen.getByText("Already queued")).toBeInTheDocument();
    expect(screen.getByText("Not eligible")).toBeInTheDocument();
    expect(screen.getByText("Missing data")).toBeInTheDocument();
    expect(screen.getAllByText("No entity CUI").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Unavailable").length).toBeGreaterThan(0);
    expect(
      screen.getByText("Matches all conditions and is ready to send."),
    ).toBeInTheDocument();
    expect(screen.queryByText("eligible")).not.toBeInTheDocument();

    const firstRow = screen.getByRole("row", {
      name: /clerk_us…cdef.*Entity One.*Ready to send/i,
    });
    expect(within(firstRow).getByText("Matches all conditions and is ready to send.")).toBeInTheDocument();

    fireEvent.click(
      screen.getAllByRole("button", { name: "Show technical details" })[0]!,
    );

    expect(screen.getByText("Full user ID")).toBeInTheDocument();
    expect(screen.getByText("clerk_user_1234567890abcdef")).toBeInTheDocument();
    expect(screen.getByText("Reason code")).toBeInTheDocument();
    expect(screen.getByText("eligible")).toBeInTheDocument();
  });
});
