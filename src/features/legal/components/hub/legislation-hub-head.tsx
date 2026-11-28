import { useEffect, useRef, type ReactNode } from 'react'
import { Link, useLocation } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { ArrowUpRight, Scale } from 'lucide-react'
import { IndicatorToggle } from '@/components/landing-skin/indicator-toggle'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { CountUpValue, countUpWithin } from '@/features/landing/components/count-up'
import { DeferredLandingSearch } from '@/features/landing/components/search/deferred-landing-search'
import { hubSearchMore } from './legislation-hub-search-more'
import { useIsMobile } from '@/hooks/use-mobile'
import { cn } from '@/lib/utils'
import { useLegalAnalytics } from '../../hooks/use-legislation-analytics'
import { fmt, pctOf } from '../../lib/analytics-format'
import { GAZETTE_URL, HEAD_ACTS_SHOWN, LEADERS_MORE_CLASS, LEADER_ROW_CLASS, PORTAL_URL, actName, analysisSearch, hubActsArgs, type HubRanking } from './legislation-hub-lib'
import { BandNote, PendingBar } from './legislation-hub-parts'

/**
 * The legislation hub's head and its figures (design: `docs/design/legal/main-page.md`). The head holds one
 * thing to do and one thing to look at: the site's search scoped to legislation, and the five leading acts in
 * the hubs' leaders' card. The four figures have their own band under the pinned bar.
 */

/** A quiet line under a name or a figure: a sentence or a name, so plain text in its own casing. */
const META_CLASS = 'text-xs leading-4 text-muted-foreground'

/**
 * The site's search, scoped to legislation, as the companies, NGO and procurement hubs scope theirs: the same
 * field, ranking and keyboard, the scope sent to the server as `docTypes`. A row opens the act's page. It
 * takes focus on arrival only at the top of the page and never on a phone.
 */
export function HubHeadSearch() {
  const isMobile = useIsMobile()
  const { hash, search } = useLocation()
  // An explicit language in the address goes on with the words (Codex review, round 1).
  const lang = (search as Record<string, unknown> | undefined)?.lang

  return (
    <DeferredLandingSearch
      docTypes={['legal_act']}
      fixedScope={{ label: t`Legislație`, Icon: Scale }}
      // Short, as the companies hub's („Nume sau CUI..."): beside the „Legislație" pill a 390px phone has room for about twelve letters.
      placeholder={t`Nume sau nr…`}
      autoFocus={!isMobile && !hash}
      scrollToTopOnFocus={isMobile}
      // This search reads names and numbers only: the words go on to the advanced search, which also reads the laws'
      // text. As the list's last row under an answer, and beside the sentence when there is none (owner, 27 November
      // 2026, chosen from a picture of three).
      more={hubSearchMore(lang)}
    />
  )
}

/**
 * The five acts most amended, or most cited, in the companies hub's leaders' card: the title and the ranking's
 * switch, then a row per act (its place, its name, its figure as a bar against the first's, a quiet line with
 * its issuer, the figure), the link to the rest and what the figure counts. An act is named once: its
 * citation, or its name where the Portal gives one, with the citation then on the quiet line. No Felul label
 * (four codes are still unplaced, LEG-F7RR).
 *
 * The view names acts, so it is read in the browser on every visit and never rendered by the server; while a
 * ranking loads (the first one, or the other after the switch) the card shows its five empty rows, never the
 * other ranking's acts under this one's title.
 */
export function HubHeadActs({ ranking, onRanking }: { readonly ranking: HubRanking; readonly onRanking: (key: HubRanking) => void }) {
  const cited = ranking === 'citate'
  const acts = useLegalAnalytics('acts', hubActsArgs(ranking))
  // Only an answer read since the card mounted names acts here (the server's privacy gate is asked on every read).
  // and only while it stands: a refetch that failed hides the names it showed
  const fresh = acts.isFetchedAfterMount && !acts.isError ? acts.data : undefined
  const rows = (fresh?.data.rows ?? []).slice(0, HEAD_ACTS_SHOWN)
  const figure = (row: (typeof rows)[number]) => (cited ? row.cited : row.amended)
  const top = Math.max(1, ...rows.map(figure))
  return (
    // The national budget page's hero card: solid, with a light shadow off the lattice.
    <section className="border bg-background p-5 shadow-sm sm:p-6" aria-labelledby="legal-hub-acts-title">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <h2 id="legal-hub-acts-title" className="text-sm font-semibold text-foreground">
          {cited ? <Trans>Cele mai citate acte</Trans> : <Trans>Cele mai modificate acte</Trans>}
        </h2>
        {/* The switch names the measure, as the companies hub's does („Cifra de afaceri", „Salariați"): two short words, one line on a phone. */}
        <IndicatorToggle<HubRanking>
          label={t`Clasamentul după`}
          options={[
            { key: 'modificate', label: t`Modificări` },
            { key: 'citate', label: t`Citări` },
          ]}
          value={ranking}
          onChange={onRanking}
        />
      </div>
      {acts.error ? (
        <div className="mt-4">
          <BandNote error={acts.error} onRetry={() => void acts.refetch()} />
        </div>
      ) : fresh ? (
        <ol className="mt-4 divide-y divide-border/70 border-y border-border/70" data-testid="legal-hub-head-acts">
          {rows.map((row, index) => {
            const act = actName(row)
            const under = [act.citation, row.issuer].filter((part): part is string => part !== null && part !== '').join(' · ')
            return (
              <li key={row.actId}>
                <Link to="/legislation/acts/$actId" params={{ actId: row.actId }} className={cn(LEADER_ROW_CLASS, 'transition-colors hover:bg-muted/40')}>
                  <MonoLabel className="pl-1 tabular-nums text-muted-foreground">{String(index + 1).padStart(2, '0')}</MonoLabel>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-foreground">{act.name}</span>
                    {/* A ranking: the bar is the act's figure against the first's; an act at zero has no bar. */}
                    <span className="mt-1 block h-1 bg-muted" aria-hidden="true">
                      {figure(row) > 0 ? (
                        <span
                          className="block h-1 bg-primary/70 transition-colors group-hover:bg-primary"
                          style={{ width: `${Math.min((figure(row) / top) * 100, 100).toFixed(1)}%` }}
                        />
                      ) : null}
                    </span>
                    {/* The line is kept under an act with nothing to say there, so the rows share one height. */}
                    <span className={cn('mt-1 block truncate', META_CLASS)} title={under === '' ? undefined : under}>
                      {under === '' ? ' ' : under}
                    </span>
                  </span>
                  <span className="text-right">
                    <span className="block text-sm font-semibold tabular-nums text-foreground">{fmt(figure(row))}</span>
                    <span className={cn('block', META_CLASS)}>{cited ? t`citări` : t`modificări`}</span>
                  </span>
                </Link>
              </li>
            )
          })}
        </ol>
      ) : (
        // Without JavaScript the ranking never arrives: the empty rows are hidden and the card offers the
        // directory, which the server renders, instead of five blanks.
        <ol
          className="mt-4 divide-y divide-border/70 border-y border-border/70 [@media(scripting:none)]:hidden"
          aria-hidden="true"
          data-testid="legal-hub-head-acts-pending"
        >
          {Array.from({ length: HEAD_ACTS_SHOWN }, (_, index) => (
            <li key={index} className={LEADER_ROW_CLASS}>
              <MonoLabel className="pl-1 tabular-nums text-muted-foreground">{String(index + 1).padStart(2, '0')}</MonoLabel>
              <span className="min-w-0">
                <span className="block text-sm font-medium">
                  <PendingBar className="block w-3/4" />
                </span>
                <span className="mt-1 block h-1 bg-muted" />
                <span className={cn('mt-1 block', META_CLASS)}>
                  <PendingBar className="w-1/3" />
                </span>
              </span>
              <span className="text-right">
                <span className="block text-sm font-semibold">
                  <PendingBar className="w-12" />
                </span>
                <span className={cn('block', META_CLASS)}>
                  <PendingBar className="w-10" />
                </span>
              </span>
            </li>
          ))}
        </ol>
      )}
      <Link to="/legislation/analytics" search={analysisSearch({ ordine: cited ? 'citari' : 'modificari' })} hash="acte" className={LEADERS_MORE_CLASS}>
        {cited ? <Trans>Toate actele, după citări</Trans> : <Trans>Toate actele, după modificări</Trans>} →
      </Link>
      <p className="mt-2 text-xs text-muted-foreground">
        {cited ? (
          <Trans>Câte alte acte din corpus îl citează.</Trans>
        ) : (
          <Trans>De câte ori actul e numit ca țintă în titlul unui act care îl modifică.</Trans>
        )}
      </p>
    </section>
  )
}

/**
 * The head's few words of sources, as the national budget's head says its own: the names, each a link. How
 * far the data goes and when the analysis was made are in the page's last line.
 */
export function HubHeadSources() {
  const link = 'font-medium text-foreground underline-offset-4 hover:underline'
  return (
    <p className="text-sm text-muted-foreground" data-testid="legal-hub-freshness">
      <Trans>
        Surse:{' '}
        <a href={PORTAL_URL} target="_blank" rel="noreferrer" className={link}>
          Portalul Legislativ
        </a>
        ,{' '}
        <a href={GAZETTE_URL} target="_blank" rel="noreferrer" className={link}>
          Monitorul Oficial
        </a>
      </Trans>
    </p>
  )
}

// ───────────────────────────────────────────────────── the figures ──

type Fact = {
  readonly key: string
  /** `undefined` while its read is in flight; `null` when the read failed or cannot prove the figure. */
  readonly value: number | null | undefined
  readonly label: ReactNode
  /** One short line: what the figure is of. `undefined` while it loads, `null` when its read failed. */
  readonly note: ReactNode | null | undefined
  readonly link: (label: ReactNode, className: string) => ReactNode
}

/** The term's link, stretched over its tile: the whole tile answers the pointer, the link's name is the label. */
const FACT_LINK_CLASS = 'after:absolute after:inset-0 after:content-[""] focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-ring'

/**
 * The four figures in their own band under the pinned bar, as the site's landing and the companies hub keep
 * theirs: the figure, its short label, and one plain line saying what it is of. Each is one field of one
 * answer (`head.total`, `summary.withText`, `head.totals.inStock`, `summary.withVersions`), each leads to the
 * page that breaks it down, and a figure whose read failed shows a dash and says so, never a zero.
 *
 * No status figure: the Portal's „în vigoare" / „abrogat" marks are mostly undated badges (I-27, I-28, I-29), so
 * status never feeds a headline figure (design doc §4). The acts that set rules are the analysis's stock: firm
 * placements, one per base act, status not applied, so never said as „in force" or „today".
 */
export function HubFiguresBand() {
  const head = useLegalAnalytics('head', {})
  const summary = useLegalAnalytics('summary', {})
  const h = head.data?.data
  const s = summary.data?.data
  const valueOf = (value: number | undefined, query: { readonly isPending: boolean }) => value ?? (query.isPending ? undefined : null)
  const noteOf = (note: ReactNode | undefined, query: { readonly isPending: boolean }) => note ?? (query.isPending ? undefined : null)

  const facts: readonly Fact[] = [
    {
      key: 'acts',
      value: valueOf(h?.total, head),
      label: <Trans>Acte publicate</Trans>,
      note: noteOf(
        h ? (
          h.years.min !== null && h.years.max !== null ? (
            <Trans>
              În Portalul Legislativ, {h.years.min}–{h.years.max}
            </Trans>
          ) : (
            <Trans>În Portalul Legislativ</Trans>
          )
        ) : undefined,
        head,
      ),
      link: (label, className) => (
        <Link to="/legislation/search" search={{ historical: true }} className={className}>
          {label}
        </Link>
      ),
    },
    {
      key: 'text',
      value: valueOf(s?.withText, summary),
      label: <Trans>Cu text de citit</Trans>,
      note: noteOf(
        s ? (
          <Trans>
            {pctOf(s.withText, s.total)} din {fmt(s.total)} acte
          </Trans>
        ) : undefined,
        summary,
      ),
      link: (label, className) => (
        <Link to="/legislation/search" search={{ historical: true }} className={className}>
          {label}
        </Link>
      ),
    },
    {
      key: 'rules',
      value: valueOf(h?.totals.inStock, head),
      // Not „stabilesc reguli" alone: that is the Felul band's group (all rule-making acts, a larger count).
      // These stand on their own: acts that only amend, apply or repeal another are not counted.
      label: <Trans>Legislația de bază</Trans>,
      note: noteOf(h ? <Trans>Stabilesc reguli de sine stătătoare; definiție provizorie</Trans> : undefined, head),
      link: (label, className) => (
        <Link to="/legislation/analytics" search={analysisSearch({ populatie: 'stoc' })} className={className}>
          {label}
        </Link>
      ),
    },
    {
      key: 'versions',
      value: valueOf(s?.withVersions, summary),
      label: <Trans>Cu versiuni consolidate</Trans>,
      note: noteOf(
        s ? (
          <Trans>
            {pctOf(s.withVersions, s.total)} din {fmt(s.total)} acte; listate de Portal, neoficiale
          </Trans>
        ) : undefined,
        summary,
      ),
      link: (label, className) => (
        <Link to="/legislation/analytics" search={analysisSearch({ vedere: 'dinamica' })} className={className}>
          {label}
        </Link>
      ),
    },
  ]

  // A figure that arrives after its tile did counts up when it lands.
  const listRef = useRef<HTMLDListElement>(null)
  const known = facts.filter((fact) => typeof fact.value === 'number').length
  useEffect(() => {
    if (known > 0 && listRef.current) countUpWithin(listRef.current, 0)
  }, [known])

  return (
    <dl ref={listRef} className="grid grid-cols-2 lg:grid-cols-4" data-testid="legal-hub-figures">
      {facts.map((fact, index) => (
        <div
          key={fact.key}
          data-testid={`legal-hub-figure-${fact.key}`}
          className={cn(
            'group relative flex flex-col px-5 py-6 transition-colors hover:bg-muted/50 sm:py-7',
            index % 2 === 1 && 'border-l',
            index >= 2 && 'border-t lg:border-t-0',
            index >= 1 && 'lg:border-l',
          )}
        >
          {/* A `dl` group is `dt` then `dd`; `order-*` puts the figure above its label without the markup
              saying otherwise. The label keeps the landing's short mono capitals; the line under it is a
              sentence, so plain text. */}
          <dt className="order-2 mt-2.5 flex flex-1 flex-col">
            {/* The label is words, so plain text, as on the companies hub (owner, 25 November 2026). */}
            <span className="block text-sm font-medium leading-snug text-foreground">{fact.link(fact.label, FACT_LINK_CLASS)}</span>
            <span className={cn('mt-auto block pt-4', META_CLASS)}>
              {fact.note === undefined ? <PendingBar className="w-24" /> : fact.note === null ? <Trans>Cifra nu s-a încărcat.</Trans> : fact.note}
            </span>
            {/* The cue that the tile leads somewhere: on hover or focus where a pointer hovers, always on touch. */}
            <ArrowUpRight
              aria-hidden="true"
              className="pointer-events-none absolute right-2 top-2 size-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 motion-reduce:transition-none [@media(hover:none)]:opacity-100"
            />
          </dt>
          <dd className="order-1 text-3xl font-semibold tabular-nums tracking-tight text-foreground sm:text-4xl">
            {fact.value === undefined ? (
              <PendingBar className="w-28" />
            ) : fact.value === null ? (
              '—'
            ) : (
              // Romanian digits in both languages, as every figure of the legislation pages (`fmt`): the note
              // under the tile says „din 227.202 acte", and the tile must not say 227,202 above it.
              <CountUpValue value={fact.value} digits={0} locale="ro" />
            )}
          </dd>
        </div>
      ))}
    </dl>
  )
}
