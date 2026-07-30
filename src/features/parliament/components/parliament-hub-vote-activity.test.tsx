import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";

import type {
  ParliamentVoteActivity,
  ParliamentVoteCoverage,
} from "@/schemas/parliament";

// The panel renders TanStack <Link>s; stub the router to a plain anchor so it
// renders without a RouterProvider (mirrors bill-stages-tab.test).
vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    to,
    search,
    ...rest
  }: {
    children?: React.ReactNode;
    to: string;
    search?: Record<string, string | undefined>;
  }) => {
    const query = new URLSearchParams(
      Object.entries(search ?? {}).filter(
        (entry): entry is [string, string] => entry[1] !== undefined,
      ),
    ).toString();
    return (
      <a
        href={query ? `${to}?${query}` : to}
        {...(rest as Record<string, unknown>)}
      >
        {children}
      </a>
    );
  },
}));

const useParliamentVoteActivity = vi.fn();
vi.mock("../hooks/use-parliament-data", () => ({
  useParliamentVoteActivity: (year: number, filter?: unknown) =>
    useParliamentVoteActivity(year, filter),
}));

import { ParliamentHubVoteActivity } from "./parliament-hub-vote-activity";

/** "Today" for every case here, so the rolling window is deterministic. */
const TODAY = new Date("2026-07-29T09:00:00Z");

const activity = (
  year: number,
  days: ParliamentVoteActivity["days"],
): ParliamentVoteActivity => ({
  year,
  days,
  availableYears: [2025, 2026],
  // The activity read now carries source-coverage rows; the fixture has none,
  // which is what an unannotated year looks like.
  coverage: [],
});

const settled = (data: ParliamentVoteActivity) => ({
  data,
  isLoading: false,
  isError: false,
  error: null,
});

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(TODAY);
});

afterEach(() => {
  vi.useRealTimers();
  useParliamentVoteActivity.mockReset();
});

describe("ParliamentHubVoteActivity", () => {
  it("renders a day square linking to that day on the votes page", () => {
    useParliamentVoteActivity.mockImplementation((year: number) =>
      settled(
        year === 2026
          ? activity(2026, [
              {
                date: "2026-03-20",
                total: 42,
                camera: 30,
                senat: 10,
                comun: 2,
              },
            ])
          : activity(2025, []),
      ),
    );

    render(<ParliamentHubVoteActivity />);

    // Matched on the date only: the count is pluralised by the active locale,
    // and the test harness aliases the Lingui macros to stubs that pick the
    // right plural form but leave `#` unsubstituted (see src/test/mocks).
    const day = screen.getByRole("link", { name: /20 martie 2026 — .*voturi/ });
    // `chamber=all` is part of the contract: a square counts camera + senat +
    // comun, so only the mixed list holds the set of votes it claims.
    expect(day).toHaveAttribute(
      "href",
      "/parlament?tab=voturi&chamber=all&from=2026-03-20&to=2026-03-20",
    );
  });

  it("always offers the way into the full votes list", () => {
    useParliamentVoteActivity.mockImplementation(() =>
      settled(activity(2026, [])),
    );

    render(<ParliamentHubVoteActivity />);

    expect(
      screen.getByRole("link", { name: /Vezi toate voturile/ }),
    ).toHaveAttribute("href", "/parlament?tab=voturi&chamber=all");
  });

  it("does not call an older-API empty response a year with no votes", () => {
    useParliamentVoteActivity.mockImplementation((year: number) =>
      settled(activity(year, [])),
    );

    render(<ParliamentHubVoteActivity />);

    expect(screen.queryByText(/Niciun vot în plen/)).not.toBeInTheDocument();
    expect(
      screen.getByTitle(
        /20 iulie 2026 — nu avem metadate de acoperire; ziua nu este confirmată/,
      ),
    ).toBeInTheDocument();
  });

  it("hatches a missing day when coverage metadata is absent", () => {
    useParliamentVoteActivity.mockImplementation((year: number) =>
      settled(
        year === 2026
          ? activity(2026, [
              {
                date: "2026-03-20",
                total: 42,
                camera: 30,
                senat: 10,
                comun: 2,
              },
            ])
          : activity(2025, []),
      ),
    );

    render(<ParliamentHubVoteActivity />);

    expect(
      screen.getByTitle(
        /21 martie 2026 — nu avem metadate de acoperire; ziua nu este confirmată/,
      ),
    ).toBeInTheDocument();
  });

  it("caveats a nonzero day when coverage metadata is absent", () => {
    useParliamentVoteActivity.mockImplementation((year: number) =>
      settled(
        year === 2026
          ? activity(2026, [
              {
                date: "2026-03-20",
                total: 42,
                camera: 30,
                senat: 10,
                comun: 2,
              },
            ])
          : activity(2025, []),
      ),
    );

    render(<ParliamentHubVoteActivity />);

    expect(
      screen.getByRole("link", {
        name: /20 martie 2026 — .*neconfirmat/,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Metadatele de acoperire nu sunt disponibile/),
    ).toBeInTheDocument();
  });

  it("states the failure instead of drawing an empty year", () => {
    useParliamentVoteActivity.mockImplementation(() => ({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error('Cannot query field "parliamentVoteActivity"'),
    }));

    render(<ParliamentHubVoteActivity />);

    expect(screen.getByRole("status")).toHaveTextContent(
      /nu a putut fi încărcată/i,
    );
    // The reader must not be told "no votes" when the truth is "not counted".
    expect(screen.queryByText(/Niciun vot în plen/)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /martie/ }),
    ).not.toBeInTheDocument();
  });

  it("draws NOTHING until both calendar years of the window have answered", () => {
    // A 12-month window ending 2026-07-29 spans 2025 and 2026. Rendering the
    // half that arrived would print 2025 as a row of empty days — a silent
    // claim that the chambers never voted.
    useParliamentVoteActivity.mockImplementation((year: number) =>
      year === 2026
        ? settled(
            activity(2026, [
              {
                date: "2026-03-20",
                total: 42,
                camera: 30,
                senat: 10,
                comun: 2,
              },
            ]),
          )
        : { data: undefined, isLoading: true, isError: false, error: null },
    );

    render(<ParliamentHubVoteActivity />);

    expect(
      screen.queryByRole("link", { name: /20 martie 2026/ }),
    ).not.toBeInTheDocument();
  });

  it("drops days the server returns from outside the rolling window", () => {
    // The aggregate is fetched a whole calendar year at a time, so 2025 arrives
    // with January in it — five months before a window that starts in August.
    useParliamentVoteActivity.mockImplementation((year: number) =>
      settled(
        year === 2025
          ? activity(2025, [
              { date: "2025-01-15", total: 12, camera: 12, senat: 0, comun: 0 },
              { date: "2025-09-10", total: 8, camera: 0, senat: 8, comun: 0 },
            ])
          : activity(2026, []),
      ),
    );

    render(<ParliamentHubVoteActivity />);

    expect(
      screen.getByRole("link", { name: /10 septembrie 2025/ }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /15 ianuarie 2025/ }),
    ).not.toBeInTheDocument();
  });
});

/**
 * The claim a square makes when it is empty. Every case here is a shape that
 * rendered as a confirmed quiet day before review and should not have.
 */
describe("ParliamentHubVoteActivity — what an empty square is allowed to claim", () => {
  const lane = (
    over: Partial<ParliamentVoteCoverage> = {},
  ): ParliamentVoteCoverage => ({
    chamber: "camera_deputatilor",
    sourceSystem: "cdep",
    scope: "Divizuni electronice",
    sourceUrl: "https://cdep.ro/x",
    sourceAvailableFrom: "2006-02-06",
    observedFrom: "2016-01-01",
    observedThrough: "2026-07-29",
    finalizedThrough: "2026-07-29",
    asOf: "2026-07-29T04:30:00Z",
    ranges: [{ from: "2016-01-01", to: "2026-07-29" }],
    gaps: [],
    ...over,
  });

  /**
   * All three chambers, since an unfiltered square SUMS them and coverage that
   * omits a lane can no longer confirm anything. `over` applies to every lane.
   */
  const allLanes = (
    over: Partial<ParliamentVoteCoverage> = {},
  ): ParliamentVoteCoverage[] => [
    lane(over),
    lane({ chamber: "senat", sourceSystem: "senat", ...over }),
    lane({ chamber: "comun", sourceSystem: "cdep", ...over }),
  ];

  // At least one day, or the heatmap draws its empty state instead of a grid
  // and there are no squares to make a claim about.
  const withCoverage = (coverage: ParliamentVoteCoverage[]) => {
    useParliamentVoteActivity.mockImplementation((year: number) =>
      settled({
        ...activity(
          year,
          year === 2026
            ? [{ date: "2026-03-20", total: 4, camera: 4, senat: 0, comun: 0 }]
            : [],
        ),
        coverage,
      }),
    );
  };

  const squareTitle = (name: RegExp) => screen.getByTitle(name);

  /**
   * THE live defect. 2026-07-27 sits inside the cdep crawl window but after the
   * settled frontier, because the lane polls at 04:30 that same morning. The
   * source published two divisions that day and we hold none — so the day must
   * not read as quiet.
   */
  it("does not confirm a day inside the window but after the settled frontier", () => {
    withCoverage(allLanes({ finalizedThrough: "2026-05-22" }));
    render(<ParliamentHubVoteActivity />);
    expect(
      squareTitle(/27 iulie 2026 — captura zilei nu a fost încă finalizată/),
    ).toBeInTheDocument();
  });

  /** A day the crawl never reached says so in different words. */
  it("distinguishes never-collected from collected-too-early", () => {
    withCoverage(
      allLanes({
        ranges: [{ from: "2016-01-01", to: "2026-06-01" }],
        observedThrough: "2026-06-01",
        finalizedThrough: "2026-06-01",
      }),
    );
    render(<ParliamentHubVoteActivity />);
    expect(
      squareTitle(/27 iulie 2026 — gol confirmat de captură/),
    ).toBeInTheDocument();
  });

  /**
   * A square SUMS its lanes, so every lane must cover the day. Senate coverage
   * ending 2026-06-30 while cdep runs to 07-29 used to leave July looking
   * confirmed on the strength of cdep alone.
   */
  it("requires EVERY contributing lane, not just one", () => {
    withCoverage([
      lane(),
      lane({
        chamber: "senat",
        sourceSystem: "senat",
        ranges: [{ from: "2001-01-01", to: "2026-06-30" }],
        observedThrough: "2026-06-30",
        finalizedThrough: "2026-06-30",
      }),
    ]);
    render(<ParliamentHubVoteActivity />);
    expect(squareTitle(/27 iulie 2026 —/)).toBeInTheDocument();
  });

  /** No settled prefix at all confirms nothing. */
  it("confirms nothing when the frontier is NULL", () => {
    withCoverage(allLanes({ finalizedThrough: null }));
    render(<ParliamentHubVoteActivity />);
    expect(squareTitle(/20 iulie 2026 —/)).toBeInTheDocument();
  });

  /** Inside the window and at/below the frontier: a zero here IS a fact. */
  it("does confirm a settled day inside every window", () => {
    withCoverage(allLanes({ finalizedThrough: "2026-07-29" }));
    render(<ParliamentHubVoteActivity />);
    expect(
      squareTitle(
        /27 iulie 2026 — zi verificată după încheiere: nicio divizare publicată/,
      ),
    ).toBeInTheDocument();
  });

  it("distinguishes the current day before its post-close confirmation", () => {
    withCoverage(allLanes({ finalizedThrough: "2026-07-28" }));
    render(<ParliamentHubVoteActivity />);
    expect(
      squareTitle(/29 iulie 2026 — ziua curentă nu este încă confirmată/),
    ).toBeInTheDocument();
  });

  it("distinguishes dates before the source historical range", () => {
    withCoverage(allLanes({ sourceAvailableFrom: "2026-01-01" }));
    render(<ParliamentHubVoteActivity />);
    expect(
      squareTitle(/10 septembrie 2025 — în afara intervalului istoric/),
    ).toBeInTheDocument();
  });

  it("shows the coverage scope and as-of provenance", () => {
    withCoverage(allLanes());
    render(<ParliamentHubVoteActivity />);
    expect(
      screen.getByText(/Acoperire: Divizuni electronice/),
    ).toBeInTheDocument();
    expect(screen.getByText(/Actualizată la/)).toBeInTheDocument();
  });

  /**
   * A COUNT past the frontier is a floor, not a total — the morning poll caught
   * what had happened by 04:30 and nothing revisits the day. 131 held divisions
   * currently sit on such days.
   */
  it("marks a day that HAS votes but is past the frontier as not yet confirmed", () => {
    withCoverage(allLanes({ finalizedThrough: "2026-01-01" }));
    render(<ParliamentHubVoteActivity />);
    expect(
      screen.getByRole("link", { name: /20 martie 2026 — .*neconfirmat/ }),
    ).toBeInTheDocument();
  });

  /**
   * The hole the first fix left: `isCovered` was consulted only for EMPTY
   * squares, so a day carrying divisions printed its count with no caveat even
   * when a typed gap said another chamber's contribution was missing. Live, 28
   * gap dates overlap 340 divisions from other chambers.
   */
  it("caveats a day that HAS divisions but also carries a typed gap", () => {
    withCoverage(
      allLanes({
        gaps: [
          {
            date: "2026-03-20",
            status: "PARSER_EMPTY",
            reason:
              "Calendarul lunii a listat ziua, dar pagina nu a returnat nicio divizune.",
          },
        ],
      }),
    );
    render(<ParliamentHubVoteActivity />);
    expect(
      screen.getByRole("link", { name: /20 martie 2026 — .*neconfirmat/ }),
    ).toBeInTheDocument();
  });

  /** A gap day states the gap's own reason, not "we checked too early". */
  it("gives a gap day its real reason rather than the morning-poll excuse", () => {
    withCoverage(
      allLanes({
        gaps: [
          {
            date: "2026-07-27",
            status: "PARSER_EMPTY",
            reason: "pagina nu a returnat nicio divizune",
          },
        ],
      }),
    );
    render(<ParliamentHubVoteActivity />);
    expect(
      squareTitle(
        /27 iulie 2026 — sursa a listat ziua, dar parserul nu a extras voturi: pagina nu a returnat/,
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByTitle(
        /27 iulie 2026 — captura zilei nu a fost încă finalizată/,
      ),
    ).not.toBeInTheDocument();
  });

  /**
   * Coverage that simply OMITS a lane must not read as coverage that confirms
   * it. An all-chamber square sums three chambers; two lanes cannot vouch for
   * the third's silence.
   */
  it("confirms nothing when a contributing lane is absent from the read", () => {
    withCoverage([lane(), lane({ chamber: "senat", sourceSystem: "senat" })]);
    render(<ParliamentHubVoteActivity />);
    expect(
      squareTitle(/20 iulie 2026 — nu avem acoperirea/),
    ).toBeInTheDocument();
  });

  it("states a settled day’s count without a caveat", () => {
    withCoverage(allLanes({ finalizedThrough: "2026-07-29" }));
    render(<ParliamentHubVoteActivity />);
    expect(
      screen.getByRole("link", { name: /20 martie 2026 — / }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /20 martie 2026 — .*neconfirmat/ }),
    ).not.toBeInTheDocument();
  });
});

describe("ParliamentHubVoteActivity — the chart asks the list’s own question", () => {
  it("sends the surface’s filter, minus its day bound", () => {
    useParliamentVoteActivity.mockImplementation((year: number) =>
      settled(activity(year, [])),
    );

    render(
      <ParliamentHubVoteActivity
        daySearch={{
          tab: "voturi",
          chamber: "senat",
          outcome: "adoptat",
          from: "2026-03-01",
          to: "2026-03-01",
        }}
      />,
    );

    const [, filter] = useParliamentVoteActivity.mock.calls[0] as [
      number,
      Record<string, unknown> | undefined,
    ];
    expect(filter).toMatchObject({
      chamber: { eq: "senat" },
      outcome: { eq: "adoptat" },
    });
    // The year argument is the bound; a voteDate here is REJECTED by the server,
    // and a chart collapsed to one day cannot show the year around it.
    expect(filter).not.toHaveProperty("voteDate");
  });

  it("sends no filter at all from the hub", () => {
    useParliamentVoteActivity.mockImplementation((year: number) =>
      settled(activity(year, [])),
    );
    render(<ParliamentHubVoteActivity />);
    const [, filter] = useParliamentVoteActivity.mock.calls[0] as [
      number,
      unknown,
    ];
    expect(filter).toBeUndefined();
  });
});
