import { render, screen } from "@/test/test-utils";
import { describe, expect, it } from "vitest";
import { CampaignAdminNotificationPlanSummary } from "./CampaignAdminNotificationPlanSummary";

describe("CampaignAdminNotificationPlanSummary", () => {
  it("renders all summary counts", () => {
    render(
      <CampaignAdminNotificationPlanSummary
        summary={{
          totalRowCount: 12,
          willSendCount: 5,
          alreadySentCount: 2,
          alreadyPendingCount: 1,
          ineligibleCount: 3,
          missingDataCount: 1,
        }}
      />,
    );

    expect(
      screen.getByRole("generic", { name: "Notification preview summary" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Total matches")).toBeInTheDocument();
    expect(screen.getByText("Ready to send")).toBeInTheDocument();
    expect(screen.getByText("Already sent")).toBeInTheDocument();
    expect(screen.getByText("Not ready to send")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getAllByText("5")).toHaveLength(2);
    expect(screen.getByText("2")).toBeInTheDocument();
  });
});
