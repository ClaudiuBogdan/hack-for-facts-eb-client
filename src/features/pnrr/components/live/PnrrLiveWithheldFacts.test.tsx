import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  pnrrOverviewSchema,
  pnrrPlaceSummarySchema,
  type PnrrLiveRelease,
} from "@/schemas/pnrr-live";
import {
  usePnrrLiveOrganization,
  usePnrrLiveOrganizationProfile,
  usePnrrLiveOrganizationProjects,
  usePnrrLiveOverview,
  usePnrrLivePlaces,
  usePnrrLiveStatus,
} from "../../hooks/use-pnrr-live-data";
import {
  PnrrLiveOrganizationPage,
  PnrrLiveOverviewPage,
  PnrrLivePlacesPage,
} from "./PnrrLivePages";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to }: { readonly children: ReactNode; readonly to: string }) => (
    <a href={to}>{children}</a>
  ),
}));

vi.mock("../../hooks/use-pnrr-live-data", () => ({
  usePnrrLiveStatus: vi.fn(),
  usePnrrLiveOrganization: vi.fn(),
  usePnrrLiveOrganizationProfile: vi.fn(),
  usePnrrLiveOrganizationProjects: vi.fn(),
  usePnrrLiveOverview: vi.fn(),
  usePnrrLivePlaces: vi.fn(),
}));

const release: PnrrLiveRelease = {
  releaseId: "pnrr-release-v1:mipe-20261015",
  releaseKind: "mipe_scoped",
  state: "degraded",
  sourceSnapshotAt: "2026-10-15T00:00:00Z",
  completedAt: "2026-11-14T11:00:00Z",
  limitation: "ORDS payment facts are withheld in this release.",
  lanes: [
    {
      lane: "mipe_projects",
      state: "served",
      asOf: "2026-10-15",
      suspended: false,
      reasonCodes: [],
    },
    {
      lane: "ords_payments_capture",
      state: "abstained",
      asOf: "2026-11-13",
      suspended: false,
      reasonCodes: ["payment_policy_pending"],
    },
  ],
};

const money = (amount: string | null, currency: "RON" | "EUR") => ({
  factType: "fixture",
  amount,
  currency,
  aggregationState: "fixture",
  coveredCount: 0,
  totalCount: 0,
});

const withheldOverview = pnrrOverviewSchema.parse({
  meta: {
    state: "degraded",
    reasonCodes: [],
    caveats: [],
    provenance: [],
    coverage: [],
    release,
  },
  program: {
    snapshotDate: "2026-10-15",
    projectCount: 21710,
    allocationEur: money("21410000000.00", "EUR"),
    receivedEur: money("10100000000.00", "EUR"),
    paidEur: money("9000000000.00", "EUR"),
  },
  beneficiaryPayments: {
    count: null,
    firstDate: null,
    lastDate: null,
    netRon: money(null, "RON"),
    grossRon: money(null, "RON"),
    reversalRon: money(null, "RON"),
  },
  commitments: {
    count: null,
    additiveCount: null,
    unresolvedCount: null,
    additiveRon: money(null, "RON"),
  },
  delivery: {
    observedCount: 24891,
    completedCount: 3000,
    overHundredCount: 12,
    missingFinancialProgressCount: 40,
    missingPhysicalProgressCount: 41,
  },
});

const withheldPlace = pnrrPlaceSummarySchema.parse({
  countySiruta: "40",
  countyName: "București",
  paymentCount: null,
  paymentNetRon: null,
  commitmentCount: null,
  additiveCommitmentCount: null,
  unresolvedCommitmentCount: null,
  additiveCommitmentRon: null,
  projectObservationCount: 812,
  sourceLocalityLabelCount: 790,
  sourceLocalityLabelValue: null,
});

const settled = <T,>(data: T) => ({ data, isLoading: false, error: null });

describe("PNRR withheld ORDS facts", () => {
  beforeEach(() => {
    vi.mocked(usePnrrLiveStatus).mockReturnValue(
      settled({
        pnrrCurrentRelease: release,
        pnrrCapabilities: [
          {
            id: "payments",
            releaseId: release.releaseId,
            // Even a served capability cannot turn a null count into a figure.
            state: "served",
            reasonCodes: [],
            limitation: null,
          },
        ],
      }) as never,
    );
    vi.mocked(usePnrrLiveOverview).mockReturnValue(
      settled(withheldOverview) as never,
    );
    vi.mocked(usePnrrLivePlaces).mockReturnValue(
      settled([withheldPlace]) as never,
    );
  });

  it("shows overview payment and commitment totals as unavailable, not zero", () => {
    render(<PnrrLiveOverviewPage />);

    expect(
      screen.getByText("Payment totals are unavailable for this release."),
    ).toBeInTheDocument();
    // Reuses the catalog's translated "Data unavailable for this release".
    expect(
      screen.getByText("Data unavailable for this release"),
    ).toBeInTheDocument();
    expect(screen.queryByText(/source-native payment rows/)).toBeNull();
    expect(screen.queryByText(/envelopes additive/)).toBeNull();
    // The publisher-reported MIPE figures are still served.
    expect(screen.getByText(/21[.,]410[.,]000[.,]000/)).toBeInTheDocument();
  });

  it("shows county payment and commitment facts as unavailable, not zero", () => {
    render(<PnrrLivePlacesPage />);

    expect(
      screen.getAllByText(/Data unavailable for this release/).length,
    ).toBeGreaterThanOrEqual(2);
    expect(screen.queryByText(/reported-county rows/)).toBeNull();
    expect(screen.queryByText(/\b0 rows\b/)).toBeNull();
    expect(screen.getAllByText("812").length).toBeGreaterThan(0);
  });
});

describe("PNRR organization projects with a withheld organization profile", () => {
  const cui = "11054529";
  const project = {
    cursor: "project-cursor",
    node: {
      projectKey: "project-1",
      contractTitle: "Railway infrastructure renewal",
      beneficiaryCui: cui,
      beneficiaryName: "Railway Infrastructure Company",
      componentCode: "C4",
      snapshotDate: "2026-10-15",
      totalValueRon: "3000000",
    },
  };

  beforeEach(() => {
    vi.mocked(usePnrrLiveStatus).mockReturnValue(
      settled({
        pnrrCurrentRelease: release,
        pnrrCapabilities: [
          {
            id: "organizations",
            releaseId: release.releaseId,
            state: "abstained",
            reasonCodes: ["capability_not_declared_for_release"],
            limitation: null,
          },
        ],
      }) as never,
    );
    vi.mocked(usePnrrLiveOrganization).mockReturnValue(
      settled(undefined) as never,
    );
    vi.mocked(usePnrrLiveOrganizationProfile).mockReturnValue(
      settled(undefined) as never,
    );
  });

  it("shows the public project portfolio without requesting the withheld profile", () => {
    vi.mocked(usePnrrLiveOrganizationProjects).mockReturnValue({
      ...settled({ pages: [{ edges: [project] }] }),
      isSuccess: true,
    } as never);

    render(<PnrrLiveOrganizationPage cui={cui} />);

    expect(
      screen.getByRole("heading", { name: "Railway Infrastructure Company" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Railway infrastructure renewal/ }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Other PNRR activity")).not.toBeInTheDocument();
    expect(usePnrrLiveOrganization).toHaveBeenCalledWith(cui, false);
    expect(usePnrrLiveOrganizationProfile).toHaveBeenCalledWith(cui, false);
  });

  it("shows an empty result when the release has no public projects for the CUI", () => {
    vi.mocked(usePnrrLiveOrganizationProjects).mockReturnValue({
      ...settled({ pages: [{ edges: [] }] }),
      isSuccess: true,
    } as never);

    render(<PnrrLiveOrganizationPage cui={cui} />);

    expect(screen.getByText("Organization not found")).toBeInTheDocument();
    expect(screen.queryByText("Other PNRR activity")).not.toBeInTheDocument();
  });
});
