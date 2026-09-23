import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { plural, t } from '@lingui/core/macro'
import { Plural, Trans, useLingui } from '@lingui/react/macro'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { RevealStyles, useRevealOnView } from '@/components/landing-skin/reveal'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { SmearFilters, countUpWithin, stopCounting } from '@/features/landing/components/count-up'
import { CornerTicks, CruxMarks, TwoLayerLattice } from '@/features/landing/components/hero-chrome'
import { HUB_BESIDE_TITLE_CLASS, HUB_SHORTCUT_LINK_CLASS, HubSectionHead } from '@/features/statistics/components/hub/hub-chrome'
import { HubIndicatorToggle } from '@/features/statistics/components/hub/hub-county-rank'
import { HubFiguresBand, type HubFact } from '@/features/statistics/components/hub/hub-figures'
import { cn } from '@/lib/utils'
import type { NgoHubLayerKey, NgoLandingSearch } from '@/schemas/ngos'
import { NgoCountyMap } from './ngo-county-map'
import { NgoCountyRank } from './ngo-county-rank'
import { formatNgoDate, formatNgoNumber } from './ngo-format'
import { NgoFormRows, NgoStatusRows } from './ngo-hub-parts'
import { NgoRegistrySearch } from './ngo-registry-search'
import { NgoYearChart } from './ngo-year-chart'
import { REGISTRY_STATUS_VALUE, countyLayer, nationalDensity, perDay, registrationsIn, registrySearch } from './registry-figures'
import type { NgoRegistrySummary } from './registry-summary-types'

/**
 * `/ong-uri` — the NGOs of Romania, from the Ministry of Justice's registry,
 * in the INS hub's composition and visual language (`docs/design/ngos/
 * design.md` §12): a hero with the registry search and the legal forms, the
 * four figures a reader comes for, the counties, and the years.
 *
 * Every figure is computed once from a full read of the registry and kept
 * in the client (`registry-summary.ts`): the page makes no request of its
 * own. The search and every link into the registry exist only where the
 * registry API does (`registry`).
 */

const DEFAULT_LAYER: NgoHubLayerKey = 'densitate'

export function NgoHubPage({
  summary,
  search,
  registry,
}: {
  readonly summary: NgoRegistrySummary
  readonly search: NgoLandingSearch
  readonly registry: boolean
}) {
  const { i18n } = useLingui()
  const navigate = useNavigate()
  const rootRef = useRef<HTMLDivElement>(null)
  useRevealOnView(rootRef, (block, delay) => countUpWithin(block, delay))
  // The count-up driver is module state; an unmount mid-flight would leave it ticking against removed nodes.
  useEffect(() => () => stopCounting(), [])
  const [activeCounty, setActiveCounty] = useState<string | undefined>(undefined)

  const year = summary.year
  const added = registrationsIn(summary, year)
  const previousYear = year - 1
  const addedPrevious = formatNgoNumber(registrationsIn(summary, previousYear))
  const firstYear = summary.registrations[0]?.year ?? year
  const daily = formatNgoNumber(perDay(added, year), 1)
  const captured = formatNgoDate(summary.capturedAt)
  const layerKey = search.indicator ?? DEFAULT_LAYER
  const layer = countyLayer(summary, layerKey)
  const layers: Record<NgoHubLayerKey, { readonly toggle: string; readonly legend: string; readonly unit: string; readonly column: string }> = {
    densitate: {
      toggle: t`La 10.000 de locuitori`,
      legend: t`ONG-uri înregistrate la 10.000 de locuitori`,
      unit: t`la 10.000 de locuitori`,
      column: t`la 10.000 loc.`,
    },
    total: { toggle: t`Înregistrate`, legend: t`ONG-uri înregistrate`, unit: t`ONG-uri`, column: t`ONG-uri` },
    noi: { toggle: t`Noi în ${year}`, legend: t`ONG-uri noi în registru în ${year}`, unit: t`noi în ${year}`, column: t`în ${year}` },
  }
  const labels = layers[layerKey]
  const unplaced = layer.unplaced
  const unplacedNote =
    unplaced === 0
      ? null
      : layerKey === 'noi'
        ? plural(unplaced, {
            one: `# dintre cele noi în ${year} nu are județ în registru și intră doar în cifra țării`,
            other: `# dintre cele noi în ${year} nu au județ în registru și intră doar în cifra țării`,
          })
        : plural(unplaced, {
            one: '# ONG înregistrat nu are județ în registru și intră doar în cifra țării',
            few: '# ONG-uri înregistrate nu au județ în registru și intră doar în cifra țării',
            other: '# de ONG-uri înregistrate nu au județ în registru și intră doar în cifra țării',
          })
  const setLayer = (key: NgoHubLayerKey) => {
    void navigate({
      to: '/ong-uri',
      search: key === DEFAULT_LAYER ? {} : { indicator: key },
      replace: true,
      resetScroll: false,
    })
  }

  // A figure opens where it is explained: the registry, filtered, when there is one; its band on this page otherwise.
  // Without a registry a figure with no band of its own is not a link.
  const toRegistry = (filters: Parameters<typeof registrySearch>[0], anchor?: string) =>
    function FigureLink(label: ReactNode, className: string) {
      if (registry) {
        return (
          <Link to="/ong-uri/registru" search={registrySearch(filters)} className={className}>
            {label}
          </Link>
        )
      }
      return anchor ? (
        <a href={anchor} className={className}>
          {label}
        </a>
      ) : (
        label
      )
    }
  const toBand = (anchor: string) =>
    function FigureLink(label: ReactNode, className: string) {
      return (
        <a href={anchor} className={className}>
          {label}
        </a>
      )
    }
  const facts: readonly HubFact[] = [
    {
      key: 'registered',
      value: summary.status.registered,
      digits: 0,
      label: <Trans>ONG-uri înregistrate</Trans>,
      note: <Trans>În registru la {captured}</Trans>,
      link: toRegistry({ status: REGISTRY_STATUS_VALUE.registered }, '#pe-judete'),
    },
    {
      key: 'added',
      value: added,
      digits: 0,
      label: <Trans>Noi în {year}</Trans>,
      note: <Trans>{addedPrevious} în {previousYear}</Trans>,
      link: toBand('#an-de-an'),
    },
    {
      key: 'density',
      value: nationalDensity(summary),
      digits: 1,
      label: <Trans>La 10.000 de locuitori</Trans>,
      note: <Trans>Populația rezidentă la 1 ianuarie {year}</Trans>,
      link: toBand('#pe-judete'),
    },
    {
      key: 'public-utility',
      value: summary.publicUtility,
      digits: 0,
      label: <Trans>De utilitate publică</Trans>,
      note: <Trans>Potrivit registrului</Trans>,
      link: toRegistry({ publicUtility: 'yes', status: REGISTRY_STATUS_VALUE.registered }),
    },
  ]

  return (
    <div ref={rootRef} className="relative w-full overflow-x-clip bg-background">
      <RevealStyles />
      <SmearFilters />

      <section className="relative border-b">
        <TwoLayerLattice idPrefix="ngo-hub" />
        <RuledFrame marker="hero" className="py-12 sm:py-16 lg:py-20">
          <CornerTicks />
          <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-12 lg:gap-8">
            <div className="min-w-0 lg:col-span-7">
              <MonoLabel className="text-muted-foreground">
                <Trans>ONG-uri / Registrul național</Trans>
              </MonoLabel>
              <h1 className="mt-5 text-[clamp(2.35rem,8.4vw+0.75rem,2.75rem)] font-extrabold leading-[0.92] tracking-tighter text-foreground sm:text-6xl lg:text-7xl">
                {/* The space keeps the heading's text „ONG-urile din România" for search engines and screen readers. */}
                <Trans>
                  ONG-urile{' '}
                  <br />
                  din România
                </Trans>
              </h1>
              <p className="mt-5 max-w-[46ch] text-lg leading-relaxed text-muted-foreground sm:text-xl">
                <Trans>Asociațiile, fundațiile și federațiile din Registrul național al Ministerului Justiției, județ cu județ.</Trans>
              </p>
              {registry ? (
                <>
                  <div className="mt-6 sm:mt-7">
                    <NgoRegistrySearch />
                  </div>
                  <nav aria-label={t`Scurtături`} className="mt-4">
                    <MonoLabel className="block text-muted-foreground/70 sm:inline sm:align-middle">
                      <Trans>Sau mergi direct la</Trans>
                    </MonoLabel>
                    <span className="flex flex-wrap gap-x-4 sm:ml-4 sm:inline-flex sm:gap-y-1.5 sm:align-middle">
                      <Link to="/ong-uri/registru" search={registrySearch()} className={HUB_SHORTCUT_LINK_CLASS}>
                        <Trans>Tot registrul</Trans>
                      </Link>
                      <Link
                        to="/ong-uri/registru"
                        search={registrySearch({ publicUtility: 'yes', status: REGISTRY_STATUS_VALUE.registered })}
                        className={HUB_SHORTCUT_LINK_CLASS}
                      >
                        <Trans>ONG-urile de utilitate publică</Trans>
                      </Link>
                    </span>
                  </nav>
                </>
              ) : null}
            </div>
            <div className="min-w-0 lg:col-span-5">
              <div className="border bg-card/80 p-5 backdrop-blur-[2px] sm:p-6">
                <MonoLabel className="text-primary">
                  <Trans>Pe forme juridice</Trans>
                </MonoLabel>
                <div className="mt-3">
                  <NgoFormRows summary={summary} registry={registry} />
                </div>
              </div>
            </div>
          </div>
        </RuledFrame>
      </section>

      <section className="border-b bg-muted/20" aria-label={t`Cifre-cheie`}>
        <RuledFrame>
          <CruxMarks />
          <HubFiguresBand facts={facts} locale={i18n.locale === 'en' ? 'en' : 'ro'} />
        </RuledFrame>
      </section>

      <section id="pe-judete" className="scroll-mt-4 border-b" aria-labelledby="ngo-hub-counties-title">
        <RuledFrame className="py-14 sm:py-20">
          <HubSectionHead
            titleId="ngo-hub-counties-title"
            index={t`01 / Pe județe`}
            title={<Trans>Câte ONG-uri are județul tău</Trans>}
            aside={
              <HubIndicatorToggle
                label={t`Ce arată harta`}
                options={(Object.keys(layers) as NgoHubLayerKey[]).map((key) => ({ key, label: layers[key].toggle }))}
                value={layerKey}
                onChange={setLayer}
              />
            }
          />
          <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-8">
            {/* The map stays in view beside the full list of 42, where the window is tall enough to hold all of it. */}
            <div className="lg:top-6 lg:col-span-7 lg:self-start lg:[@media(min-height:42rem)]:sticky" data-reveal>
              <NgoCountyMap
                key={layer.key}
                layer={layer}
                legend={labels.legend}
                unit={labels.unit}
                registry={registry}
                unplacedNote={unplacedNote}
                activeCode={activeCounty}
                onActiveChange={setActiveCounty}
              />
            </div>
            <div className="lg:col-span-5 lg:col-start-8" data-reveal>
              <NgoCountyRank layer={layer} unit={labels.column} registry={registry} activeCode={activeCounty} onActiveChange={setActiveCounty} />
            </div>
          </div>
        </RuledFrame>
      </section>

      <section id="an-de-an" className="scroll-mt-4 border-b" aria-labelledby="ngo-hub-years-title">
        <RuledFrame className="py-14 sm:py-20">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <HubSectionHead
                titleId="ngo-hub-years-title"
                index={t`02 / An de an`}
                title={
                  <Trans>
                    Câte ONG-uri{' '}
                    <br />
                    apar în fiecare an
                  </Trans>
                }
                lede={
                  <Trans>
                    În {year} au intrat în registru{' '}
                    <Plural value={added} one="# organizație nouă" few="# organizații noi" other="# de organizații noi" />, câte {daily} pe zi.
                  </Trans>
                }
              />
              <div className="mt-8" data-reveal>
                <MonoLabel className="block text-muted-foreground">
                  <Trans>Starea în registru</Trans>
                </MonoLabel>
                <div className="mt-3">
                  <NgoStatusRows summary={summary} registry={registry} />
                </div>
              </div>
            </div>
            <div className={cn('lg:col-span-6 lg:col-start-7', HUB_BESIDE_TITLE_CLASS)} data-reveal>
              <MonoLabel className="block text-muted-foreground">
                <Trans>
                  ONG-uri noi în registru, {firstYear}–{year}
                </Trans>
              </MonoLabel>
              <div className="mt-4">
                <NgoYearChart points={summary.registrations} label={t`ONG-uri noi în registru, pe an`} unit={t`organizații noi`} />
              </div>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                <Trans>
                  După anul din numărul de registru, pe care o organizație îl păstrează. Registrul există din 2000; organizațiile mai vechi
                  au fost preluate atunci.
                </Trans>
              </p>
            </div>
          </div>
        </RuledFrame>
      </section>

      <footer className="border-b bg-muted/20">
        <RuledFrame className="py-6">
          <p className="text-sm leading-relaxed text-muted-foreground">
            <MonoLabel className="mr-3 text-foreground">
              <Trans>Surse</Trans>
            </MonoLabel>
            <Trans>
              <a href={summary.sourceUrl} target="_blank" rel="noreferrer" className="text-foreground underline underline-offset-4 hover:text-primary">
                Registrul național ONG
              </a>
              , Ministerul Justiției, exportul din {captured}. Populația: INS, 1 ianuarie {year}.
            </Trans>
          </p>
        </RuledFrame>
      </footer>
    </div>
  )
}
