/* eslint-disable react-refresh/only-export-components -- `hubFacts` builds the
   four tiles the band beside it renders, labels included; the two are one
   surface and are read together. */
import { useId, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { Building2 } from 'lucide-react'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { useRevealOnView } from '@/components/landing-skin/reveal'
import { CountUpValue, countUpWithin } from '@/features/landing/components/count-up'
import { LandingSearch } from '@/features/landing/components/search/landing-search'
import { useIsMobile } from '@/hooks/use-mobile'
import { cn } from '@/lib/utils'
import type { CompanyGroupSlice, CompanyHubStats } from '@/schemas/private-company-search'
import { labelDivisions } from '../../lib/caen-divisions'
import {
  STATUS_ACTIVE,
  STATUS_BANKRUPTCY,
  STATUS_INSOLVENCY,
  STATUS_STRUCK_OFF,
} from '../../lib/company-status-codes'
import { foldCountyName } from '../../lib/county-names'
import { formatInteger } from '../../lib/formatting'

/**
 * The bands the companies hub is assembled from.
 *
 * Every figure on this page is a link: a status row, a sector bar, a county
 * on the map or in the list all open `/companies/search` with the filters the
 * directory already reads from the URL. The hub is a set of saved queries with
 * their sizes shown, not a dashboard to be read and left.
 *
 * Numbers are Romanian-formatted through the feature's own `formatInteger`,
 * which the directory and the profile use too, so one company count never
 * appears two ways in one session.
 */

/**
 * Percentages in the same convention as the counts beside them.
 *
 * The feature's `formatShare` follows the UI language while its `formatInteger`
 * is pinned to `ro-RO`, so using both here would print `44.9%` next to
 * `1.749.479` on an English page. One page, one convention.
 */
function formatSharePinned(fraction: number): string {
  return new Intl.NumberFormat('ro-RO', {
    style: 'percent',
    maximumFractionDigits: 1,
  }).format(fraction)
}

function countFor(stats: CompanyHubStats, code: string): number {
  return stats.statusMix.find((slice) => slice.key === code)?.count ?? 0
}

// ───────────────────────────────────────────────────────────── search ──

/**
 * The landing's field, with the scope pinned to companies.
 *
 * The scope travels to the server as `docTypes`, so the rows are companies
 * drawn from the whole index rather than the company rows that happened to
 * survive among the first few hits of everything. Picking one opens that
 * company's profile.
 */
export function HubSearch({
  autoFocus,
  className,
}: {
  readonly autoFocus?: boolean
  readonly className?: string
}) {
  const isMobile = useIsMobile()
  return (
    <LandingSearch
      className={className}
      docTypes={['company']}
      fixedScope={{ label: t`Firme`, Icon: Building2 }}
      placeholder={t`Nume sau CUI...`}
      autoFocus={autoFocus && !isMobile}
      scrollToTopOnFocus={isMobile}
    />
  )
}

// ────────────────────────────────────────────────────── section chrome ──

export function SectionHead({
  index,
  title,
  lede,
  aside,
}: {
  readonly index: string
  readonly title: ReactNode
  readonly lede?: ReactNode
  readonly aside?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
      <div className="min-w-0">
        <MonoLabel className="block text-primary" data-reveal>
          {index}
        </MonoLabel>
        <h2
          data-reveal
          className="mt-3 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
        >
          {title}
        </h2>
        {lede ? (
          <p data-reveal className="mt-3 max-w-[56ch] text-base leading-relaxed text-muted-foreground">
            {lede}
          </p>
        ) : null}
      </div>
      {aside ? <div className="min-w-0 max-w-full">{aside}</div> : null}
    </div>
  )
}

export function Pending({ rows = 6, className }: { readonly rows?: number; readonly className?: string }) {
  return (
    <div className={cn('space-y-2', className)} aria-hidden="true">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="h-7 w-full animate-pulse rounded-sm bg-muted/60" />
      ))}
    </div>
  )
}

/**
 * `companyHubStats` is a nullable root field: its cold compute is about thirty
 * seconds, so a request landing while the server cache warms resolves to null.
 * That reads as "not ready, try again", never as a hub full of zeroes.
 */
export function LoadError({ onRetry }: { readonly onRetry: () => void }) {
  return (
    <div role="alert" className="space-y-3 text-sm text-muted-foreground">
      <p>
        <Trans>
          Cifrele nu au sosit. Agregatul se calculează pe server și poate dura la prima cerere.
        </Trans>
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex min-h-9 items-center rounded-sm border px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
      >
        <Trans>Încearcă din nou</Trans>
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────── snapshot ──

export type Fact = {
  readonly key: string
  readonly testId: string
  readonly value: number
  readonly label: ReactNode
  readonly note: ReactNode
  readonly search: Record<string, unknown>
}

export function hubFacts(stats: CompanyHubStats): readonly Fact[] {
  return [
    {
      key: 'total',
      testId: 'company-hub-tile-total',
      value: stats.totalCompanies,
      label: <Trans>firme în setul de date</Trans>,
      note: <Trans>toate stările ONRC, inclusiv radiate</Trans>,
      search: {},
    },
    {
      key: 'active',
      testId: 'company-hub-tile-active',
      value: stats.activeCompanies,
      label: <Trans>în funcțiune</Trans>,
      note: (
        <Trans>
          {formatSharePinned(stats.activeCompanies / stats.totalCompanies)} din total, stare ONRC 1048
        </Trans>
      ),
      search: { status: [STATUS_ACTIVE] },
    },
    {
      key: 'distress',
      testId: 'company-hub-tile-distress',
      value: countFor(stats, STATUS_INSOLVENCY) + countFor(stats, STATUS_BANKRUPTCY),
      label: <Trans>în insolvență sau faliment</Trans>,
      note: <Trans>stările ONRC 1107 și 1070</Trans>,
      search: { status: [STATUS_INSOLVENCY, STATUS_BANKRUPTCY] },
    },
    {
      key: 'struck-off',
      testId: 'company-hub-tile-struck-off',
      value: countFor(stats, STATUS_STRUCK_OFF),
      label: <Trans>radiate</Trans>,
      note: <Trans>rămân în set cu istoricul lor, stare ONRC 1084</Trans>,
      search: { status: [STATUS_STRUCK_OFF] },
    },
  ]
}

/**
 * A description list, four terms and their values; the value sits on top.
 *
 * Owns its own reveal because it mounts only once the figures arrive, which is
 * after the page's observer has taken its one look at the tree. The landing's
 * figures are in the server HTML from the start and do not need this.
 */
export function SnapshotBand({
  facts,
  className,
}: {
  readonly facts: readonly Fact[]
  readonly className?: string
}) {
  const listRef = useRef<HTMLDListElement>(null)
  useRevealOnView(listRef, countUpWithin)
  const baseId = useId()
  return (
    <dl ref={listRef} className={cn('grid grid-cols-2 lg:grid-cols-4', className)}>
      {facts.map((fact, index) => {
        const labelId = `${baseId}-${fact.key}`
        return (
          // A `dl` admits `dt`, `dd` and a `div` grouping them, and nothing
          // else — so the whole tile cannot be an anchor. The link is stretched
          // over the tile instead, and takes its name from the term.
          <div
            key={fact.key}
            data-reveal
            data-testid={fact.testId}
            className={cn(
              'relative flex flex-col px-5 py-6 transition-colors hover:bg-muted/40 sm:py-7',
              'focus-within:bg-muted/40',
              index % 2 === 1 && 'border-l',
              index >= 2 && 'border-t lg:border-t-0',
              index >= 1 && 'lg:border-l',
            )}
          >
            {/* `dt` precedes `dd` as the spec requires; `order` puts the figure on top. */}
            <dt className="order-2 mt-2.5 flex flex-1 flex-col">
              <MonoLabel id={labelId} className="block leading-relaxed text-foreground">
                {fact.label}
              </MonoLabel>
              <MonoLabel className="mt-auto block pt-5 leading-relaxed text-muted-foreground">
                {fact.note}
              </MonoLabel>
              <Link
                to="/companies/search"
                search={fact.search}
                aria-labelledby={labelId}
                className="absolute inset-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
              />
            </dt>
            <dd className="order-1 text-3xl font-semibold tabular-nums tracking-tight text-foreground sm:text-4xl">
              {/* Romanian separators, pinned rather than taken from the UI
                  language, because every other count on this page comes from
                  `formatInteger`, which is `ro-RO` for the whole feature. Taking
                  the locale here would print `3,892,657` in the tiles above
                  `341.116` in the county list on an English page. */}
              <CountUpValue value={fact.value} digits={0} locale="ro" />
            </dd>
          </div>
        )
      })}
    </dl>
  )
}

// ─────────────────────────────────────────────────────────────── CAEN ──

/**
 * Horizontal bars over the active population, one per CAEN division.
 *
 * The overlap is real: a company with two recorded activities appears in two
 * bars, so these are counts of recorded activities and there is no total and
 * no share of anything. `CaenCaveat` says so beside them.
 */
export function CaenBars({
  divisions,
  limit = 10,
  className,
}: {
  readonly divisions: readonly CompanyGroupSlice[]
  readonly limit?: number
  readonly className?: string
}) {
  const [expanded, setExpanded] = useState(false)
  const labelled = labelDivisions(divisions)
  // Codes with no division behind them are source noise, not sectors. Neither
  // ranked among real ones nor dropped: their mass is stated below the list.
  const named = labelled.filter((division) => division.named)
  const unnamed = labelled.filter((division) => !division.named)
  const unnamedCount = unnamed.reduce((sum, division) => sum + division.count, 0)
  const max = named[0]?.count ?? 1
  const shown = expanded ? named : named.slice(0, limit)
  return (
    <div className={className} data-testid="company-hub-caen">
      <ol className="divide-y divide-border/70">
        {shown.map((division) => (
          <li key={division.key}>
            <Link
              to="/companies/search"
              search={{ caen: division.key, status: [STATUS_ACTIVE] }}
              className="group block py-2.5 transition-colors hover:bg-muted/40"
              title={division.long}
            >
              <div className="flex items-baseline justify-between gap-4">
                <span className="flex min-w-0 items-baseline gap-2.5">
                  <MonoLabel className="w-5 shrink-0 text-muted-foreground">{division.key}</MonoLabel>
                  <span className="truncate text-sm text-foreground">{division.short}</span>
                </span>
                <span className="shrink-0 text-sm tabular-nums text-foreground">
                  {formatInteger(division.count)}
                </span>
              </div>
              <div className="mt-1.5 h-1.5 w-full bg-muted/70">
                <div
                  className="h-full bg-primary/80 transition-[width] duration-500 group-hover:bg-primary"
                  style={{ width: `${Math.max(1, (division.count / max) * 100).toFixed(1)}%` }}
                />
              </div>
            </Link>
          </li>
        ))}
      </ol>
      <div className="mt-3 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        {named.length > limit ? (
          <button
            type="button"
            onClick={() => setExpanded((current) => !current)}
            className="inline-flex min-h-9 items-center text-sm font-medium text-foreground underline-offset-4 hover:underline"
            aria-expanded={expanded}
          >
            {expanded ? (
              <Trans>Doar primele {limit}</Trans>
            ) : (
              <Trans>Toate cele {named.length} diviziuni</Trans>
            )}
          </button>
        ) : null}
        {unnamed.length > 0 ? (
          <MonoLabel className="leading-relaxed text-muted-foreground">
            <Trans>
              + {unnamed.length} coduri fără diviziune în nomenclator, {formatInteger(unnamedCount)}{' '}
              activități înregistrate
            </Trans>
          </MonoLabel>
        ) : null}
      </div>
    </div>
  )
}

/** Said beside the bars, because both constraints change how they are read. */
export function CaenCaveat() {
  return (
    <MonoLabel className="block leading-relaxed text-muted-foreground">
      <Trans>
        Numele diviziunilor vin din nomenclatorul CAEN Rev.2; cifrele grupează codurile din toate
        revizuirile.
      </Trans>
    </MonoLabel>
  )
}

// ─────────────────────────────────────────────────────────── counties ──

export function CountyList({
  counties,
  limit = 10,
  className,
  highlightedKey,
  onHover,
}: {
  readonly counties: readonly CompanyGroupSlice[]
  readonly limit?: number
  readonly className?: string
  /** The folded county name under the pointer, here or on the map. */
  readonly highlightedKey?: string
  readonly onHover?: (key: string | undefined) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const shown = expanded ? counties : counties.slice(0, limit)
  const max = counties[0]?.count ?? 1
  return (
    <div className={className} data-testid="company-hub-counties">
      <ol className="divide-y divide-border/70">
        {shown.map((county, index) => {
          const key = foldCountyName(county.key)
          const isHighlighted = highlightedKey === key
          return (
            <li key={county.key}>
              <Link
                to="/companies/search"
                search={{ county: [county.key], status: [STATUS_ACTIVE] }}
                onPointerEnter={() => onHover?.(key)}
                onPointerLeave={() => onHover?.(undefined)}
                onFocus={() => onHover?.(key)}
                onBlur={() => onHover?.(undefined)}
                className={cn(
                  'group flex items-baseline gap-3 py-2.5 transition-colors hover:bg-muted/40',
                  isHighlighted && 'bg-muted/40',
                )}
              >
                <MonoLabel className="w-6 shrink-0 text-muted-foreground">
                  {String(index + 1).padStart(2, '0')}
                </MonoLabel>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-4">
                    <span className="truncate text-sm text-foreground">{county.key}</span>
                    <span className="shrink-0 text-sm tabular-nums text-foreground">
                      {formatInteger(county.count)}
                    </span>
                  </span>
                  <span className="mt-1.5 block h-1 w-full bg-muted/70">
                    <span
                      className={cn(
                        'block h-full bg-primary/70 group-hover:bg-primary',
                        isHighlighted && 'bg-primary',
                      )}
                      style={{ width: `${Math.max(1, (county.count / max) * 100).toFixed(1)}%` }}
                    />
                  </span>
                </span>
              </Link>
            </li>
          )
        })}
      </ol>
      {counties.length > limit ? (
        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          className="mt-3 inline-flex min-h-9 items-center text-sm font-medium text-foreground underline-offset-4 hover:underline"
          aria-expanded={expanded}
        >
          {expanded ? (
            <Trans>Doar primele {limit}</Trans>
          ) : (
            <Trans>Toate cele {counties.length} județe</Trans>
          )}
        </button>
      ) : null}
    </div>
  )
}

/**
 * The active companies the map cannot place.
 *
 * The `(none)` bucket of the same answer the map is drawn from, so it is never
 * a difference between two snapshots. Small in practice, and said anyway: a
 * map that looks complete owes the reader the number it leaves out.
 */
export function CountyGapNote({
  unplaced,
  className,
}: {
  readonly unplaced: number
  readonly className?: string
}) {
  if (unplaced <= 0) return null
  return (
    <MonoLabel
      data-testid="company-hub-county-coverage"
      className={cn('block leading-relaxed text-muted-foreground', className)}
    >
      <Trans>
        {formatInteger(unplaced)} firme în funcțiune nu au județ în registru și nu apar pe hartă.
      </Trans>
    </MonoLabel>
  )
}

// ───────────────────────────────────────────────────────────── status ──

const STATUS_ORDER = [STATUS_ACTIVE, STATUS_STRUCK_OFF, STATUS_INSOLVENCY, STATUS_BANKRUPTCY] as const
const STATUS_TONE: Record<string, string> = {
  [STATUS_ACTIVE]: 'bg-primary/80',
  [STATUS_STRUCK_OFF]: 'bg-foreground/25',
  [STATUS_INSOLVENCY]: 'bg-amber-500/70',
  [STATUS_BANKRUPTCY]: 'bg-destructive/60',
}

/**
 * The register's shape: one stacked strip for the proportion, then a row per
 * state with its count and share. Each row is a saved query; the remainder is
 * not, because "alte stări" is a sum of codes rather than a filter.
 */
export function StatusPanel({
  stats,
  className,
}: {
  readonly stats: CompanyHubStats
  readonly className?: string
}) {
  const known = STATUS_ORDER.map((code) =>
    stats.statusMix.find((slice) => slice.key === code),
  ).filter((slice): slice is CompanyGroupSlice => slice !== undefined)
  const rest = stats.totalCompanies - known.reduce((sum, slice) => sum + slice.count, 0)
  const segments = [...known, { key: 'other', label: t`alte stări`, count: rest }]
  return (
    <div className={className}>
      <div
        className="flex h-2.5 w-full overflow-hidden rounded-sm bg-muted"
        role="img"
        aria-label={t`Firme pe stări ONRC`}
      >
        {segments.map((segment) => (
          <span
            key={segment.key}
            className={cn('block h-full', STATUS_TONE[segment.key] ?? 'bg-muted-foreground/30')}
            style={{ width: `${((segment.count / stats.totalCompanies) * 100).toFixed(2)}%` }}
          />
        ))}
      </div>
      <ol className="mt-4 divide-y divide-border/70 border-y border-border/70">
        {segments.map((segment) => {
          const row = (
            <>
              <span
                className={cn(
                  'size-2 shrink-0 rounded-[1px]',
                  STATUS_TONE[segment.key] ?? 'bg-muted-foreground/30',
                )}
              />
              <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                {segment.label ?? segment.key}
              </span>
              <MonoLabel className="w-10 shrink-0 text-right text-muted-foreground">
                {formatSharePinned(segment.count / stats.totalCompanies)}
              </MonoLabel>
              <span className="w-24 shrink-0 text-right text-sm tabular-nums text-foreground">
                {formatInteger(segment.count)}
              </span>
            </>
          )
          return (
            <li key={segment.key}>
              {segment.key === 'other' ? (
                <span className="flex items-center gap-3 py-2">{row}</span>
              ) : (
                <Link
                  to="/companies/search"
                  search={{ status: [segment.key] }}
                  className="flex items-center gap-3 py-2 transition-colors hover:bg-muted/40"
                >
                  {row}
                </Link>
              )}
            </li>
          )
        })}
      </ol>
    </div>
  )
}

// ────────────────────────────────────────────────────── investigations ──

const INVESTIGATIONS: readonly {
  readonly key: string
  readonly title: ReactNode
  readonly body: ReactNode
  readonly search: Record<string, unknown>
}[] = [
  {
    key: 'distress',
    title: <Trans>Firme în insolvență sau faliment</Trans>,
    body: <Trans>Sub procedură — de verificat când un furnizor al unei instituții apare aici.</Trans>,
    search: { status: [STATUS_INSOLVENCY, STATUS_BANKRUPTCY] },
  },
  {
    key: 'inactive',
    title: <Trans>Declarate inactive fiscal de ANAF</Trans>,
    body: <Trans>Inactive în lista ANAF, dar încă în funcțiune în registrul ONRC.</Trans>,
    search: { inactive: true, status: [STATUS_ACTIVE] },
  },
  {
    key: 'young',
    title: <Trans>Înregistrate din 2024</Trans>,
    body: <Trans>Firme tinere — cine a câștigat contracte la scurt timp după înființare.</Trans>,
    search: { regFrom: '2024-01-01', status: [STATUS_ACTIVE] },
  },
]

export function InvestigationLinks({ className }: { readonly className?: string }) {
  return (
    <ul className={cn('grid gap-px bg-border/70 sm:grid-cols-3', className)}>
      {INVESTIGATIONS.map((item) => (
        <li key={item.key} className="bg-background">
          <Link
            to="/companies/search"
            search={item.search}
            className="block h-full p-5 transition-colors hover:bg-muted/40"
          >
            <span className="block text-base font-semibold tracking-tight text-foreground">
              {item.title}
            </span>
            <span className="mt-1.5 block text-sm leading-relaxed text-muted-foreground">
              {item.body}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}

// ──────────────────────────────────────────────────────────── sources ──

/**
 * What the figures are made of, and when they were computed.
 *
 * `computedAt` is the instant the server's cached aggregate last ran, which is
 * the only date on this page that is served. The per-source capture dates —
 * when ONRC published the register snapshot, when the ANAF list was taken —
 * are not exposed by the API, so they are named as missing rather than
 * guessed. `DESIGN.md` §Data Trust asks for the date beside the claim; where
 * there is none, saying so is the honest form.
 */
/**
 * ONRC registry entries with no CUI, measured 25 August 2026 in the scrapper's
 * own audit. Interpolated rather than written into the sentence so it is
 * formatted like every other count on the page instead of in the separators
 * of whichever language the sentence was translated into.
 */
const REGISTRATIONS_WITHOUT_CUI = 86_000

export function SourcesStrip({
  stats,
  className,
}: {
  readonly stats?: CompanyHubStats
  readonly className?: string
}) {
  const formattedRegistrationsWithoutCui = formatInteger(REGISTRATIONS_WITHOUT_CUI)
  return (
    <div className={cn('grid gap-6 lg:grid-cols-12', className)}>
      <div className="lg:col-span-5">
        <MonoLabel className="block text-primary">
          <Trans>Surse și acoperire</Trans>
        </MonoLabel>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          <Trans>
            ONRC — registrul comerțului: stare, formă juridică, activități CAEN autorizate. ANAF —
            date fiscale (TVA, inactivitate) și situații financiare anuale. Firmele de aici sunt
            cele cu CUI; circa {formattedRegistrationsWithoutCui} de înregistrări ONRC fără CUI nu
            apar.
          </Trans>
        </p>
      </div>
      <div className="space-y-2 lg:col-span-6 lg:col-start-7">
        <p className="text-sm leading-relaxed text-muted-foreground">
          <Trans>
            Cifrele de mai sus vin dintr-un agregat calculat periodic pe server, nu la fiecare
            vizită.
          </Trans>
        </p>
        {stats ? (
          <MonoLabel
            data-testid="company-hub-computed-at"
            className="block leading-relaxed text-muted-foreground"
          >
            <Trans>Agregat calculat la {stats.computedAt.slice(0, 10)}</Trans>
          </MonoLabel>
        ) : null}
        <MonoLabel className="block leading-relaxed text-muted-foreground">
          <Trans>
            Datele capturii ONRC și ale listei ANAF nu sunt încă publicate de API, așa că nu apar
            aici.
          </Trans>
        </MonoLabel>
      </div>
    </div>
  )
}
