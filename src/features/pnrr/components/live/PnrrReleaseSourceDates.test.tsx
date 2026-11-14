import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { PnrrLiveRelease } from "@/schemas/pnrr-live";
import { PnrrReleaseSourceDates } from "./PnrrLivePages";

const release: PnrrLiveRelease = {
  releaseId: "test-release",
  releaseKind: "operational_snapshot",
  state: "degraded",
  sourceSnapshotAt: "2026-10-15T00:00:00Z",
  completedAt: "2026-11-14T11:00:00Z",
  limitation: "",
  lanes: [
    {
      lane: "progress_observations",
      state: "served",
      asOf: "2026-10-15",
      suspended: false,
      reasonCodes: [],
    },
    {
      lane: "ords_payments_capture",
      state: "abstained",
      asOf: "2026-11-13 06:17:28+00",
      suspended: false,
      reasonCodes: ["payment_policy_pending"],
    },
  ],
};

describe("PNRR release source dates", () => {
  it("shows the MIPE snapshot and ORDS capture with their own dates", () => {
    render(<PnrrReleaseSourceDates release={release} />);

    expect(
      screen.getByText("MIPE project snapshot").nextElementSibling,
    ).toHaveTextContent(/15/);
    expect(
      screen.getByText("ORDS payments capture").nextElementSibling,
    ).toHaveTextContent(/13/);
  });

  it("does not substitute a release or served-payment date for missing capture dates", () => {
    render(
      <PnrrReleaseSourceDates
        release={{
          ...release,
          lanes: [{ ...release.lanes[1]!, lane: "payments" }],
        }}
      />,
    );

    expect(screen.getAllByText("—")).toHaveLength(2);
  });
});
