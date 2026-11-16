import { i18n } from "@lingui/core";
import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PnrrLiveRelease } from "@/schemas/pnrr-live";
import { PnrrReleaseSourceDates } from "./PnrrLivePages";

const release: PnrrLiveRelease = {
  releaseId: "test-release",
  releaseKind: "mipe_scoped",
  state: "degraded",
  sourceSnapshotAt: "2026-10-15T00:00:00Z",
  completedAt: "2026-11-14T11:00:00Z",
  limitation: "",
  lanes: [
    {
      lane: "mipe_projects",
      state: "served",
      asOf: "2026-10-15",
      suspended: false,
      reasonCodes: [],
    },
    {
      lane: "mipe_indicators",
      state: "served",
      asOf: "2026-10-01",
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

// The test build's Lingui is a writable stand-in pinned to "en" whose
// `activate` does nothing (see src/lib/i18n.test.ts). Make it switch, so the
// unmocked `getUserLocale()` reads the active language as it does in the app,
// where the root route activates the request's locale before rendering.
const lingui = i18n as { locale: string };
const initialLocale = i18n.locale;

const dateFor = (label: string) =>
  screen.getByText(label).nextElementSibling?.textContent ?? "";

describe("PNRR release source dates", () => {
  beforeEach(() => {
    vi.spyOn(i18n, "activate").mockImplementation((locale: string) => {
      lingui.locale = locale;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    lingui.locale = initialLocale;
  });

  it("shows the MIPE project snapshot and ORDS capture with their own dates", () => {
    render(<PnrrReleaseSourceDates release={release} />);

    expect(dateFor("MIPE project snapshot")).toMatch(/15/);
    expect(dateFor("ORDS payments capture")).toMatch(/13/);
  });

  it("keeps the withheld ORDS lane's capture date instead of a paid-fact date", () => {
    render(<PnrrReleaseSourceDates release={release} />);

    expect(dateFor("ORDS payments capture")).toMatch(/2026/);
    expect(screen.queryByText(/paid/i)).toBeNull();
  });

  it.each([
    ["ro", /^15 oct\.? 2026$/, /^13 nov\.? 2026$/],
    ["en", /^Oct 15, 2026$/, /^Nov 13, 2026$/],
  ] as const)(
    "formats both source dates for the %s locale",
    (locale, mipeDate, ordsDate) => {
      i18n.activate(locale);
      expect(i18n.locale).toBe(locale);

      render(<PnrrReleaseSourceDates release={release} />);

      expect(dateFor("MIPE project snapshot")).toMatch(mipeDate);
      expect(dateFor("ORDS payments capture")).toMatch(ordsDate);
    },
  );

  it("does not substitute a release or served-payment date for missing capture dates", () => {
    render(
      <PnrrReleaseSourceDates
        release={{
          ...release,
          lanes: [
            { ...release.lanes[0]!, lane: "progress_observations" },
            { ...release.lanes[2]!, lane: "payments" },
          ],
        }}
      />,
    );

    expect(screen.getAllByText("—")).toHaveLength(2);
  });
});
