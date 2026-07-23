import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { Link, useNavigate } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import type {
  CompanyCoverage,
  CompanyHubStats,
} from '@/schemas/private-company-search'
import { usePrivateCompanyHub } from '../../hooks/use-private-company-hub'
import { formatInteger } from '../../lib/formatting'
import { CompanySearchAutocomplete } from '../search/company-search-autocomplete'
import {
  HubBlock,
  HubBlockError,
  HubBlockSkeleton,
  HubGroupBars,
} from './company-hub-blocks'

const ACTIVE = '1048'
const STRUCK_OFF = '1084'
const BANKRUPTCY = '1070'
const INSOLVENCY = '1107'

function countFor(stats: CompanyHubStats, code: string): number {
  return stats.statusMix.find((slice) => slice.key === code)?.count ?? 0
}

export function PrivateCompanyHubPage() {
  const navigate = useNavigate()
  const hub = usePrivateCompanyHub()
  const stats = hub.data

  return (
    <main className="mx-auto w-full max-w-5xl space-y-8 px-4 py-8 sm:px-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-[var(--pnrr-fg)]">
          <Trans>Companies</Trans>
        </h1>
        <p className="max-w-2xl text-base leading-relaxed text-[var(--pnrr-muted)]">
          <Trans>
            Companies from the ONRC trade register snapshot, with registry
            status, ANAF fiscal data and annual financial statements. Look up a
            company, or start from a question.
          </Trans>
        </p>
      </header>

      <section aria-label={t`Key figures`}>
        {hub.isPending ? (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, index) => (
              <div
                key={index}
                aria-hidden
                className="h-24 animate-pulse border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-subtle)]"
              />
            ))}
          </div>
        ) : hub.isError || !stats ? (
          <div className="border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] p-5">
            <HubBlockError onRetry={() => void hub.refetch()} />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile
              label={<Trans>Total companies</Trans>}
              value={stats.totalCompanies}
              search={{}}
              testId="company-hub-tile-total"
            />
            <StatTile
              label={<Trans>Active</Trans>}
              value={stats.activeCompanies}
              search={{ status: [ACTIVE] }}
              testId="company-hub-tile-active"
            />
            <StatTile
              label={<Trans>Struck off</Trans>}
              value={countFor(stats, STRUCK_OFF)}
              search={{ status: [STRUCK_OFF] }}
              testId="company-hub-tile-struck-off"
            />
            <StatTile
              label={<Trans>Insolvency and bankruptcy</Trans>}
              value={countFor(stats, INSOLVENCY) + countFor(stats, BANKRUPTCY)}
              search={{ status: [INSOLVENCY, BANKRUPTCY] }}
              testId="company-hub-tile-distress"
            />
          </div>
        )}
      </section>

      <section
        aria-label={t`Search a company`}
        className="border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] p-5"
      >
        <label
          htmlFor="company-hub-search"
          className="mb-2 block text-sm font-bold uppercase tracking-widest text-[var(--pnrr-fg)]"
        >
          <Trans>Search a company</Trans>
        </label>
        <CompanySearchAutocomplete
          value={undefined}
          commitMode="enter"
          onCommit={(q) =>
            void navigate({ to: '/companies/search', search: q ? { q } : {} })
          }
          placeholder={t`e.g. Dedeman or 2816464`}
          inputId="company-hub-search"
          ariaLabel={t`Company name or CUI`}
        />
        <p className="mt-2 text-xs text-[var(--pnrr-muted)]">
          <Trans>
            Press Enter to search, or pick a suggestion to jump straight to that
            company's profile.
          </Trans>
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <HubBlock title={<Trans>Counties with the most companies</Trans>}>
          {hub.isPending ? (
            <HubBlockSkeleton rows={6} />
          ) : hub.isError || !stats ? (
            <HubBlockError onRetry={() => void hub.refetch()} />
          ) : (
            <>
              <HubGroupBars
                groups={stats.topCounties}
                testId="company-hub-counties"
                buildSearch={(group) => ({ county: [group.key], status: [ACTIVE] })}
              />
              <CountyCoverageNote coverage={stats.coverage} />
            </>
          )}
        </HubBlock>

        <HubBlock title={<Trans>Activity sectors (CAEN)</Trans>}>
          {hub.isPending ? (
            <HubBlockSkeleton rows={6} />
          ) : hub.isError || !stats ? (
            <HubBlockError onRetry={() => void hub.refetch()} />
          ) : (
            <HubGroupBars
              groups={stats.caenDivisions}
              testId="company-hub-caen"
              buildSearch={(group) => ({ caen: group.key, status: [ACTIVE] })}
            />
          )}
        </HubBlock>
      </div>

      <section aria-label={t`Quick investigations`} className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-widest text-[var(--pnrr-fg)]">
          <Trans>Start an investigation</Trans>
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <InvestigationCard
            title={<Trans>Companies in insolvency or bankruptcy</Trans>}
            description={
              <Trans>
                Companies under proceedings — useful when checking the suppliers
                of a public institution.
              </Trans>
            }
            search={{ status: [INSOLVENCY, BANKRUPTCY] }}
          />
          <InvestigationCard
            title={<Trans>Companies declared fiscally inactive</Trans>}
            description={
              <Trans>
                Marked inactive by ANAF, yet still active in the ONRC register.
              </Trans>
            }
            search={{ inactive: true, status: [ACTIVE] }}
          />
          <InvestigationCard
            title={<Trans>Companies registered since 2024</Trans>}
            description={
              <Trans>
                Young companies — check who won contracts shortly after being
                founded.
              </Trans>
            }
            search={{ regFrom: '2024-01-01', status: [ACTIVE] }}
          />
          <InvestigationCard
            title={<Trans>Active construction companies</Trans>}
            description={
              <Trans>
                CAEN division 41 — building construction, the sector with the most
                public contracts.
              </Trans>
            }
            search={{ caen: '41', status: [ACTIVE] }}
          />
        </div>
      </section>

      <footer className="border-t-2 border-[var(--pnrr-border)] pt-4 text-xs leading-relaxed text-[var(--pnrr-muted)]">
        <p className="font-bold uppercase tracking-widest text-[var(--pnrr-fg)]">
          <Trans>Sources</Trans>
        </p>
        <p className="mt-2">
          <Trans>
            ONRC — the trade register (status, legal form, CAEN). ANAF — fiscal
            data (VAT, inactivity) and financial statements.
          </Trans>
        </p>
        {stats ? (
          <p className="mt-1" data-testid="company-hub-computed-at">
            <Trans>Figures computed on {formatDay(stats.computedAt)}</Trans>
          </p>
        ) : null}
      </footer>
    </main>
  )
}

/** ISO-8601 → `YYYY-MM-DD`; the time of day is noise for a 6-hourly aggregate. */
function formatDay(iso: string): string {
  return iso.slice(0, 10)
}

/**
 * 39% of active companies carry no county in the ONRC register and are excluded
 * from the ranking, so the bars do not add up to "Active". Saying nothing would
 * leave the reader to assume they do.
 */
function CountyCoverageNote({ coverage }: { readonly coverage: CompanyCoverage }) {
  const unmatched = coverage.territoryUnmatched
  if (unmatched === null || unmatched <= 0) return null
  return (
    <p
      className="mt-3 border-t border-[var(--pnrr-border)] pt-2 text-xs leading-relaxed text-[var(--pnrr-muted)]"
      data-testid="company-hub-county-coverage"
    >
      <Trans>
        {formatInteger(unmatched)} active companies have no county in the
        register and are not ranked here, so the bars do not sum to the total.
      </Trans>
    </p>
  )
}

function StatTile({
  label,
  value,
  search,
  testId,
}: {
  readonly label: ReactNode
  readonly value: number
  readonly search: Record<string, unknown>
  readonly testId: string
}) {
  return (
    <Link
      to="/companies/search"
      search={search}
      data-testid={testId}
      className="block border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] p-4 transition-colors hover:bg-[var(--pnrr-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)]"
    >
      <p className="text-xs font-bold uppercase tracking-widest text-[var(--pnrr-muted)]">
        {label}
      </p>
      <p className="mt-2 text-2xl font-black tabular-nums text-[var(--pnrr-fg)]">
        {formatInteger(value)}
      </p>
    </Link>
  )
}

function InvestigationCard({
  title,
  description,
  search,
}: {
  readonly title: ReactNode
  readonly description: ReactNode
  readonly search: Record<string, unknown>
}) {
  return (
    <Link
      to="/companies/search"
      search={search}
      className="block border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] p-4 transition-colors hover:bg-[var(--pnrr-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)]"
    >
      <p className="text-base font-bold text-[var(--pnrr-fg)]">{title}</p>
      <p className="mt-1 text-sm leading-relaxed text-[var(--pnrr-muted)]">
        {description}
      </p>
    </Link>
  )
}
