import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { useLingui } from '@lingui/react'
import { plural, t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { Search } from 'lucide-react'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { RevealStyles, useRevealOnView } from '@/components/landing-skin/reveal'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CountUpValue, SmearFilters, countUpWithin, stopCounting } from '@/features/landing/components/count-up'
import { CornerTicks, CruxMarks, TwoLayerLattice } from '@/features/landing/components/hero-chrome'
import { useLegislationFreshness, useLegislationStatusCounts } from '@/features/legal/hooks/use-legislation'
import { useLegislationFrontier } from '@/features/legal/hooks/use-legislation-frontier'
import { useLegalAnalytics } from '@/features/legal/hooks/use-legislation-analytics'
import { fmt, pct } from '@/features/legal/lib/analytics-format'
import { READING_SENTENCE } from '@/features/legal/lib/analytics-notes-text'
import { formatLegalDate } from '@/features/legal/lib/legal-format'
import { HomeSectionNav } from '@/features/procurement/components/home/home-section-nav'
import { HUB_SHORTCUT_LINK_CLASS, HubSectionHead } from '@/features/statistics/components/hub/hub-chrome'
import { cn } from '@/lib/utils'
import { ChangesBand, FelulBand, GazetteBand, IssuersBand, LegalLeaders, LinksBand, YearsBand, legalHubSections, type LeadersRanking } from './landing.bands'
import { GAZETTE_URL, ISSUERS_SHOWN, LEADERS_SHOWN, PORTAL_URL, PROTOTYPE_MARKER, SEARCH_EXAMPLES, analysisSearch, linkCounts } from './landing.lib'
import { PendingBar } from './landing.parts'

/**
 * `/legislation` without tabs — the landing as a hub, in the companies hub's composition: the search in a
 * head, with the four figures a reader comes for under it, the leading acts beside it and the data's dates at
 * its foot; the pinned bar of the page's bands; one numbered band per question (each a sentence with its
 * figure, a compact chart or list and the link to the page that holds the rest); six places to start; the
 * reading note and the sources. The companies hub keeps its figures in a band under the pinned bar: here they
 * stand in the head, in the room the leaders' card leaves beside it, so the first screen holds them.
 *
 * Every figure is read in the browser from the live API through the feature's hooks; nothing waits for it:
 * the head, the bar and each band's title render on the server, a band keeps a skeleton its own size and a
 * read that fails says so in one line. The Tip lens is left out on purpose (LEG-PDYY).
 */

const DEFAULT_RANKING: LeadersRanking = 'modificate'

/** The Government's lineage, as the layer names it: the card's filter and its count are the same lineage. */
const GOVERNMENT = 'Guvernul'

function startArrivalEffects(block: Element, delay: number) {
  countUpWithin(block, delay)
}

export function LandingHub() {
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

  useOneLayer(ranking)
  const sections = legalHubSections()

  return (
    <div ref={rootRef} className="relative w-full overflow-x-clip bg-background" data-dev-marker={PROTOTYPE_MARKER}>
      <RevealStyles />
      <SmearFilters />

      <section className="relative border-b">
        <TwoLayerLattice idPrefix="legal-hub" />
        <RuledFrame marker="hero" className="py-12 sm:py-16 lg:py-20">
          <CornerTicks />
          <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-12 lg:gap-8">
            <div className="min-w-0 lg:col-span-7">
              <MonoLabel className="text-muted-foreground">
                <Trans>Legislație / România</Trans>
              </MonoLabel>
              <h1 className="mt-5 text-[clamp(2.35rem,8.4vw+0.75rem,2.75rem)] font-extrabold leading-[0.92] tracking-tighter text-foreground sm:text-6xl lg:text-7xl">
                <Trans>
                  Legislația
                  <br />
                  României
                </Trans>
              </h1>
              <p className="mt-5 max-w-[46ch] text-lg leading-relaxed text-muted-foreground sm:text-xl">
                <Trans>Legile, ordonanțele, hotărârile și deciziile din Portalul Legislativ: textul lor, cine le emite, cum se schimbă și cum se leagă.</Trans>
              </p>
              <div className="mt-6 sm:mt-7">
                <HubSearch />
              </div>
              <nav aria-label={t`Scurtături`} className="mt-5">
                <MonoLabel className="block text-muted-foreground/70 sm:inline sm:align-middle">
                  <Trans>Sau mergi direct la</Trans>
                </MonoLabel>
                <span className="flex flex-wrap gap-x-4 sm:ml-4 sm:inline-flex sm:gap-y-1.5 sm:align-middle">
                  <Link to="/legislation/acts" search={{ status: 'toate' }} preload="intent" className={HUB_SHORTCUT_LINK_CLASS}>
                    <Trans>Toate actele</Trans>
                  </Link>
                  <Link to="/legislation/analytics" preload="intent" className={HUB_SHORTCUT_LINK_CLASS}>
                    <Trans>Analiză</Trans>
                  </Link>
                  <Link to="/legislation/changes" preload="intent" className={HUB_SHORTCUT_LINK_CLASS}>
                    <Trans>Modificări</Trans>
                  </Link>
                  <Link to="/legislation/gazette" preload="intent" className={HUB_SHORTCUT_LINK_CLASS}>
                    <Trans>Monitorul Oficial</Trans>
                  </Link>
                  <Link to="/legislation/guide" preload="intent" className={HUB_SHORTCUT_LINK_CLASS}>
                    <Trans>Ghid</Trans>
                  </Link>
                </span>
              </nav>
              <section className="mt-8 border bg-card/80 backdrop-blur-[2px]" aria-label={t`Cifre-cheie`}>
                <HubFigures />
              </section>
            </div>
            <div className="min-w-0 lg:col-span-5">
              <LegalLeaders ranking={ranking} onRanking={setRanking} />
            </div>
            {/* The dates close the head: under the leaders on a phone; from a wide screen, at the head's foot, just above its bottom rule. */}
            <div className="min-w-0 lg:absolute lg:inset-x-8 lg:bottom-6">
              <HeadFreshness />
            </div>
          </div>
          {/* The crux on the head's bottom rule, where the pinned bar begins. */}
          <span className="absolute inset-x-0 top-full z-30 mt-px" aria-hidden="true">
            <CruxMarks />
          </span>
        </RuledFrame>
      </section>

      <HomeSectionNav title={t`Legislația României`} sections={sections} />

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
          <MonoLabel id="legal-hub-reading-title" className="block text-primary">
            <Trans>Cum citim felul actului</Trans>
          </MonoLabel>
          <p className="mt-3 max-w-[80ch] text-sm leading-relaxed text-muted-foreground">{READING_SENTENCE}</p>
          <Link to="/legislation/guide" className="mt-2 inline-flex min-h-11 items-center text-sm font-medium text-foreground underline-offset-4 hover:underline sm:min-h-9">
            <Trans>Ghidul legislației: cum citești corect aceste date</Trans> →
          </Link>
        </RuledFrame>
      </section>

      <SourcesLine />
    </div>
  )
}

/**
 * Answers of one page must come from one layer: if two of them differ (a layer was published while the page
 * loaded), every analytics read is made again. The same reads the bands make, by the same keys.
 */
function useOneLayer(ranking: LeadersRanking) {
  const client = useQueryClient()
  const layers = [
    useLegalAnalytics('head', {}).data?.layer.layerId,
    useLegalAnalytics('summary', {}).data?.layer.layerId,
    useLegalAnalytics('acts', { order: ranking === 'citate' ? 'cited' : 'amended', limit: LEADERS_SHOWN }).data?.layer.layerId,
    useLegalAnalytics('breakdown', { lens: 'issuer', limit: ISSUERS_SHOWN + 1 }).data?.layer.layerId,
    useLegalAnalytics('series', { lens: 'felul' }).data?.layer.layerId,
    useLegalAnalytics('links', {}).data?.layer.layerId,
  ]
  const mixed = new Set(layers.filter((layer) => layer !== undefined)).size > 1
  useEffect(() => {
    if (mixed) void client.invalidateQueries({ queryKey: ['legal', 'analytics'] })
  }, [mixed, client])
}

// ───────────────────────────────────────────────────── the head ──

/**
 * The search as the page's main action. It hands the words to the finder (`/legislation/search`), which
 * answers act numbers and act names: the placeholder and the examples show only those shapes. A plain form,
 * so it submits without the page's code too.
 */
function HubSearch() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmed = query.trim()
    if (trimmed.length === 0) return
    void navigate({ to: '/legislation/search', search: { q: trimmed } })
  }
  return (
    <div>
      <form
        role="search"
        action="/legislation/search"
        method="get"
        onSubmit={onSubmit}
        aria-label={t`Caută în legislație`}
        className="flex min-h-12 items-center gap-2 rounded-lg border border-input bg-card pl-3.5 pr-1.5 focus-within:ring-1 focus-within:ring-ring"
      >
        <Search className="pointer-events-none size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <Input
          name="q"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label={t`Caută în legislație`}
          placeholder={t`Legea 227/2015, Codul muncii...`}
          autoComplete="off"
          className="h-11 min-w-0 flex-1 border-0 bg-transparent px-0 text-base shadow-none focus-visible:ring-0 md:text-base"
        />
        <Button type="submit" size="sm" className="h-9 shrink-0 rounded-md px-4 text-sm">
          <Trans>Caută</Trans>
        </Button>
      </form>
      <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-2">
        <MonoLabel className="mr-1 text-muted-foreground/70">
          <Trans>Exemple</Trans>
        </MonoLabel>
        {SEARCH_EXAMPLES.map((example) => (
          <Link
            key={example}
            to="/legislation/search"
            search={{ q: example }}
            className="inline-flex min-h-9 items-center rounded-sm border bg-background px-2.5 text-sm text-foreground transition-colors hover:border-foreground/40 hover:bg-muted/40"
          >
            {example}
          </Link>
        ))}
      </div>
    </div>
  )
}

/** The data's dates at the head's foot: the sources' frontier, then when the analysis was made and on which corpus. */
function HeadFreshness() {
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
          <Trans>
            analiză generată pe {day(layer.publishedAt)}, pe corpusul din {day(layer.releaseBuiltAt)}
          </Trans>
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
  readonly note: ReactNode
  readonly link: (cell: ReactNode, className: string) => ReactNode
}

/**
 * The four figures, each a link to the page that breaks it down and each from its own read: the acts and the
 * stock from the analysis head, the acts in force from the status counts, the acts with listed versions from
 * the summary. A figure whose read failed shows a dash and says so: never a zero. A share names the total it
 * is a share of, from the same answer as its figure.
 */
function HubFigures() {
  const head = useLegalAnalytics('head', {})
  const summary = useLegalAnalytics('summary', {})
  const status = useLegislationStatusCounts()
  const h = head.data?.data
  const s = summary.data?.data
  const counts = status.data
  const pending = <PendingBar className="w-24" />
  const failed = <Trans>Cifra nu s-a încărcat.</Trans>
  const valueOf = (value: number | undefined, query: { readonly isPending: boolean }) => value ?? (query.isPending ? undefined : null)

  const facts: readonly Fact[] = [
    {
      key: 'acts',
      value: valueOf(h?.total, head),
      label: <Trans>Acte publicate</Trans>,
      note: h ? (
        h.years.min !== null && h.years.max !== null ? (
          <Trans>
            În Portalul Legislativ, {h.years.min}–{h.years.max}
          </Trans>
        ) : (
          <Trans>În Portalul Legislativ</Trans>
        )
      ) : head.isPending ? (
        pending
      ) : (
        failed
      ),
      link: (cell, className) => (
        <Link to="/legislation/acts" search={{ status: 'toate' }} className={className}>
          {cell}
        </Link>
      ),
    },
    {
      key: 'in-force',
      value: valueOf(counts?.inVigoare, status),
      label: <Trans>În vigoare</Trans>,
      note:
        counts?.inVigoare !== undefined ? (
          counts.total !== undefined && counts.total > 0 ? (
            <Trans>
              {pct(counts.inVigoare / counts.total)} din {fmt(counts.total)} acte cu statut
            </Trans>
          ) : (
            <Trans>Cu statutul „în vigoare"</Trans>
          )
        ) : status.isPending ? (
          pending
        ) : (
          failed
        ),
      link: (cell, className) => (
        <Link to="/legislation/acts" search={{ status: 'in-vigoare' }} className={className}>
          {cell}
        </Link>
      ),
    },
    {
      key: 'stock',
      value: valueOf(h?.totals.inStock, head),
      label: <Trans>Acte în stoc</Trans>,
      note: h ? <Trans>Stabilesc reguli și stau singure; definiție provizorie, fără statut</Trans> : head.isPending ? pending : failed,
      link: (cell, className) => (
        <Link to="/legislation/analytics" search={analysisSearch({ populatie: 'stoc' })} className={className}>
          {cell}
        </Link>
      ),
    },
    {
      key: 'versions',
      value: valueOf(s?.withVersions, summary),
      label: <Trans>Cu versiuni consolidate</Trans>,
      note: s ? (
        <Trans>
          {pct(s.withVersions / Math.max(1, s.total))} din {fmt(s.total)} acte; listate de Portal, neoficiale
        </Trans>
      ) : summary.isPending ? (
        pending
      ) : (
        failed
      ),
      link: (cell, className) => (
        <Link to="/legislation/analytics" search={analysisSearch({ vedere: 'dinamica' })} className={className}>
          {cell}
        </Link>
      ),
    },
  ]

  // A figure that arrives after its cell did counts up when it lands.
  const listRef = useRef<HTMLUListElement>(null)
  const known = facts.filter((fact) => typeof fact.value === 'number').length
  useEffect(() => {
    if (known > 0 && listRef.current) countUpWithin(listRef.current, 0)
  }, [known])

  return (
    <ul ref={listRef} className="grid grid-cols-2" data-testid="legal-hub-figures">
      {facts.map((fact, index) => (
        <li key={fact.key} className={cn('flex min-w-0', index % 2 === 1 && 'border-l', index >= 2 && 'border-t')}>
          {fact.link(
            <>
              <span className="text-2xl font-semibold tabular-nums tracking-tight text-foreground sm:text-3xl">
                {fact.value === undefined ? <PendingBar className="w-28" /> : fact.value === null ? '—' : <CountUpValue value={fact.value} digits={0} locale="ro" />}
              </span>
              <MonoLabel className="mt-2.5 block leading-relaxed text-foreground">{fact.label}</MonoLabel>
              <MonoLabel className="mt-auto block pt-3 leading-relaxed text-muted-foreground">{fact.note}</MonoLabel>
            </>,
            'flex w-full min-w-0 flex-col px-4 py-5 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:px-5',
          )}
        </li>
      ))}
    </ul>
  )
}

// ───────────────────────────────────────────────────── start cards ──

/**
 * Six places to start: four questions the analysis page answers as they are (each address is written by the
 * page's own writer, so it carries only filters its parser reads), the acts directory and the guide. A card
 * says its size from an answer the page already holds; without the answer it says the question alone.
 */
function StartCards() {
  const head = useLegalAnalytics('head', {}).data?.data
  const links = useLegalAnalytics('links', {}).data?.data
  const ordinances = head?.types.find((row) => row.key === 'ordonanta-urgenta')?.acts
  const government = head?.issuers.find((row) => row.lineage === GOVERNMENT)?.acts
  const amends = links ? linkCounts(links, 'amends').resolved : undefined
  return (
    <ul className="grid gap-px border bg-border/70 sm:grid-cols-2 lg:grid-cols-3" data-testid="legal-hub-start">
      <StartCard
        kicker={t`Analiză`}
        title={<Trans>Ordonanțele de urgență, an de an</Trans>}
        body={
          ordinances !== undefined
            ? plural(ordinances, {
                one: '# ordonanță de urgență, pe anul ei și după ce face.',
                few: '# ordonanțe de urgență, pe anii lor și după ce fac.',
                other: '# de ordonanțe de urgență, pe anii lor și după ce fac.',
              })
            : t`Ordonanțele de urgență, pe anii lor și după ce fac.`
        }
        link={(children, className) => (
          <Link to="/legislation/analytics" search={analysisSearch({ tip: ['ordonanta-urgenta'], forma: 'timp' })} className={className}>
            {children}
          </Link>
        )}
      />
      <StartCard
        kicker={t`Analiză`}
        title={<Trans>Stocul, după felul actului</Trans>}
        body={
          head
            ? plural(head.totals.inStock, {
                one: '# act care stabilește reguli și stă singur, pe feluri.',
                few: '# acte care stabilesc reguli și stau singure, pe feluri.',
                other: '# de acte care stabilesc reguli și stau singure, pe feluri.',
              })
            : t`Actele care stabilesc reguli și stau singure, pe feluri.`
        }
        link={(children, className) => (
          <Link to="/legislation/analytics" search={analysisSearch({ populatie: 'stoc', fin: true })} className={className}>
            {children}
          </Link>
        )}
      />
      <StartCard
        kicker={t`Analiză`}
        title={<Trans>Actele Guvernului, după fel</Trans>}
        body={
          government !== undefined
            ? plural(government, {
                one: '# act emis de Guvern: ce face.',
                few: '# acte emise de Guvern: ce fac.',
                other: '# de acte emise de Guvern: ce fac.',
              })
            : t`Actele emise de Guvern: ce fac.`
        }
        link={(children, className) => (
          <Link to="/legislation/analytics" search={analysisSearch({ emitent: GOVERNMENT })} className={className}>
            {children}
          </Link>
        )}
      />
      <StartCard
        kicker={t`Analiză`}
        title={<Trans>Cele mai modificate acte</Trans>}
        body={
          amends !== undefined
            ? plural(amends, {
                one: '# modificare citită din titluri, pe actul pe care îl schimbă.',
                few: '# modificări citite din titluri, pe actele pe care le schimbă.',
                other: '# de modificări citite din titluri, pe actele pe care le schimbă.',
              })
            : t`Modificările citite din titluri, pe actele pe care le schimbă.`
        }
        link={(children, className) => (
          <Link to="/legislation/analytics" search={analysisSearch({ ordine: 'modificari' })} hash="acte" className={className}>
            {children}
          </Link>
        )}
      />
      <StartCard
        kicker={t`Director`}
        title={<Trans>Directorul actelor</Trans>}
        body={
          head
            ? plural(head.total, {
                one: '# act, de filtrat după tip, an și statut.',
                few: '# acte, de filtrat după tip, an și statut.',
                other: '# de acte, de filtrat după tip, an și statut.',
              })
            : t`Toate actele, de filtrat după tip, an și statut.`
        }
        link={(children, className) => (
          <Link to="/legislation/acts" search={{ status: 'toate' }} className={className}>
            {children}
          </Link>
        )}
      />
      <StartCard
        kicker={t`Ghid`}
        title={<Trans>Ghidul legislației</Trans>}
        body={t`Cum găsești o lege, cum îi citești statutul și ce nu îți pot spune aceste date.`}
        link={(children, className) => (
          <Link to="/legislation/guide" className={className}>
            {children}
          </Link>
        )}
      />
    </ul>
  )
}

/** One place to start: where it leads, the question, and its size when the page holds it. */
function StartCard({
  kicker,
  title,
  body,
  link,
}: {
  readonly kicker: string
  readonly title: ReactNode
  readonly body: ReactNode
  readonly link: (children: ReactNode, className: string) => ReactNode
}) {
  return (
    <li>
      {link(
        <>
          <MonoLabel className="block text-muted-foreground">{kicker}</MonoLabel>
          <span className="mt-2.5 block text-base font-semibold tracking-tight text-foreground">{title}</span>
          <span className="mt-1.5 block text-sm leading-relaxed text-muted-foreground">{body}</span>
        </>,
        'block h-full bg-background p-5 transition-colors hover:bg-muted/40',
      )}
    </li>
  )
}

// ───────────────────────────────────────────────────── the foot ──

/** The page's full sources line, closing it: each source, its publisher and its dates. */
function SourcesLine() {
  const { i18n } = useLingui()
  const freshness = useLegislationFreshness().data
  const layer = useLegalAnalytics('head', {}).data?.layer
  const day = (value: string) => formatLegalDate(value, i18n.locale)
  const link = 'text-foreground underline underline-offset-4 hover:text-primary'
  return (
    <footer className="border-b bg-muted/20">
      <RuledFrame className="py-6">
        <p className="text-sm leading-relaxed text-muted-foreground">
          <MonoLabel className="mr-3 text-foreground">
            <Trans>Surse</Trans>
          </MonoLabel>
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
                Analiza: stratul {layer.layerId}, generat pe {day(layer.publishedAt)}, pe corpusul din {day(layer.releaseBuiltAt)}
              </Trans>
            </>
          ) : null}
        </p>
      </RuledFrame>
    </footer>
  )
}
