import { useEffect, useRef, type ReactNode } from 'react'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { useLingui } from '@lingui/react'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { ArrowLeft, ArrowRight, ArrowUpRight, Home } from 'lucide-react'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { RevealStyles, useRevealOnView } from '@/components/landing-skin/reveal'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { CountUpValue, SmearFilters, countUpWithin, stopCounting } from '@/features/landing/components/count-up'
import { CornerTicks, CruxMarks, TwoLayerLattice } from '@/features/landing/components/hero-chrome'
import { useLegislationFrontier } from '@/features/legal/hooks/use-legislation-frontier'
import { useLegalAnalytics } from '@/features/legal/hooks/use-legislation-analytics'
import { fmt, pct } from '@/features/legal/lib/analytics-format'
import { READING_SENTENCE } from '@/features/legal/lib/analytics-notes-text'
import { formatLegalDate } from '@/features/legal/lib/legal-format'
import { HubInfoNote } from '@/features/private-companies/components/hub/hub-info-note'
import type { HomeSection } from '@/features/procurement/lib/home-links'
import { HubSectionHead } from '@/features/statistics/components/hub/hub-chrome'
import { cn } from '@/lib/utils'
import { ChangesBand, FelulBand, GazetteBand, IssuersBand, LinksBand, YearsBand, legalHubSections, type LeadersRanking } from './landing.bands'
import { HubSearch, SourcesLine, StartCards, useOneLayer } from './landing.hub'
import { GAZETTE_URL, PORTAL_URL, PROTOTYPE_MARKER, actName, analysisSearch } from './landing.lib'
import { BandNote, PendingBar } from './landing.parts'

/**
 * The landing prototype, second round (owner, 25 November 2026: „too cluttered … clean it up and restructure
 * the information … polish the font and layout following the design principles from the landing page … a back
 * to the main page navigation at the top"). The first round stays as the `hub` variant.
 *
 * What changed, against `hub`:
 * - The head holds one thing to do and one thing to look at: the search with one row of shortcuts, and a short
 *   list of acts. The example chips are gone (the placeholder shows the same shapes), the shortcuts are four,
 *   and the four figures left the head for their own band under the pinned bar, as on the site's landing and
 *   the companies hub.
 * - The acts' card is six rows of two plain lines, in the landing's institutions panel's form: an act is named
 *   once (its citation, or its name where the Portal gives one), with its issuer under it; the figure's column
 *   is named once, in the card's header, and what the figure counts sits behind one marker.
 * - The way home: „Acasă" opens the head, and the pinned bar starts with it, so it stays in reach on scroll.
 * - Type as the landing sets it: the headline's tracking, word spacing and leading; the lede's normal tracking;
 *   round commas (`ss03`); words in Inter in their own casing, mono capitals only on the figures' short labels.
 *
 * The bands, the start cards and the foot are the first round's, untouched.
 */

const DEFAULT_RANKING: LeadersRanking = 'modificate'

/** The acts the head lists: a glance, not a table. The rest is one link away. */
const HEAD_ACTS_SHOWN = 6

/** A shortcut under the search, as the landing sets its own: medium weight, the accent on hover, no underline. */
const SHORTCUT_LINK_CLASS = 'inline-flex min-h-11 items-center text-sm font-medium text-foreground transition-colors hover:text-primary sm:min-h-0'

/** A quiet line under a name or a figure: a sentence or a name, so plain text in its own casing. */
const META_CLASS = 'text-xs leading-4 text-muted-foreground'

function startArrivalEffects(block: Element, delay: number) {
  countUpWithin(block, delay)
}

export function LandingHubSimple() {
  const rootRef = useRef<HTMLDivElement>(null)
  useRevealOnView(rootRef, startArrivalEffects)
  // The count-up driver is module state; an unmount mid-flight would leave it ticking against removed nodes.
  useEffect(() => () => stopCounting(), [])

  const navigate = useNavigate()
  const search = useSearch({ strict: false }) as Record<string, unknown>
  const ranking: LeadersRanking = search['clasament'] === 'citate' ? 'citate' : DEFAULT_RANKING
  const setRanking = (key: LeadersRanking) =>
    void navigate({
      to: '.',
      search: (previous: Record<string, unknown>) => ({ ...previous, clasament: key === DEFAULT_RANKING ? undefined : key }),
      replace: true,
      resetScroll: false,
    })

  useOneLayer(ranking, HEAD_ACTS_SHOWN)
  const sections = legalHubSections()

  return (
    // `ss03` is Inter's round commas and quotes, as on the landing: the comma in a figure, in a heading and
    // under every „ș" and „ț". Already in the font the page downloads.
    <div ref={rootRef} className="relative w-full overflow-x-clip bg-background [font-feature-settings:'ss03']" data-dev-marker={PROTOTYPE_MARKER}>
      <RevealStyles />
      <SmearFilters />

      <section className="relative border-b">
        <TwoLayerLattice idPrefix="legal-hub-simple" />
        <RuledFrame marker="hero" className="py-12 sm:py-16 lg:py-20">
          <CornerTicks />
          <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-12 lg:gap-8">
            <div className="min-w-0 lg:col-span-7">
              {/* Where the reader is, and the way back to the site's main page. Words, so plain text. */}
              <nav aria-label={t`Ești aici`} className="flex items-center gap-2 text-sm text-muted-foreground">
                <Link to="/" className="group -my-3 inline-flex items-center gap-1.5 py-3 font-medium transition-colors hover:text-foreground">
                  <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-0.5 motion-reduce:transition-none" aria-hidden="true" />
                  <Trans>Acasă</Trans>
                </Link>
                <span aria-hidden="true">/</span>
                <span aria-current="page">
                  <Trans>Legislație</Trans>
                </span>
              </nav>
              {/* The landing's headline: extra-bold and tightly tracked; the tracking closes the gaps between
                  words too, so they are given back, and the lines sit far enough apart for the circumflex of
                  „â" to clear the comma of „ț" above it. */}
              <h1 className="mt-6 text-[2.75rem] font-extrabold leading-[0.96] tracking-[-0.04em] text-foreground [word-spacing:0.06em] sm:text-6xl lg:text-7xl">
                <Trans>
                  Legislația
                  <br />
                  României
                </Trans>
              </h1>
              {/* The site's tracking is set for 14px text: at 20px under a tight headline it reads loose. */}
              <p className="mt-5 max-w-[46ch] text-balance text-lg leading-relaxed tracking-normal text-muted-foreground sm:text-xl">
                <Trans>Legi, ordonanțe și hotărâri din Portalul Legislativ: textul lor, cine le emite și cum se schimbă.</Trans>
              </p>
              <div className="mt-6 sm:mt-7">
                <HubSearch examples={false} />
              </div>
              {/* The landing's shortcut row: the label is a sentence that runs into the links, so it is set in
                  their voice and shares their baseline; on a phone it has its own line and each shortcut is a
                  44px row. Four short names, so a phone keeps them on one line. */}
              <nav aria-label={t`Scurtături`} className="mt-4 flex flex-wrap items-baseline gap-x-4 sm:gap-x-5 sm:gap-y-1.5">
                <span className="basis-full text-sm text-muted-foreground sm:basis-auto">
                  <Trans>Sau mergi direct la</Trans>
                </span>
                <Link to="/legislation/acts" search={{ status: 'toate' }} preload="intent" className={SHORTCUT_LINK_CLASS}>
                  <Trans>Acte</Trans>
                </Link>
                <Link to="/legislation/analytics" preload="intent" className={SHORTCUT_LINK_CLASS}>
                  <Trans>Analiză</Trans>
                </Link>
                <Link to="/legislation/changes" preload="intent" className={SHORTCUT_LINK_CLASS}>
                  <Trans>Modificări</Trans>
                </Link>
                <Link to="/legislation/gazette" preload="intent" className={SHORTCUT_LINK_CLASS}>
                  <Trans>Monitorul Oficial</Trans>
                </Link>
              </nav>
            </div>
            <div className="min-w-0 lg:col-span-5">
              <HeadActs ranking={ranking} onRanking={setRanking} />
            </div>
            {/* The sources close the head: under the acts on a phone; from a wide screen, at the head's foot. */}
            <div className="min-w-0 lg:absolute lg:inset-x-8 lg:bottom-6">
              <HeadSources />
            </div>
          </div>
          {/* The crux on the head's bottom rule, where the pinned bar begins. */}
          <span className="absolute inset-x-0 top-full z-30 mt-px" aria-hidden="true">
            <CruxMarks />
          </span>
        </RuledFrame>
      </section>

      <SectionBar title={t`Legislația României`} sections={sections} />

      <section className="border-b bg-muted/20" aria-label={t`Cifre-cheie`}>
        <RuledFrame>
          <FiguresBand />
        </RuledFrame>
      </section>

      <ChangesBand sections={sections} />
      <FelulBand sections={sections} />
      <IssuersBand sections={sections} />
      <YearsBand sections={sections} />
      <LinksBand sections={sections} />
      <GazetteBand sections={sections} />

      <section aria-labelledby="legal-hub-start-title" className="border-b">
        <RuledFrame className="py-14 sm:py-20">
          <HubSectionHead titleId="legal-hub-start-title" index={t`Începe de aici`} title={<Trans>De aici poți începe</Trans>} />
          <div className="mt-8" data-reveal>
            <StartCards />
          </div>
        </RuledFrame>
      </section>

      <section aria-labelledby="legal-hub-reading-title" className="border-b">
        <RuledFrame className="py-10">
          <h2 id="legal-hub-reading-title" className="text-sm font-semibold text-foreground">
            <Trans>Cum citim felul actului</Trans>
          </h2>
          <p className="mt-2 max-w-[80ch] text-sm leading-relaxed text-muted-foreground">{READING_SENTENCE}</p>
          <Link to="/legislation/guide" className="mt-2 inline-flex min-h-11 items-center text-sm font-medium text-foreground underline-offset-4 hover:underline sm:min-h-9">
            <Trans>Ghidul legislației: cum citești corect aceste date</Trans> →
          </Link>
        </RuledFrame>
      </section>

      <SourcesLine />
    </div>
  )
}

// ───────────────────────────────────────────────────── the pinned bar ──

/**
 * The page's pinned bar with the way home at its start: the hubs' bar (`HomeSectionNav`), which is shared and
 * left as it is, drawn here with „Acasă" before the page's name. On a phone the link is its icon alone.
 */
function SectionBar({ title, sections }: { readonly title: string; readonly sections: readonly HomeSection[] }) {
  return (
    <nav aria-label={t`Secțiunile paginii`} className="sticky top-0 z-20 border-b bg-background/90 backdrop-blur">
      <RuledFrame className="flex items-center gap-4 overflow-x-auto py-0 sm:gap-5">
        <Link
          to="/"
          aria-label={t`Pagina principală`}
          className="inline-flex min-h-11 shrink-0 items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <Home className="size-4" aria-hidden="true" />
          <span className="hidden sm:inline" aria-hidden="true">
            <Trans>Acasă</Trans>
          </span>
        </Link>
        <span className="hidden h-4 w-px shrink-0 bg-border md:block" aria-hidden="true" />
        <span className="hidden min-w-0 truncate py-3 text-sm font-semibold text-foreground md:block md:max-w-72">{title}</span>
        <ol className="flex shrink-0 gap-4 sm:gap-5 md:ml-auto">
          {sections.map((section, position) => (
            <li key={section.id}>
              <a href={`#${section.id}`} className="inline-flex min-h-11 items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
                <MonoLabel className="text-primary" aria-hidden="true">
                  {String(position + 1).padStart(2, '0')}
                </MonoLabel>
                {section.label}
              </a>
            </li>
          ))}
        </ol>
      </RuledFrame>
    </nav>
  )
}

// ───────────────────────────────────────────────────── the head ──

/**
 * The acts most amended, or most cited, as a short list beside the search: the landing's institutions panel's
 * form. The two rankings are the card's header; the figure's column is named once, beside them, with what it
 * counts behind the marker. A row is an act in one line and its issuer under it.
 */
function HeadActs({ ranking, onRanking }: { readonly ranking: LeadersRanking; readonly onRanking: (key: LeadersRanking) => void }) {
  const cited = ranking === 'citate'
  const acts = useLegalAnalytics('acts', { order: cited ? 'cited' : 'amended', limit: HEAD_ACTS_SHOWN })
  const rows = acts.data?.data.rows ?? []
  // The full name from `sm`; on a phone „Cele mai" is said once, before the two, so they fit beside the marker.
  const options: readonly { readonly key: LeadersRanking; readonly label: string; readonly short: string }[] = [
    { key: 'modificate', label: t`Cele mai modificate`, short: t`modificate` },
    { key: 'citate', label: t`Cele mai citate`, short: t`citate` },
  ]
  return (
    <section className="overflow-hidden rounded-lg border border-input bg-card" aria-labelledby="legal-hub-acts-title">
      <h2 id="legal-hub-acts-title" className="sr-only">
        <Trans>Actele din frunte</Trans>
      </h2>
      <div className="flex items-center justify-between gap-3 border-b bg-muted/40 pl-4 pr-2 sm:pr-3">
        <div role="group" aria-label={t`Clasamentul după`} className="flex items-center gap-3 sm:gap-4">
          <span className="text-sm text-muted-foreground sm:hidden" aria-hidden="true">
            <Trans>Cele mai</Trans>
          </span>
          {options.map((option) => {
            const chosen = option.key === ranking
            return (
              <button
                key={option.key}
                type="button"
                aria-pressed={chosen}
                aria-label={option.label}
                onClick={() => onRanking(option.key)}
                className={cn(
                  'relative inline-flex min-h-11 items-center whitespace-nowrap text-sm transition-colors hover:text-foreground',
                  chosen ? 'font-semibold text-foreground' : 'text-muted-foreground',
                )}
              >
                <span className="sm:hidden">{option.short}</span>
                <span className="hidden sm:inline">{option.label}</span>
                {chosen ? <span className="absolute inset-x-0 bottom-0 h-0.5 bg-primary" aria-hidden="true" /> : null}
              </button>
            )
          })}
        </div>
        <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
          <span className="hidden sm:inline">{cited ? <Trans>Citări</Trans> : <Trans>Modificări</Trans>}</span>
          <HubInfoNote label={t`Despre clasament`}>
            <p>
              {cited ? (
                <Trans>De câte ori actul e citat de alte acte din corpus.</Trans>
              ) : (
                <Trans>De câte ori actul e numit ca țintă în titlul unui act care îl modifică.</Trans>
              )}
            </p>
          </HubInfoNote>
        </span>
      </div>
      {acts.error ? (
        <div className="px-4 py-3">
          <BandNote error={acts.error} onRetry={() => void acts.refetch()} />
        </div>
      ) : acts.data ? (
        // The previous ranking stays while the next one loads, dimmed: its figures are not the new header's.
        <ol className={cn('transition-opacity', acts.isPlaceholderData && 'opacity-40')} aria-busy={acts.isPlaceholderData} data-testid="legal-hub-head-acts">
          {rows.map((row) => {
            const act = actName(row)
            const under = [act.citation, row.issuer].filter((part): part is string => part !== null && part !== '').join(' · ')
            return (
              <li key={row.actId}>
                <Link
                  to="/legislation/acts/$actId"
                  params={{ actId: row.actId }}
                  className="group flex items-baseline justify-between gap-3 px-4 py-2.5 transition-colors hover:bg-muted/50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-card-foreground group-hover:underline">{act.name}</span>
                    {/* The line is kept under an act with nothing to say there, so the rows share one height. */}
                    <span className={cn('block truncate', META_CLASS)}>{under === '' ? ' ' : under}</span>
                  </span>
                  <span className="shrink-0 text-sm font-semibold tabular-nums text-card-foreground">{fmt(cited ? row.cited : row.amended)}</span>
                </Link>
              </li>
            )
          })}
        </ol>
      ) : (
        <ol aria-hidden="true">
          {Array.from({ length: HEAD_ACTS_SHOWN }, (_, index) => (
            <li key={index} className="flex items-baseline justify-between gap-3 px-4 py-2.5">
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">
                  <PendingBar className="w-1/2" />
                </span>
                <span className={cn('block', META_CLASS)}>
                  <PendingBar className="w-1/3" />
                </span>
              </span>
              <span className="text-sm font-semibold">
                <PendingBar className="w-10" />
              </span>
            </li>
          ))}
        </ol>
      )}
      <Link
        to="/legislation/analytics"
        search={analysisSearch({ ordine: cited ? 'citari' : 'modificari' })}
        hash="acte"
        className="group flex items-center justify-between gap-3 border-t bg-muted/40 px-4 py-2.5 text-sm font-medium text-card-foreground transition-colors hover:bg-muted focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      >
        <span className="group-hover:underline">{cited ? <Trans>Toate actele, după citări</Trans> : <Trans>Toate actele, după modificări</Trans>}</span>
        <ArrowRight aria-hidden="true" className="size-4 text-muted-foreground" />
      </Link>
    </section>
  )
}

/**
 * The sources in a line at the head's foot, with the two dates a reader needs: how far the data goes, and when
 * the analysis was made. The corpus's own date and the layer are in the page's last line.
 */
function HeadSources() {
  const { i18n } = useLingui()
  const { measuredAt } = useLegislationFrontier('corpus')
  const layer = useLegalAnalytics('head', {}).data?.layer
  const day = (value: string) => formatLegalDate(value, i18n.locale)
  const link = 'whitespace-nowrap font-medium text-foreground underline-offset-4 hover:underline'
  return (
    <p className="text-sm text-muted-foreground" data-testid="legal-hub-freshness">
      <Trans>
        Surse:{' '}
        <a href={PORTAL_URL} target="_blank" rel="noreferrer" className={link}>
          Portalul Legislativ<span aria-hidden="true"> ↗</span>
          <span className="sr-only"> (se deschide într-o filă nouă)</span>
        </a>{' '}
        și{' '}
        <a href={GAZETTE_URL} target="_blank" rel="noreferrer" className={link}>
          Monitorul Oficial<span aria-hidden="true"> ↗</span>
          <span className="sr-only"> (se deschide într-o filă nouă)</span>
        </a>
      </Trans>
      {measuredAt ? (
        <>
          {' · '}
          <Trans>date până la {day(measuredAt)}</Trans>
        </>
      ) : null}
      {layer ? (
        <>
          {' · '}
          <Trans>analiză din {day(layer.publishedAt)}</Trans>
        </>
      ) : null}
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
 * theirs: the figure, its short label, and one plain line saying what it is of. Each leads to the page that
 * breaks it down, and each comes from its own read: a figure whose read failed shows a dash and says so, never
 * a zero.
 *
 * No status figure: the Portal's „în vigoare" / „abrogat" marks are mostly undated badges (I-27, I-28, I-29), so
 * status never feeds a headline figure (design doc §4). The acts that set rules are the analysis's stock: firm
 * placements, one per base act, status not applied, so never said as „in force" or „today".
 */
function FiguresBand() {
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
        <Link to="/legislation/acts" search={{ status: 'toate' }} className={className}>
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
            {pct(s.withText / Math.max(1, s.total))} din {fmt(s.total)} acte
          </Trans>
        ) : undefined,
        summary,
      ),
      link: (label, className) => (
        <Link to="/legislation/acts" search={{ status: 'toate' }} className={className}>
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
            {pct(s.withVersions / Math.max(1, s.total))} din {fmt(s.total)} acte; listate de Portal, neoficiale
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
            <MonoLabel className="block leading-relaxed text-foreground">{fact.link(fact.label, FACT_LINK_CLASS)}</MonoLabel>
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
            {fact.value === undefined ? <PendingBar className="w-28" /> : fact.value === null ? '—' : <CountUpValue value={fact.value} digits={0} locale="ro" />}
          </dd>
        </div>
      ))}
    </dl>
  )
}
