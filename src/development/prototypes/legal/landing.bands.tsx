import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useLingui } from '@lingui/react'
import { plural, t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { IndicatorToggle } from '@/components/landing-skin/indicator-toggle'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { StackedYears } from '@/features/legal/components/analytics/analytics-charts'
import { fetchRecentChangesCount, fetchRecentChangesPage } from '@/features/legal/api/legal-changes-api'
import { fetchGazetteIssuesPage } from '@/features/legal/api/legal-gazette-api'
import { useLegislationFreshness } from '@/features/legal/hooks/use-legislation'
import { useLegalAnalytics } from '@/features/legal/hooks/use-legislation-analytics'
import { fmt, pct } from '@/features/legal/lib/analytics-format'
import { GROUP_LABEL, labelOf } from '@/features/legal/lib/analytics-labels'
import { labelOfKey } from '@/features/legal/lib/analytics-view'
import { formatLegalDate, localIsoDate } from '@/features/legal/lib/legal-format'
import { legalEventKindLabel, legalGazettePartLabel } from '@/features/legal/lib/legal-vocabulary'
import { LEADER_ROW_CLASS } from '@/features/legal/components/hub/legislation-hub-lib'
import type { HomeSection } from '@/features/procurement/lib/home-links'
import { cn } from '@/lib/utils'
import {
  CHANGES_SHOWN,
  CHANGES_WINDOW_DAYS,
  GAZETTE_SHOWN,
  ISSUERS_SHOWN,
  LEADERS_SHOWN,
  LINK_KINDS,
  YEARS_FROM,
  analysisSearch,
  isoDaysBefore,
  leaderName,
  linkCounts,
  yearsChart,
  type LinkKind,
} from './landing.lib'
import { Band, BandNote, BarRows, Figure, MORE_LINK_CLASS, PendingBar, PendingRows, type BarRow } from './landing.parts'

/**
 * The landing prototype's bands and its leaders' card. Each reads the live API through the feature's own hooks
 * and modules, keeps a skeleton its own size while it loads, and says in one line when its read failed; the
 * rest of the page stays. Each leads to the page that holds the rest.
 */

/** The page's bands, in order: the pinned bar's links and each band's number. */
export function legalHubSections(): readonly HomeSection[] {
  return [
    { id: 'schimbari', label: t`Schimbări` },
    { id: 'feluri', label: t`Felul actelor` },
    { id: 'emitenti', label: t`Emitenți` },
    { id: 'ani', label: t`An de an` },
    { id: 'legaturi', label: t`Legături` },
    { id: 'monitor', label: t`Monitorul Oficial` },
  ]
}

/** A day as a list writes it („25 sept. 2026"): the source's civil date, never the viewer's timezone. */
function shortDay(value: string, locale: string): string {
  const parsed = new Date(`${value.slice(0, 10)}T00:00:00Z`)
  if (Number.isNaN(parsed.getTime())) return value
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(parsed)
}

// ───────────────────────────────────────────────────── the leaders ──

export type LeadersRanking = 'modificate' | 'citate'

/**
 * The ten acts most amended, or most cited, in their card beside the search. The act goes by its title, with
 * its citation under it; the Felul label is left out on purpose (four codes are still unplaced, LEG-F7RR).
 */
export function LegalLeaders({ ranking, onRanking }: { readonly ranking: LeadersRanking; readonly onRanking: (key: LeadersRanking) => void }) {
  const acts = useLegalAnalytics('acts', { order: ranking === 'citate' ? 'cited' : 'amended', limit: LEADERS_SHOWN })
  const rows = acts.data?.data.rows ?? []
  const figure = (row: (typeof rows)[number]) => (ranking === 'citate' ? row.cited : row.amended)
  const top = Math.max(1, ...rows.map(figure))
  return (
    <section className="border bg-card/80 p-5 backdrop-blur-[2px] sm:p-6" aria-labelledby="legal-hub-leaders-title">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <MonoLabel id="legal-hub-leaders-title" className="text-primary">
          <Trans>Actele din frunte</Trans>
        </MonoLabel>
        <IndicatorToggle<LeadersRanking>
          label={t`Clasamentul după`}
          options={[
            { key: 'modificate', label: t`Cele mai modificate` },
            { key: 'citate', label: t`Cele mai citate` },
          ]}
          value={ranking}
          onChange={onRanking}
        />
      </div>
      {acts.error ? (
        <div className="mt-4">
          <BandNote error={acts.error} onRetry={() => void acts.refetch()} />
        </div>
      ) : acts.data ? (
        // The previous ranking stays while the next one loads, dimmed: its figures are not the new label's.
        <ol
          className={cn('mt-4 divide-y divide-border/70 border-y border-border/70 transition-opacity', acts.isPlaceholderData && 'opacity-40')}
          aria-busy={acts.isPlaceholderData}
          data-testid="legal-hub-leaders"
        >
          {rows.map((row, index) => {
            const name = leaderName(row)
            return (
              <li key={row.actId}>
                <Link to="/legislation/acts/$actId" params={{ actId: row.actId }} className={cn(LEADER_ROW_CLASS, 'transition-colors hover:bg-muted/40')}>
                  <MonoLabel className="pl-1 tabular-nums text-muted-foreground">{String(index + 1).padStart(2, '0')}</MonoLabel>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-foreground">{name.primary}</span>
                    <span className="mt-1 block h-1 bg-muted" aria-hidden="true">
                      <span
                        className="block h-1 bg-primary/70 transition-colors group-hover:bg-primary"
                        style={{ width: `${Math.min(Math.max((figure(row) / top) * 100, 0.8), 100).toFixed(1)}%` }}
                      />
                    </span>
                    {/* The line is kept under a title that stands alone, so the rows share one height. */}
                    <MonoLabel className="mt-1 block truncate text-muted-foreground">{name.secondary ?? ' '}</MonoLabel>
                  </span>
                  <span className="text-right">
                    <span className="block text-sm font-semibold tabular-nums text-foreground">{fmt(figure(row))}</span>
                    <MonoLabel className="hidden text-muted-foreground sm:block">{ranking === 'citate' ? t`citări` : t`modificări`}</MonoLabel>
                  </span>
                </Link>
              </li>
            )
          })}
        </ol>
      ) : (
        <LeaderRowsPending rows={LEADERS_SHOWN} />
      )}
      <Link to="/legislation/analytics" search={analysisSearch({ ordine: ranking === 'citate' ? 'citari' : 'modificari' })} hash="acte" className={MORE_LINK_CLASS}>
        {ranking === 'citate' ? <Trans>Toate actele, după citări</Trans> : <Trans>Toate actele, după modificări</Trans>} →
      </Link>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        {ranking === 'citate' ? (
          <Trans>De câte ori actul e citat de alte acte din corpus.</Trans>
        ) : (
          <Trans>De câte ori actul e numit ca țintă în titlul unui act care îl modifică.</Trans>
        )}
      </p>
    </section>
  )
}

/** The leaders' rows before they arrive: the same grid and type, so the card does not move when they land. */
function LeaderRowsPending({ rows }: { readonly rows: number }) {
  return (
    <ol className="mt-4 divide-y divide-border/70 border-y border-border/70" aria-hidden="true">
      {Array.from({ length: rows }, (_, index) => (
        <li key={index} className={LEADER_ROW_CLASS}>
          <MonoLabel className="pl-1 tabular-nums text-muted-foreground">{String(index + 1).padStart(2, '0')}</MonoLabel>
          <span className="min-w-0">
            <span className="block text-sm font-medium">
              <PendingBar className="block w-3/4" />
            </span>
            <span className="mt-1 block h-1 bg-muted" />
            <MonoLabel className="mt-1 block">
              <PendingBar className="w-1/3" />
            </MonoLabel>
          </span>
          <span className="text-right">
            <span className="block text-sm font-semibold">
              <PendingBar className="w-12" />
            </span>
            <MonoLabel className="block">
              <PendingBar className="w-10" />
            </MonoLabel>
          </span>
        </li>
      ))}
    </ol>
  )
}

// ───────────────────────────────────────────────────── 01 changes ──

/**
 * What changed last: the newest changes already in force and how many came into force in the last thirty
 * days. The count is its own read (the server scans for it), so its failure leaves the list. When the newest
 * change is older than the window the count is zero by construction: the sentence says the date instead.
 */
export function ChangesBand({ sections }: { readonly sections: readonly HomeSection[] }) {
  const { i18n } = useLingui()
  const today = localIsoDate()
  const since = isoDaysBefore(today, CHANGES_WINDOW_DAYS)
  const feed = useQuery({
    queryKey: ['legal', 'landing', 'changes', today] as const,
    queryFn: ({ signal }) => fetchRecentChangesPage({ until: today }, { first: CHANGES_SHOWN, signal }),
    staleTime: 5 * 60 * 1000,
  })
  const count = useQuery({
    queryKey: ['legal', 'landing', 'changes-count', since, today] as const,
    queryFn: ({ signal }) => fetchRecentChangesCount({ since, until: today }, { signal }),
    staleTime: 5 * 60 * 1000,
  })
  const rows = feed.data?.items ?? []
  const newest = rows.find((row) => row.effectiveDate !== null)?.effectiveDate ?? null
  const inWindow = count.data ?? null
  let lede: ReactNode
  if (inWindow !== null && inWindow > 0) {
    lede = (
      <>
        <Trans>În ultimele {CHANGES_WINDOW_DAYS} de zile</Trans>{' '}
        {plural(inWindow, { one: 'a intrat în vigoare', other: 'au intrat în vigoare' })} <Figure>{fmt(inWindow)}</Figure>{' '}
        {plural(inWindow, { one: 'modificare înregistrată.', few: 'modificări înregistrate.', other: 'de modificări înregistrate.' })}
      </>
    )
  } else if (newest !== null) {
    lede = (
      <>
        <Trans>
          Cea mai recentă modificare înregistrată a intrat în vigoare pe <Figure>{formatLegalDate(newest, i18n.locale)}</Figure>.
        </Trans>{' '}
        {inWindow === 0 ? <Trans>În ultimele {CHANGES_WINDOW_DAYS} de zile nu e înregistrată niciuna.</Trans> : null}
      </>
    )
  } else if (feed.isPending || count.isPending) {
    lede = <PendingBar className="w-4/5" />
  } else {
    lede = <Trans>Modificările, abrogările și republicările, după data intrării în vigoare.</Trans>
  }
  return (
    <Band
      id="schimbari"
      sections={sections}
      title={<Trans>Ce s-a schimbat</Trans>}
      lede={lede}
      note={<Trans>Ce act s-a schimbat, prin ce act și de când. Data e cea a intrării în vigoare, așa cum o înregistrează sursa.</Trans>}
    >
      {feed.error ? (
        <BandNote error={feed.error} onRetry={() => void feed.refetch()} />
      ) : feed.data ? (
        <ol className="divide-y divide-border/70 border-y border-border/70" data-testid="legal-hub-changes">
          {rows.map((row) => (
            <li key={row.eventId}>
              <Link
                to="/legislation/acts/$actId"
                params={{ actId: row.actId }}
                className="grid grid-cols-[6.5rem_minmax(0,1fr)] items-baseline gap-x-3 py-2 transition-colors hover:bg-muted/40"
              >
                <MonoLabel className="whitespace-nowrap pl-1 tabular-nums text-muted-foreground">{row.effectiveDate ? shortDay(row.effectiveDate, i18n.locale) : '—'}</MonoLabel>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-foreground">{row.displayCitation}</span>
                  <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                    {legalEventKindLabel(row.eventKind)}
                    {row.sourceAct ? ` ${t`prin`} ${row.sourceAct.displayCitation}` : null}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ol>
      ) : (
        <PendingRows rows={CHANGES_SHOWN} />
      )}
      <Link to="/legislation/changes" className={MORE_LINK_CLASS}>
        <Trans>Toate modificările</Trans> →
      </Link>
    </Band>
  )
}

// ───────────────────────────────────────────────────── 02 Felul ──

/** The classes that are not groups: weak placements and acts no rule places. Shown apart, never inside a group. */
const APART = new Set(['uncertain', 'unplaced'])

/**
 * What the acts do: the six groups of the Felul reading as ranked rows, each a share of all acts, then the
 * uncertain and the unplaced apart, on the same ruler. Read from the summary the figures row already holds.
 */
export function FelulBand({ sections }: { readonly sections: readonly HomeSection[] }) {
  const summary = useLegalAnalytics('summary', {})
  const s = summary.data?.data
  const row = (key: string | null, acts: number): BarRow => ({
    key: key ?? '',
    label: labelOf(GROUP_LABEL, key, t`neîncadrate`),
    acts,
    link:
      key === null
        ? undefined
        : (children, className) => (
            <Link to="/legislation/analytics" search={analysisSearch({ felul: key })} className={className}>
              {children}
            </Link>
          ),
  })
  const groups = s ? s.felul.filter((r) => r.key !== null && !APART.has(r.key)).sort((a, b) => b.acts - a.acts) : []
  // The remainders come from the summary's own fields: the page never infers them from the list.
  const apart = s ? [row('uncertain', s.uncertain), row('unplaced', s.unplaced)] : []
  const scale = Math.max(1, ...groups.map((r) => r.acts), ...apart.map((r) => r.acts))
  const lead = groups[0]
  return (
    <Band
      id="feluri"
      sections={sections}
      title={<Trans>Ce fac actele</Trans>}
      lede={
        s && lead ? (
          <>
            <Trans>Cea mai mare grupă</Trans>, „{labelOf(GROUP_LABEL, lead.key, '')}": <Figure>{fmt(lead.acts)}</Figure>{' '}
            {plural(s.total, { one: 'din # act', few: 'din # acte', other: 'din # de acte' })} ({pct(lead.acts / Math.max(1, s.total))}).
          </>
        ) : summary.error ? (
          <Trans>Fiecare act, după ce face: stabilește reguli, numește, alocă, judecă.</Trans>
        ) : (
          <PendingBar className="w-4/5" />
        )
      }
      note={<Trans>Felul actului e citit din titlu, de reguli. Un act încadrat nesigur sau neîncadrat nu e numărat în nicio grupă.</Trans>}
    >
      {summary.error ? (
        <BandNote error={summary.error} onRetry={() => void summary.refetch()} />
      ) : s ? (
        <div data-testid="legal-hub-felul">
          <BarRows rows={groups.map((r) => row(r.key, r.acts))} total={s.total} scale={scale} />
          <MonoLabel className="mt-5 block text-muted-foreground">
            <Trans>Numărate separat</Trans>
          </MonoLabel>
          <BarRows className="mt-2" rows={apart} total={s.total} scale={scale} quiet />
          <p className="mt-3 text-xs text-muted-foreground">{plural(s.total, { one: 'Procente din # act.', few: 'Procente din # acte.', other: 'Procente din # de acte.' })}</p>
        </div>
      ) : (
        <PendingRows rows={8} />
      )}
      <Link to="/legislation/analytics" search={analysisSearch({ vedere: 'felul' })} className={MORE_LINK_CLASS}>
        <Trans>Deschide în analiză, după felul actului</Trans> →
      </Link>
    </Band>
  )
}

// ───────────────────────────────────────────────────── 03 issuers ──

/**
 * Who issues: the leading issuer lineages as ranked rows. One row more than shown is asked for, because the
 * acts without an issuer rank among the first: they are drawn apart, and what the rows leave out is stated.
 */
export function IssuersBand({ sections }: { readonly sections: readonly HomeSection[] }) {
  const breakdown = useLegalAnalytics('breakdown', { lens: 'issuer', limit: ISSUERS_SHOWN + 1 })
  const b = breakdown.data?.data
  const named = b ? b.rows.filter((r): r is { key: string; acts: number } => r.key !== null).slice(0, ISSUERS_SHOWN) : []
  const none = b?.rows.find((r) => r.key === null) ?? null
  const shown = named.reduce((sum, r) => sum + r.acts, 0) + (none?.acts ?? 0)
  const others = b ? b.total - shown : 0
  const scale = Math.max(1, ...named.map((r) => r.acts), none?.acts ?? 0)
  const lead = named[0]
  return (
    <Band
      id="emitenti"
      sections={sections}
      title={<Trans>Cine emite</Trans>}
      lede={
        b && lead ? (
          <>
            <Trans>Cele mai multe acte le-a emis</Trans> {lead.key}: <Figure>{fmt(lead.acts)}</Figure>{' '}
            {plural(b.total, { one: 'din # act', few: 'din # acte', other: 'din # de acte' })} ({pct(lead.acts / Math.max(1, b.total))}).
          </>
        ) : breakdown.error ? (
          <Trans>Actele, după cine le-a emis.</Trans>
        ) : (
          <PendingBar className="w-4/5" />
        )
      }
      note={
        <Trans>Emitentul e cel scris în sursă; pentru legi, ordonanțe și decrete fără emitent scris e derivat din tip și dată. O linie de minister unește denumirile lui succesive.</Trans>
      }
    >
      {breakdown.error ? (
        <BandNote error={breakdown.error} onRetry={() => void breakdown.refetch()} />
      ) : b ? (
        <div data-testid="legal-hub-issuers">
          <BarRows
            rows={named.map((r) => ({
              key: r.key,
              label: r.key,
              acts: r.acts,
              link: (children, className) => (
                <Link to="/legislation/analytics" search={analysisSearch({ emitent: r.key })} className={className}>
                  {children}
                </Link>
              ),
            }))}
            total={b.total}
            scale={scale}
          />
          {none ? (
            <>
              <MonoLabel className="mt-5 block text-muted-foreground">
                <Trans>Numărate separat</Trans>
              </MonoLabel>
              <BarRows className="mt-2" rows={[{ key: 'none', label: t`fără emitent`, acts: none.acts }]} total={b.total} scale={scale} quiet />
            </>
          ) : null}
          <p className="mt-3 text-xs text-muted-foreground">
            {plural(b.total, { one: 'Procente din # act.', few: 'Procente din # acte.', other: 'Procente din # de acte.' })}{' '}
            {none ? <Trans>Ceilalți emitenți:</Trans> : <Trans>Ceilalți emitenți și actele fără emitent:</Trans>}{' '}
            {plural(others, { one: '# act.', few: '# acte.', other: '# de acte.' })}
          </p>
        </div>
      ) : (
        <PendingRows rows={ISSUERS_SHOWN + 1} />
      )}
      <Link to="/legislation/analytics" search={analysisSearch({ vedere: 'emitent' })} className={MORE_LINK_CLASS}>
        <Trans>Deschide în analiză, după emitent</Trans> →
      </Link>
    </Band>
  )
}

// ───────────────────────────────────────────────────── 04 years ──

/**
 * Acts per year, stacked by Felul group, from `YEARS_FROM` on, a column a year (the API leaves out a year
 * without acts; the chart draws it empty). The acts before the first column and the acts without a year are
 * counted in the footnote. The year the corpus was built in is drawn hollow: it is not over.
 */
export function YearsBand({ sections }: { readonly sections: readonly HomeSection[] }) {
  const series = useLegalAnalytics('series', { lens: 'felul' })
  const s = series.data?.data
  const chart = s ? yearsChart(s) : null
  const builtYear = series.data ? Number(series.data.layer.releaseBuiltAt.slice(0, 4)) : null
  const lastYear = chart?.years[chart.years.length - 1]?.year ?? null
  return (
    <Band
      id="ani"
      sections={sections}
      title={<Trans>Legislația, an de an</Trans>}
      lede={
        chart?.peak ? (
          <>
            <Trans>Anul cu cele mai multe acte din {YEARS_FROM} încoace e</Trans> {chart.peak.year}: <Figure>{fmt(chart.peak.acts)}</Figure>.
          </>
        ) : series.error ? (
          <Trans>Actele fiecărui an, după felul lor.</Trans>
        ) : (
          <PendingBar className="w-4/5" />
        )
      }
      note={<Trans>Anul e cel al actului. Un an recent crește încă, pe măsură ce actele lui ajung în date.</Trans>}
    >
      {series.error ? (
        <BandNote error={series.error} onRetry={() => void series.refetch()} />
      ) : s && chart ? (
        <div data-testid="legal-hub-years">
          <StackedYears
            years={chart.years}
            labels={[...s.keys.map((key) => labelOfKey(s.lens, key)), 'altele']}
            caption={t`acte pe an`}
            pendingFrom={builtYear !== null && lastYear !== null && builtYear <= lastYear ? { year: builtYear, label: t`an în curs` } : undefined}
            footnote={
              <>
                <Trans>„Altele": rapoarte și comunicări, încadrări nesigure și acte neîncadrate, împreună.</Trans>{' '}
                {plural(chart.earlier, {
                  one: `Nu sunt pe grafic: # act dinainte de ${YEARS_FROM}`,
                  few: `Nu sunt pe grafic: # acte dinainte de ${YEARS_FROM}`,
                  other: `Nu sunt pe grafic: # de acte dinainte de ${YEARS_FROM}`,
                })}{' '}
                {plural(s.unknownYear, { one: 'și # act fără an.', few: 'și # acte fără an.', other: 'și # de acte fără an.' })}
              </>
            }
          />
        </div>
      ) : (
        <div className="h-60 animate-pulse bg-muted/40 motion-reduce:animate-none sm:h-72" aria-hidden="true" />
      )}
      <Link to="/legislation/analytics" search={analysisSearch({ forma: 'timp' })} className={MORE_LINK_CLASS}>
        <Trans>Deschide în analiză, în timp</Trans> →
      </Link>
    </Band>
  )
}

// ───────────────────────────────────────────────────── 05 links ──

/** What one kind of link is, in the page's words: who names whom. */
function linkText(kind: LinkKind): { readonly label: string; readonly text: string } {
  switch (kind) {
    case 'amends':
      return { label: t`Modificări`, text: t`Acte care numesc în titlu actul pe care îl modifică sau îl completează.` }
    case 'court_names':
      return { label: t`Decizii ale instanțelor`, text: t`Decizii care numesc în titlu actul asupra căruia se pronunță.` }
    case 'promulgates':
      return { label: t`Promulgări`, text: t`Decrete care promulgă o lege.` }
    case 'approves_ordinance':
      return { label: t`Ordonanțe aprobate`, text: t`Legi care aprobă o ordonanță.` }
    case 'rejects_ordinance':
      return { label: t`Ordonanțe respinse`, text: t`Legi care resping o ordonanță.` }
  }
}

/**
 * How the acts link: per kind, the links read in titles whose target is an act of the corpus, as plain counts,
 * each with what it is and how many of that kind were read in all. References, not effects.
 */
export function LinksBand({ sections }: { readonly sections: readonly HomeSection[] }) {
  const links = useLegalAnalytics('links', {})
  const l = links.data?.data
  const counts = l ? LINK_KINDS.map((kind) => ({ kind, ...linkCounts(l, kind) })) : []
  const resolved = counts.reduce((sum, row) => sum + row.resolved, 0)
  const approval = l?.days.find((row) => row.kind === 'approves_ordinance') ?? null
  return (
    <Band
      id="legaturi"
      sections={sections}
      title={<Trans>Cum se leagă actele</Trans>}
      lede={
        l ? (
          <>
            <Figure>{fmt(resolved)}</Figure>{' '}
            {plural(resolved, {
              one: 'trimitere de la un act la alt act din corpus.',
              few: 'trimiteri de la un act la alt act din corpus.',
              other: 'de trimiteri de la un act la alt act din corpus.',
            })}
          </>
        ) : links.error ? (
          <Trans>Trimiterile de la un act la altul, citite din titluri.</Trans>
        ) : (
          <PendingBar className="w-4/5" />
        )
      }
      note={<Trans>Legăturile sunt citite din titluri: trimiteri, nu efecte. Sunt numărate doar cele a căror țintă e un act din corpus.</Trans>}
    >
      {links.error ? (
        <BandNote error={links.error} onRetry={() => void links.refetch()} />
      ) : l ? (
        <dl className="divide-y divide-border/70 border-y border-border/70" data-testid="legal-hub-links">
          {counts.map((row) => {
            const text = linkText(row.kind)
            return (
              <div key={row.kind} className="grid grid-cols-[5.5rem_minmax(0,1fr)] items-baseline gap-x-4 py-3 sm:grid-cols-[6.5rem_minmax(0,1fr)]">
                <dd className="order-1 text-right text-xl font-semibold tabular-nums tracking-tight text-foreground sm:text-2xl">{fmt(row.resolved)}</dd>
                <dt className="order-2 min-w-0">
                  <span className="block text-sm font-medium text-foreground">{text.label}</span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                    {text.text}{' '}
                    {row.kind === 'approves_ordinance' && approval?.median != null ? (
                      <>
                        <Trans>De la ordonanță la lege, mediana e de</Trans> {plural(approval.median, { one: '# zi', few: '# zile', other: '# de zile' })},{' '}
                        {plural(approval.links, { one: 'dintr-o lege.', few: 'din # legi.', other: 'din # de legi.' })}
                      </>
                    ) : null}
                  </span>
                  <MonoLabel className="mt-1.5 block leading-relaxed tabular-nums text-muted-foreground">
                    <Trans>din {fmt(row.read)} citite în titluri</Trans>
                  </MonoLabel>
                </dt>
              </div>
            )
          })}
        </dl>
      ) : (
        <PendingRows rows={LINK_KINDS.length} />
      )}
      <Link to="/legislation/analytics" search={analysisSearch({ vedere: 'legaturi' })} className={MORE_LINK_CLASS}>
        <Trans>Deschide în analiză, legăturile</Trans> →
      </Link>
    </Band>
  )
}

// ───────────────────────────────────────────────────── 06 gazette ──

/**
 * The newest Monitorul Oficial issues. The server browses the gazette a year at a time, so the year is the
 * newest issue's (the freshness read the head already makes), or the clock's when that read failed. The band
 * says an issue exists, its part and its day: nothing about its text.
 */
export function GazetteBand({ sections }: { readonly sections: readonly HomeSection[] }) {
  const { i18n } = useLingui()
  const freshness = useLegislationFreshness()
  const latest = freshness.data?.latestIssueDate ?? null
  const year = latest !== null ? Number(latest.slice(0, 4)) : freshness.isPending ? null : Number(localIsoDate().slice(0, 4))
  const issues = useQuery({
    queryKey: ['legal', 'landing', 'gazette', year] as const,
    queryFn: ({ signal }) => {
      if (year === null) throw new Error('unreachable: query disabled')
      return fetchGazetteIssuesPage({ year }, { pageSize: GAZETTE_SHOWN, signal })
    },
    enabled: year !== null,
    staleTime: 5 * 60 * 1000,
  })
  const rows = issues.data?.items ?? []
  const total = issues.data?.total ?? null
  const newest = rows[0]?.issueDate ?? null
  return (
    <Band
      id="monitor"
      sections={sections}
      title={<Trans>Ce a apărut în Monitorul Oficial</Trans>}
      lede={
        issues.data && total !== null && total > 0 && year !== null ? (
          <>
            <Figure>{fmt(total)}</Figure> {plural(total, { one: `număr apărut în ${year}`, few: `numere apărute în ${year}`, other: `de numere apărute în ${year}` })}
            {newest ? (
              <>
                , <Trans>cel mai recent pe {formatLegalDate(newest, i18n.locale)}</Trans>
              </>
            ) : null}
            .
          </>
        ) : issues.error || issues.data ? (
          <Trans>Dovada publicării: de la apariția în Monitor, un act produce efecte.</Trans>
        ) : (
          <PendingBar className="w-4/5" />
        )
      }
      note={<Trans>Numerele din date, toate părțile. De la data apariției în Monitor, un act produce efecte.</Trans>}
    >
      {issues.error ? (
        <BandNote error={issues.error} onRetry={() => void issues.refetch()} />
      ) : issues.data ? (
        <ol className="divide-y divide-border/70 border-y border-border/70" data-testid="legal-hub-gazette">
          {rows.map((issue) => (
            <li key={issue.moIssueId} className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-4 py-2">
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium tabular-nums text-foreground">
                  <Trans>Nr. {issue.issueLabel}</Trans>
                </span>
                <MonoLabel className="mt-1 block truncate text-muted-foreground">{legalGazettePartLabel(issue.partCode)}</MonoLabel>
              </span>
              <span className="text-sm tabular-nums text-muted-foreground">{issue.issueDate ? shortDay(issue.issueDate, i18n.locale) : issue.issueYear}</span>
            </li>
          ))}
        </ol>
      ) : (
        <PendingRows rows={GAZETTE_SHOWN} />
      )}
      <Link to="/legislation/gazette" className={MORE_LINK_CLASS}>
        <Trans>Toate numerele</Trans> →
      </Link>
    </Band>
  )
}
