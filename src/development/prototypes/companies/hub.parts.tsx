import { useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { Building2 } from 'lucide-react'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { DataStatusBadge } from '@/components/data-trust/data-status-badge'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { useRevealOnView } from '@/components/landing-skin/reveal'
import { CountUpValue, countUpWithin } from '@/features/landing/components/count-up'
import { LandingSearch } from '@/features/landing/components/search/landing-search'
import { useIsMobile } from '@/hooks/use-mobile'
import { cn } from '@/lib/utils'
import type { CompanyGroupSlice, CompanyHubStats } from '@/schemas/private-company-search'
import {
  MOCK_SOURCE_AS_OF,
  STATUS_ACTIVE,
  STATUS_BANKRUPTCY,
  STATUS_INSOLVENCY,
  STATUS_STRUCK_OFF,
  countFor,
  foldCountyName,
  formatCount,
  formatShare,
  labelDivisions,
} from './hub.data'

/**
 * The pieces the three compositions are assembled from. Each is presentational
 * over a slice of `CompanyHubStats`; the variants decide order, width and
 * emphasis. Everything links out to `/companies/search` with the same URL
 * filters the directory already reads, so a click on a bar is a saved query.
 */

// ───────────────────────────────────────────────────────────── search ──

/**
 * The landing's field with the scope pinned to companies. The scope goes to
 * the server as `docTypes`, so the rows are companies from the whole index,
 * not the company rows among the first eight of everything.
 */
export function HubSearch({ autoFocus, className }: { readonly autoFocus?: boolean; readonly className?: string }) {
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
        <h2 data-reveal className="mt-3 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
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

/** The mock-first contract's badge, with the reason beside it. */
export function MockNote({ children }: { readonly children: ReactNode }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <DataStatusBadge status="mock" />
      <MonoLabel className="leading-relaxed text-muted-foreground">{children}</MonoLabel>
    </span>
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

export function LoadError({ onRetry }: { readonly onRetry: () => void }) {
  return (
    <div role="alert" className="space-y-3 text-sm text-muted-foreground">
      <p>
        <Trans>Cifrele nu au sosit. Agregatul se calculează pe server și poate dura la prima cerere.</Trans>
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

// ───────────────────────────────────────────────────────── snapshot ──

export type Fact = {
  readonly key: string
  readonly value: number
  readonly label: ReactNode
  readonly note: ReactNode
  readonly search?: Record<string, unknown>
}

export function hubFacts(stats: CompanyHubStats): readonly Fact[] {
  return [
    {
      key: 'total',
      value: stats.totalCompanies,
      label: <Trans>firme în setul de date</Trans>,
      note: <Trans>toate stările ONRC, inclusiv radiate</Trans>,
      search: {},
    },
    {
      key: 'active',
      value: stats.activeCompanies,
      label: <Trans>în funcțiune</Trans>,
      note: <Trans>{formatShare(stats.activeCompanies, stats.totalCompanies)} din total, stare ONRC 1048</Trans>,
      search: { status: [STATUS_ACTIVE] },
    },
    {
      key: 'distress',
      value: countFor(stats, STATUS_INSOLVENCY) + countFor(stats, STATUS_BANKRUPTCY),
      label: <Trans>în insolvență sau faliment</Trans>,
      note: <Trans>stările ONRC 1107 și 1070</Trans>,
      search: { status: [STATUS_INSOLVENCY, STATUS_BANKRUPTCY] },
    },
    {
      key: 'struck-off',
      value: countFor(stats, STATUS_STRUCK_OFF),
      label: <Trans>radiate</Trans>,
      note: <Trans>rămân în set cu istoricul lor, stare ONRC 1084</Trans>,
      search: { status: [STATUS_STRUCK_OFF] },
    },
  ]
}

/**
 * The county gap: the `(none)` bucket of the same answer the map is drawn
 * from, never a difference between two snapshots. 593 on 16 September 2026 —
 * small, and said anyway, because a map that looks complete owes the reader
 * the number. Nothing to do with `coverage.territoryUnmatched`, which is the
 * SIRUTA placement gap and a different question.
 */
export function CountyGapNote({ unplaced, className }: { readonly unplaced: number; readonly className?: string }) {
  if (unplaced <= 0) return null
  return (
    <MonoLabel className={cn('block leading-relaxed text-muted-foreground', className)}>
      <Trans>
        {formatCount(unplaced)} firme în funcțiune nu au județ în registru și nu apar pe hartă.
      </Trans>
    </MonoLabel>
  )
}

/** The CAEN caveat every composition carries beside the bars. */
export function CaenCaveat() {
  return (
    <MockNote>
      <Trans>
        nume din nomenclatorul Rev.2; cifrele grupează codurile din toate revizuirile CAEN
      </Trans>
    </MockNote>
  )
}

/**
 * A description list, four terms and their values; the value sits on top.
 *
 * Owns its own reveal: the band mounts only once the figures have arrived,
 * which is after the page's observer took its one look at the tree, so the
 * tiles would never be seen — or counted up — from there. The landing's
 * figures are in the HTML from the start and do not have this problem.
 */
export function SnapshotBand({ facts, className }: { readonly facts: readonly Fact[]; readonly className?: string }) {
  const listRef = useRef<HTMLDListElement>(null)
  useRevealOnView(listRef, countUpWithin)
  return (
    <dl ref={listRef} className={cn('grid grid-cols-2 lg:grid-cols-4', className)}>
      {facts.map((fact, i) => {
        const body = (
          <>
            <dt className="order-2 mt-2.5 flex flex-1 flex-col">
              <MonoLabel className="block leading-relaxed text-foreground">{fact.label}</MonoLabel>
              <MonoLabel className="mt-auto block pt-5 leading-relaxed text-muted-foreground">{fact.note}</MonoLabel>
            </dt>
            <dd className="order-1 text-3xl font-semibold tabular-nums tracking-tight text-foreground sm:text-4xl">
              <CountUpValue value={fact.value} digits={0} />
            </dd>
          </>
        )
        const cell = cn(
          'flex flex-col px-5 py-6 sm:py-7',
          i % 2 === 1 && 'border-l',
          i >= 2 && 'border-t lg:border-t-0',
          i >= 1 && 'lg:border-l',
        )
        return fact.search ? (
          <Link
            key={fact.key}
            to="/companies/search"
            search={fact.search}
            data-reveal
            className={cn(cell, 'transition-colors hover:bg-muted/40')}
          >
            {body}
          </Link>
        ) : (
          <div key={fact.key} data-reveal className={cell}>
            {body}
          </div>
        )
      })}
    </dl>
  )
}

// ───────────────────────────────────────────────────────────── CAEN ──

/**
 * Horizontal bars over the active population, one per division. Overlap is
 * real: a company with two recorded activities is in two bars, so there is
 * no total and no share of anything — only counts, and the sentence says so.
 */
export function CaenBars({
  divisions,
  limit = 8,
  expandable = true,
  className,
}: {
  readonly divisions: readonly CompanyGroupSlice[]
  readonly limit?: number
  readonly expandable?: boolean
  readonly className?: string
}) {
  const [expanded, setExpanded] = useState(false)
  const labelled = labelDivisions(divisions)
  // Codes with no division behind them (`00`, `04`, …) are source noise, not
  // sectors. They are not ranked among the sectors and not dropped either:
  // their mass is stated below the list, so the reader knows it exists.
  const named = labelled.filter((division) => division.named)
  const unnamed = labelled.filter((division) => !division.named)
  const unnamedCount = unnamed.reduce((sum, division) => sum + division.count, 0)
  const max = named[0]?.count ?? 1
  const shown = expanded ? named : named.slice(0, limit)
  return (
    <div className={className}>
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
                <span className="shrink-0 text-sm tabular-nums text-foreground">{formatCount(division.count)}</span>
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
        {expandable && named.length > limit ? (
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
              + {unnamed.length} coduri fără diviziune în nomenclator, {formatCount(unnamedCount)}{' '}
              activități înregistrate
            </Trans>
          </MonoLabel>
        ) : null}
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────── counties ──

export function CountyList({
  counties,
  limit = 8,
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
    <div className={className}>
      <ol className="divide-y divide-border/70">
        {shown.map((county, index) => (
          <li key={county.key}>
            <Link
              to="/companies/search"
              search={{ county: [county.key], status: [STATUS_ACTIVE] }}
              onPointerEnter={() => onHover?.(foldCountyName(county.key))}
              onPointerLeave={() => onHover?.(undefined)}
              onFocus={() => onHover?.(foldCountyName(county.key))}
              onBlur={() => onHover?.(undefined)}
              className={cn(
                'group flex items-baseline gap-3 py-2.5 transition-colors hover:bg-muted/40',
                highlightedKey === foldCountyName(county.key) && 'bg-muted/40',
              )}
            >
              <MonoLabel className="w-6 shrink-0 text-muted-foreground">{String(index + 1).padStart(2, '0')}</MonoLabel>
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-4">
                  <span className="truncate text-sm text-foreground">{county.key}</span>
                  <span className="shrink-0 text-sm tabular-nums text-foreground">{formatCount(county.count)}</span>
                </span>
                <span className="mt-1.5 block h-1 w-full bg-muted/70">
                  <span
                    className={cn(
                      'block h-full bg-primary/70 group-hover:bg-primary',
                      highlightedKey === foldCountyName(county.key) && 'bg-primary',
                    )}
                    style={{ width: `${Math.max(1, (county.count / max) * 100).toFixed(1)}%` }}
                  />
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
      {counties.length > limit ? (
        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          className="mt-3 inline-flex min-h-9 items-center text-sm font-medium text-foreground underline-offset-4 hover:underline"
          aria-expanded={expanded}
        >
          {expanded ? <Trans>Doar primele {limit}</Trans> : <Trans>Toate cele {counties.length} județe</Trans>}
        </button>
      ) : null}
    </div>
  )
}

// ──────────────────────────────────────────────────────────── status ──

const STATUS_ORDER = [STATUS_ACTIVE, STATUS_STRUCK_OFF, STATUS_INSOLVENCY, STATUS_BANKRUPTCY] as const
const STATUS_TONE: Record<string, string> = {
  [STATUS_ACTIVE]: 'bg-primary/80',
  [STATUS_STRUCK_OFF]: 'bg-foreground/25',
  [STATUS_INSOLVENCY]: 'bg-amber-500/70',
  [STATUS_BANKRUPTCY]: 'bg-destructive/60',
}

/**
 * The hero's panel: the strip, then one row per state with its count and
 * share, each a saved query. The legend and the rows are the same list said
 * twice — the strip for proportion, the rows for the numbers.
 */
export function StatusPanel({ stats, className }: { readonly stats: CompanyHubStats; readonly className?: string }) {
  const known = STATUS_ORDER.map((code) => stats.statusMix.find((slice) => slice.key === code)).filter(
    (slice): slice is CompanyGroupSlice => slice !== undefined,
  )
  const rest = stats.totalCompanies - known.reduce((sum, slice) => sum + slice.count, 0)
  const segments = [...known, { key: 'other', label: 'alte stări', count: rest }]
  return (
    <div className={className}>
      <div className="flex h-2.5 w-full overflow-hidden rounded-sm bg-muted" role="img" aria-label={t`Firme pe stări ONRC`}>
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
              <span className={cn('size-2 shrink-0 rounded-[1px]', STATUS_TONE[segment.key] ?? 'bg-muted-foreground/30')} />
              <span className="min-w-0 flex-1 truncate text-sm text-foreground">{segment.label ?? segment.key}</span>
              <MonoLabel className="w-10 shrink-0 text-right text-muted-foreground">
                {formatShare(segment.count, stats.totalCompanies)}
              </MonoLabel>
              <span className="w-24 shrink-0 text-right text-sm tabular-nums text-foreground">
                {formatCount(segment.count)}
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

/** One stacked strip: why the corpus is twice the active population. */
export function StatusStrip({ stats, className }: { readonly stats: CompanyHubStats; readonly className?: string }) {
  const known = STATUS_ORDER.map((code) => stats.statusMix.find((slice) => slice.key === code)).filter(
    (slice): slice is CompanyGroupSlice => slice !== undefined,
  )
  const rest = stats.totalCompanies - known.reduce((sum, slice) => sum + slice.count, 0)
  const segments = [...known, { key: 'other', label: 'alte stări', count: rest }]
  return (
    <div className={className}>
      <div className="flex h-3 w-full overflow-hidden rounded-sm bg-muted" role="img" aria-label={t`Firme pe stări ONRC`}>
        {segments.map((segment) => (
          <span
            key={segment.key}
            className={cn('block h-full', STATUS_TONE[segment.key] ?? 'bg-muted-foreground/30')}
            style={{ width: `${((segment.count / stats.totalCompanies) * 100).toFixed(2)}%` }}
            title={`${segment.label ?? segment.key}: ${formatCount(segment.count)}`}
          />
        ))}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
        {segments.map((segment) => (
          <li key={segment.key} className="flex items-center gap-2">
            <span className={cn('size-2 shrink-0 rounded-[1px]', STATUS_TONE[segment.key] ?? 'bg-muted-foreground/30')} />
            <MonoLabel className="text-muted-foreground">
              <span className="text-foreground tabular-nums">{formatCount(segment.count)}</span> {segment.label ?? segment.key}
            </MonoLabel>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ───────────────────────────────────────────────────── investigations ──

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

export function InvestigationLinks({ className, dense }: { readonly className?: string; readonly dense?: boolean }) {
  return (
    <ul className={cn('grid gap-px bg-border/70 sm:grid-cols-3', className)}>
      {INVESTIGATIONS.map((item) => (
        <li key={item.key} className="bg-background">
          <Link
            to="/companies/search"
            search={item.search}
            className={cn('block h-full transition-colors hover:bg-muted/40', dense ? 'p-4' : 'p-5')}
          >
            <span className="block text-base font-semibold tracking-tight text-foreground">{item.title}</span>
            <span className="mt-1.5 block text-sm leading-relaxed text-muted-foreground">{item.body}</span>
          </Link>
        </li>
      ))}
    </ul>
  )
}

// ─────────────────────────────────────────────────────────── sources ──

export function SourcesStrip({ stats, className }: { readonly stats?: CompanyHubStats; readonly className?: string }) {
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
            cele cu CUI; circa 86.000 de înregistrări ONRC fără CUI nu apar.
          </Trans>
        </p>
      </div>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 lg:col-span-6 lg:col-start-7">
        <div>
          <dt>
            <MonoLabel className="text-muted-foreground">
              <Trans>Captură ONRC</Trans>
            </MonoLabel>
          </dt>
          <dd className="mt-1 text-sm tabular-nums text-foreground">{MOCK_SOURCE_AS_OF.onrcCapture}</dd>
        </div>
        <div>
          <dt>
            <MonoLabel className="text-muted-foreground">
              <Trans>Snapshot ANAF</Trans>
            </MonoLabel>
          </dt>
          <dd className="mt-1 text-sm tabular-nums text-foreground">{MOCK_SOURCE_AS_OF.anafSnapshot}</dd>
        </div>
        <div>
          <dt>
            <MonoLabel className="text-muted-foreground">
              <Trans>Situații financiare</Trans>
            </MonoLabel>
          </dt>
          <dd className="mt-1 text-sm tabular-nums text-foreground">
            {MOCK_SOURCE_AS_OF.financialsFrom}–{MOCK_SOURCE_AS_OF.financialsTo}
          </dd>
        </div>
        <div>
          <dt>
            <MonoLabel className="text-muted-foreground">
              <Trans>Agregat calculat</Trans>
            </MonoLabel>
          </dt>
          <dd className="mt-1 text-sm tabular-nums text-foreground">{stats ? stats.computedAt.slice(0, 10) : '…'}</dd>
        </div>
        <div className="col-span-2">
          <MockNote>
            <Trans>
              datele de captură și snapshot și intervalul situațiilor financiare nu sunt servite
              încă de API
            </Trans>
          </MockNote>
        </div>
      </dl>
    </div>
  )
}
