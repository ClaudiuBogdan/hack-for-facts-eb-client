import { Link } from "@tanstack/react-router";
import { Trans } from "@lingui/react/macro";
import { t } from "@lingui/core/macro";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  ChevronDown,
  ExternalLink,
  Filter,
  MapPin,
} from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import {
  usePnrrLiveOrganization,
  usePnrrLiveCatalogResources,
  usePnrrLiveDocumentReferences,
  usePnrrLiveFundingApplications,
  usePnrrLiveFundingCalls,
  usePnrrLiveOrganizationProfile,
  usePnrrLiveOrganizationProjects,
  usePnrrLiveOrganizations,
  usePnrrLiveOverview,
  usePnrrLivePlace,
  usePnrrLivePlaces,
  usePnrrLiveProject,
  usePnrrLiveProjectHistory,
  usePnrrLiveProjectFacets,
  usePnrrLiveProjects,
  usePnrrLiveProgramRevisions,
  usePnrrLiveStatus,
  usePnrrLiveVerification,
} from "../../hooks/use-pnrr-live-data";
import type {
  PnrrOrganizationListFilters,
  PnrrProjectListFilters,
} from "../../api/pnrr-api";
import type { PnrrLiveProject, PnrrLiveRelease } from "@/schemas/pnrr-live";
import { getUserLocale } from "@/lib/utils";
import {
  downloadPnrrProjectPageCsv,
  downloadPnrrVerificationCsv,
} from "../../lib/pnrr-live-export";

export type PnrrProjectsRouteSearch = PnrrProjectListFilters & {
  readonly after?: string;
  readonly first?: number;
};

export type PnrrOrganizationsRouteSearch = PnrrOrganizationListFilters & {
  readonly [key: string]: unknown;
  readonly after?: string;
  readonly first?: number;
};

function formatExactMoney(
  amount: string | null,
  currency: "RON" | "EUR",
): string {
  if (amount === null) return "—";
  const [integer = "0", decimals] = amount.split(".");
  const sign = integer.startsWith("-") ? "-" : "";
  const digits = sign ? integer.slice(1) : integer;
  const isRomanian = getUserLocale() === "ro";
  const grouped = digits.replace(
    /\B(?=(\d{3})+(?!\d))/g,
    isRomanian ? "." : ",",
  );
  return `${sign}${grouped}${
    decimals ? `${isRomanian ? "," : "."}${decimals}` : ""
  } ${currency}`;
}

function formatProgressRatio(value: number | null): string {
  if (value === null) return "—";
  return `${new Intl.NumberFormat(getUserLocale(), {
    maximumFractionDigits: 2,
  }).format(value * 100)}%`;
}

function formatInteger(value: number): string {
  return new Intl.NumberFormat(getUserLocale(), {
    maximumFractionDigits: 0,
  }).format(value);
}

function progressPercent(value: number | null): number | null {
  if (value === null) return null;
  return Math.min(100, Math.max(0, value * 100));
}

function formatSourceDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(`${value.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(getUserLocale(), {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function projectDisplayTitle(project: PnrrLiveProject): string {
  return (
    project.contractTitle ??
    (project.contractNumber
      ? t`Contract ${project.contractNumber}`
      : project.itemKey) ??
    t`PNRR project`
  );
}

function projectLocation(project: PnrrLiveProject): string | null {
  const parts = [project.localityName, project.countyName].filter(
    (value): value is string => Boolean(value),
  );
  return (
    parts
      .filter(
        (value, index) =>
          parts.findIndex(
            (candidate) =>
              candidate.trim().toLocaleLowerCase("ro-RO") ===
              value.trim().toLocaleLowerCase("ro-RO"),
          ) === index,
      )
      .join(", ") || null
  );
}

function projectFinancingSourceLabel(value: string | null): string | null {
  if (!value) return null;
  if (value.toLowerCase() === "loan") return t`Loan`;
  if (value.toLowerCase() === "grant") return t`Grant`;
  if (value.toLowerCase() === "grant/loan") return t`Grant and loan`;
  return value;
}

function projectMeasureLabel(project: PnrrLiveProject): string | null {
  const placeholders = new Set(["", "-", "x", "n/a"]);
  return (
    [project.measureCode, project.submeasureCode]
      .filter(
        (value): value is string =>
          Boolean(value) && !placeholders.has(value!.trim().toLowerCase()),
      )
      .join(" · ") || null
  );
}

function projectRelationshipLabel(relationship: string | null): string | null {
  if (relationship === "candidate_project") {
    return t`Candidate link — not confirmed`;
  }
  if (!relationship) return null;
  return relationship;
}

function PnrrLiveShell({
  release,
  children,
  returnView = "overview",
  returnLabel,
}: {
  readonly release?: PnrrLiveRelease;
  readonly children: React.ReactNode;
  readonly returnView?: "overview" | "projects" | "beneficiaries";
  readonly returnLabel?: React.ReactNode;
}) {
  const status = usePnrrLiveStatus();
  const servingRelease = status.data?.pnrrCurrentRelease ?? release;
  const isAbstained = servingRelease?.state === "abstained";
  const releaseLabel =
    servingRelease?.state === "served"
      ? t`Data available`
      : servingRelease?.state === "abstained"
        ? t`Data unavailable`
        : t`Partial coverage`;

  return (
    <div className="min-h-screen bg-[var(--pnrr-bg)] text-[var(--pnrr-fg)]">
      <header className="border-b-2 border-[var(--pnrr-border)]">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Link
            to="/pnrr"
            search={{ view: returnView }}
            className="inline-flex items-center gap-2 text-sm font-black text-[var(--pnrr-fg)] underline decoration-2 underline-offset-4"
          >
            <ArrowLeft className="h-4 w-4" />
            {returnLabel ?? <Trans>Back to the PNRR dashboard</Trans>}
          </Link>
          <div>
            {servingRelease && (
              <details className="group max-w-sm border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] text-sm">
                <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 font-black [&::-webkit-details-marker]:hidden">
                  <span
                    className={`h-2.5 w-2.5 ${
                      servingRelease.state === "served"
                        ? "bg-emerald-600"
                        : servingRelease.state === "abstained"
                          ? "bg-red-700"
                          : "bg-amber-500"
                    }`}
                    aria-hidden="true"
                  />
                  {releaseLabel}
                  <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
                </summary>
                <div className="border-t border-[var(--pnrr-border)] px-3 py-3 text-xs leading-relaxed text-[var(--pnrr-muted)]">
                  <p>{servingRelease.limitation}</p>
                  <p className="mt-2 break-all font-mono">
                    {servingRelease.releaseId}
                  </p>
                </div>
              </details>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {isAbstained && servingRelease ? (
          <>
            {status.error && (
              <div
                role="alert"
                className="mb-4 border-2 border-red-700 bg-red-50 p-4 text-sm text-red-950"
              >
                <Trans>
                  Release status could not be refreshed. Cached abstention
                  remains in force, so no facts are displayed.
                </Trans>
              </div>
            )}
            <CaveatPanel release={servingRelease} />
            <CapabilityStatus
              capabilities={status.data?.pnrrCapabilities ?? []}
            />
          </>
        ) : (
          children
        )}
      </main>
    </div>
  );
}

function QueryState({
  isLoading,
  error,
  children,
}: {
  readonly isLoading: boolean;
  readonly error: Error | null;
  readonly children: React.ReactNode;
}) {
  if (isLoading) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="border-2 border-[var(--pnrr-border)] p-6 font-bold"
      >
        <Trans>Loading PNRR data…</Trans>
      </div>
    );
  }
  if (error) {
    return (
      <div
        role="alert"
        className="border-2 border-red-700 bg-red-50 p-6 text-red-950"
      >
        <p className="font-black">
          <Trans>PNRR details are temporarily unavailable.</Trans>
        </p>
        <p className="mt-2 text-sm">
          <Trans>
            Please try again in a moment. The established MIPE dashboard remains
            available from the link above.
          </Trans>
        </p>
      </div>
    );
  }
  return children;
}

function SectionState({
  isLoading,
  error,
  hasUsableData = false,
  children,
}: {
  readonly isLoading: boolean;
  readonly error: Error | null;
  readonly hasUsableData?: boolean;
  readonly children: React.ReactNode;
}) {
  if (isLoading) {
    return (
      <div role="status" aria-live="polite" className="border p-4 text-sm">
        <Trans>Loading this section…</Trans>
      </div>
    );
  }
  if (error && !hasUsableData) {
    return (
      <div role="alert" className="border border-red-700 bg-red-50 p-4 text-sm">
        <Trans>
          This section is temporarily unavailable. The other source sections
          remain usable.
        </Trans>
      </div>
    );
  }
  return (
    <>
      {children}
      {error && (
        <div
          role="alert"
          className="mt-3 border border-red-700 bg-red-50 p-3 text-sm"
        >
          <Trans>
            Additional records could not be loaded. The records already shown
            remain valid; use “Load more” to retry.
          </Trans>
        </div>
      )}
    </>
  );
}

function SourcePager({
  shownCount,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
}: {
  readonly shownCount: number;
  readonly hasNextPage: boolean;
  readonly isFetchingNextPage: boolean;
  readonly onLoadMore: () => void;
}) {
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--pnrr-border)] pt-3 text-sm">
      <p className="text-[var(--pnrr-muted)]">
        <Trans>{shownCount} loaded records</Trans>
        {hasNextPage ? (
          <Trans> · additional records are available</Trans>
        ) : (
          <Trans> · complete</Trans>
        )}
      </p>
      {hasNextPage && (
        <button
          type="button"
          disabled={isFetchingNextPage}
          onClick={onLoadMore}
          className="border-2 border-[var(--pnrr-border)] px-4 py-2 font-bold disabled:cursor-wait disabled:opacity-60"
        >
          {isFetchingNextPage ? t`Loading…` : t`Load more`}
        </button>
      )}
    </div>
  );
}

function CaveatPanel({
  release,
  caveats = [],
}: {
  readonly release: PnrrLiveRelease;
  readonly caveats?: readonly string[];
}) {
  const title =
    release.state === "abstained"
      ? t`Data unavailable for this release`
      : release.state === "degraded" || release.state === "legacy_unversioned"
        ? t`This view has partial coverage`
        : t`Source-aware data`;
  const tone =
    release.state === "abstained"
      ? "border-red-700 bg-red-50 text-red-950"
      : release.state === "served"
        ? "border-emerald-700 bg-emerald-50 text-emerald-950"
        : "border-amber-700 bg-amber-50 text-amber-950";
  return (
    <details className={`group mb-6 border-2 ${tone}`}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-4 [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-3 font-black">
          <AlertTriangle aria-hidden="true" className="h-5 w-5 shrink-0" />
          {title}
        </span>
        <span className="flex items-center gap-2 text-xs font-black uppercase tracking-wide">
          <Trans>View limitations</Trans>
          <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
        </span>
      </summary>
      <div className="border-t border-current/30 px-4 pb-4 pt-3">
        <div className="ml-8">
          <p className="mt-1 text-sm">{release.limitation}</p>
          {caveats.map((caveat) => (
            <p key={caveat} className="mt-1 text-sm">
              {caveat}
            </p>
          ))}
        </div>
      </div>
    </details>
  );
}

function CapabilityStatus({
  capabilities,
}: {
  readonly capabilities: readonly {
    readonly id: string;
    readonly state: string;
    readonly reasonCodes: readonly string[];
    readonly limitation: string | null;
  }[];
}) {
  return (
    <section aria-labelledby="pnrr-capability-status">
      <h2 id="pnrr-capability-status" className="text-xl font-black">
        Source capabilities
      </h2>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {capabilities.map((capability) => (
          <article
            key={capability.id}
            className="border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="font-bold">{capability.id}</span>
              <span className="font-mono text-xs uppercase">
                {capability.state}
              </span>
            </div>
            {capability.limitation && (
              <p className="mt-2 text-sm">{capability.limitation}</p>
            )}
            {capability.reasonCodes.length > 0 && (
              <p className="mt-2 font-mono text-xs text-[var(--pnrr-muted)]">
                {capability.reasonCodes.join(", ")}
              </p>
            )}
          </article>
        ))}
        {capabilities.length === 0 && (
          <p className="border-2 border-[var(--pnrr-border)] p-4 text-sm">
            Capability details are unavailable. The global abstention still
            prevents fact queries.
          </p>
        )}
      </div>
    </section>
  );
}

function MetricCard({
  label,
  value,
  note,
}: {
  readonly label: string;
  readonly value: string;
  readonly note: string;
}) {
  return (
    <div className="border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] p-5">
      <p className="text-xs font-black uppercase tracking-wide text-[var(--pnrr-muted)]">
        {label}
      </p>
      <p className="mt-2 break-words text-2xl font-black tabular-nums">
        {value}
      </p>
      <p className="mt-2 text-sm text-[var(--pnrr-muted)]">{note}</p>
    </div>
  );
}

export function PnrrLiveOverviewPage() {
  const status = usePnrrLiveStatus();
  const overview = usePnrrLiveOverview();
  const error = (status.error ?? overview.error) as Error | null;

  return (
    <PnrrLiveShell release={status.data?.pnrrCurrentRelease}>
      <QueryState
        isLoading={status.isLoading || overview.isLoading}
        error={error}
      >
        {status.data && overview.data && (
          <>
            <CaveatPanel
              release={overview.data.meta.release}
              caveats={overview.data.meta.caveats}
            />
            {overview.data.meta.state !== "abstained" && (
              <>
                <h2 className="text-2xl font-black">National overview</h2>
                <p className="mt-2 max-w-3xl text-[var(--pnrr-muted)]">
                  Each card keeps its source grain and currency. The explorer
                  never adds allocation, receipts, payments, commitments, or
                  procurement.
                </p>
                <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <MetricCard
                    label="Plan allocation"
                    value={formatExactMoney(
                      overview.data.program.allocationEur.amount,
                      "EUR",
                    )}
                    note={`MIPE national indicator · ${overview.data.program.snapshotDate ?? "date unavailable"}`}
                  />
                  <MetricCard
                    label="EU receipts"
                    value={formatExactMoney(
                      overview.data.program.receivedEur.amount,
                      "EUR",
                    )}
                    note="MIPE national indicator, not beneficiary payments"
                  />
                  <MetricCard
                    label="National paid indicator"
                    value={formatExactMoney(
                      overview.data.program.paidEur.amount,
                      "EUR",
                    )}
                    note="MIPE-reported national aggregate; distinct from accepted ORDS beneficiary payments"
                  />
                  <MetricCard
                    label="Beneficiary payment net"
                    value={formatExactMoney(
                      overview.data.beneficiaryPayments.netRon.amount,
                      "RON",
                    )}
                    note={`${overview.data.beneficiaryPayments.count.toLocaleString()} source-native payment rows`}
                  />
                  <MetricCard
                    label="Commitment envelopes"
                    value={formatExactMoney(
                      overview.data.commitments.additiveRon.amount,
                      "RON",
                    )}
                    note={`${overview.data.commitments.additiveCount}/${overview.data.commitments.count} envelopes additive; ${overview.data.commitments.unresolvedCount} unresolved`}
                  />
                  <MetricCard
                    label="Delivery observations"
                    value={overview.data.delivery.observedCount.toLocaleString()}
                    note={`${overview.data.delivery.completedCount.toLocaleString()} reported at or above completion`}
                  />
                  <MetricCard
                    label="Progress over 100%"
                    value={overview.data.delivery.overHundredCount.toLocaleString()}
                    note="Deterministic verification signal, not a finding"
                  />
                </div>
              </>
            )}
            <section className="mt-8">
              <h2 className="text-xl font-black">Source capabilities</h2>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {status.data.pnrrCapabilities.map((capability) => (
                  <div
                    key={capability.id}
                    className="border border-[var(--pnrr-border)] p-4"
                  >
                    <div className="flex justify-between gap-3">
                      <span className="font-bold">{capability.id}</span>
                      <span className="font-mono text-xs">
                        {capability.state}
                      </span>
                    </div>
                    {capability.limitation && (
                      <p className="mt-2 text-sm text-[var(--pnrr-muted)]">
                        {capability.limitation}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </QueryState>
    </PnrrLiveShell>
  );
}

export function PnrrLiveOrganizationsPage({
  search,
  onSearch,
}: {
  readonly search: PnrrOrganizationsRouteSearch;
  readonly onSearch: (next: PnrrOrganizationsRouteSearch) => void;
}) {
  const status = usePnrrLiveStatus();
  const [query, setQuery] = useState(search.q ?? "");
  const [role, setRole] = useState(search.role ?? "");
  const [hub, setHub] = useState(search.hub ?? "");
  useEffect(() => {
    setQuery(search.q ?? "");
    setRole(search.role ?? "");
    setHub(search.hub ?? "");
  }, [search.hub, search.q, search.role]);
  const organizations = usePnrrLiveOrganizations({
    filters: search,
    first: search.first ?? 25,
    after: search.after,
  });
  const error = (status.error ?? organizations.error) as Error | null;

  const applyFilters = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSearch({
      ...(query.trim() ? { q: query.trim() } : {}),
      ...(role
        ? {
            role: role as NonNullable<PnrrOrganizationListFilters["role"]>,
          }
        : {}),
      ...(hub
        ? {
            hub: hub as NonNullable<PnrrOrganizationListFilters["hub"]>,
          }
        : {}),
      first: search.first,
    });
  };

  return (
    <PnrrLiveShell release={status.data?.pnrrCurrentRelease}>
      <QueryState
        isLoading={status.isLoading || organizations.isLoading}
        error={error}
      >
        {status.data && organizations.data && (
          <>
            <CaveatPanel
              release={status.data.pnrrCurrentRelease}
              caveats={[
                "Organizations are joined by normalized public CUI. Source aliases remain incomplete and are not merged by name.",
              ]}
            />
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="text-3xl font-black">PNRR organizations</h2>
                <p className="mt-2 max-w-3xl text-sm text-[var(--pnrr-muted)]">
                  Beneficiaries, applicants, and procurement participants on the
                  public organization identity spine.
                </p>
              </div>
              <button
                type="button"
                disabled={!organizations.data.pageInfo.hasNextPage}
                onClick={() =>
                  onSearch({
                    ...search,
                    after: organizations.data.pageInfo.endCursor ?? undefined,
                  })
                }
                className="inline-flex items-center gap-2 border-2 border-[var(--pnrr-border)] px-4 py-2 font-bold disabled:opacity-40"
              >
                Next page <ArrowRight className="h-4 w-4" />
              </button>
            </div>
            <form
              onSubmit={applyFilters}
              className="mt-6 grid gap-3 border-2 border-[var(--pnrr-border)] p-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_220px_220px_120px_auto_auto]"
            >
              <label className="grid gap-1 text-sm font-bold">
                Organization name
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search the resolved public name"
                  className="border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-bg)] px-3 py-2 font-normal"
                />
              </label>
              <label className="grid gap-1 text-sm font-bold">
                PNRR role
                <select
                  value={role}
                  onChange={(event) => setRole(event.target.value)}
                  className="border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-bg)] px-3 py-2 font-normal"
                >
                  <option value="">All roles</option>
                  <option value="beneficiary">Beneficiary</option>
                  <option value="applicant">Applicant</option>
                  <option value="winner">Procurement winner flag</option>
                  <option value="subcontractor">Subcontractor flag</option>
                </select>
              </label>
              <label className="grid gap-1 text-sm font-bold">
                Registry evidence
                <select
                  value={hub}
                  onChange={(event) => setHub(event.target.value)}
                  className="border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-bg)] px-3 py-2 font-normal"
                >
                  <option value="">All registries</option>
                  <option value="public_entities">
                    Public entity registry
                  </option>
                  <option value="companies">Company registry</option>
                </select>
              </label>
              <label className="grid gap-1 text-sm font-bold">
                Page size
                <select
                  value={search.first ?? 25}
                  onChange={(event) =>
                    onSearch({
                      ...search,
                      first: Number(event.target.value),
                      after: undefined,
                    })
                  }
                  className="border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-bg)] px-3 py-2 font-normal"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </label>
              <button
                type="submit"
                className="self-end border-2 border-[var(--pnrr-border)] px-4 py-2 font-black"
              >
                Apply
              </button>
              <button
                type="button"
                onClick={() => onSearch({ first: search.first })}
                className="self-end border-2 border-[var(--pnrr-border)] px-4 py-2 font-bold"
              >
                Clear
              </button>
            </form>
            {search.after && (
              <button
                type="button"
                onClick={() => onSearch({ ...search, after: undefined })}
                className="mt-4 inline-flex items-center gap-2 underline"
              >
                <ArrowLeft className="h-4 w-4" /> First page
              </button>
            )}
            <div className="mt-6 grid gap-3">
              {organizations.data.edges.map(({ node }) => {
                const roles = Object.entries(node.roles)
                  .filter(([, enabled]) => enabled)
                  .map(([name]) => name);
                return (
                  <Link
                    key={node.cui}
                    to="/pnrr/organizatii/$cui"
                    params={{ cui: node.cui }}
                    className="grid gap-3 border-2 border-[var(--pnrr-border)] p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center"
                  >
                    <div>
                      <p className="font-black">
                        {node.name ?? `CUI ${node.cui}`}
                      </p>
                      <p className="mt-1 font-mono text-xs text-[var(--pnrr-muted)]">
                        CUI {node.cui}
                      </p>
                    </div>
                    <div className="text-sm text-[var(--pnrr-muted)] md:text-right">
                      <p>{roles.join(" · ") || "role unavailable"}</p>
                      <p className="mt-1">
                        {node.hubs.join(" · ") || "no registry evidence"}
                      </p>
                    </div>
                  </Link>
                );
              })}
              {organizations.data.edges.length === 0 && (
                <p className="border-2 border-[var(--pnrr-border)] p-5">
                  No public organizations match this filter.
                </p>
              )}
            </div>
          </>
        )}
      </QueryState>
    </PnrrLiveShell>
  );
}

export function PnrrLiveProjectsPage({
  search,
  onSearch,
}: {
  readonly search: PnrrProjectsRouteSearch;
  readonly onSearch: (next: PnrrProjectsRouteSearch) => void;
}) {
  const status = usePnrrLiveStatus();
  const [draft, setDraft] = useState<PnrrProjectListFilters>(search);
  useEffect(() => {
    setDraft({
      componentCode: search.componentCode,
      beneficiaryCui: search.beneficiaryCui,
      contractNumber: search.contractNumber,
      countySiruta: search.countySiruta,
      status: search.status,
      measureCode: search.measureCode,
      from: search.from,
      to: search.to,
    });
  }, [
    search.beneficiaryCui,
    search.componentCode,
    search.contractNumber,
    search.countySiruta,
    search.from,
    search.measureCode,
    search.status,
    search.to,
  ]);
  const projects = usePnrrLiveProjects({
    filters: search,
    first: search.first ?? 25,
    after: search.after,
  });
  const facets = usePnrrLiveProjectFacets(search);
  const error = (status.error ?? projects.error) as Error | null;
  const invalidDateRange =
    draft.from !== undefined && draft.to !== undefined && draft.from > draft.to;
  const activeFilterCount = [
    search.componentCode,
    search.measureCode,
    search.beneficiaryCui,
    search.contractNumber,
    search.countySiruta,
    search.status,
    search.from,
    search.to,
  ].filter(Boolean).length;
  const activeFilters = [
    search.componentCode ? t`Component: ${search.componentCode}` : null,
    search.measureCode ? t`Measure: ${search.measureCode}` : null,
    search.status ? t`Status: ${search.status}` : null,
    search.countySiruta
      ? t`County: ${
          facets.data?.counties.find(
            (facet) => facet.value === search.countySiruta,
          )?.label ?? search.countySiruta
        }`
      : null,
    search.beneficiaryCui ? t`Beneficiary CUI: ${search.beneficiaryCui}` : null,
    search.contractNumber ? t`Contract: ${search.contractNumber}` : null,
    search.from ? t`From: ${formatSourceDate(search.from)}` : null,
    search.to ? t`To: ${formatSourceDate(search.to)}` : null,
  ].filter((value): value is string => value !== null);
  const setDraftField = (field: keyof PnrrProjectListFilters, value: string) =>
    setDraft((current) => ({
      ...current,
      [field]: value || undefined,
    }));
  const applyFilters = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (invalidDateRange) return;
    onSearch({
      ...draft,
      first: search.first,
      after: undefined,
    });
  };

  return (
    <PnrrLiveShell release={status.data?.pnrrCurrentRelease}>
      <QueryState
        isLoading={status.isLoading || projects.isLoading}
        error={error}
      >
        {status.data && projects.data && (
          <>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="max-w-3xl">
                <p className="text-xs font-black uppercase tracking-widest text-[var(--pnrr-blue)]">
                  <Trans>MIPE project progress</Trans>
                </p>
                <h2 className="mt-1 text-3xl font-black">
                  <Trans>PNRR projects</Trans>
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-[var(--pnrr-muted)]">
                  <Trans>
                    Explore the projects reported by MIPE, then open a profile
                    for progress, dates, beneficiary, location, and source
                    evidence.
                  </Trans>
                </p>
                <p className="mt-3 text-sm font-black">
                  {formatInteger(
                    facets.data?.totalCount ?? projects.data.edges.length,
                  )}{" "}
                  <Trans>projects in the selected view</Trans>
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    downloadPnrrProjectPageCsv(
                      projects.data.edges.map(({ node }) => node),
                      status.data.pnrrCurrentRelease,
                    )
                  }
                  disabled={projects.data.edges.length === 0}
                  className="border-2 border-[var(--pnrr-border)] px-4 py-2 font-bold disabled:opacity-40"
                >
                  <Trans>Export this page</Trans> (
                  {formatInteger(projects.data.edges.length)})
                </button>
              </div>
            </div>
            {activeFilters.length > 0 && (
              <div className="mt-5 flex flex-wrap items-center gap-2">
                {activeFilters.map((filter) => (
                  <span
                    key={filter}
                    className="border border-[var(--pnrr-border)] bg-[var(--pnrr-card)] px-2.5 py-1 text-xs font-bold"
                  >
                    {filter}
                  </span>
                ))}
                <button
                  type="button"
                  onClick={() => onSearch({ first: search.first })}
                  className="ml-1 text-xs font-black underline"
                >
                  <Trans>Clear all</Trans>
                </button>
              </div>
            )}
            <details className="group mt-6 border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)]">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 [&::-webkit-details-marker]:hidden">
                <span className="flex items-center gap-2 font-black">
                  <Filter className="h-4 w-4" />
                  <Trans>Filters</Trans>
                  {activeFilterCount > 0 && (
                    <span className="bg-[var(--pnrr-blue)] px-2 py-0.5 text-xs text-white">
                      {activeFilterCount}
                    </span>
                  )}
                </span>
                <span className="flex items-center gap-2 text-xs font-bold text-[var(--pnrr-muted)]">
                  {activeFilterCount > 0 ? (
                    <Trans>Change the selected view</Trans>
                  ) : (
                    <Trans>Narrow the project list</Trans>
                  )}
                  <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
                </span>
              </summary>
              <form
                onSubmit={applyFilters}
                className="border-t border-[var(--pnrr-border)] bg-[var(--pnrr-bg)] p-4"
              >
                <SectionState
                  isLoading={facets.isLoading}
                  error={facets.error as Error | null}
                >
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <ProjectFacetSelect
                      label={t`Component`}
                      emptyLabel={t`All components`}
                      value={draft.componentCode}
                      values={facets.data?.components ?? []}
                      onChange={(value) =>
                        setDraftField("componentCode", value)
                      }
                    />
                    <ProjectFacetSelect
                      label={t`Measure`}
                      emptyLabel={t`All measures`}
                      value={draft.measureCode}
                      values={facets.data?.measures ?? []}
                      onChange={(value) => setDraftField("measureCode", value)}
                    />
                    <ProjectFacetSelect
                      label={t`Status`}
                      emptyLabel={t`All statuses`}
                      value={draft.status}
                      values={facets.data?.statuses ?? []}
                      onChange={(value) => setDraftField("status", value)}
                    />
                    <ProjectFacetSelect
                      label={t`County`}
                      emptyLabel={t`All counties`}
                      value={draft.countySiruta}
                      values={facets.data?.counties ?? []}
                      onChange={(value) => setDraftField("countySiruta", value)}
                    />
                  </div>
                </SectionState>
                <details className="group/exact mt-4 border-t border-[var(--pnrr-border)] pt-4">
                  <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-black [&::-webkit-details-marker]:hidden">
                    <ChevronDown className="h-4 w-4 transition-transform group-open/exact:rotate-180" />
                    <Trans>Exact identifiers and snapshot dates</Trans>
                  </summary>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <label className="grid gap-1 text-sm font-bold">
                      <Trans>Beneficiary CUI</Trans>
                      <input
                        value={draft.beneficiaryCui ?? ""}
                        onChange={(event) =>
                          setDraftField("beneficiaryCui", event.target.value)
                        }
                        inputMode="numeric"
                        className="border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-bg)] px-3 py-2 font-normal"
                      />
                    </label>
                    <label className="grid gap-1 text-sm font-bold">
                      <Trans>Contract number</Trans>
                      <input
                        value={draft.contractNumber ?? ""}
                        onChange={(event) =>
                          setDraftField("contractNumber", event.target.value)
                        }
                        className="border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-bg)] px-3 py-2 font-normal"
                      />
                    </label>
                    <label className="grid gap-1 text-sm font-bold">
                      <Trans>Snapshot from</Trans>
                      <input
                        type="date"
                        value={draft.from ?? ""}
                        onChange={(event) =>
                          setDraftField("from", event.target.value)
                        }
                        className="border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-bg)] px-3 py-2 font-normal"
                      />
                    </label>
                    <label className="grid gap-1 text-sm font-bold">
                      <Trans>Snapshot to</Trans>
                      <input
                        type="date"
                        value={draft.to ?? ""}
                        onChange={(event) =>
                          setDraftField("to", event.target.value)
                        }
                        className="border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-bg)] px-3 py-2 font-normal"
                      />
                    </label>
                  </div>
                </details>
                <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
                  <label className="grid gap-1 text-sm font-bold">
                    <Trans>Projects per page</Trans>
                    <select
                      value={search.first ?? 25}
                      onChange={(event) =>
                        onSearch({
                          ...search,
                          first: Number(event.target.value),
                          after: undefined,
                        })
                      }
                      className="border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-bg)] px-3 py-2 font-normal"
                    >
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </label>
                  <div className="flex gap-2">
                    {activeFilterCount > 0 && (
                      <button
                        type="button"
                        onClick={() => onSearch({ first: search.first })}
                        className="px-3 py-2 font-bold underline"
                      >
                        <Trans>Clear filters</Trans>
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={invalidDateRange}
                      className="border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-blue)] px-4 py-2 font-black text-white disabled:opacity-40"
                    >
                      <Trans>Show projects</Trans>
                    </button>
                  </div>
                </div>
                {invalidDateRange && (
                  <p
                    role="alert"
                    className="mt-3 text-sm font-bold text-red-700"
                  >
                    <Trans>
                      “Snapshot from” must not be after “Snapshot to”.
                    </Trans>
                  </p>
                )}
              </form>
            </details>
            <div className="mt-6 grid gap-3 md:hidden">
              {projects.data.edges.map(({ node }) => (
                <ProjectCard key={node.projectKey} project={node} />
              ))}
            </div>
            <div className="mt-6 hidden overflow-x-auto border-2 border-[var(--pnrr-border)] md:block">
              <table className="w-full min-w-[900px] text-left text-sm">
                <caption className="sr-only">
                  <Trans>PNRR projects for the selected filters</Trans>
                </caption>
                <thead className="bg-[var(--pnrr-card)]">
                  <tr>
                    <th scope="col" className="p-3">
                      <Trans>Project</Trans>
                    </th>
                    <th scope="col" className="p-3">
                      <Trans>Beneficiary and place</Trans>
                    </th>
                    <th scope="col" className="p-3">
                      <Trans>Program and status</Trans>
                    </th>
                    <th scope="col" className="p-3">
                      <Trans>Reported value</Trans>
                    </th>
                    <th scope="col" className="p-3">
                      <Trans>Progress</Trans>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {projects.data.edges.map(({ node }) => (
                    <ProjectRow key={node.projectKey} project={node} />
                  ))}
                </tbody>
              </table>
            </div>
            {projects.data.edges.length === 0 && (
              <p className="mt-6 border-2 border-[var(--pnrr-border)] p-5">
                <Trans>No projects match these filters.</Trans>
              </p>
            )}
            {projects.data.edges.length > 0 && (
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t-2 border-[var(--pnrr-border)] pt-4">
                <p className="text-sm text-[var(--pnrr-muted)]">
                  <Trans>
                    Showing {projects.data.edges.length} projects on this page
                  </Trans>
                </p>
                <div className="flex gap-2">
                  {search.after && (
                    <button
                      type="button"
                      onClick={() => onSearch({ ...search, after: undefined })}
                      className="inline-flex items-center gap-2 border-2 border-[var(--pnrr-border)] px-4 py-2 font-bold"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      <Trans>First page</Trans>
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={!projects.data.pageInfo.hasNextPage}
                    onClick={() =>
                      onSearch({
                        ...search,
                        after: projects.data.pageInfo.endCursor ?? undefined,
                      })
                    }
                    className="inline-flex items-center gap-2 border-2 border-[var(--pnrr-border)] px-4 py-2 font-bold disabled:opacity-40"
                  >
                    <Trans>Next page</Trans>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </QueryState>
    </PnrrLiveShell>
  );
}

function ProjectFacetSelect({
  label,
  emptyLabel,
  value,
  values,
  onChange,
}: {
  readonly label: string;
  readonly emptyLabel: string;
  readonly value?: string;
  readonly values: readonly {
    readonly value: string;
    readonly label: string | null;
    readonly count: number;
  }[];
  readonly onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-1 text-sm font-bold">
      {label}
      <select
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
        className="min-w-0 border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-bg)] px-3 py-2 font-normal"
      >
        <option value="">{emptyLabel}</option>
        {values.map((facet) => (
          <option key={facet.value} value={facet.value}>
            {facet.label ?? facet.value} ({formatInteger(facet.count)})
          </option>
        ))}
      </select>
    </label>
  );
}

function ProjectCard({ project }: { readonly project: PnrrLiveProject }) {
  const location = projectLocation(project);
  return (
    <article className="border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            to="/pnrr/proiecte/$projectKey"
            params={{ projectKey: project.projectKey }}
            className="text-lg font-black leading-snug hover:underline"
          >
            {projectDisplayTitle(project)}
          </Link>
          {project.contractNumber && project.contractTitle && (
            <p className="mt-1 text-xs font-bold text-[var(--pnrr-muted)]">
              <Trans>Contract</Trans> {project.contractNumber}
            </p>
          )}
        </div>
        {project.status && (
          <span className="shrink-0 border border-[var(--pnrr-border)] bg-[var(--pnrr-bg)] px-2 py-1 text-xs font-black">
            {project.status}
          </span>
        )}
      </div>
      <div className="mt-3 space-y-1 text-sm">
        <p className="font-bold">
          {project.beneficiaryName ??
            (project.beneficiaryCui
              ? `CUI ${project.beneficiaryCui}`
              : t`Beneficiary not reported`)}
        </p>
        {location && (
          <p className="flex items-center gap-1.5 text-[var(--pnrr-muted)]">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            {location}
          </p>
        )}
        {(project.componentCode || project.measureCode) && (
          <p className="text-[var(--pnrr-muted)]">
            {[project.componentCode, project.measureCode]
              .filter(Boolean)
              .join(" · ")}
          </p>
        )}
      </div>
      <div className="mt-4 border-t border-[var(--pnrr-border)] pt-3">
        <p className="text-xs font-black uppercase tracking-wide text-[var(--pnrr-muted)]">
          <Trans>Reported project value</Trans>
        </p>
        <p className="mt-1 font-mono font-black">
          {formatExactMoney(project.totalValueRon, "RON")}
        </p>
      </div>
      <div className="mt-4 grid gap-3">
        <ProjectProgress
          label={t`Physical`}
          value={project.physicalProgressRatio}
        />
        <ProjectProgress
          label={t`Financial`}
          value={project.financialProgressRatio}
        />
      </div>
      <Link
        to="/pnrr/proiecte/$projectKey"
        params={{ projectKey: project.projectKey }}
        className="mt-5 inline-flex items-center gap-2 font-black underline"
      >
        <Trans>View project</Trans>
        <ArrowRight className="h-4 w-4" />
      </Link>
    </article>
  );
}

function ProjectRow({ project }: { readonly project: PnrrLiveProject }) {
  const location = projectLocation(project);
  return (
    <tr className="border-t border-[var(--pnrr-border)] align-top">
      <td className="max-w-sm p-3">
        <Link
          to="/pnrr/proiecte/$projectKey"
          params={{ projectKey: project.projectKey }}
          className="font-black leading-snug hover:underline"
        >
          {projectDisplayTitle(project)}
        </Link>
        {project.contractNumber && project.contractTitle && (
          <p className="mt-1 text-xs text-[var(--pnrr-muted)]">
            <Trans>Contract</Trans> {project.contractNumber}
          </p>
        )}
      </td>
      <td className="p-3">
        {project.beneficiaryCui ? (
          <Link
            to="/pnrr/organizatii/$cui"
            params={{ cui: project.beneficiaryCui }}
            className="underline"
          >
            {project.beneficiaryName ?? project.beneficiaryCui}
          </Link>
        ) : (
          (project.beneficiaryName ?? "—")
        )}
        {location && (
          <p className="mt-2 flex items-start gap-1 text-xs text-[var(--pnrr-muted)]">
            <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
            {location}
          </p>
        )}
      </td>
      <td className="p-3">
        <p>
          {[project.componentCode, project.measureCode]
            .filter(Boolean)
            .join(" · ") || "—"}
        </p>
        {project.status && (
          <p className="mt-2 inline-block border border-[var(--pnrr-border)] px-2 py-1 text-xs font-bold">
            {project.status}
          </p>
        )}
      </td>
      <td className="p-3">
        <p className="font-mono font-bold">
          {formatExactMoney(project.totalValueRon, "RON")}
        </p>
        <p className="mt-1 text-xs text-[var(--pnrr-muted)]">
          <Trans>reported by the source</Trans>
        </p>
      </td>
      <td className="min-w-44 p-3">
        <div className="grid gap-3">
          <ProjectProgress
            label={t`Physical`}
            value={project.physicalProgressRatio}
          />
          <ProjectProgress
            label={t`Financial`}
            value={project.financialProgressRatio}
          />
        </div>
      </td>
    </tr>
  );
}

function ProjectProgress({
  label,
  value,
}: {
  readonly label: string;
  readonly value: number | null;
}) {
  const percent = progressPercent(value);
  const isOutOfRange = value !== null && (value < 0 || value > 1);
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-3 text-xs">
        <span className="font-bold text-[var(--pnrr-muted)]">{label}</span>
        <span className="font-mono font-black">
          {formatProgressRatio(value)}
        </span>
      </div>
      <div
        className="h-1.5 bg-[var(--pnrr-bg)] outline outline-1 outline-[var(--pnrr-border)]"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent ?? undefined}
      >
        {percent !== null && (
          <div
            className="h-full bg-[var(--pnrr-blue)]"
            style={{ width: `${percent}%` }}
          />
        )}
      </div>
      {isOutOfRange && (
        <p className="mt-1 text-xs font-black text-[var(--pnrr-red)]">
          <Trans>Source-reported value outside the 0–100% range</Trans>
        </p>
      )}
    </div>
  );
}

function ProjectProgressMetric({
  label,
  value,
  note,
}: {
  readonly label: string;
  readonly value: number | null;
  readonly note: string;
}) {
  return (
    <article className="border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] p-4">
      <h3 className="text-xs font-black uppercase tracking-wide text-[var(--pnrr-muted)]">
        {label}
      </h3>
      <p className="mt-2 font-mono text-2xl font-black tabular-nums">
        {formatProgressRatio(value)}
      </p>
      <div className="mt-4">
        <ProjectProgress label={label} value={value} />
      </div>
      <p className="mt-3 text-xs leading-relaxed text-[var(--pnrr-muted)]">
        {note}
      </p>
    </article>
  );
}

export function PnrrLiveProjectPage({
  projectKey,
}: {
  readonly projectKey: string;
}) {
  const status = usePnrrLiveStatus();
  const project = usePnrrLiveProject(projectKey);
  const history = usePnrrLiveProjectHistory(projectKey);
  const error = (status.error ?? project.error) as Error | null;
  const projectData = project.data;
  const timelineDateCount = projectData
    ? [
        projectData.commitmentDate,
        projectData.startDate,
        projectData.snapshotDate,
        projectData.endDate,
        projectData.lastFundingDate,
      ].filter(Boolean).length
    : 0;
  const sourceMoney = projectData
    ? [
        {
          label: t`EU contribution`,
          value: projectData.euContributionRon,
          currency: "RON" as const,
        },
        {
          label: t`National public contribution`,
          value: projectData.nationalPublicValueRon,
          currency: "RON" as const,
        },
        {
          label: t`VAT`,
          value: projectData.vatRon,
          currency: "RON" as const,
        },
        {
          label: t`Ineligible value`,
          value: projectData.ineligibleValueRon,
          currency: "RON" as const,
        },
        {
          label: t`Amount received`,
          value: projectData.receivedAmountRon,
          currency: "RON" as const,
        },
        {
          label: t`Allocated`,
          value: projectData.allocatedEur,
          currency: "EUR" as const,
        },
        {
          label: t`Paid`,
          value: projectData.paidEur,
          currency: "EUR" as const,
        },
        {
          label: t`Received`,
          value: projectData.receivedEur,
          currency: "EUR" as const,
        },
        {
          label: t`Prefinancing`,
          value: projectData.prefinancingEur,
          currency: "EUR" as const,
        },
        {
          label: t`Suspended`,
          value: projectData.suspendedEur,
          currency: "EUR" as const,
        },
        {
          label: t`Revoked`,
          value: projectData.revokedEur,
          currency: "EUR" as const,
        },
        {
          label: t`Source total`,
          value: projectData.totalRon,
          currency: "RON" as const,
        },
        {
          label: t`Source total`,
          value: projectData.totalEur,
          currency: "EUR" as const,
        },
      ].filter((fact) => fact.value !== null)
    : [];

  return (
    <PnrrLiveShell
      release={status.data?.pnrrCurrentRelease}
      returnView="projects"
      returnLabel={<Trans>Back to PNRR projects</Trans>}
    >
      <QueryState
        isLoading={status.isLoading || project.isLoading}
        error={error}
      >
        {status.data && projectData === null && (
          <div className="border-2 border-[var(--pnrr-border)] p-6">
            <p className="font-black">
              <Trans>Project not found</Trans>
            </p>
            <p className="mt-2 text-sm text-[var(--pnrr-muted)]">
              <Trans>
                This project is not available in the current data release.
              </Trans>
            </p>
          </div>
        )}
        {status.data && projectData && (
          <>
            <header className="border-b-2 border-[var(--pnrr-border)] pb-6">
              <div className="flex flex-wrap items-start justify-between gap-5">
                <div className="max-w-4xl">
                  <div className="flex flex-wrap items-center gap-2 text-xs font-black uppercase tracking-wide">
                    <span className="bg-[var(--pnrr-fg)] px-2 py-1 text-[var(--pnrr-bg)]">
                      {projectData.projectKeyVersion === "mipe_observation_v1"
                        ? t`Project reported by MIPE`
                        : t`PNRR project`}
                    </span>
                    {projectData.status && (
                      <span className="border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] px-2 py-1">
                        {projectData.status}
                      </span>
                    )}
                    {(projectData.componentCode || projectData.measureCode) && (
                      <span className="text-[var(--pnrr-muted)]">
                        {[projectData.componentCode, projectData.measureCode]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    )}
                  </div>
                  <h2 className="mt-3 text-3xl font-black leading-tight sm:text-4xl">
                    {projectDisplayTitle(projectData)}
                  </h2>
                  {projectData.contractNumber && projectData.contractTitle && (
                    <p className="mt-2 text-sm text-[var(--pnrr-muted)]">
                      <Trans>Contract</Trans>{" "}
                      <span className="font-mono font-bold">
                        {projectData.contractNumber}
                      </span>
                    </p>
                  )}
                  <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
                    {projectData.beneficiaryName && (
                      <span className="font-bold">
                        {projectData.beneficiaryName}
                      </span>
                    )}
                    {projectLocation(projectData) && (
                      <span className="inline-flex items-center gap-1.5 text-[var(--pnrr-muted)]">
                        <MapPin className="h-4 w-4" />
                        {projectLocation(projectData)}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1.5 text-[var(--pnrr-muted)]">
                      <CalendarDays className="h-4 w-4" />
                      <Trans>Updated</Trans>{" "}
                      {formatSourceDate(projectData.snapshotDate)}
                    </span>
                  </div>
                </div>
                <a
                  href={projectData.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex shrink-0 items-center gap-2 border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] px-4 py-3 font-black"
                >
                  <Trans>Open MIPE source</Trans>
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </header>
            <p className="mt-5 max-w-4xl border-l-4 border-amber-500 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-950 dark:bg-amber-950/30 dark:text-amber-100">
              <Trans>
                This profile uses the current detailed-data release. Its MIPE
                update date may differ from the dashboard snapshot you opened.
              </Trans>
            </p>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <MetricCard
                label={t`Reported project value`}
                value={formatExactMoney(projectData.totalValueRon, "RON")}
                note={t`RON reported by MIPE; not added to payments or procurement`}
              />
              <ProjectProgressMetric
                label={t`Physical progress`}
                value={projectData.physicalProgressRatio}
                note={
                  history.data
                    ? t`${history.data.length} source updates available`
                    : t`Update history loads independently`
                }
              />
              <ProjectProgressMetric
                label={t`Financial progress`}
                value={projectData.financialProgressRatio}
                note={t`Progress ratio reported by MIPE`}
              />
            </div>
            <section
              className={`mt-8 grid gap-5 ${
                timelineDateCount > 1
                  ? "lg:grid-cols-[minmax(0,1.6fr)_minmax(18rem,1fr)]"
                  : ""
              }`}
            >
              <div className="border-2 border-[var(--pnrr-border)] p-5">
                <h3 className="text-xl font-black">
                  <Trans>Project at a glance</Trans>
                </h3>
                <dl className="mt-5 grid gap-x-6 gap-y-5 sm:grid-cols-2">
                  <ProfileDetail
                    label={t`Beneficiary`}
                    value={projectData.beneficiaryName}
                  />
                  <ProfileDetail
                    label={t`Beneficiary type`}
                    value={projectData.beneficiaryType}
                  />
                  <ProfileDetail
                    label={t`Responsible institution`}
                    value={projectData.responsibleInstitutionName}
                  />
                  <ProfileDetail
                    label={t`Financing source`}
                    value={projectFinancingSourceLabel(
                      projectData.financingSource,
                    )}
                  />
                  <ProfileDetail
                    label={t`Component`}
                    value={projectData.componentCode}
                  />
                  <ProfileDetail
                    label={t`Measure`}
                    value={projectMeasureLabel(projectData)}
                  />
                  <ProfileDetail
                    label={t`Location`}
                    value={projectLocation(projectData)}
                  />
                  <ProfileDetail label={t`Impact`} value={projectData.impact} />
                </dl>
              </div>
              {timelineDateCount > 1 && (
                <div className="border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] p-5">
                  <h3 className="text-xl font-black">
                    <Trans>Project timeline</Trans>
                  </h3>
                  <ol className="mt-5 space-y-5 border-l-2 border-[var(--pnrr-border)] pl-5">
                    <TimelineItem
                      label={t`Contract or commitment`}
                      value={projectData.commitmentDate}
                    />
                    <TimelineItem
                      label={t`Start`}
                      value={projectData.startDate}
                    />
                    <TimelineItem
                      label={t`Latest MIPE update`}
                      value={projectData.snapshotDate}
                      active
                    />
                    <TimelineItem
                      label={t`Planned end`}
                      value={projectData.endDate}
                    />
                    <TimelineItem
                      label={t`Last funding date`}
                      value={projectData.lastFundingDate}
                    />
                  </ol>
                  {(projectData.timelineMonth || projectData.timelineLabel) && (
                    <p className="mt-5 border-t border-[var(--pnrr-border)] pt-4 text-sm text-[var(--pnrr-muted)]">
                      {[projectData.timelineMonth, projectData.timelineLabel]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  )}
                </div>
              )}
            </section>
            {sourceMoney.length > 0 && (
              <details className="group mt-6 border-2 border-[var(--pnrr-border)]">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-4 [&::-webkit-details-marker]:hidden">
                  <span>
                    <span className="block font-black">
                      <Trans>Financial breakdown reported by the source</Trans>
                    </span>
                    <span className="mt-1 block text-sm text-[var(--pnrr-muted)]">
                      <Trans>
                        RON and EUR values stay separate and are never converted
                        or added together.
                      </Trans>
                    </span>
                  </span>
                  <ChevronDown className="h-5 w-5 shrink-0 transition-transform group-open:rotate-180" />
                </summary>
                <div className="grid gap-6 border-t border-[var(--pnrr-border)] bg-[var(--pnrr-card)] p-5 lg:grid-cols-2">
                  {(["RON", "EUR"] as const).map((currency) => {
                    const facts = sourceMoney.filter(
                      (fact) => fact.currency === currency,
                    );
                    if (facts.length === 0) return null;
                    return (
                      <section
                        key={currency}
                        aria-labelledby={`pnrr-source-money-${currency}`}
                      >
                        <h4
                          id={`pnrr-source-money-${currency}`}
                          className="border-b-2 border-[var(--pnrr-border)] pb-2 text-sm font-black uppercase tracking-widest"
                        >
                          {currency === "RON" ? (
                            <Trans>Values reported in RON</Trans>
                          ) : (
                            <Trans>Values reported in EUR</Trans>
                          )}
                        </h4>
                        <dl className="mt-4 grid gap-5 sm:grid-cols-2">
                          {facts.map((fact) => (
                            <Detail
                              key={`${fact.label}-${fact.currency}`}
                              label={fact.label}
                              value={formatExactMoney(
                                fact.value,
                                fact.currency,
                              )}
                            />
                          ))}
                        </dl>
                      </section>
                    );
                  })}
                </div>
              </details>
            )}
            <details
              open
              className="group mt-6 border-2 border-[var(--pnrr-border)]"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-4 [&::-webkit-details-marker]:hidden">
                <span>
                  <span className="block font-black">
                    <Trans>Reported progress history</Trans>
                  </span>
                  <span className="mt-1 block text-sm text-[var(--pnrr-muted)]">
                    {history.data ? (
                      <Trans>
                        {history.data.length} updates reported by MIPE
                      </Trans>
                    ) : (
                      <Trans>Open to inspect source updates</Trans>
                    )}
                  </span>
                </span>
                <ChevronDown className="h-5 w-5 shrink-0 transition-transform group-open:rotate-180" />
              </summary>
              <div className="border-t border-[var(--pnrr-border)] p-4">
                <SectionState
                  isLoading={history.isLoading}
                  error={history.error as Error | null}
                >
                  <p className="mb-4 max-w-3xl text-sm text-[var(--pnrr-muted)]">
                    <Trans>
                      MIPE observations with the same source identity. This
                      history does not prove a link to payments or procurement.
                    </Trans>
                  </p>
                  <div className="overflow-x-auto border-2 border-[var(--pnrr-border)]">
                    <table className="w-full min-w-[650px] text-left text-sm">
                      <caption className="sr-only">
                        <Trans>
                          MIPE source updates associated with this project
                          observation
                        </Trans>
                      </caption>
                      <thead className="bg-[var(--pnrr-card)]">
                        <tr>
                          <th scope="col" className="p-3">
                            <Trans>Updated</Trans>
                          </th>
                          <th scope="col" className="p-3">
                            <Trans>Status</Trans>
                          </th>
                          <th scope="col" className="p-3">
                            <Trans>Physical</Trans>
                          </th>
                          <th scope="col" className="p-3">
                            <Trans>Financial</Trans>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {(history.data ?? []).map((snapshot) => (
                          <tr
                            key={snapshot.projectKey}
                            className="border-t border-[var(--pnrr-border)]"
                          >
                            <td className="p-3">
                              {formatSourceDate(snapshot.snapshotDate)}
                            </td>
                            <td className="p-3">{snapshot.status ?? "—"}</td>
                            <td className="p-3">
                              {formatProgressRatio(
                                snapshot.physicalProgressRatio,
                              )}
                            </td>
                            <td className="p-3">
                              {formatProgressRatio(
                                snapshot.financialProgressRatio,
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </SectionState>
              </div>
            </details>
            <section className="mt-6 border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] p-5">
              <div className="flex flex-wrap items-start justify-between gap-5">
                <div className="max-w-3xl">
                  <p className="text-xs font-black uppercase tracking-widest text-[var(--pnrr-blue)]">
                    <Trans>Related organization context</Trans>
                  </p>
                  <h3 className="mt-1 text-xl font-black">
                    <Trans>Explore the beneficiary’s PNRR portfolio</Trans>
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--pnrr-muted)]">
                    <Trans>
                      See the other projects associated with this beneficiary.
                      Payments and procurement remain organization-level context
                      and are not attributed to this project.
                    </Trans>
                  </p>
                </div>
                {projectData.beneficiaryCui && (
                  <Link
                    to="/pnrr/organizatii/$cui"
                    params={{ cui: projectData.beneficiaryCui }}
                    className="inline-flex items-center gap-2 border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-bg)] px-4 py-3 font-black"
                  >
                    <Trans>View organization profile</Trans>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                )}
              </div>
            </section>
            <details className="group mt-6 border-2 border-[var(--pnrr-border)]">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-4 [&::-webkit-details-marker]:hidden">
                <span>
                  <span className="block font-black">
                    <Trans>Identifiers and provenance</Trans>
                  </span>
                  <span className="mt-1 block text-sm text-[var(--pnrr-muted)]">
                    <Trans>
                      Technical source keys, retrieval details, and candidate
                      relationships
                    </Trans>
                  </span>
                </span>
                <ChevronDown className="h-5 w-5 shrink-0 transition-transform group-open:rotate-180" />
              </summary>
              <dl className="grid gap-5 border-t border-[var(--pnrr-border)] bg-[var(--pnrr-card)] p-5 sm:grid-cols-2 lg:grid-cols-3">
                <Detail label={t`Project key`} value={projectData.projectKey} />
                <Detail
                  label={t`Project key version`}
                  value={projectData.projectKeyVersion}
                />
                <Detail
                  label={t`Source observation ID`}
                  value={projectData.sourceObservationId}
                />
                <Detail label={t`Snapshot ID`} value={projectData.snapshotId} />
                <Detail
                  label={t`MIPE endpoint`}
                  value={projectData.endpointName}
                />
                <Detail
                  label={t`Source system`}
                  value={projectData.sourceSystem}
                />
                <Detail
                  label={t`Retrieved at`}
                  value={projectData.retrievedAt}
                />
                <ProfileDetail
                  label={t`Commitment business ID`}
                  value={projectData.commitmentBusinessId}
                />
                <ProfileDetail
                  label={t`Candidate commitment`}
                  value={projectData.linkedCommitmentKey}
                />
                <ProfileDetail
                  label={t`Candidate relationship`}
                  value={projectRelationshipLabel(
                    projectData.commitmentRelationship,
                  )}
                />
                <ProfileDetail
                  label={t`Aggregation state`}
                  value={projectData.commitmentAggregationState}
                />
              </dl>
              <div className="border-t border-[var(--pnrr-border)] p-4">
                <a
                  href={projectData.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 font-black underline"
                >
                  <Trans>Open the original source observation</Trans>
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </details>
          </>
        )}
      </QueryState>
    </PnrrLiveShell>
  );
}

function TimelineItem({
  label,
  value,
  active = false,
}: {
  readonly label: string;
  readonly value: string | null;
  readonly active?: boolean;
}) {
  if (!value) return null;
  return (
    <li className="relative">
      <span
        className={`absolute -left-[1.7rem] top-1 h-3 w-3 border-2 border-[var(--pnrr-border)] ${
          active ? "bg-[var(--pnrr-blue)]" : "bg-[var(--pnrr-bg)]"
        }`}
        aria-hidden="true"
      />
      <p className="text-xs font-black uppercase tracking-wide text-[var(--pnrr-muted)]">
        {label}
      </p>
      <p className="mt-1 font-bold">{formatSourceDate(value)}</p>
    </li>
  );
}

function ProfileDetail({
  label,
  value,
}: {
  readonly label: string;
  readonly value: string | null;
}) {
  if (!value) return null;
  return <Detail label={label} value={value} />;
}

function Detail({
  label,
  value,
}: {
  readonly label: string;
  readonly value: string | null;
}) {
  return (
    <div>
      <dt className="text-xs font-black uppercase text-[var(--pnrr-muted)]">
        {label}
      </dt>
      <dd className="mt-1 break-words font-medium">{value ?? "—"}</dd>
    </div>
  );
}

export function PnrrLiveOrganizationPage({ cui }: { readonly cui: string }) {
  const status = usePnrrLiveStatus();
  const organization = usePnrrLiveOrganization(cui);
  const organizationProfile = usePnrrLiveOrganizationProfile(cui);
  const projects = usePnrrLiveOrganizationProjects(cui);
  const identity = organization.data;
  const profile = organizationProfile.data;
  const projectEdges = projects.data?.pages.flatMap((page) => page.edges) ?? [];
  const activeRoles = identity
    ? Object.entries(identity.roles)
        .filter(([role, active]) => active && role !== "beneficiary")
        .map(([role]) => organizationRoleLabel(role))
    : [];

  return (
    <PnrrLiveShell
      release={status.data?.pnrrCurrentRelease}
      returnView="beneficiaries"
      returnLabel={<Trans>Back to PNRR beneficiaries</Trans>}
    >
      <QueryState
        isLoading={status.isLoading || organization.isLoading}
        error={(status.error ?? organization.error) as Error | null}
      >
        {identity === null && (
          <div className="border-2 border-[var(--pnrr-border)] p-6">
            <p className="font-black">
              <Trans>Organization not found</Trans>
            </p>
            <p className="mt-2 text-sm text-[var(--pnrr-muted)]">
              <Trans>
                This organization is not available in the current PNRR release.
              </Trans>
            </p>
          </div>
        )}
        {identity && (
          <>
            <header className="border-b-2 border-[var(--pnrr-border)] pb-6">
              <p className="text-xs font-black uppercase tracking-widest text-[var(--pnrr-blue)]">
                <Trans>PNRR beneficiary</Trans>
              </p>
              <h2 className="mt-2 max-w-4xl text-3xl font-black leading-tight sm:text-4xl">
                {identity.name ?? cui}
              </h2>
              <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
                <span className="border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] px-3 py-1.5 font-mono font-black">
                  CUI {identity.cui}
                </span>
                {activeRoles.map((role) => (
                  <span
                    key={role}
                    className="border-2 border-[var(--pnrr-border)] px-3 py-1.5 font-bold"
                  >
                    {role}
                  </span>
                ))}
              </div>
            </header>

            <section className="mt-8">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-[var(--pnrr-blue)]">
                  <Trans>Project portfolio</Trans>
                </p>
                <h3 className="mt-1 text-2xl font-black">
                  <Trans>Projects reported for this beneficiary</Trans>
                </h3>
                <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[var(--pnrr-muted)]">
                  <Trans>
                    Projects are taken from the MIPE dashboard and linked by the
                    beneficiary’s CUI. Open any project for its dates, value
                    breakdown and progress history.
                  </Trans>
                </p>
              </div>
              <div className="mt-3">
                <SectionState
                  isLoading={projects.isLoading}
                  error={projects.error as Error | null}
                  hasUsableData={projectEdges.length > 0}
                >
                  <div className="grid gap-3">
                    {projectEdges.map(({ node }) => (
                      <Link
                        key={node.projectKey}
                        to="/pnrr/proiecte/$projectKey"
                        params={{ projectKey: node.projectKey }}
                        className="group grid gap-5 border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] p-5 transition-colors hover:bg-[var(--pnrr-fg)] hover:text-[var(--pnrr-bg)] sm:grid-cols-[minmax(0,1fr)_minmax(10rem,auto)_minmax(12rem,auto)] sm:items-center"
                      >
                        <span className="min-w-0">
                          <span className="flex flex-wrap gap-2 text-xs font-black uppercase tracking-wide text-[var(--pnrr-muted)] group-hover:text-[var(--pnrr-bg)]">
                            {[node.componentCode, node.measureCode]
                              .filter(Boolean)
                              .join(" · ")}
                            {node.status && <span>· {node.status}</span>}
                          </span>
                          <span className="mt-3 block text-lg font-black leading-snug">
                            {projectDisplayTitle(node)}
                          </span>
                          {node.contractNumber && node.contractTitle && (
                            <span className="mt-2 block font-mono text-xs">
                              <Trans>Contract</Trans> {node.contractNumber}
                            </span>
                          )}
                        </span>
                        <span className="text-sm text-[var(--pnrr-muted)] group-hover:text-[var(--pnrr-bg)] sm:text-right">
                          {projectLocation(node) ??
                            formatSourceDate(node.snapshotDate)}
                        </span>
                        <span className="font-mono font-black tabular-nums sm:text-right">
                          {formatExactMoney(node.totalValueRon, "RON")}
                        </span>
                      </Link>
                    ))}
                    {projectEdges.length === 0 && (
                      <p className="border-2 border-[var(--pnrr-border)] p-5 text-sm">
                        <Trans>
                          No public MIPE project is available for this CUI.
                        </Trans>
                      </p>
                    )}
                  </div>
                  <SourcePager
                    shownCount={projectEdges.length}
                    hasNextPage={projects.hasNextPage}
                    isFetchingNextPage={projects.isFetchingNextPage}
                    onLoadMore={() => void projects.fetchNextPage()}
                  />
                </SectionState>
              </div>
            </section>

            <section className="mt-8 grid gap-5 lg:grid-cols-2">
              <div className="border-2 border-[var(--pnrr-border)] p-5">
                <h3 className="text-xl font-black">
                  <Trans>Organization details</Trans>
                </h3>
                <dl className="mt-5 grid gap-5 sm:grid-cols-2">
                  <Detail
                    label={t`Registry evidence`}
                    value={
                      identity.hubs.map(registryHubLabel).join(" · ") || null
                    }
                  />
                  <Detail label={t`CAEN code`} value={identity.caenCode} />
                  <Detail
                    label={t`Organization status`}
                    value={
                      identity.isActive === null
                        ? null
                        : identity.isActive
                          ? t`Active`
                          : t`Inactive`
                    }
                  />
                  <Detail
                    label={t`VAT status`}
                    value={
                      identity.isVatPayer === null
                        ? null
                        : identity.isVatPayer
                          ? t`VAT registered`
                          : t`Not VAT registered`
                    }
                  />
                  <Detail
                    label={t`Name source`}
                    value={
                      identity.nameSource
                        ? registryHubLabel(identity.nameSource)
                        : null
                    }
                  />
                  <Detail
                    label={t`First observed source`}
                    value={
                      identity.firstSeenSource
                        ? registryHubLabel(identity.firstSeenSource)
                        : null
                    }
                  />
                </dl>
              </div>

              <details className="group border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)]">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 [&::-webkit-details-marker]:hidden">
                  <span>
                    <span className="block text-xl font-black">
                      <Trans>Other PNRR activity</Trans>
                    </span>
                    <span className="mt-2 block text-sm leading-relaxed text-[var(--pnrr-muted)]">
                      <Trans>
                        Organization-level payments and procurement context.
                        These records are not attributed to a specific project.
                      </Trans>
                    </span>
                  </span>
                  <ChevronDown className="h-5 w-5 shrink-0 transition-transform group-open:rotate-180" />
                </summary>
                <div className="border-t border-[var(--pnrr-border)] p-5">
                  <SectionState
                    isLoading={organizationProfile.isLoading}
                    error={organizationProfile.error as Error | null}
                  >
                    {profile && (
                      <dl className="grid gap-5 sm:grid-cols-2">
                        <Detail
                          label={t`Payment observations`}
                          value={formatInteger(profile.payments.count)}
                        />
                        <Detail
                          label={t`Net payments reported for the beneficiary`}
                          value={formatExactMoney(
                            profile.payments.totalLei,
                            "RON",
                          )}
                        />
                        <Detail
                          label={t`Procurement participant relationships`}
                          value={formatInteger(
                            profile.procurement.participantRelationCount,
                          )}
                        />
                        <Detail
                          label={t`Unresolved commitment envelopes`}
                          value={formatInteger(
                            profile.commitments.unresolvedCount,
                          )}
                        />
                      </dl>
                    )}
                    <p className="mt-5 text-sm leading-relaxed text-[var(--pnrr-muted)]">
                      <Trans>
                        Payment totals remain subject to duplicate review.
                        Procurement is shown as relationship counts only because
                        participant-level money is not available.
                      </Trans>
                    </p>
                  </SectionState>
                </div>
              </details>
            </section>
          </>
        )}
      </QueryState>
    </PnrrLiveShell>
  );
}

function organizationRoleLabel(role: string): string {
  if (role === "beneficiary") return t`Beneficiary`;
  if (role === "applicant") return t`Funding applicant`;
  if (role === "winner") return t`Procurement participant`;
  if (role === "subcontractor") return t`Subcontractor`;
  return role;
}

function registryHubLabel(hub: string): string {
  if (hub === "companies") return t`Company registry`;
  if (hub === "public_entities") return t`Public entity registry`;
  if (hub === "anaf") return t`ANAF registry`;
  if (hub === "ords") return t`MIPE data service`;
  return hub;
}

export function PnrrLiveCountyPage({
  countySiruta,
}: {
  readonly countySiruta: string;
}) {
  const status = usePnrrLiveStatus();
  const place = usePnrrLivePlace(countySiruta);

  return (
    <PnrrLiveShell release={status.data?.pnrrCurrentRelease}>
      <QueryState
        isLoading={status.isLoading || place.isLoading}
        error={(status.error ?? place.error) as Error | null}
      >
        {status.data && place.data === null && (
          <div className="border-2 border-[var(--pnrr-border)] p-6">
            County not found in the canonical territory directory.
          </div>
        )}
        {place.data && (
          <>
            <CaveatPanel
              release={place.data.meta.release}
              caveats={[
                "Payment county and commitment implementation county are separate source roles.",
                "Source locality labels are count-only; no locality value is attributed or published.",
              ]}
            />
            <h2 className="text-3xl font-black">
              {place.data.countyName ?? `County ${countySiruta}`}
            </h2>
            <p className="mt-2 font-mono">SIRUTA {place.data.countySiruta}</p>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <MetricCard
                label="Reported-county payments"
                value={formatExactMoney(place.data.paymentNetRon, "RON")}
                note={`${place.data.paymentCount} payment rows`}
              />
              <MetricCard
                label="Implementation commitments"
                value={formatExactMoney(
                  place.data.additiveCommitmentRon,
                  "RON",
                )}
                note={`${place.data.additiveCommitmentCount}/${place.data.commitmentCount} additive`}
              />
              <MetricCard
                label="MIPE project observations"
                value={place.data.projectObservationCount.toLocaleString()}
                note="Release-scoped project observations with this source county role"
              />
              <MetricCard
                label="Rows with a source locality label"
                value={place.data.sourceLocalityLabelCount.toLocaleString()}
                note="Count only; the source label is not treated as a resolved UAT"
              />
            </div>
            <Link
              to="/pnrr/proiecte"
              search={{ countySiruta }}
              className="mt-6 inline-flex items-center gap-2 border-2 border-[var(--pnrr-border)] px-4 py-3 font-bold"
            >
              Explore this county’s project observations
              <ArrowRight className="h-4 w-4" />
            </Link>
          </>
        )}
      </QueryState>
    </PnrrLiveShell>
  );
}

export function PnrrLivePlacesPage() {
  const status = usePnrrLiveStatus();
  const places = usePnrrLivePlaces();

  return (
    <PnrrLiveShell release={status.data?.pnrrCurrentRelease}>
      <QueryState
        isLoading={status.isLoading || places.isLoading}
        error={(status.error ?? places.error) as Error | null}
      >
        {status.data && places.data && (
          <>
            <CaveatPanel
              release={status.data.pnrrCurrentRelease}
              caveats={[
                "Payment county, commitment implementation county, and MIPE source locality labels are different source roles.",
                "Source locality labels are shown as counts only and are not treated as resolved UAT geography.",
              ]}
            />
            <h2 className="text-3xl font-black">PNRR by county</h2>
            <p className="mt-2 max-w-3xl text-sm text-[var(--pnrr-muted)]">
              Canonical counties provide the index. Each measure keeps its
              original geography role instead of implying that all facts
              describe the same location.
            </p>
            <div className="mt-6 grid gap-3 md:hidden">
              {places.data.map((place) => (
                <article
                  key={place.countySiruta}
                  className="border-2 border-[var(--pnrr-border)] p-4"
                >
                  <Link
                    to="/pnrr/judete/$countySiruta"
                    params={{ countySiruta: place.countySiruta }}
                    className="text-lg font-black underline"
                  >
                    {place.countyName}
                  </Link>
                  <p className="mt-1 font-mono text-xs">
                    SIRUTA {place.countySiruta}
                  </p>
                  <dl className="mt-4 grid gap-3 text-sm">
                    <Detail
                      label="Reported-county payments"
                      value={`${formatExactMoney(place.paymentNetRon, "RON")} · ${place.paymentCount.toLocaleString()} rows`}
                    />
                    <Detail
                      label="Implementation commitments"
                      value={`${formatExactMoney(place.additiveCommitmentRon, "RON")} · ${place.additiveCommitmentCount.toLocaleString()}/${place.commitmentCount.toLocaleString()} additive · ${place.unresolvedCommitmentCount.toLocaleString()} unresolved`}
                    />
                    <Detail
                      label="MIPE project observations"
                      value={place.projectObservationCount.toLocaleString()}
                    />
                    <Detail
                      label="Source locality labels"
                      value={`${place.sourceLocalityLabelCount.toLocaleString()} rows · count only`}
                    />
                  </dl>
                </article>
              ))}
            </div>
            <div className="mt-6 hidden overflow-x-auto border-2 border-[var(--pnrr-border)] md:block">
              <table className="w-full min-w-[900px] text-left text-sm">
                <caption className="sr-only">
                  Source-role-qualified PNRR facts by canonical county
                </caption>
                <thead className="bg-[var(--pnrr-card)]">
                  <tr>
                    <th scope="col" className="p-3">
                      County
                    </th>
                    <th scope="col" className="p-3">
                      Payment facts
                    </th>
                    <th scope="col" className="p-3">
                      Commitment envelopes
                    </th>
                    <th scope="col" className="p-3">
                      MIPE project observations
                    </th>
                    <th scope="col" className="p-3">
                      Rows with locality label
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {places.data.map((place) => (
                    <tr
                      key={place.countySiruta}
                      className="border-t border-[var(--pnrr-border)] align-top"
                    >
                      <td className="p-3">
                        <Link
                          to="/pnrr/judete/$countySiruta"
                          params={{ countySiruta: place.countySiruta }}
                          className="font-black underline"
                        >
                          {place.countyName}
                        </Link>
                        <p className="mt-1 font-mono text-xs">
                          {place.countySiruta}
                        </p>
                      </td>
                      <td className="p-3">
                        <p>{formatExactMoney(place.paymentNetRon, "RON")}</p>
                        <p className="mt-1 text-xs text-[var(--pnrr-muted)]">
                          {place.paymentCount.toLocaleString()} reported-county
                          rows
                        </p>
                      </td>
                      <td className="p-3">
                        <p>
                          {formatExactMoney(place.additiveCommitmentRon, "RON")}
                        </p>
                        <p className="mt-1 text-xs text-[var(--pnrr-muted)]">
                          {place.additiveCommitmentCount.toLocaleString()}/
                          {place.commitmentCount.toLocaleString()} additive ·{" "}
                          {place.unresolvedCommitmentCount.toLocaleString()}{" "}
                          unresolved
                        </p>
                      </td>
                      <td className="p-3">
                        {place.projectObservationCount.toLocaleString()}
                      </td>
                      <td className="p-3">
                        {place.sourceLocalityLabelCount.toLocaleString()}
                        <p className="mt-1 text-xs text-[var(--pnrr-muted)]">
                          count only
                        </p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </QueryState>
    </PnrrLiveShell>
  );
}

export function PnrrLiveSourcesPage() {
  const status = usePnrrLiveStatus();
  const calls = usePnrrLiveFundingCalls();
  const applications = usePnrrLiveFundingApplications();
  const revisions = usePnrrLiveProgramRevisions();
  const catalog = usePnrrLiveCatalogResources();
  const documents = usePnrrLiveDocumentReferences();
  const callEdges = calls.data?.pages.flatMap((page) => page.edges) ?? [];
  const applicationEdges =
    applications.data?.pages.flatMap((page) => page.edges) ?? [];
  const revisionEdges =
    revisions.data?.pages.flatMap((page) => page.edges) ?? [];
  const catalogEdges = catalog.data?.pages.flatMap((page) => page.edges) ?? [];
  const documentEdges =
    documents.data?.pages.flatMap((page) => page.edges) ?? [];

  return (
    <PnrrLiveShell release={status.data?.pnrrCurrentRelease}>
      <QueryState
        isLoading={status.isLoading}
        error={status.error as Error | null}
      >
        {status.data && (
          <>
            <CaveatPanel release={status.data.pnrrCurrentRelease} />
            <h2 className="text-3xl font-black">Sources and freshness</h2>
            <p className="mt-2 max-w-3xl text-sm text-[var(--pnrr-muted)]">
              A release identifies a validated serving projection. Each source
              lane reports its own freshness and suspension state; suspended or
              legacy-unversioned lanes are never presented as fully served.
            </p>
            <section className="mt-6 grid gap-3 md:grid-cols-2">
              {status.data.pnrrCurrentRelease.lanes.map((lane) => (
                <article
                  key={lane.lane}
                  className="border-2 border-[var(--pnrr-border)] p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <h3 className="font-black">{lane.lane}</h3>
                    <span className="font-mono text-xs">{lane.state}</span>
                  </div>
                  <dl className="mt-4 grid gap-2 text-sm">
                    <Detail label="As of" value={lane.asOf} />
                    <Detail
                      label="Refresh"
                      value={lane.suspended ? "suspended" : "enabled"}
                    />
                    <Detail
                      label="Reason codes"
                      value={lane.reasonCodes.join(", ") || "none"}
                    />
                  </dl>
                </article>
              ))}
            </section>
            <section className="mt-10">
              <h2 className="text-2xl font-black">Serving capabilities</h2>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {status.data.pnrrCapabilities.map((capability) => (
                  <article
                    key={capability.id}
                    className="border border-[var(--pnrr-border)] p-4"
                  >
                    <div className="flex flex-wrap justify-between gap-3">
                      <h3 className="font-bold">{capability.id}</h3>
                      <span className="font-mono text-xs">
                        {capability.state}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-[var(--pnrr-muted)]">
                      {capability.limitation ?? "No additional limitation."}
                    </p>
                    <p className="mt-2 font-mono text-xs">
                      {capability.reasonCodes.join(", ") || "no reason code"}
                    </p>
                  </article>
                ))}
              </div>
            </section>
            <section className="mt-10">
              <h2 className="text-2xl font-black">Program revisions</h2>
              <p className="mt-2 text-sm text-[var(--pnrr-muted)]">
                Legal revisions remain distinct. A proposal is not treated as
                the adopted plan merely because it is available. The last proven
                adopted revision and any newer pending Council amendment are
                shown separately.
              </p>
              <div className="mt-4">
                <SectionState
                  isLoading={revisions.isLoading}
                  error={revisions.error as Error | null}
                  hasUsableData={revisionEdges.length > 0}
                >
                  <div className="grid gap-3 md:grid-cols-2">
                    {revisionEdges.map(({ node }) => (
                      <a
                        key={node.revisionId}
                        href={node.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="border border-[var(--pnrr-border)] p-4"
                      >
                        <div className="flex flex-wrap justify-between gap-3">
                          <span className="font-black">
                            {node.legalReference}
                          </span>
                          <span className="font-mono text-xs">
                            {node.legalStatus}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-[var(--pnrr-muted)]">
                          {node.isCurrentAdopted
                            ? "Current adopted revision"
                            : "Not the current adopted revision"}
                          {node.effectiveDate
                            ? ` · effective ${node.effectiveDate}`
                            : ""}
                        </p>
                        <p className="mt-2 text-xs text-[var(--pnrr-muted)]">
                          {node.sourceAuthority} · {node.identifierScheme}
                          {node.celex ? ` ${node.celex}` : ""}
                        </p>
                        <p className="mt-3 text-sm">
                          {node.documentCount.toLocaleString()} document
                          {node.documentCount === 1 ? "" : "s"} ·{" "}
                          {node.textReadyDocumentCount.toLocaleString()}{" "}
                          text-ready ·{" "}
                          {node.ocrRequiredDocumentCount.toLocaleString()} need
                          OCR
                        </p>
                      </a>
                    ))}
                  </div>
                  <SourcePager
                    shownCount={revisionEdges.length}
                    hasNextPage={revisions.hasNextPage}
                    isFetchingNextPage={revisions.isFetchingNextPage}
                    onLoadMore={() => void revisions.fetchNextPage()}
                  />
                </SectionState>
              </div>
            </section>
            <section className="mt-10">
              <h2 className="text-2xl font-black">Funding calls</h2>
              <p className="mt-2 text-sm text-[var(--pnrr-muted)]">
                Source-published call budgets and eligibility envelopes. These
                are not beneficiary payments.
              </p>
              <div className="mt-4">
                <SectionState
                  isLoading={calls.isLoading}
                  error={calls.error as Error | null}
                  hasUsableData={callEdges.length > 0}
                >
                  <div className="grid gap-3 md:grid-cols-2">
                    {callEdges.map(({ node }) => (
                      <a
                        key={node.callId}
                        href={node.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="border border-[var(--pnrr-border)] p-4"
                      >
                        <p className="font-black">{node.title}</p>
                        <p className="mt-2 font-mono text-xs">{node.callId}</p>
                        <p className="mt-3 text-sm">
                          Budget {formatExactMoney(node.budgetRon, "RON")}
                        </p>
                        <p className="mt-1 text-sm text-[var(--pnrr-muted)]">
                          Eligible envelope{" "}
                          {formatExactMoney(node.totalEligibleValueRon, "RON")}
                        </p>
                      </a>
                    ))}
                  </div>
                  <SourcePager
                    shownCount={callEdges.length}
                    hasNextPage={calls.hasNextPage}
                    isFetchingNextPage={calls.isFetchingNextPage}
                    onLoadMore={() => void calls.fetchNextPage()}
                  />
                </SectionState>
              </div>
            </section>
            <section className="mt-10">
              <h2 className="text-2xl font-black">
                Funding application listings
              </h2>
              <p className="mt-2 text-sm text-[var(--pnrr-muted)]">
                Platform listings preserve both the payload call ID and the
                request call ID so mismatches remain visible.
              </p>
              <div className="mt-4">
                <SectionState
                  isLoading={applications.isLoading}
                  error={applications.error as Error | null}
                  hasUsableData={applicationEdges.length > 0}
                >
                  <div className="grid gap-3">
                    {applicationEdges.map(({ node }) => {
                      const callMismatch =
                        node.callId !== null &&
                        node.sourceRequestCallId !== null &&
                        node.callId !== node.sourceRequestCallId;
                      return (
                        <a
                          key={node.listingId}
                          href={node.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="border border-[var(--pnrr-border)] p-4"
                        >
                          <div className="flex flex-wrap justify-between gap-3">
                            <span className="font-black">
                              {node.applicantName ??
                                node.applicantCui ??
                                node.listingId}
                            </span>
                            <span className="font-mono text-xs">
                              {node.completenessStatus}
                            </span>
                          </div>
                          <p className="mt-2 text-sm text-[var(--pnrr-muted)]">
                            Payload call {node.callId ?? "missing"} · request
                            call {node.sourceRequestCallId ?? "missing"}
                          </p>
                          {callMismatch && (
                            <p className="mt-2 text-sm font-bold text-amber-700">
                              Source call-ID mismatch
                            </p>
                          )}
                        </a>
                      );
                    })}
                  </div>
                  <SourcePager
                    shownCount={applicationEdges.length}
                    hasNextPage={applications.hasNextPage}
                    isFetchingNextPage={applications.isFetchingNextPage}
                    onLoadMore={() => void applications.fetchNextPage()}
                  />
                </SectionState>
              </div>
            </section>
            <section className="mt-10">
              <h2 className="text-2xl font-black">
                Open-data catalog evidence
              </h2>
              <p className="mt-2 text-sm text-[var(--pnrr-muted)]">
                CKAN resources are discovery and provenance evidence until a
                workbook family is explicitly conformed into facts.
              </p>
              <div className="mt-4">
                <SectionState
                  isLoading={catalog.isLoading}
                  error={catalog.error as Error | null}
                  hasUsableData={catalogEdges.length > 0}
                >
                  <div className="grid gap-3 md:grid-cols-2">
                    {catalogEdges.map(({ node }) => (
                      <a
                        key={node.resourceId}
                        href={node.fileUrl ?? node.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="border border-[var(--pnrr-border)] p-4"
                      >
                        <p className="font-black">
                          {node.resourceName ?? node.resourceId}
                        </p>
                        <p className="mt-2 text-sm text-[var(--pnrr-muted)]">
                          {node.format ?? node.mimeType ?? "unknown format"} ·{" "}
                          {node.datastoreActive
                            ? "CKAN datastore active"
                            : "file resource"}
                        </p>
                      </a>
                    ))}
                  </div>
                  <SourcePager
                    shownCount={catalogEdges.length}
                    hasNextPage={catalog.hasNextPage}
                    isFetchingNextPage={catalog.isFetchingNextPage}
                    onLoadMore={() => void catalog.fetchNextPage()}
                  />
                </SectionState>
              </div>
            </section>
            <section className="mt-10">
              <h2 className="text-2xl font-black">Document references</h2>
              <p className="mt-2 text-sm text-[var(--pnrr-muted)]">
                Metadata and extraction state only. Document text, claims, and
                OCR output remain unavailable until custody, quality, and PII
                gates are complete.
              </p>
              <div className="mt-4">
                <SectionState
                  isLoading={documents.isLoading}
                  error={documents.error as Error | null}
                  hasUsableData={documentEdges.length > 0}
                >
                  <div className="grid gap-3 md:grid-cols-2">
                    {documentEdges.map(({ node }) => (
                      <a
                        key={node.documentKey}
                        href={node.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="border border-[var(--pnrr-border)] p-4"
                      >
                        <p className="font-black">
                          {node.fileName ?? node.documentKey}
                        </p>
                        <p className="mt-2 text-sm text-[var(--pnrr-muted)]">
                          {node.documentType ?? node.mimeType ?? "document"} ·{" "}
                          {node.extractionState} ·{" "}
                          {node.hasObjectCustody
                            ? "object custody recorded"
                            : "source reference only"}
                        </p>
                        {node.programRevisionId && (
                          <p className="mt-2 font-mono text-xs text-[var(--pnrr-muted)]">
                            {node.programRevisionId}
                            {node.language ? ` · ${node.language}` : ""}
                            {node.documentRole ? ` · ${node.documentRole}` : ""}
                          </p>
                        )}
                      </a>
                    ))}
                  </div>
                  <SourcePager
                    shownCount={documentEdges.length}
                    hasNextPage={documents.hasNextPage}
                    isFetchingNextPage={documents.isFetchingNextPage}
                    onLoadMore={() => void documents.fetchNextPage()}
                  />
                </SectionState>
              </div>
            </section>
          </>
        )}
      </QueryState>
    </PnrrLiveShell>
  );
}

export function PnrrLiveVerificationPage() {
  const status = usePnrrLiveStatus();
  const verification = usePnrrLiveVerification();
  const signals = verification.data
    ? ([
        [
          "Unresolved commitment envelopes",
          verification.data.unresolvedCommitmentCount,
          "Multiple or conflicting source observations cannot yet be summed as one commitment value.",
        ],
        [
          "Potential duplicate payment groups",
          verification.data.duplicatePaymentGroupCount,
          "Deterministic candidate groups still require a stratified review before payment totals are promoted.",
        ],
        [
          "Missing commitment source URL",
          verification.data.missingCommitmentSourceUrlCount,
          "The row lacks a direct human-openable evidence link.",
        ],
        [
          "End date before start date",
          verification.data.endBeforeStartCount,
          "The two source-reported dates are internally inconsistent.",
        ],
        [
          "Reported progress over 100%",
          verification.data.overHundredProgressCount,
          "A source-reported physical or financial ratio is greater than 1; the value is retained, not silently clamped.",
        ],
        [
          "Missing accepted progress link",
          verification.data.missingProgressLinkCount,
          "The progress observation has no accepted commitment relationship and remains separately visible.",
        ],
      ] as const)
    : [];

  return (
    <PnrrLiveShell release={status.data?.pnrrCurrentRelease}>
      <QueryState
        isLoading={status.isLoading || verification.isLoading}
        error={(status.error ?? verification.error) as Error | null}
      >
        {verification.data && (
          <>
            <CaveatPanel
              release={verification.data.meta.release}
              caveats={[
                "These deterministic signals describe data quality and coverage. They are not findings of wrongdoing.",
              ]}
            />
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="text-3xl font-black">Verification signals</h2>
                <p className="mt-2 max-w-3xl text-sm text-[var(--pnrr-muted)]">
                  Reproducible rules over the current release. Counts describe
                  what needs interpretation; they do not assign fault or intent.
                </p>
                <p className="mt-2 max-w-3xl font-mono text-xs text-[var(--pnrr-muted)]">
                  {verification.data.ruleSetVersion} · answer{" "}
                  {verification.data.meta.state} · release{" "}
                  {verification.data.meta.release.state}
                </p>
                <p className="mt-1 max-w-3xl text-xs text-[var(--pnrr-muted)]">
                  Reason codes:{" "}
                  {verification.data.meta.reasonCodes.join(", ") || "none"} ·
                  provenance:{" "}
                  {verification.data.meta.provenance.join(", ") ||
                    "unavailable"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => downloadPnrrVerificationCsv(verification.data)}
                className="border-2 border-[var(--pnrr-border)] px-4 py-2 font-bold"
              >
                Export signals
              </button>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {signals.map(([label, value, explanation]) => (
                <MetricCard
                  key={label}
                  label={label}
                  value={value.toLocaleString("ro-RO")}
                  note={`${explanation} · ${verification.data.ruleSetVersion} · review state unavailable`}
                />
              ))}
            </div>
            {verification.data.meta.coverage.length > 0 && (
              <section className="mt-8">
                <h3 className="text-xl font-black">Field coverage</h3>
                <div className="mt-3 overflow-x-auto border-2 border-[var(--pnrr-border)]">
                  <table className="w-full text-left text-sm">
                    <caption className="sr-only">
                      Field-level coverage for the current PNRR verification
                      answer
                    </caption>
                    <thead className="bg-[var(--pnrr-card)]">
                      <tr>
                        <th scope="col" className="p-3">
                          Field
                        </th>
                        <th scope="col" className="p-3">
                          Covered
                        </th>
                        <th scope="col" className="p-3">
                          Total
                        </th>
                        <th scope="col" className="p-3">
                          Coverage
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {verification.data.meta.coverage.map((coverage) => (
                        <tr
                          key={coverage.field}
                          className="border-t border-[var(--pnrr-border)]"
                        >
                          <td className="p-3 font-mono">{coverage.field}</td>
                          <td className="p-3">
                            {coverage.covered.toLocaleString("ro-RO")}
                          </td>
                          <td className="p-3">
                            {coverage.total.toLocaleString("ro-RO")}
                          </td>
                          <td className="p-3">
                            {coverage.percent === null
                              ? "—"
                              : `${coverage.percent.toLocaleString("ro-RO", {
                                  maximumFractionDigits: 2,
                                })}%`}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </>
        )}
      </QueryState>
    </PnrrLiveShell>
  );
}
