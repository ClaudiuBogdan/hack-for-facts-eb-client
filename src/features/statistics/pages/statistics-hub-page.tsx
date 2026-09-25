import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { Trans, useLingui } from '@lingui/react/macro'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { RevealStyles, useRevealOnView } from '@/components/landing-skin/reveal'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { SmearFilters, countUpWithin, stopCounting } from '@/features/landing/components/count-up'
import { CornerTicks, CruxMarks, TwoLayerLattice } from '@/features/landing/components/hero-chrome'
import { cn } from '@/lib/utils'
import type { StatisticsHubData, StatisticsHubIndicatorKey, StatisticsHubSearch } from '@/schemas/statistics'
import { HubTwoLineChart } from '../components/hub/hub-charts'
import { HUB_BESIDE_TITLE_CLASS, HUB_SHORTCUT_LINK_CLASS, HubLoadError, HubPending, HubSectionHead } from '../components/hub/hub-chrome'
import { HubCountyBand } from '../components/hub/hub-county-band'
import { IndicatorToggle } from '@/components/landing-skin/indicator-toggle'
import { useWarmRouteCode } from '@/hooks/use-warm-route-code'
import { HubDatasetSearch } from '../components/hub/hub-dataset-search'
import { buildHubFacts, indicatorByCode } from '../components/hub/hub-facts'
import { HubFigureRows, HubFiguresBand } from '../components/hub/hub-figures'
import { useIndicatorLabel } from '../components/hub/hub-labels'
import { HubThemePanel } from '../components/hub/hub-theme-panel'
import { HubThenNow } from '../components/hub/hub-then-now'
import { UatMapSection } from '../components/uat-map/uat-map-section'
import { useStatisticsHub } from '../hooks/use-statistics-hub'
import { deathsExceedBirthsSince } from '../lib/hub-indicators'
import { HUB_COUNTY_LAYERS, HUB_FIGURE_CODES } from '../lib/landing-constants'

/**
 * `/ins` — the statistics hub, in the landing's visual language, one
 * band per idea (the composition chosen on 2026-09-16, see
 * `docs/design/statistics/design.md` §6 and §6n).
 *
 * Search first, in a hero that names the source, with the eight domains
 * beside it. Then the four figures a reader comes for — inflation, net
 * earnings, unemployment, population — counting up. Then one numbered band
 * per module: the national series with their sparklines, the counties (map
 * beside list, shared highlight, one indicator at a time, the choice in the
 * URL), every locality on a map of its own (loaded as the reader nears it),
 * 35 years of births and deaths, three ready analyses. A band says
 * what its numbers are and nothing about the database behind them.
 *
 * Every section reads independently and fails independently: a failed one
 * says so and offers the retry, never a blank.
 */

type StatisticsHubPageProps = {
  readonly search: StatisticsHubSearch
  readonly initialHub?: StatisticsHubData
}

const DEFAULT_INDICATOR: StatisticsHubIndicatorKey = 'viata'

function startArrivalEffects(block: Element, delay: number) {
  countUpWithin(block, delay)
}

/** A read that answered with no figure for a band: quiet, with no retry to offer. */
function HubEmpty({ children }: { readonly children: ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>
}

export function StatisticsHubPage({ search, initialHub }: StatisticsHubPageProps) {
  // Most of this page's links open a series: have its code before the tap.
  useWarmRouteCode('/ins/seturi/$cod')
  const { i18n } = useLingui()
  const navigate = useNavigate()
  const rootRef = useRef<HTMLDivElement>(null)
  // The count-up driver is module state; an unmount mid-flight would leave it
  // ticking against nodes that are no longer in the document.
  useEffect(() => () => stopCounting(), [])
  const query = useStatisticsHub(initialHub)
  // A partial server read is shown as a placeholder while the browser reads
  // again: the gaps it has are pending, not failed, until that read lands.
  // Should that read fail, the figures the server did render stay, with the
  // sections it could not read as the retries they are.
  const hub = query.data ?? (query.isError && initialHub?.nativeContract === 'hub-v1' ? initialHub : undefined)
  // A client-side navigation mounts on skeletons; the figures' blocks arrive
  // with the read, and are armed — and counted up — then.
  useRevealOnView(rootRef, startArrivalEffects, hub !== undefined)
  const pending = query.isPending || (query.isPlaceholderData && (query.isFetching || query.isPaused))
  const retry = () => void query.refetch()
  const labelOf = useIndicatorLabel()
  const [activeSeries, setActiveSeries] = useState<string | undefined>(undefined)

  const indicatorKey = search.indicator ?? DEFAULT_INDICATOR
  const layerDefinition = HUB_COUNTY_LAYERS.find((layer) => layer.key === indicatorKey) ?? HUB_COUNTY_LAYERS[0]
  const layer = hub?.counties?.find((entry) => entry.code === layerDefinition.code)
  const setIndicator = (key: StatisticsHubIndicatorKey) => {
    void navigate({
      to: '/ins',
      // The localities' map keeps its own params.
      search: (previous) => ({ ...previous, indicator: key === DEFAULT_INDICATOR ? undefined : key }),
      replace: true,
      resetScroll: false,
    })
  }

  const lifeExpectancy = indicatorByCode(hub, 'POP217A')
  const employees = indicatorByCode(hub, 'FOM104D')
  const dwellings = indicatorByCode(hub, 'LOC101B')
  const births = indicatorByCode(hub, 'POP201D')
  const deaths = indicatorByCode(hub, 'POP206D')
  const figureRows = HUB_FIGURE_CODES.flatMap((code) => {
    const indicator = indicatorByCode(hub, code)
    return indicator ? [indicator] : []
  })
  const since = lifeExpectancy?.series[0]?.period ?? '1990'
  const naturalDecreaseSince = births && deaths ? deathsExceedBirthsSince(births.series, deaths.series) : null
  const changeRows = [births, deaths, lifeExpectancy, employees, dwellings].flatMap((indicator) =>
    indicator && indicator.series.length > 1 ? [{ indicator, label: labelOf(indicator) }] : [],
  )

  const facts = buildHubFacts(hub)
  // The read answered, and answered with nothing: not a failure to retry.
  const answered = !pending && hub?.indicators != null
  // A layer INS no longer publishes was never read; only a read that failed is one to retry.
  const countiesFailed = hub?.failures.includes('counties') ?? true

  return (
    <div ref={rootRef} className="relative w-full overflow-x-clip bg-background">
      <RevealStyles />
      <SmearFilters />

      <section className="relative border-b">
        <TwoLayerLattice idPrefix="statistics-hub" />
        <RuledFrame marker="hero" className="py-12 sm:py-16 lg:py-20">
          <CornerTicks />
          <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-12 lg:gap-8">
            <div className="min-w-0 lg:col-span-7">
              <MonoLabel className="text-muted-foreground">
                <Trans>Statistici / INS</Trans>
              </MonoLabel>
              {/* Two lines at every width: the second is the shorter, so it never
                  leaves a word alone on a third. */}
              <h1 className="mt-5 text-[clamp(2.35rem,8.4vw+0.75rem,2.75rem)] font-extrabold leading-[0.92] tracking-tighter text-foreground sm:text-6xl lg:text-7xl">
                <Trans>
                  Cifrele oficiale
                  <br />
                  ale României
                </Trans>
              </h1>
              <p className="mt-5 max-w-[46ch] text-lg leading-relaxed text-muted-foreground sm:text-xl">
                <Trans>De la Institutul Național de Statistică, pentru țară, județe și fiecare localitate.</Trans>
              </p>
              <div className="mt-6 sm:mt-7">
                <HubDatasetSearch autoFocus />
              </div>
              <nav aria-label={t`Scurtături`} className="mt-4">
                <MonoLabel className="block text-muted-foreground/70 sm:inline sm:align-middle">
                  <Trans>Sau mergi direct la</Trans>
                </MonoLabel>
                <span className="flex flex-wrap gap-x-4 sm:ml-4 sm:inline-flex sm:gap-y-1.5 sm:align-middle">
                  <Link to="/ins/seturi" preload="intent" className={HUB_SHORTCUT_LINK_CLASS}>
                    <Trans>Toate seturile de date</Trans>
                  </Link>
                  <Link to="/ins/comparatii" preload="intent" className={HUB_SHORTCUT_LINK_CLASS}>
                    <Trans>Compară teritorii</Trans>
                  </Link>
                </span>
              </nav>
            </div>
            <div className="min-w-0 lg:col-span-5">
              {/* The domains are the catalog's own map: the way in for a reader
                  who does not yet know what to search for. */}
              <div className="border bg-card/80 p-5 backdrop-blur-[2px] sm:p-6">
                <MonoLabel className="text-primary">
                  <Trans>Pe domenii</Trans>
                </MonoLabel>
                <HubThemePanel className="mt-3" />
              </div>
            </div>
          </div>
        </RuledFrame>
      </section>

      <section className="border-b bg-muted/20" aria-label={t`Cifre-cheie`}>
        <RuledFrame>
          <CruxMarks />
          {facts.length > 0 ? (
            <HubFiguresBand facts={facts} locale={i18n.locale === 'en' ? 'en' : 'ro'} />
          ) : (
            <div className="px-5 py-7">
              {pending ? (
                <HubPending rows={2} />
              ) : answered ? (
                <HubEmpty>
                  <Trans>INS nu a publicat încă aceste cifre.</Trans>
                </HubEmpty>
              ) : (
                <HubLoadError onRetry={retry} />
              )}
            </div>
          )}
        </RuledFrame>
      </section>

      <section className="border-b" aria-labelledby="hub-national-title">
        <RuledFrame className="py-14 sm:py-20">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <HubSectionHead
                titleId="hub-national-title"
                index={t`01 / Indicatori naționali`}
                title={
                  <Trans>
                    România,
                    <br />
                    an de an
                  </Trans>
                }
              />
            </div>
            <div className="lg:col-span-6 lg:col-start-7" data-reveal>
              {figureRows.length > 0 ? (
                <HubFigureRows indicators={figureRows} />
              ) : pending ? (
                <HubPending rows={6} />
              ) : answered ? (
                <HubEmpty>
                  <Trans>INS nu a publicat încă aceste serii.</Trans>
                </HubEmpty>
              ) : (
                <HubLoadError onRetry={retry} />
              )}
            </div>
          </div>
        </RuledFrame>
      </section>

      <section className="border-b" aria-labelledby="hub-counties-title">
        <RuledFrame className="py-14 sm:py-20">
          <HubSectionHead
            titleId="hub-counties-title"
            index={t`02 / Pe județe`}
            title={<Trans>Unde se situează județul tău</Trans>}
            aside={
              <IndicatorToggle
                label={t`Indicatorul de pe harta județelor`}
                options={HUB_COUNTY_LAYERS.map((entry) => ({ key: entry.key, label: i18n._(entry.label) }))}
                value={layerDefinition.key}
                onChange={setIndicator}
                // Six indicators on a phone: two rows of three.
                className="grid-flow-row grid-cols-3"
              />
            }
          />
          {layer && layer.values.length > 0 ? (
            // A new indicator is a new band: what was held or hovered belongs to the last one.
            <HubCountyBand key={layer.code} layer={layer} definition={layerDefinition} />
          ) : (
            <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-8">
              <div className="lg:col-span-7" data-reveal>
                {layer?.period ? (
                  <HubEmpty>
                    <Trans>INS nu a publicat încă valorile pe județe pentru {layer.period}.</Trans>
                  </HubEmpty>
                ) : pending ? (
                  <div className="aspect-[640/454] w-full animate-pulse rounded-sm bg-muted/60" aria-hidden="true" />
                ) : answered && !countiesFailed ? (
                  <HubEmpty>
                    <Trans>INS nu a publicat încă valorile pe județe ale acestui indicator.</Trans>
                  </HubEmpty>
                ) : (
                  <HubLoadError onRetry={retry} />
                )}
              </div>
              <div className="lg:col-span-5 lg:col-start-8" data-reveal>
                {pending && !layer ? <HubPending rows={10} /> : null}
              </div>
            </div>
          )}
        </RuledFrame>
      </section>

      <UatMapSection />

      <section className="border-b" aria-labelledby="hub-change-title">
        <RuledFrame className="py-14 sm:py-20">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <HubSectionHead
                titleId="hub-change-title"
                index={t`04 / Din ${since} până azi`}
                title={
                  <Trans>
                    Ce s-a schimbat
                    <br />
                    din {since} încoace
                  </Trans>
                }
                lede={
                  naturalDecreaseSince ? (
                    <Trans>Din {naturalDecreaseSince}, în fiecare an au murit mai mulți oameni decât s-au născut.</Trans>
                  ) : null
                }
              />
              <div className="mt-8" data-reveal>
                {changeRows.length > 0 ? (
                  <HubThenNow rows={changeRows} since={since} onActiveChange={setActiveSeries} />
                ) : pending ? (
                  <HubPending rows={5} />
                ) : null}
              </div>
            </div>
            <div className={cn('lg:col-span-6 lg:col-start-7', HUB_BESIDE_TITLE_CLASS)} data-reveal>
              {births && deaths && births.series.length > 1 && deaths.series.length > 1 ? (
                <>
                  <MonoLabel className="block text-muted-foreground">
                    <Trans>Născuți vii și decedați, pe an</Trans>
                  </MonoLabel>
                  <div className="mt-3">
                    <HubTwoLineChart
                      a={{ label: labelOf(births), points: births.series }}
                      b={{ label: labelOf(deaths), points: deaths.series }}
                      gap={{
                        label: t`Spor natural`,
                        aAbove: t`Nașteri peste decese`,
                        bAbove: t`Decese peste nașteri`,
                      }}
                      highlight={activeSeries === births.code ? 'a' : activeSeries === deaths.code ? 'b' : undefined}
                    />
                  </div>
                </>
              ) : pending ? (
                <HubPending rows={6} />
              ) : answered ? null : (
                <HubLoadError onRetry={retry} />
              )}
            </div>
          </div>
        </RuledFrame>
      </section>

      <section aria-labelledby="hub-analyses-title">
        <RuledFrame className="py-14 sm:py-20">
          <HubSectionHead titleId="hub-analyses-title" index={t`05 / Analize`} title={<Trans>De aici poți începe</Trans>} />
          <div className="mt-8" data-reveal>
            <ul className="grid gap-px border bg-border/70 sm:grid-cols-3">
              <li>
                <Link
                  to="/ins/comparatii"
                  // Dataset and territories only, as the page's own presets: a
                  // cadence alone is an explicit selection with its other
                  // coordinates missing, and the page waits for them.
                  search={{ cod: 'POP107D', teritorii: ['cod:TR', 'cod:BR', 'cod:TL', 'cod:OT', 'cod:HD'] }}
                  className="block h-full bg-background p-5 transition-colors hover:bg-muted/40"
                >
                  <span className="block text-base font-semibold tracking-tight text-foreground">
                    <Trans>Județele care pierd populație</Trans>
                  </span>
                  <span className="mt-1.5 block text-sm leading-relaxed text-muted-foreground">
                    <Trans>Teleorman, Brăila, Tulcea, Olt și Hunedoara, an de an.</Trans>
                  </span>
                </Link>
              </li>
              <li>
                <Link
                  to="/ins/seturi/$cod"
                  params={{ cod: 'SOM103B' }}
                  search={{ teritoriu: 'cod:RO', frecventa: 'MONTHLY' }}
                  className="block h-full bg-background p-5 transition-colors hover:bg-muted/40"
                >
                  <span className="block text-base font-semibold tracking-tight text-foreground">
                    <Trans>Șomajul, lună de lună</Trans>
                  </span>
                  <span className="mt-1.5 block text-sm leading-relaxed text-muted-foreground">
                    <Trans>Rata șomajului înregistrat din 1992 până azi, pentru țară și pentru fiecare județ.</Trans>
                  </span>
                </Link>
              </li>
              <li>
                <Link
                  to="/ins/seturi/$cod"
                  params={{ cod: 'TUR104E' }}
                  search={{ teritoriu: 'cod:RO', frecventa: 'ANNUAL', din: 2018, pana: 2025 }}
                  className="block h-full bg-background p-5 transition-colors hover:bg-muted/40"
                >
                  <span className="block text-base font-semibold tracking-tight text-foreground">
                    <Trans>Turismul înainte și după pandemie</Trans>
                  </span>
                  <span className="mt-1.5 block text-sm leading-relaxed text-muted-foreground">
                    <Trans>Sosirile în structurile de cazare, 2018–2025, pentru țară sau pentru o localitate.</Trans>
                  </span>
                </Link>
              </li>
            </ul>
          </div>
        </RuledFrame>
      </section>
    </div>
  )
}
