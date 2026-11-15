import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  usePnrrAnomalyModel,
  usePnrrBeneficiaryPage,
  usePnrrFilterFacets,
  usePnrrMapModel,
  usePnrrProjectPage,
  usePnrrServerOverview,
} from "../hooks/usePnrrData";
import { usePnrrLiveStatus } from "../hooks/use-pnrr-live-data";
import { usePnrrFilterState } from "../hooks/usePnrrFilterState";
import { computeAggregates } from "../lib/data-transform";
import {
  FIXTURE_RELEASE_ID,
  makeFixtureRelease,
} from "../lib/pnrr-api-snapshot.fixture";
import { usePnrrDashboardReleaseId } from "../lib/pnrr-release-context";
import { PnrrDashboard } from "./PnrrDashboard";
import type {
  PnrrServerOverview,
  PnrrWorkerProjectPage,
} from "../workers/pnrr-worker-types";
import type { PnrrLiveRelease } from "@/schemas/pnrr-live";

vi.mock("../hooks/usePnrrData", () => ({
  usePnrrServerOverview: vi.fn(),
  usePnrrProjectPage: vi.fn(),
  usePnrrBeneficiaryPage: vi.fn(),
  usePnrrAnomalyModel: vi.fn(),
  usePnrrMapModel: vi.fn(),
  usePnrrFilterFacets: vi.fn(),
}));

vi.mock("../hooks/use-pnrr-live-data", () => ({
  usePnrrLiveStatus: vi.fn(),
  getPnrrFactReleaseId: (release: PnrrLiveRelease | null | undefined) =>
    release?.state === "abstained" ? undefined : release?.releaseId,
}));

vi.mock("../hooks/usePnrrFilterState", () => ({
  usePnrrFilterState: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    to,
    className,
  }: {
    readonly children: ReactNode;
    readonly to: string;
    readonly className?: string;
  }) => (
    <a href={to} className={className}>
      {children}
    </a>
  ),
}));

vi.mock("../lib/PnrrCurrencyProvider", () => ({
  PnrrCurrencyProvider: ({ children }: { readonly children: ReactNode }) => (
    <>{children}</>
  ),
}));

vi.mock("./PnrrHeader", () => ({
  PnrrHeader: ({
    actions,
    isLoading,
    projectsCount,
    totalValue,
    totalValueLabel,
    beneficiaryNamesByCui,
    uatLabelsBySiruta,
    releaseId,
  }: {
    readonly actions: ReactNode;
    readonly isLoading: boolean;
    readonly projectsCount: number;
    readonly totalValue: number;
    readonly totalValueLabel?: ReactNode;
    readonly beneficiaryNamesByCui?: ReadonlyMap<string, string>;
    readonly uatLabelsBySiruta?: ReadonlyMap<string, string>;
    readonly releaseId?: string | null;
  }) => (
    <header data-testid="pnrr-header" data-loading={String(isLoading)}>
      <span data-testid="pnrr-header-release">{releaseId}</span>
      <span data-testid="pnrr-header-labels">
        {JSON.stringify([
          [...(uatLabelsBySiruta ?? [])],
          [...(beneficiaryNamesByCui ?? [])],
        ])}
      </span>
      <span data-testid="pnrr-header-projects">{projectsCount}</span>
      <span data-testid="pnrr-header-total">{totalValue}</span>
      <span data-testid="pnrr-header-total-label">{totalValueLabel}</span>
      {actions}
    </header>
  ),
}));

vi.mock("./PnrrSkeleton", () => ({
  PnrrContentSkeleton: () => <div data-testid="pnrr-content-skeleton" />,
}));

function ReleaseProbe({ testId }: { readonly testId: string }) {
  return <div data-testid={testId}>{usePnrrDashboardReleaseId()}</div>;
}

vi.mock("./tabs/PnrrOverview", () => ({
  PnrrOverview: ({ overview }: { readonly overview?: object | null }) => (
    <div data-testid="pnrr-overview" data-has-overview={String(overview != null)}>
      <ReleaseProbe testId="pnrr-overview-release" />
    </div>
  ),
}));

vi.mock("./tabs/PnrrProjectsView", () => ({
  PnrrProjectsView: ({
    page,
    isPageStatePending,
  }: {
    readonly page: PnrrWorkerProjectPage;
    readonly isPageStatePending?: boolean;
  }) => (
    <div data-testid="pnrr-projects" data-pending={String(isPageStatePending)}>
      {page.totalCount}
    </div>
  ),
}));

vi.mock("./tabs/PnrrAnomaliesView", () => ({
  PnrrAnomaliesView: () => <div data-testid="pnrr-anomalies" />,
}));

vi.mock("./tabs/PnrrBeneficiariesView", () => ({
  PnrrBeneficiariesView: () => <div data-testid="pnrr-beneficiaries" />,
}));

vi.mock("./PnrrMapView", () => ({
  PnrrMapView: () => <div data-testid="pnrr-map" />,
}));

vi.mock("./filters/PnrrFilterSheet", () => ({
  PnrrFilterSheet: () => null,
  PnrrFilterTriggerButton: ({ onClick }: { readonly onClick: () => void }) => (
    <button type="button" onClick={onClick}>
      Filters
    </button>
  ),
}));

vi.mock("./filters/PnrrInfoSheet", () => ({
  PnrrInfoSheet: () => null,
}));

vi.mock("./table/PnrrExportButton", () => ({
  PnrrExportButton: ({ releaseId }: { readonly releaseId?: string | null }) => (
    <span data-testid="pnrr-export-release">{releaseId}</span>
  ),
}));

function makeFilterState(
  overrides: Partial<ReturnType<typeof usePnrrFilterState>> = {},
): ReturnType<typeof usePnrrFilterState> {
  return {
    search: {
      view: "overview",
      page: 1,
      pageSize: 25,
      sortBy: "value",
      sortOrder: "desc",
      beneficiarySortBy: "value",
      beneficiarySortOrder: "desc",
      beneficiaryPage: 1,
      onlyAnomalies: false,
      excludeMicro: false,
      granularity: "county",
      includeNational: true,
    },
    setView: vi.fn(),
    showBeneficiaryProjects: vi.fn(),
    showUatView: vi.fn(),
    setSearch: vi.fn(),
    setBeneficiarySearch: vi.fn(),
    setBeneficiaryCui: vi.fn(),
    setUatFilter: vi.fn(),
    setUatFilters: vi.fn(),
    setComponents: vi.fn(),
    setCounties: vi.fn(),
    setFundingSources: vi.fn(),
    setMeasures: vi.fn(),
    setCris: vi.fn(),
    setProgressCategories: vi.fn(),
    setOnlyAnomalies: vi.fn(),
    setExcludeMicro: vi.fn(),
    setAnomalyTypes: vi.fn(),
    setDataQualitySignalTypes: vi.fn(),
    setGranularity: vi.fn(),
    setEntityTypes: vi.fn(),
    setBeneficiaryTypes: vi.fn(),
    setIncludeNational: vi.fn(),
    setSorting: vi.fn(),
    setBeneficiarySorting: vi.fn(),
    setCurrency: vi.fn(),
    setPagination: vi.fn(),
    setBeneficiaryPagination: vi.fn(),
    setMapView: vi.fn(),
    openProjectPanel: vi.fn(),
    openBeneficiaryPanel: vi.fn(),
    openMapCountyPanel: vi.fn(),
    openMapUatPanel: vi.fn(),
    openAnomalyInfoPanel: vi.fn(),
    closePanel: vi.fn(),
    closeProjectPanel: vi.fn(),
    clearFilters: vi.fn(),
    ...overrides,
  };
}

function withView(view: "overview" | "projects" | "map" | "beneficiaries" | "anomalies") {
  return makeFilterState({ search: { ...makeFilterState().search, view } });
}

function makeServerOverview(
  overrides: Partial<PnrrServerOverview> = {},
  metaOverrides: Partial<PnrrServerOverview["meta"]> = {},
): PnrrServerOverview {
  const aggregates = computeAggregates([]);
  const emptyHistogramMetric = {
    data: [],
    countCoveragePercent: 0,
    valueCoveragePercent: 0,
    validCount: 0,
    validValue: 0,
    totalRecordCount: 0,
    totalValue: 0,
  };

  return {
    fileSetId: FIXTURE_RELEASE_ID,
    overview: {
      aggregates: { ...aggregates, projectCount: 7, rawTotalValue: 700 },
      topComponents: [],
      topCounties: [],
      topBeneficiaries: [],
      beneficiaryRankingSource: "listed-project-value",
      beneficiaryRankingScope: "filtered",
      projectPreviewRows: [],
      emblematicProjectRows: [],
      histogram: {
        tech: emptyHistogramMetric,
        fin: emptyHistogramMetric,
        gap: emptyHistogramMetric,
      },
    },
    meta: {
      projectCount: 7,
      projectRecordCount: 9,
      beneficiaryPaymentCount: 0,
      officialAllocatedTotalEur: null,
      officialPaidTotalEur: null,
      paidBeneficiaryCount: null,
      paymentCapability: "legacy_unversioned",
      indicatorCapability: "legacy_unversioned",
      ...metaOverrides,
    },
    labels: { uats: [], beneficiaries: [] },
    ...overrides,
  };
}

type QueryMock = {
  readonly data?: unknown;
  readonly error?: Error | null;
  readonly isLoading?: boolean;
  readonly isPlaceholderData?: boolean;
  readonly refetch?: () => void;
};

function queryResult(result: QueryMock = {}) {
  return {
    data: undefined,
    error: null,
    isError: Boolean(result.error),
    isLoading: false,
    isRefetching: false,
    isPlaceholderData: false,
    refetch: vi.fn(),
    ...result,
  } as never;
}

function mockStatus(
  release: PnrrLiveRelease | null = makeFixtureRelease(),
  result: QueryMock = {},
) {
  vi.mocked(usePnrrLiveStatus).mockReturnValue(
    queryResult({
      data: release ? { pnrrCurrentRelease: release, pnrrCapabilities: [] } : undefined,
      ...result,
    }),
  );
}

const lastEnabled = (hook: (...args: never[]) => unknown) =>
  (vi.mocked(hook).mock.lastCall as unknown as readonly unknown[] | undefined)
    ?.find((arg): arg is { enabled: boolean } =>
      typeof arg === "object" && arg !== null && "enabled" in arg,
    )?.enabled;

describe("PnrrDashboard", () => {
  beforeEach(() => {
    for (const hook of [
      usePnrrServerOverview,
      usePnrrProjectPage,
      usePnrrBeneficiaryPage,
      usePnrrAnomalyModel,
      usePnrrMapModel,
      usePnrrFilterFacets,
    ]) {
      vi.mocked(hook).mockReset();
      vi.mocked(hook).mockReturnValue(queryResult());
    }
    mockStatus();
    vi.mocked(usePnrrFilterState).mockReturnValue(makeFilterState());
  });

  it("renders the server overview and pins the page to the active release", () => {
    vi.mocked(usePnrrServerOverview).mockReturnValue(
      queryResult({ data: makeServerOverview() }),
    );

    render(<PnrrDashboard />);

    expect(screen.getByTestId("pnrr-header-projects")).toHaveTextContent("7");
    expect(screen.getByTestId("pnrr-header-total")).toHaveTextContent("700");
    expect(screen.getByTestId("pnrr-overview")).toHaveAttribute(
      "data-has-overview",
      "true",
    );
    // One release for the header badge, the export and every panel.
    expect(screen.getByTestId("pnrr-header-release")).toHaveTextContent(
      FIXTURE_RELEASE_ID,
    );
    expect(screen.getByTestId("pnrr-export-release")).toHaveTextContent(
      FIXTURE_RELEASE_ID,
    );
    expect(screen.getByTestId("pnrr-overview-release")).toHaveTextContent(
      FIXTURE_RELEASE_ID,
    );
  });

  it("shows the release's MIPE and ORDS source dates apart", () => {
    vi.mocked(usePnrrServerOverview).mockReturnValue(
      queryResult({ data: makeServerOverview() }),
    );

    render(<PnrrDashboard />);

    const dates = screen.getByTestId("pnrr-release-source-dates");
    expect(dates).toHaveTextContent("MIPE project snapshot");
    expect(dates).toHaveTextContent("ORDS payments capture");
    expect(dates).toHaveTextContent(/Oct 15, 2026|15 oct\.? 2026/);
    expect(dates).toHaveTextContent(/Nov 13, 2026|13 nov\.? 2026/);
  });

  it("reads only the open tab's part, and the overview for the header", () => {
    vi.mocked(usePnrrFilterState).mockReturnValue(withView("projects"));
    vi.mocked(usePnrrProjectPage).mockReturnValue(
      queryResult({
        data: {
          rows: [],
          totalCount: 12,
          page: 1,
          pageSize: 25,
          totalPages: 1,
          sortBy: "value",
          sortOrder: "desc",
        },
        isPlaceholderData: true,
      }),
    );

    render(<PnrrDashboard />);

    expect(lastEnabled(usePnrrServerOverview)).toBe(true);
    expect(lastEnabled(usePnrrProjectPage)).toBe(true);
    expect(lastEnabled(usePnrrBeneficiaryPage)).toBe(false);
    expect(lastEnabled(usePnrrAnomalyModel)).toBe(false);
    expect(lastEnabled(usePnrrMapModel)).toBe(false);
    expect(lastEnabled(usePnrrFilterFacets)).toBe(false);
    expect(screen.getByTestId("pnrr-projects")).toHaveTextContent("12");
    expect(screen.getByTestId("pnrr-projects")).toHaveAttribute(
      "data-pending",
      "true",
    );
  });

  it.each(["map", "beneficiaries", "anomalies"] as const)(
    "renders the %s tab from its own part",
    (view) => {
      vi.mocked(usePnrrFilterState).mockReturnValue(withView(view));
      const part =
        view === "map"
          ? usePnrrMapModel
          : view === "beneficiaries"
            ? usePnrrBeneficiaryPage
            : usePnrrAnomalyModel;
      vi.mocked(part).mockReturnValue(
        queryResult({
          data:
            view === "map"
              ? { mapModel: {} }
              : view === "beneficiaries"
                ? { rows: [] }
                : { rows: [], totalCount: 0 },
        }),
      );

      render(<PnrrDashboard />);

      expect(lastEnabled(part)).toBe(true);
      expect(screen.getByTestId(`pnrr-${view}`)).toBeInTheDocument();
    },
  );

  it("reads the filter options once the filter sheet opens", () => {
    vi.mocked(usePnrrServerOverview).mockReturnValue(
      queryResult({ data: makeServerOverview() }),
    );

    render(<PnrrDashboard />);
    expect(lastEnabled(usePnrrFilterFacets)).toBe(false);

    fireEvent.click(screen.getByRole("button", { name: "Filters" }));

    expect(lastEnabled(usePnrrFilterFacets)).toBe(true);
    expect(screen.getByTestId("pnrr-overview")).toHaveAttribute(
      "data-has-overview",
      "true",
    );
  });

  it("shows the overview without a banner when payment data is unavailable", () => {
    vi.mocked(usePnrrServerOverview).mockReturnValue(
      queryResult({
        data: makeServerOverview({}, { paymentCapability: "degraded" }),
      }),
    );

    render(<PnrrDashboard />);

    expect(screen.getByTestId("pnrr-overview")).toHaveAttribute(
      "data-has-overview",
      "true",
    );
    expect(
      screen.queryByText(/partial pnrr data availability/i),
    ).not.toBeInTheDocument();
  });

  it("discloses estimated conversion for non-RON currency", () => {
    vi.mocked(usePnrrFilterState).mockReturnValue(
      makeFilterState({
        search: { ...makeFilterState().search, currency: "EUR" },
      }),
    );

    render(<PnrrDashboard />);

    expect(
      screen.getByText(
        /estimated currency conversion|conversie valutară estimată/i,
      ),
    ).toBeInTheDocument();
  });

  it("uses the publisher-reported allocation in the unfiltered header", () => {
    vi.mocked(usePnrrServerOverview).mockReturnValue(
      queryResult({
        data: makeServerOverview({}, { officialAllocatedTotalEur: 2_000 }),
      }),
    );

    render(<PnrrDashboard />);

    expect(screen.getByTestId("pnrr-header-total")).toHaveTextContent("2000");
    expect(screen.getByTestId("pnrr-header-total-label")).toHaveTextContent(
      /alocat total|total allocated/,
    );
  });

  it("keeps the header loading, without figures, until the overview arrives", () => {
    vi.mocked(usePnrrServerOverview).mockReturnValue(
      queryResult({ isLoading: true }),
    );

    render(<PnrrDashboard />);

    expect(screen.getByTestId("pnrr-header")).toHaveAttribute(
      "data-loading",
      "true",
    );
    expect(screen.getByTestId("pnrr-content-skeleton")).toBeInTheDocument();
    expect(screen.queryByTestId("pnrr-overview")).not.toBeInTheDocument();
  });

  it("names active UAT and beneficiary filters from the server overview", () => {
    vi.mocked(usePnrrServerOverview).mockReturnValue(
      queryResult({
        data: makeServerOverview({
          labels: {
            uats: [{ siruta: "179132", label: "București" }],
            beneficiaries: [{ cui: "4267117", name: "Municipiul București" }],
          },
        }),
      }),
    );

    render(<PnrrDashboard />);

    expect(screen.getByTestId("pnrr-header-labels")).toHaveTextContent(
      JSON.stringify([
        [["179132", "București"]],
        [["4267117", "Municipiul București"]],
      ]),
    );
  });

  it("shows a retryable error state when the overview fails to load", () => {
    const refetch = vi.fn();
    vi.mocked(usePnrrServerOverview).mockReturnValue(
      queryResult({
        error: new Error("Failed to load the PNRR overview: 502"),
        refetch,
      }),
    );

    render(<PnrrDashboard />);

    expect(screen.queryByTestId("pnrr-content-skeleton")).not.toBeInTheDocument();
    expect(screen.getByText("Could not load PNRR data")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Retry/i }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("re-reads the release when it could not be read", () => {
    const refetch = vi.fn();
    mockStatus(null, { error: new Error("GraphQL request failed"), refetch });

    render(<PnrrDashboard />);

    expect(screen.getByText("Could not load PNRR data")).toBeInTheDocument();
    expect(screen.getByTestId("pnrr-header-release")).toBeEmptyDOMElement();
    fireEvent.click(screen.getByRole("button", { name: /Retry/i }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("says what the release withholds instead of showing figures for an abstained release", () => {
    mockStatus(
      makeFixtureRelease(FIXTURE_RELEASE_ID, {
        state: "abstained",
        limitation: "This release withholds every PNRR fact.",
      }),
    );

    render(<PnrrDashboard />);

    expect(screen.getByText("Could not load PNRR data")).toBeInTheDocument();
    expect(
      screen.getByText("This release withholds every PNRR fact."),
    ).toBeInTheDocument();
    // No release id reaches the reads, so none of them can ask for facts.
    expect(screen.getByTestId("pnrr-header-release")).toBeEmptyDOMElement();
    expect(screen.queryByTestId("pnrr-overview")).not.toBeInTheDocument();
  });

  // With the default `networkMode: 'online'`, an offline browser parks the
  // query at `fetchStatus: 'paused'`: not loading, not errored, and with no
  // data. Rendering must not fall through to the data branch.
  it.each(["overview", "projects"] as const)(
    "renders a retryable state instead of crashing on the %s tab while paused offline",
    (view) => {
      vi.mocked(usePnrrFilterState).mockReturnValue(withView(view));

      expect(() => render(<PnrrDashboard />)).not.toThrow();

      expect(screen.queryByTestId(`pnrr-${view}`)).not.toBeInTheDocument();
      expect(screen.getByText("Could not load PNRR data")).toBeInTheDocument();
    },
  );
});
