import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { plural, t } from '@lingui/core/macro'
import { Trans, useLingui } from '@lingui/react/macro'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { RevealStyles, useRevealOnView } from '@/components/landing-skin/reveal'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { SmearFilters, countUpWithin, stopCounting } from '@/features/landing/components/count-up'
import { CornerTicks, CruxMarks, TwoLayerLattice } from '@/features/landing/components/hero-chrome'
import type { StatisticsHubData, StatisticsHubIndicator, StatisticsHubIndicatorKey, StatisticsHubSearch } from '@/schemas/statistics'
import { HubSparkline, HubTwoLineChart } from '../components/hub/hub-charts'
import { HUB_SHORTCUT_LINK_CLASS, HUB_TEXT_LINK_CLASS, HubLoadError, HubPending, HubSectionHead } from '../components/hub/hub-chrome'
import { HubCountyMap } from '../components/hub/hub-county-map'
import { HubCountyRank, HubIndicatorToggle } from '../components/hub/hub-county-rank'
import { HubDatasetSearch } from '../components/hub/hub-dataset-search'
import { HubFigureRows, HubFiguresBand, type HubFact } from '../components/hub/hub-figures'
import { useIndicatorLabel } from '../components/hub/hub-labels'
import { HubPlaceFinder } from '../components/hub/hub-place-finder'
import { HubThemePanel } from '../components/hub/hub-theme-panel'
import { useStatisticsHub } from '../hooks/use-statistics-hub'
import {
  annualInflationRate,
  deathsExceedBirthsSince,
  describeHubChange,
  formatHubPeriod,
  formatHubValue,
  hubUnitWord,
  indicatorDetailSearch,
  sameMonthLastYear,
  sourceDecimals,
} from '../lib/hub-format'
import { HUB_COUNTY_LAYERS, HUB_FIGURE_CODES, HUB_HEADLINE_CODES } from '../lib/landing-constants'
import { describeValueStatus } from '../lib/value-status'

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
 * URL), 35 years of births and deaths, three ready analyses. A band says
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

function indicatorByCode(hub: StatisticsHubData | undefined, code: string): StatisticsHubIndicator | undefined {
  return hub?.indicators?.find((indicator) => indicator.code === code)
}

/** An indicator with a number and a period to show, or nothing — a blocked or absent cell has no figure to put in the band. */
function withFigure(indicator: StatisticsHubIndicator | undefined) {
  return indicator && indicator.value !== null && indicator.period ? { ...indicator, value: indicator.value, period: indicator.period } : null
}

/** The cell's INS flag, spelled out after its period: a provisional or estimated figure says so here as it does in the rows. */
function withValueStatus(note: ReactNode, indicator: StatisticsHubIndicator): ReactNode {
  return indicator.valueStatus ? (
    <>
      {note}, {describeValueStatus(indicator.valueStatus)}
    </>
  ) : (
    note
  )
}

function detailLink(indicator: StatisticsHubIndicator) {
  return function DetailLink(label: ReactNode, className: string) {
    return (
      <Link to="/ins/seturi/$cod" params={{ cod: indicator.code }} search={indicatorDetailSearch(indicator)} className={className}>
        {label}
      </Link>
    )
  }
}

export function StatisticsHubPage({ search, initialHub }: StatisticsHubPageProps) {
  const { i18n } = useLingui()
  const navigate = useNavigate()
  const rootRef = useRef<HTMLDivElement>(null)
  useRevealOnView(rootRef, startArrivalEffects)
  // The count-up driver is module state; an unmount mid-flight would leave it
  // ticking against nodes that are no longer in the document.
  useEffect(() => () => stopCounting(), [])
  const query = useStatisticsHub(initialHub)
  const hub = query.data
  const retry = () => void query.refetch()
  const labelOf = useIndicatorLabel()
  const [hoveredCounty, setHoveredCounty] = useState<string | undefined>(undefined)

  const indicatorKey = search.indicator ?? DEFAULT_INDICATOR
  const layerDefinition = HUB_COUNTY_LAYERS.find((layer) => layer.key === indicatorKey) ?? HUB_COUNTY_LAYERS[0]
  const layer = hub?.counties?.find((entry) => entry.code === layerDefinition.code)
  const setIndicator = (key: StatisticsHubIndicatorKey) => {
    void navigate({
      to: '/ins',
      search: key === DEFAULT_INDICATOR ? {} : { indicator: key },
      replace: true,
      resetScroll: false,
    })
  }

  const lifeExpectancy = indicatorByCode(hub, 'POP217A')
  const employees = indicatorByCode(hub, 'FOM104D')
  const tourists = indicatorByCode(hub, 'TUR104E')
  const births = indicatorByCode(hub, 'POP201D')
  const deaths = indicatorByCode(hub, 'POP206D')
  const figureRows = HUB_FIGURE_CODES.flatMap((code) => {
    const indicator = indicatorByCode(hub, code)
    return indicator ? [indicator] : []
  })
  const since = lifeExpectancy?.series[0]?.period ?? '1990'
  const naturalDecreaseSince = births && deaths ? deathsExceedBirthsSince(births.series, deaths.series) : null

  const inflation = withFigure(indicatorByCode(hub, HUB_HEADLINE_CODES.inflation))
  const earnings = withFigure(indicatorByCode(hub, HUB_HEADLINE_CODES.earnings))
  const unemployment = withFigure(indicatorByCode(hub, HUB_HEADLINE_CODES.unemployment))
  const population = withFigure(indicatorByCode(hub, HUB_HEADLINE_CODES.population))
  const inflationBase = inflation ? sameMonthLastYear(inflation.period) : null
  const facts: readonly HubFact[] = [
    ...(inflation
      ? [
          {
            key: 'inflation',
            value: annualInflationRate(inflation.value, sourceDecimals(inflation.rawValue)),
            digits: sourceDecimals(inflation.rawValue),
            unit: '%',
            label: <Trans>Inflația anuală</Trans>,
            note: withValueStatus(
              inflationBase ? (
                <Trans>
                  {formatHubPeriod(inflation.period)} față de {formatHubPeriod(inflationBase)}
                </Trans>
              ) : (
                formatHubPeriod(inflation.period)
              ),
              inflation,
            ),
            link: detailLink(inflation),
          } satisfies HubFact,
        ]
      : []),
    ...(earnings
      ? [
          {
            key: 'earnings',
            value: earnings.value,
            digits: sourceDecimals(earnings.rawValue),
            unit: hubUnitWord(earnings.unit, earnings.unitLabel),
            label: <Trans>Salariul mediu net</Trans>,
            note: withValueStatus(formatHubPeriod(earnings.period), earnings),
            link: detailLink(earnings),
          } satisfies HubFact,
        ]
      : []),
    ...(unemployment
      ? [
          {
            key: 'unemployment',
            value: unemployment.value,
            digits: sourceDecimals(unemployment.rawValue),
            unit: '%',
            label: <Trans>Rata șomajului</Trans>,
            note: withValueStatus(<Trans>Șomeri înregistrați, {formatHubPeriod(unemployment.period)}</Trans>, unemployment),
            link: detailLink(unemployment),
          } satisfies HubFact,
        ]
      : []),
    ...(population
      ? [
          {
            key: 'population',
            value: population.value,
            digits: 0,
            label: <Trans>Locuitori</Trans>,
            note: withValueStatus(<Trans>Populația rezidentă la 1 ianuarie {population.period}</Trans>, population),
            link: detailLink(population),
          } satisfies HubFact,
        ]
      : []),
  ]

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
            <div className="px-5 py-7">{query.isPending ? <HubPending rows={2} /> : <HubLoadError onRetry={retry} />}</div>
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
              ) : query.isPending ? (
                <HubPending rows={6} />
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
            title={<Trans>Unde stă județul tău</Trans>}
            aside={
              <HubIndicatorToggle
                label={t`Indicatorul de pe hartă`}
                options={HUB_COUNTY_LAYERS.map((entry) => ({ key: entry.key, label: i18n._(entry.label) }))}
                value={layerDefinition.key}
                onChange={setIndicator}
              />
            }
          />
          <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-8">
            <div className="lg:col-span-7" data-reveal>
              {layer ? (
                <HubCountyMap
                  key={layer.code}
                  layer={layer}
                  legend={`${i18n._(layerDefinition.legend)}${layer.period ? `, ${layer.period}` : ''}`}
                  highlightedCode={hoveredCounty}
                  onHover={setHoveredCounty}
                />
              ) : query.isPending ? (
                <div className="aspect-[640/440] w-full animate-pulse rounded-sm bg-muted/60" aria-hidden="true" />
              ) : (
                <HubLoadError onRetry={retry} />
              )}
            </div>
            <div className="lg:col-span-4 lg:col-start-9" data-reveal>
              {layer ? (
                <HubCountyRank layer={layer} limit={10} highlightedCode={hoveredCounty} onHover={setHoveredCounty} />
              ) : query.isPending ? (
                <HubPending rows={10} />
              ) : null}
            </div>
          </div>
          <div className="mt-12 grid grid-cols-1 gap-6 border-t pt-8 lg:grid-cols-12" data-reveal>
            <div className="lg:col-span-5">
              <MonoLabel className="block text-primary">
                <Trans>Localitatea ta</Trans>
              </MonoLabel>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                <Trans>Cifrele INS ale oricărei localități, lângă cele ale județului și ale țării.</Trans>
              </p>
            </div>
            <div className="lg:col-span-6 lg:col-start-7">
              <HubPlaceFinder inputId="statistics-hub-place" />
            </div>
          </div>
        </RuledFrame>
      </section>

      <section className="border-b" aria-labelledby="hub-change-title">
        <RuledFrame className="py-14 sm:py-20">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <HubSectionHead
                titleId="hub-change-title"
                index={t`03 / Din ${since} până azi`}
                title={
                  <Trans>
                    Ce s-a schimbat
                    <br />
                    din {since} încoace
                  </Trans>
                }
                lede={
                  births?.value !== null && births?.value !== undefined && deaths?.value !== null && deaths?.value !== undefined ? (
                    <>
                      <Trans>
                        În {births.period} s-au născut{' '}
                        {plural(births.value, { one: 'un copil', few: '# copii', other: '# de copii' })} și au murit{' '}
                        {plural(deaths.value, { one: 'o persoană', few: '# persoane', other: '# de persoane' })}.
                      </Trans>
                      {naturalDecreaseSince ? (
                        <>
                          {' '}
                          <Trans>Din {naturalDecreaseSince}, în fiecare an au murit mai mulți oameni decât s-au născut.</Trans>
                        </>
                      ) : null}
                    </>
                  ) : null
                }
              />
              <dl className="mt-8 grid grid-cols-1 gap-y-4 sm:grid-cols-3 sm:gap-x-6 lg:grid-cols-1" data-reveal>
                {[employees, lifeExpectancy, tourists].map((indicator) =>
                  indicator && indicator.series.length > 1 ? (
                    <ChangeItem
                      key={indicator.code}
                      label={labelOf(indicator)}
                      indicator={indicator}
                      since={indicator.series[0].period}
                    />
                  ) : null,
                )}
              </dl>
            </div>
            <div className="lg:col-span-6 lg:col-start-7" data-reveal>
              {births && deaths && births.series.length > 1 && deaths.series.length > 1 ? (
                <>
                  <MonoLabel className="block text-muted-foreground">
                    <Trans>Născuți vii și decedați, pe an</Trans>
                  </MonoLabel>
                  <div className="mt-3">
                    <HubTwoLineChart a={{ label: labelOf(births), points: births.series }} b={{ label: labelOf(deaths), points: deaths.series }} />
                  </div>
                  <p className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
                    <Link
                      to="/ins/seturi/$cod"
                      params={{ cod: births.code }}
                      search={{ ...indicatorDetailSearch(births), din: Number(births.series[0].period), pana: Number(births.period) }}
                      className={HUB_TEXT_LINK_CLASS}
                    >
                      <Trans>Seria nașterilor</Trans>
                    </Link>
                    <Link
                      to="/ins/seturi/$cod"
                      params={{ cod: deaths.code }}
                      search={{ ...indicatorDetailSearch(deaths), din: Number(deaths.series[0].period), pana: Number(deaths.period) }}
                      className={HUB_TEXT_LINK_CLASS}
                    >
                      <Trans>Seria deceselor</Trans>
                    </Link>
                  </p>
                </>
              ) : query.isPending ? (
                <HubPending rows={6} />
              ) : (
                <HubLoadError onRetry={retry} />
              )}
            </div>
          </div>
        </RuledFrame>
      </section>

      <section aria-labelledby="hub-analyses-title">
        <RuledFrame className="py-14 sm:py-20">
          <HubSectionHead titleId="hub-analyses-title" index={t`04 / Analize`} title={<Trans>De aici poți începe</Trans>} />
          <div className="mt-8" data-reveal>
            <ul className="grid gap-px border bg-border/70 sm:grid-cols-3">
              <li>
                <Link
                  to="/ins/comparatii"
                  search={{ cod: 'POP107D', teritorii: ['cod:TR', 'cod:BR', 'cod:TL', 'cod:OT', 'cod:HD'], frecventa: 'ANNUAL' }}
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

function ChangeItem({ label, indicator, since }: { readonly label: string; readonly indicator: StatisticsHubIndicator; readonly since: string }) {
  const last = indicator.series[indicator.series.length - 1]
  if (!last) return null
  const value = formatHubValue(last.value, indicator.unit, indicator.unitLabel, { compact: true })
  const change = describeHubChange(indicator.series, indicator.unit, since)
  return (
    <div>
      <dt>
        <MonoLabel className="text-muted-foreground">
          {label} · {formatHubPeriod(last.period)}
        </MonoLabel>
      </dt>
      <dd className="mt-1 text-sm text-foreground">
        <span className="text-base font-semibold tabular-nums tracking-tight">{value.value}</span>
        {value.unit ? <span className="ml-1 text-muted-foreground">{value.unit}</span> : null}
        {change ? <MonoLabel className="ml-2 tabular-nums text-muted-foreground">{change.text}</MonoLabel> : null}
        {!change && indicator.series.length > 1 ? <HubSparkline points={indicator.series} width={64} height={18} className="ml-2 text-primary" /> : null}
      </dd>
    </div>
  )
}
