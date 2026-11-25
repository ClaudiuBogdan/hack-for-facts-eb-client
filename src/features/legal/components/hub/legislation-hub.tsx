import { useEffect, useRef, type ReactNode } from 'react'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { useLingui } from '@lingui/react'
import { plural, t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { ArrowLeft, ArrowUpRight } from 'lucide-react'
import { DataStatusBadge } from '@/components/data-trust'
import { RevealStyles, useRevealOnView } from '@/components/landing-skin/reveal'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { SmearFilters, countUpWithin, stopCounting } from '@/features/landing/components/count-up'
import { CornerTicks, CruxMarks, TwoLayerLattice } from '@/features/landing/components/hero-chrome'
import { LEGAL_ANALYTICS_UNAVAILABLE, LegalAnalyticsError, isLegalAnalyticsMock } from '../../api/legal-analytics-api'
import { useLegislationFreshness } from '../../hooks/use-legislation'
import { useLegalAnalytics } from '../../hooks/use-legislation-analytics'
import { formatLegalDate } from '../../lib/legal-format'
import { AnalyticsProblem } from '../analytics/analytics-notes'
import { ChangesBand, FelulBand, GazetteBand, IssuersBand, LinksBand, YearsBand } from './legislation-hub-bands'
import { LegalSectionHead, LegalSectionNav } from './legislation-hub-chrome'
import { HubFiguresBand, HubHeadActs, HubHeadSearch, HubHeadSources } from './legislation-hub-head'
import {
  DEFAULT_HUB_RANKING,
  GAZETTE_URL,
  LEGAL_HUB_SERVER_READS,
  PORTAL_URL,
  analysisSearch,
  hubActsArgs,
  legalHubSections,
  linkCounts,
  type HubRanking,
} from './legislation-hub-lib'

/**
 * `/legislation`, the legislation hub (design: `docs/design/legal/main-page.md`; owner, 25 November 2026: no
 * old hero, no tabs on this page; a hub like the companies one, a summary of the key information with links to
 * the dedicated pages).
 *
 * - The head: the way home, the title, the site's search scoped to legislation with one row of shortcuts, and
 *   the five leading acts in the hubs' leaders' card. Its sources are their names alone.
 * - The pinned bar without running numbers (`LegalSectionNav`), then four figures in their own band.
 * - Six bands, each a summary with the link to the page that holds the rest: what changed, what the acts do,
 *   who issues them, the acts year by year, how they link, what appeared in Monitorul Oficial.
 * - Six places to start, how the Felul reading is to be read, and the full sources line.
 *
 * Type as the site's landing sets it: the headline's tracking, word spacing and leading; the lede's normal
 * tracking; round commas (`ss03`); words in Inter in their own casing, mono capitals only on short labels.
 *
 * The aggregate answers (figures, Felul, issuers, years) arrive rendered by the server
 * (`LEGAL_HUB_SERVER_READS`, the route loader). Whatever names an act (the leading acts, the links, the
 * changes) is read in the browser: the page goes out publicly cached.
 */

/** A shortcut under the search, as the landing sets its own: medium weight, the accent on hover, no underline. */
const SHORTCUT_LINK_CLASS = 'inline-flex min-h-11 items-center text-sm font-medium text-foreground transition-colors hover:text-primary sm:min-h-0'

/** The Government's lineage name, as the layer writes it. */
const GOVERNMENT = 'Guvernul'

function startArrivalEffects(block: Element, delay: number) {
  countUpWithin(block, delay)
}

export function LegislationHub({
  analyticsUnavailable = false,
}: {
  /** The server's analytics read was refused with 503 (no layer published yet): say so until a read succeeds. */
  readonly analyticsUnavailable?: boolean
}) {
  const rootRef = useRef<HTMLDivElement>(null)
  useRevealOnView(rootRef, startArrivalEffects)
  // The count-up driver is module state; an unmount mid-flight would leave it ticking against removed nodes.
  useEffect(() => () => stopCounting(), [])

  const navigate = useNavigate()
  const search = useSearch({ strict: false }) as Record<string, unknown>
  // The ranking lives in the address (`clasament`); any other value is the default ranking.
  const ranking: HubRanking = search['clasament'] === 'citate' ? 'citate' : DEFAULT_HUB_RANKING
  const setRanking = (key: HubRanking) =>
    void navigate({
      to: '.',
      search: (previous: Record<string, unknown>) => ({ ...previous, clasament: key === DEFAULT_HUB_RANKING ? undefined : key }),
      replace: true,
      resetScroll: false,
    })

  useOneLayer(ranking)
  const head = useLegalAnalytics('head', {})
  // Before the first layer is published (or while the server is busy) the API answers 503: a designed state.
  const unavailable = (analyticsUnavailable && !head.data) || (head.error instanceof LegalAnalyticsError && head.error.kind === 'unavailable')
  const sections = legalHubSections()

  return (
    // `ss03` is Inter's round commas and quotes, as on the landing: the comma in a figure, in a heading and
    // under every „ș" and „ț". Already in the font the page downloads.
    <div ref={rootRef} className="relative w-full overflow-x-clip bg-background [font-feature-settings:'ss03']">
      <RevealStyles />
      <SmearFilters />

      <section className="relative border-b">
        <TwoLayerLattice idPrefix="legal-hub" />
        <RuledFrame marker="hero" className="py-12 sm:py-16 lg:py-20">
          <CornerTicks />
          <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-12 lg:gap-8">
            <div className="min-w-0 lg:col-span-7">
              {/* Where the reader is, and the way back to the site's main page. Words, so plain text. */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
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
                {/* Under mock mode every figure and act on the page is a fixture: said at the top (data-trust contract). */}
                {isLegalAnalyticsMock() ? <DataStatusBadge status="mock" /> : null}
              </div>
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
                <HubHeadSearch />
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
              <HubHeadActs ranking={ranking} onRanking={setRanking} />
            </div>
            {/* The sources close the head: under the acts on a phone; from a wide screen, at the head's foot. */}
            <div className="min-w-0 lg:absolute lg:inset-x-8 lg:bottom-6">
              <HubHeadSources />
            </div>
          </div>
          {/* The crux on the head's bottom rule, where the pinned bar begins. */}
          <span className="absolute inset-x-0 top-full z-30 mt-px" aria-hidden="true">
            <CruxMarks />
          </span>
        </RuledFrame>
      </section>

      {/* No running numbers on this page (owner, 25 November 2026), as on the companies hub: each section's title names it. */}
      <LegalSectionNav title={t`Legislația României`} sections={sections} />

      <section className="border-b bg-muted/20" aria-label={t`Cifre-cheie`}>
        <RuledFrame>
          {unavailable ? (
            <div className="py-6">
              <AnalyticsProblem error={LEGAL_ANALYTICS_UNAVAILABLE} />
            </div>
          ) : (
            <HubFiguresBand />
          )}
        </RuledFrame>
      </section>

      <ChangesBand />
      <FelulBand />
      <IssuersBand />
      <YearsBand />
      <LinksBand />
      <GazetteBand />

      <section aria-labelledby="legal-hub-start-title" className="border-b">
        <RuledFrame className="py-14 sm:py-20">
          <LegalSectionHead titleId="legal-hub-start-title" title={<Trans>De aici poți începe</Trans>} />
          <div className="mt-8" data-reveal>
            <StartCards />
          </div>
        </RuledFrame>
      </section>


      <SourcesLine />
    </div>
  )
}

/**
 * Answers of one page must come from one layer: if two of them differ (a layer was published while the page
 * loaded), every analytics read is made again. The same reads the page's parts make, by the same keys.
 */
function useOneLayer(ranking: HubRanking) {
  const client = useQueryClient()
  const layers = [
    useLegalAnalytics(LEGAL_HUB_SERVER_READS[0][0], LEGAL_HUB_SERVER_READS[0][1]).data?.layer.layerId,
    useLegalAnalytics(LEGAL_HUB_SERVER_READS[1][0], LEGAL_HUB_SERVER_READS[1][1]).data?.layer.layerId,
    useLegalAnalytics(LEGAL_HUB_SERVER_READS[2][0], LEGAL_HUB_SERVER_READS[2][1]).data?.layer.layerId,
    useLegalAnalytics(LEGAL_HUB_SERVER_READS[3][0], LEGAL_HUB_SERVER_READS[3][1]).data?.layer.layerId,
    useLegalAnalytics('acts', hubActsArgs(ranking)).data?.layer.layerId,
    useLegalAnalytics('links', {}).data?.layer.layerId,
  ]
  const mixed = new Set(layers.filter((layer) => layer !== undefined)).size > 1
  useEffect(() => {
    if (mixed) void client.invalidateQueries({ queryKey: ['legal', 'analytics'] })
  }, [mixed, client])
}

// ───────────────────────────────────────────────────── start cards ──

/**
 * Six places to start, each its name and its count (owner, 25 November 2026, as the companies hub's): four
 * questions the analysis page answers as they are (each address written by the page's own writer), the acts
 * directory and the guide. A count keeps its unit and its population, from an answer the page already holds;
 * without the answer the card is its name alone.
 */
function StartCards() {
  const head = useLegalAnalytics('head', {}).data?.data
  const links = useLegalAnalytics('links', {})
  // counts only, from a read since mount (the links answer names acts)
  const amends = links.isFetchedAfterMount && links.data ? linkCounts(links.data.data, 'amends').resolved : undefined
  const ordinances = head?.types.find((row) => row.key === 'ordonanta-urgenta')?.acts
  const government = head?.issuers.find((row) => row.lineage === GOVERNMENT)?.acts
  return (
    <ul className="grid gap-px border bg-border/70 sm:grid-cols-2 lg:grid-cols-3" data-testid="legal-hub-start">
      <StartCard
        title={<Trans>Ordonanțele de urgență, an de an</Trans>}
        count={ordinances !== undefined ? plural(ordinances, { one: '# ordonanță de urgență', few: '# ordonanțe de urgență', other: '# de ordonanțe de urgență' }) : null}
        link={(children, className) => (
          <Link to="/legislation/analytics" search={analysisSearch({ tip: ['ordonanta-urgenta'], forma: 'timp' })} className={className}>
            {children}
          </Link>
        )}
      />
      <StartCard
        title={<Trans>Legislația de bază, după felul actului</Trans>}
        // the stock: never without its provisional definition
        count={head ? plural(head.totals.inStock, { one: '# act, definiție provizorie', few: '# acte, definiție provizorie', other: '# de acte, definiție provizorie' }) : null}
        link={(children, className) => (
          <Link to="/legislation/analytics" search={analysisSearch({ populatie: 'stoc', fin: true })} className={className}>
            {children}
          </Link>
        )}
      />
      <StartCard
        title={<Trans>Actele Guvernului, după fel</Trans>}
        count={government !== undefined ? plural(government, { one: '# act publicat', few: '# acte publicate', other: '# de acte publicate' }) : null}
        link={(children, className) => (
          <Link to="/legislation/analytics" search={analysisSearch({ emitent: GOVERNMENT })} className={className}>
            {children}
          </Link>
        )}
      />
      <StartCard
        title={<Trans>Cele mai modificate acte</Trans>}
        count={amends !== undefined ? plural(amends, { one: '# modificare citită din titluri', few: '# modificări citite din titluri', other: '# de modificări citite din titluri' }) : null}
        link={(children, className) => (
          <Link to="/legislation/analytics" search={analysisSearch({ ordine: 'modificari' })} hash="acte" className={className}>
            {children}
          </Link>
        )}
      />
      <StartCard
        title={<Trans>Directorul actelor</Trans>}
        count={head ? plural(head.total, { one: '# act publicat', few: '# acte publicate', other: '# de acte publicate' }) : null}
        link={(children, className) => (
          <Link to="/legislation/acts" search={{ status: 'toate' }} className={className}>
            {children}
          </Link>
        )}
      />
      <StartCard
        title={<Trans>Ghidul legislației</Trans>}
        count={null}
        link={(children, className) => (
          <Link to="/legislation/guide" className={className}>
            {children}
          </Link>
        )}
      />
    </ul>
  )
}

/** One place to start: its name and its count, and the arrow that says it leads on (as the landing's tiles). */
function StartCard({
  title,
  count,
  link,
}: {
  readonly title: ReactNode
  readonly count: ReactNode
  readonly link: (children: ReactNode, className: string) => ReactNode
}) {
  return (
    <li>
      {link(
        <>
          <span className="block pr-6 text-base font-semibold tracking-tight text-foreground">{title}</span>
          {count ? <span className="mt-1.5 block text-sm tabular-nums text-muted-foreground">{count}</span> : null}
          <ArrowUpRight aria-hidden="true" className="absolute right-4 top-5 size-4 text-muted-foreground transition-colors group-hover:text-foreground" />
        </>,
        'group relative block h-full bg-background p-5 transition-colors hover:bg-muted/40',
      )}
    </li>
  )
}

// ───────────────────────────────────────────────────── the foot ──

/** The page's full sources line, closing it: each source, its publisher and its dates, and when the analysis was made. */
function SourcesLine() {
  const { i18n } = useLingui()
  const freshness = useLegislationFreshness().data
  const layer = useLegalAnalytics('head', {}).data?.layer
  const day = (value: string) => formatLegalDate(value, i18n.locale)
  const link = 'text-foreground underline underline-offset-4 hover:text-primary'
  return (
    <footer className="border-b bg-muted/20">
      <RuledFrame className="py-6">
        <p className="text-sm leading-relaxed text-muted-foreground" data-testid="legal-hub-sources">
          <span className="mr-3 font-medium text-foreground">
            <Trans>Surse</Trans>
          </span>
          <Trans>
            <a href={PORTAL_URL} target="_blank" rel="noreferrer" className={link}>
              Portalul Legislativ
            </a>
            , Ministerul Justiției ·{' '}
            <a href={GAZETTE_URL} target="_blank" rel="noreferrer" className={link}>
              Monitorul Oficial
            </a>
            , Regia Autonomă „Monitorul Oficial"
          </Trans>
          {freshness?.latestIssueDate ? (
            <>
              {' · '}
              <Trans>Ultimul număr din date: {day(freshness.latestIssueDate)}</Trans>
            </>
          ) : null}
          {freshness?.latestEffectiveChangeDate ? (
            <>
              {' · '}
              <Trans>Ultima modificare în vigoare: {day(freshness.latestEffectiveChangeDate)}</Trans>
            </>
          ) : null}
          {layer ? (
            <>
              {' · '}
              <Trans>
                Analiza: stratul {layer.layerId}, generat pe {day(layer.builtAt)}, pe corpusul din {day(layer.releaseBuiltAt)}
              </Trans>
            </>
          ) : null}
        </p>
      </RuledFrame>
    </footer>
  )
}
