import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  usePnrrServerOverview,
  usePnrrWorkerModel,
} from "../hooks/usePnrrData";
import { usePnrrFilterState } from "../hooks/usePnrrFilterState";
import {
  buildPnrrSeoSnapshotSearchKey,
  type PnrrSeoSnapshot,
} from "../seo/pnrr-seo";
import { computeAggregates, processPnrrData } from "../lib/data-transform";
import { PnrrDashboard } from "./PnrrDashboard";
import type {
  PnrrServerOverview,
  PnrrWorkerQueryResult,
} from "../workers/pnrr-worker-types";

vi.mock("../hooks/usePnrrData", () => ({
  usePnrrServerOverview: vi.fn(),
  usePnrrWorkerModel: vi.fn(),
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
  }: {
    readonly actions: ReactNode;
    readonly isLoading: boolean;
    readonly projectsCount: number;
    readonly totalValue: number;
    readonly totalValueLabel?: ReactNode;
    readonly beneficiaryNamesByCui?: ReadonlyMap<string, string>;
    readonly uatLabelsBySiruta?: ReadonlyMap<string, string>;
  }) => (
    <header data-testid="pnrr-header" data-loading={String(isLoading)}>
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
  PnrrContentSkeleton: ({
    hideMetricCards = false,
  }: {
    readonly hideMetricCards?: boolean;
  }) => (
    <div
      data-testid="pnrr-content-skeleton"
      data-hide-metric-cards={String(hideMetricCards)}
    />
  ),
}));

vi.mock("./tabs/PnrrOverview", () => ({
  PnrrFullDataLoadingStatus: () => <div data-testid="pnrr-full-data-loading" />,
  PnrrOverview: ({
    cachedStats,
    isLoadingFullData,
    overview,
    mapPreview,
  }: {
    readonly cachedStats?: { readonly rawTotalValue: number } | null;
    readonly isLoadingFullData?: boolean;
    readonly overview?: object | null;
    readonly mapPreview?: object;
  }) => (
    <div
      data-testid="pnrr-overview"
      data-loading-full-data={String(isLoadingFullData)}
      data-has-overview={String(overview != null)}
      data-has-map-preview={String(mapPreview !== undefined)}
    >
      {cachedStats?.rawTotalValue}
    </div>
  ),
}));

vi.mock("./tabs/PnrrProjectsView", () => ({
  PnrrProjectsView: () => <div data-testid="pnrr-projects" />,
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
  PnrrExportButton: () => null,
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
      includeNational: false,
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

function makeSnapshot(): PnrrSeoSnapshot {
  return {
    lastUpdated: "2026-05-18",
    projectCount: 42,
    projectRecordCount: 45,
    deduplicatedProjectCount: 40,
    listedFundingTotalRon: 1_200_000,
    deduplicatedListedFundingRon: 1_100_000,
    completedCount: 12,
    completedListedFundingRon: 300_000,
    inProgressCount: 25,
    notStartedCount: 5,
    loanListedFundingRon: 250_000,
    loanPercent: 20.83,
    missingFinancialProgressCount: 8,
    missingFinancialProgressPercent: 19.05,
    anomalyCount: 3,
    dataQualitySignalCount: 2,
    topComponents: [],
    topCounties: [],
    topBeneficiaries: [],
    officialAllocatedTotalEur: null,
    officialPaidTotalEur: null,
    paidBeneficiaryCount: null,
  };
}

function makeSnapshotSearchKey(search = makeFilterState().search): string {
  return buildPnrrSeoSnapshotSearchKey(search);
}

function makeWorkerResult(
  data = processPnrrData([]),
  overrides: Partial<PnrrWorkerQueryResult["meta"]> = {},
): PnrrWorkerQueryResult {
  const aggregates = computeAggregates(data.projects);
  const meta = {
    projectCount: data.meta.projectCount,
    projectRecordCount: data.meta.projectRecordCount,
    source: "worker" as const,
    paymentSource: "worker" as const,
    indicatorSource: "worker" as const,
    beneficiaryPaymentCount: 0,
    officialAllocatedTotalEur: null,
    officialPaidTotalEur: null,
    paidBeneficiaryCount: null,
    projectCapability: "legacy_unversioned" as const,
    paymentCapability: "legacy_unversioned" as const,
    indicatorCapability: "legacy_unversioned" as const,
    laneFreshness: {
      projects: "legacy_unversioned" as const,
      payments: "legacy_unversioned" as const,
      indicators: "legacy_unversioned" as const,
    },
    ...overrides,
  };
  const emptyHistogramMetric = {
    data: [],
    countCoveragePercent: 0,
    valueCoveragePercent: 0,
    validCount: 0,
    validValue: 0,
    totalRecordCount: aggregates.projectRecordCount,
    totalValue: aggregates.rawTotalValue,
  };
  const emptyMapModel = {
    seriesId: "total-value" as const,
    granularity: "county" as const,
    series: { id: "total-value" as const, data: [], min: 0, max: 0 },
    nationalCount: 0,
    unmappedCount: 0,
    uatProjectCount: 0,
    selectedUat: null,
    selectedCountyProjects: [],
    selectedUatProjects: [],
  };

  return {
    overview: {
      aggregates,
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
      mapPreview: emptyMapModel,
    },
    projectPage: {
      rows: data.projects,
      totalCount: data.projects.length,
      page: 1,
      pageSize: 25,
      totalPages: 1,
      sortBy: "value",
      sortOrder: "desc",
    },
    beneficiaryPage: {
      rows: [],
      totalCount: 0,
      page: 1,
      pageSize: 25,
      totalPages: 1,
      sortBy: "value",
      sortOrder: "desc",
    },
    anomalyModel: {
      riskCount: 0,
      riskValue: 0,
      dataQualityCount: 0,
      dataQualityValue: 0,
      rows: [],
      totalCount: 0,
    },
    mapModel: emptyMapModel,
    filterFacets: {
      components: [],
      counties: [],
      uats: [],
      measures: [],
      cris: [],
    },
    meta,
  };
}

function makeServerOverview(
  overrides: Partial<PnrrServerOverview> = {},
): PnrrServerOverview {
  const { mapPreview: _mapPreview, ...overview } = makeWorkerResult().overview;

  return {
    fileSetId: "20260619",
    overview: {
      ...overview,
      aggregates: { ...overview.aggregates, projectCount: 7, rawTotalValue: 700 },
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
    },
    labels: { uats: [], beneficiaries: [] },
    ...overrides,
  };
}

function mockServerOverview(
  result: Partial<ReturnType<typeof usePnrrServerOverview>> = {},
) {
  vi.mocked(usePnrrServerOverview).mockReturnValue({
    data: undefined,
    error: null,
    isError: false,
    isLoading: false,
    isRefetching: false,
    refetch: vi.fn(),
    ...result,
  } as unknown as ReturnType<typeof usePnrrServerOverview>);
}

function mockIdleWorker() {
  vi.mocked(usePnrrWorkerModel).mockReturnValue({
    data: undefined,
    error: null,
    isError: false,
    isLoading: false,
    isRefetching: false,
    refetch: vi.fn(),
  } as unknown as ReturnType<typeof usePnrrWorkerModel>);
}

function lastWorkerOptions() {
  return vi.mocked(usePnrrWorkerModel).mock.lastCall?.[1];
}

describe("PnrrDashboard", () => {
  beforeEach(() => {
    vi.mocked(usePnrrWorkerModel).mockReset();
    mockServerOverview();
  });

  it("uses distinct official project count in the header", () => {
    const data = processPnrrData([
      {
        id_angajament: 123,
        titlu_contract: "Same project",
        denumire_beneficiar: "Beneficiar",
        cui: "123",
        judet_implementare: "București",
        localitate_implementare: "București",
        sursa_finantare: "grant",
        valoare_fe: 1_000,
        progres_fizic: 0.5,
        progres_financiar: 0.4,
        cod_componenta: "C4",
        cod_masura: "I3",
        cri: "MTI",
      },
      {
        id_angajament: 123,
        titlu_contract: "Same project",
        denumire_beneficiar: "Beneficiar",
        cui: "123",
        judet_implementare: "București",
        localitate_implementare: "București",
        sursa_finantare: "loan",
        valoare_fe: 2_000,
        progres_fizic: 0.5,
        progres_financiar: 0.4,
        cod_componenta: "C4",
        cod_masura: "I3",
        cri: "MTI",
      },
    ]);
    vi.mocked(usePnrrWorkerModel).mockReturnValue({
      data: makeWorkerResult(data),
      error: null,
      isError: false,
      isLoading: false,
      isRefetching: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof usePnrrWorkerModel>);
    vi.mocked(usePnrrFilterState).mockReturnValue(makeFilterState());

    render(<PnrrDashboard />);

    expect(screen.getByTestId("pnrr-header-projects")).toHaveTextContent("1");
    expect(screen.getByTestId("pnrr-header-total")).toHaveTextContent("3000");
    expect(screen.getByTestId("pnrr-overview")).toBeInTheDocument();
    expect(
      screen.queryByRole("link", {
        name: /projects and lifecycle|proiecte și ciclu de viață/i,
      }),
    ).not.toBeInTheDocument();
  });

  it("keeps the established degraded-source warning visible", () => {
    vi.mocked(usePnrrWorkerModel).mockReturnValue({
      data: makeWorkerResult(undefined, {
        paymentCapability: "degraded",
      }),
      error: null,
      isError: false,
      isLoading: false,
      isRefetching: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof usePnrrWorkerModel>);
    vi.mocked(usePnrrFilterState).mockReturnValue(makeFilterState());

    render(<PnrrDashboard />);

    expect(
      screen.getByText(
        /partial pnrr data availability|disponibilitate parțială a datelor pnrr/i,
      ),
    ).toBeInTheDocument();
  });

  it("discloses estimated conversion for non-RON currency", () => {
    vi.mocked(usePnrrWorkerModel).mockReturnValue({
      data: makeWorkerResult(),
      error: null,
      isError: false,
      isLoading: false,
      isRefetching: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof usePnrrWorkerModel>);
    vi.mocked(usePnrrFilterState).mockReturnValue(
      makeFilterState({
        search: {
          ...makeFilterState().search,
          currency: "EUR",
        },
      }),
    );

    render(<PnrrDashboard />);

    expect(
      screen.getByText(
        /estimated currency conversion|conversie valutară estimată/i,
      ),
    ).toBeInTheDocument();
  });

  it("uses official allocated total in the unfiltered header", () => {
    const data = processPnrrData([
      {
        id_angajament: 123,
        titlu_contract: "Same project",
        denumire_beneficiar: "Beneficiar",
        cui: "123",
        judet_implementare: "București",
        localitate_implementare: "București",
        sursa_finantare: "grant",
        valoare_fe: 1_000,
        progres_fizic: 0.5,
        progres_financiar: 0.4,
        cod_componenta: "C4",
        cod_masura: "I3",
        cri: "MTI",
      },
    ]);
    vi.mocked(usePnrrWorkerModel).mockReturnValue({
      data: makeWorkerResult(data, { officialAllocatedTotalEur: 2_000 }),
      error: null,
      isError: false,
      isLoading: false,
      isRefetching: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof usePnrrWorkerModel>);
    vi.mocked(usePnrrFilterState).mockReturnValue(
      makeFilterState({
        search: {
          ...makeFilterState().search,
          includeNational: true,
        },
      }),
    );

    render(<PnrrDashboard />);

    expect(screen.getByTestId("pnrr-header-total")).toHaveTextContent("2000");
    expect(screen.getByTestId("pnrr-header-total-label")).toHaveTextContent(
      /alocat total|total allocated/,
    );
  });

  it("uses cached SSR stats for the overview cards and header while full data loads", () => {
    mockIdleWorker();
    mockServerOverview({ isLoading: true });
    vi.mocked(usePnrrFilterState).mockReturnValue(makeFilterState());

    render(
      <PnrrDashboard
        ssrSnapshot={makeSnapshot()}
        ssrSnapshotSearchKey={makeSnapshotSearchKey()}
      />,
    );

    expect(screen.getByTestId("pnrr-header")).toHaveAttribute(
      "data-loading",
      "false",
    );
    expect(screen.getByTestId("pnrr-header-projects")).toHaveTextContent("42");
    expect(screen.getByTestId("pnrr-header-total")).toHaveTextContent(
      "1200000",
    );
    expect(screen.getByTestId("pnrr-overview")).toHaveAttribute(
      "data-loading-full-data",
      "true",
    );
    expect(screen.getByTestId("pnrr-overview")).toHaveTextContent("1200000");
  });

  it("keeps non-overview tabs on the standard skeleton while using cached header stats", () => {
    vi.mocked(usePnrrWorkerModel).mockReturnValue({
      data: undefined,
      error: null,
      isError: false,
      isLoading: true,
      isRefetching: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof usePnrrWorkerModel>);
    const filterState = makeFilterState({
      search: {
        ...makeFilterState().search,
        view: "projects",
      },
    });
    vi.mocked(usePnrrFilterState).mockReturnValue(filterState);

    render(
      <PnrrDashboard
        ssrSnapshot={makeSnapshot()}
        ssrSnapshotSearchKey={makeSnapshotSearchKey(filterState.search)}
      />,
    );

    expect(screen.getByTestId("pnrr-header")).toHaveAttribute(
      "data-loading",
      "false",
    );
    expect(screen.queryByTestId("pnrr-overview")).not.toBeInTheDocument();
    expect(screen.getByTestId("pnrr-content-skeleton")).toHaveAttribute(
      "data-hide-metric-cards",
      "false",
    );
  });

  it("ignores cached SSR stats when they were built for different filters", () => {
    mockIdleWorker();
    mockServerOverview({ isLoading: true });
    vi.mocked(usePnrrFilterState).mockReturnValue(
      makeFilterState({
        search: {
          ...makeFilterState().search,
          search: "spital",
        },
      }),
    );

    render(
      <PnrrDashboard
        ssrSnapshot={makeSnapshot()}
        ssrSnapshotSearchKey={makeSnapshotSearchKey()}
      />,
    );

    expect(screen.getByTestId("pnrr-header")).toHaveAttribute(
      "data-loading",
      "true",
    );
    expect(screen.getByTestId("pnrr-header-projects")).toHaveTextContent("0");
    expect(screen.queryByTestId("pnrr-overview")).not.toBeInTheDocument();
    expect(screen.getByTestId("pnrr-content-skeleton")).toBeInTheDocument();
  });

  it("shows a retryable error state when the dataset fails to load", () => {
    const refetch = vi.fn();
    mockServerOverview({
      error: new Error("Failed to load the PNRR overview: 502"),
      isError: true,
    });
    vi.mocked(usePnrrWorkerModel).mockReturnValue({
      data: undefined,
      error: new Error("Failed to fetch PNRR projects"),
      isError: true,
      isLoading: false,
      isRefetching: false,
      refetch,
    } as unknown as ReturnType<typeof usePnrrWorkerModel>);
    vi.mocked(usePnrrFilterState).mockReturnValue(makeFilterState());

    render(<PnrrDashboard />);

    expect(
      screen.queryByTestId("pnrr-content-skeleton"),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Could not load PNRR data")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Retry/i }));

    expect(refetch).toHaveBeenCalledTimes(1);
  });

  // With the default `networkMode: 'online'`, an offline browser parks the
  // query at `fetchStatus: 'paused'`: not loading, not errored, and with no
  // data. Rendering must not fall through to the data branch.
  it("renders a retryable state instead of crashing when the query is paused offline", () => {
    const refetch = vi.fn();
    mockIdleWorker();
    mockServerOverview({ refetch });
    vi.mocked(usePnrrFilterState).mockReturnValue(makeFilterState());

    expect(() => render(<PnrrDashboard />)).not.toThrow();

    expect(screen.queryByTestId("pnrr-overview")).not.toBeInTheDocument();
    expect(screen.getByText("Could not load PNRR data")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Retry/i }));

    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("does not crash on a non-overview tab while the query is paused offline", () => {
    vi.mocked(usePnrrWorkerModel).mockReturnValue({
      data: undefined,
      error: null,
      isError: false,
      isLoading: false,
      isRefetching: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof usePnrrWorkerModel>);
    vi.mocked(usePnrrFilterState).mockReturnValue(
      makeFilterState({
        search: { ...makeFilterState().search, view: "projects" },
      }),
    );

    expect(() => render(<PnrrDashboard />)).not.toThrow();

    expect(screen.queryByTestId("pnrr-projects")).not.toBeInTheDocument();
    expect(screen.getByText("Could not load PNRR data")).toBeInTheDocument();
  });

  it("renders the server overview without loading the raw dataset", () => {
    mockIdleWorker();
    mockServerOverview({ data: makeServerOverview() });
    vi.mocked(usePnrrFilterState).mockReturnValue(makeFilterState());

    render(<PnrrDashboard />);

    expect(lastWorkerOptions()).toEqual({ enabled: false });
    expect(vi.mocked(usePnrrServerOverview).mock.lastCall?.[1]).toEqual({
      enabled: true,
    });
    expect(screen.getByTestId("pnrr-header-projects")).toHaveTextContent("7");
    expect(screen.getByTestId("pnrr-overview")).toHaveAttribute(
      "data-has-overview",
      "true",
    );
    // The map preview is fetched apart by the overview itself.
    expect(screen.getByTestId("pnrr-overview")).toHaveAttribute(
      "data-has-map-preview",
      "false",
    );
  });

  it("names active UAT and beneficiary filters from the server overview", () => {
    mockIdleWorker();
    mockServerOverview({
      data: makeServerOverview({
        labels: {
          uats: [{ siruta: "179132", label: "București" }],
          beneficiaries: [{ cui: "4267117", name: "Municipiul București" }],
        },
      }),
    });
    vi.mocked(usePnrrFilterState).mockReturnValue(makeFilterState());

    render(<PnrrDashboard />);

    expect(screen.getByTestId("pnrr-header-labels")).toHaveTextContent(
      JSON.stringify([
        [["179132", "București"]],
        [["4267117", "Municipiul București"]],
      ]),
    );
  });

  it("loads the raw dataset for an explorer tab", () => {
    mockIdleWorker();
    vi.mocked(usePnrrFilterState).mockReturnValue(
      makeFilterState({
        search: { ...makeFilterState().search, view: "beneficiaries" },
      }),
    );

    render(<PnrrDashboard />);

    expect(lastWorkerOptions()).toEqual({ enabled: true });
  });

  it("loads the raw dataset when the filter sheet opens", () => {
    mockIdleWorker();
    mockServerOverview({ data: makeServerOverview() });
    vi.mocked(usePnrrFilterState).mockReturnValue(makeFilterState());

    render(<PnrrDashboard />);
    expect(lastWorkerOptions()).toEqual({ enabled: false });

    fireEvent.click(screen.getByRole("button", { name: "Filters" }));

    expect(lastWorkerOptions()).toEqual({ enabled: true });
    // The server overview stays on screen while the worker loads.
    expect(screen.getByTestId("pnrr-overview")).toHaveAttribute(
      "data-has-overview",
      "true",
    );
  });

  it("loads the raw dataset once a filter changes on the page", () => {
    mockIdleWorker();
    mockServerOverview({ data: makeServerOverview() });
    vi.mocked(usePnrrFilterState).mockReturnValue(makeFilterState());

    const { rerender } = render(<PnrrDashboard />);
    expect(lastWorkerOptions()).toEqual({ enabled: false });

    vi.mocked(usePnrrFilterState).mockReturnValue(
      makeFilterState({
        search: { ...makeFilterState().search, search: "spital" },
      }),
    );
    rerender(<PnrrDashboard />);

    expect(lastWorkerOptions()).toEqual({ enabled: true });
    // The server is asked only for the filters the page opened with.
    expect(vi.mocked(usePnrrServerOverview).mock.lastCall?.[1]).toEqual({
      enabled: false,
    });
  });

  it("keeps the server overview and offers a retry when the raw dataset fails", () => {
    const refetch = vi.fn();
    vi.mocked(usePnrrWorkerModel).mockReturnValue({
      data: undefined,
      error: new Error("Failed to load /api/pnrr/raw/projects: 502"),
      isError: true,
      isLoading: false,
      isRefetching: false,
      refetch,
    } as unknown as ReturnType<typeof usePnrrWorkerModel>);
    mockServerOverview({ data: makeServerOverview() });
    vi.mocked(usePnrrFilterState).mockReturnValue(makeFilterState());

    render(<PnrrDashboard />);
    expect(screen.queryByText("Could not load PNRR data")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Filters" }));

    expect(screen.getByTestId("pnrr-overview")).toHaveAttribute(
      "data-has-overview",
      "true",
    );
    expect(screen.getByText("Could not load PNRR data")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Retry/i }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("loads the raw dataset, and says so, when a project is opened from the server overview", () => {
    vi.mocked(usePnrrWorkerModel).mockReturnValue({
      data: undefined,
      error: null,
      isError: false,
      isFetching: true,
      isLoading: true,
      isRefetching: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof usePnrrWorkerModel>);
    mockServerOverview({ data: makeServerOverview() });
    vi.mocked(usePnrrFilterState).mockReturnValue(
      makeFilterState({
        search: {
          ...makeFilterState().search,
          panel: "project",
          panelProjectId: "engagement:123",
        },
      }),
    );

    render(<PnrrDashboard />);

    expect(lastWorkerOptions()).toEqual({ enabled: true });
    expect(screen.getByTestId("pnrr-overview")).toHaveAttribute(
      "data-has-overview",
      "true",
    );
    expect(screen.getByTestId("pnrr-full-data-loading")).toBeInTheDocument();
  });

  it("falls back to the worker when the server overview fails", () => {
    mockIdleWorker();
    mockServerOverview({ error: new Error("502"), isError: true });
    vi.mocked(usePnrrFilterState).mockReturnValue(makeFilterState());

    render(<PnrrDashboard />);

    expect(lastWorkerOptions()).toEqual({ enabled: true });
  });

  it("prefers the worker's overview, with its map preview, once it has loaded", () => {
    vi.mocked(usePnrrWorkerModel).mockReturnValue({
      data: makeWorkerResult(),
      error: null,
      isError: false,
      isLoading: false,
      isRefetching: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof usePnrrWorkerModel>);
    mockServerOverview({ data: makeServerOverview() });
    vi.mocked(usePnrrFilterState).mockReturnValue(makeFilterState());

    render(<PnrrDashboard />);

    expect(screen.getByTestId("pnrr-header-projects")).toHaveTextContent("0");
    expect(screen.getByTestId("pnrr-overview")).toHaveAttribute(
      "data-has-map-preview",
      "true",
    );
  });
});
