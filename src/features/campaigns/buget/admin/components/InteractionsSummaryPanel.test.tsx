import { fireEvent, render, screen } from "@/test/test-utils";
import { describe, expect, it, vi } from "vitest";
import { InteractionsSummaryPanel } from "./InteractionsSummaryPanel";
import type { CampaignAdminInteractionMetaStats } from "../types";

const baseStats: CampaignAdminInteractionMetaStats = {
  total: 100,
  riskFlagged: 5,
  withInstitutionThread: 20,
  reviewStatusCounts: {
    pending: 30,
    approved: 50,
    rejected: 15,
    notReviewed: 5,
  },
  phaseCounts: {
    idle: 10,
    draft: 20,
    pending: 30,
    resolved: 35,
    failed: 5,
  },
  threadPhaseCounts: {
    sending: 3,
    awaiting_reply: 7,
    reply_received_unreviewed: 4,
    manual_follow_up_needed: 2,
    resolved_positive: 5,
    resolved_negative: 2,
    closed_no_response: 1,
    failed: 1,
    none: 70,
  },
};

describe("InteractionsSummaryPanel", () => {
  it("renders compact stats bar with core metrics", () => {
    render(
      <InteractionsSummaryPanel
        stats={baseStats}
        isExpanded={false}
        onExpandedChange={vi.fn()}
      />,
    );

    const statLabels = screen.getAllByTestId("compact-stat-label").map((el) => el.textContent);
    expect(statLabels).toContain("Interactions");
    expect(statLabels).toContain("Pending");
    expect(statLabels).toContain("Approved");
    expect(statLabels).toContain("Rejected");
    expect(statLabels).toContain("Flagged");
    expect(statLabels).toContain("In progress");

    const statValues = screen.getAllByTestId("compact-stat-value").map((el) => el.textContent);
    expect(statValues).toContain("100");
    expect(statValues).toContain("30");
    expect(statValues).toContain("50");
    expect(statValues).toContain("15");
    expect(statValues).toContain("5");
    expect(statValues).toContain("10");
  });

  it("hides Flagged when riskFlagged is zero", () => {
    const stats = { ...baseStats, riskFlagged: 0 };
    render(
      <InteractionsSummaryPanel
        stats={stats}
        isExpanded={false}
        onExpandedChange={vi.fn()}
      />,
    );

    const statLabels = screen.getAllByTestId("compact-stat-label").map((el) => el.textContent);
    expect(statLabels).not.toContain("Flagged");
  });

  it("hides In progress when no threads are sending or awaiting_reply", () => {
    const stats: CampaignAdminInteractionMetaStats = {
      ...baseStats,
      threadPhaseCounts: {
        ...baseStats.threadPhaseCounts,
        sending: 0,
        awaiting_reply: 0,
      },
    };
    render(
      <InteractionsSummaryPanel
        stats={stats}
        isExpanded={false}
        onExpandedChange={vi.fn()}
      />,
    );

    const statLabels = screen.getAllByTestId("compact-stat-label").map((el) => el.textContent);
    expect(statLabels).not.toContain("In progress");
  });

  it("shows expanded summary cards when isExpanded is true", () => {
    render(
      <InteractionsSummaryPanel
        stats={baseStats}
        isExpanded={true}
        onExpandedChange={vi.fn()}
      />,
    );

    expect(screen.getAllByText("Review status").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Phase").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Threads").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Risk flags").length).toBeGreaterThan(0);
    expect(screen.getByText(/1 Thread failed/)).toBeInTheDocument();
    expect(screen.getByText(/70 No thread/)).toBeInTheDocument();
  });

  it("calls onExpandedChange when toggle is clicked", () => {
    const onExpandedChange = vi.fn();
    render(
      <InteractionsSummaryPanel
        stats={baseStats}
        isExpanded={false}
        onExpandedChange={onExpandedChange}
      />,
    );

    fireEvent.click(screen.getByText("Show more"));
    expect(onExpandedChange).toHaveBeenCalledWith(true);
  });
});
