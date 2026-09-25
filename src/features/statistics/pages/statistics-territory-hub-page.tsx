import { plural, t } from '@lingui/core/macro'
import { Trans, useLingui } from '@lingui/react/macro'
import { AlertTriangle } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ShareFilteredView } from '@/components/shared/procurement-data/share-filtered-view'
import { useClientDocumentTitle } from '@/hooks/use-client-document-title'
import { cn } from '@/lib/utils'
import type { StatisticsTerritoryHubResult, StatisticsTerritoryHubSearch } from '@/schemas/statistics'
import { useWarmRouteCode } from '@/hooks/use-warm-route-code'
import { comparisonPlaceName } from '../lib/comparison-format'
import { statisticsTheme } from '../lib/statistics-theme'
import { BUCHAREST_MUNICIPALITY_SIRUTA } from '../lib/territory'
import { groupTerritoryTiles } from '../lib/territory-groups'
import {
  applyTerritoryPeriod,
  collectTerritoryYears,
  territoryPeriodAvailable,
} from '../lib/territory-period'
import { RelatedLinksRail } from '../components/territory/related-links-rail'
import { StatisticsBackLink } from '../components/statistics-back-link'
import { TerritoryDerivedSection } from '../components/territory/territory-derived-section'
import { TerritoryHeader } from '../components/territory/territory-header'
import { TerritoryHeadlineTile, TerritoryIndicatorRow } from '../components/territory/territory-indicator-row'
import { TerritoryPeriodControl } from '../components/territory/territory-period-control'
import { useStatisticsTerritoryHub } from '../hooks/use-statistics'

type StatisticsTerritoryHubPageProps = {
  readonly siruta: string
  readonly search: StatisticsTerritoryHubSearch
  /** The hub the route loader read on the server, for the same SIRUTA. */
  readonly initialHub?: StatisticsTerritoryHubResult
}

function TerritorySkeleton() {
  return (
    <div className="space-y-4" aria-hidden="true">
      <Skeleton className="h-24 w-full" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-32" />
        ))}
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  )
}

/**
 * The territory page: the four headline indicators as a band with their
 * county and national references, then every other indicator the territory
 * has, grouped by domain in an accordion — one compact row per dataset,
 * never a wall of identical tiles. The first two groups open by default.
 */
export function StatisticsTerritoryHubPage({ siruta, search, initialHub }: StatisticsTerritoryHubPageProps) {
  // Most of this page's links open a series: have its code before the tap.
  useWarmRouteCode('/ins/seturi/$cod')
  const navigate = useNavigate()
  const { i18n } = useLingui()
  // Malformed SIRUTA must never cost a request — the query is gated, and the
  // early return below (after the hooks, per the rules of hooks) renders the
  // not-found state.
  const isValidSiruta = /^\d{1,6}$/.test(siruta.trim())
  const hubQuery = useStatisticsTerritoryHub({
    siruta,
    enabled: isValidSiruta,
    ...(initialHub ? { initialData: initialHub } : {}),
  })
  const unfilteredHub = hubQuery.data
  // The router merges the RAW parent search over the validated child output,
  // so a key the validator dropped (e.g. ?period=2009 parsed as a NUMBER)
  // still arrives here with its raw type — read defensively, always.
  const activePeriod = typeof search.period === 'string' && search.period !== 'latest' ? search.period : null
  const years = collectTerritoryYears(unfilteredHub)
  const periodAvailable = activePeriod === null || territoryPeriodAvailable(unfilteredHub, activePeriod)
  const hub = unfilteredHub ? applyTerritoryPeriod(unfilteredHub, activePeriod) : unfilteredHub
  const shouldShowHub = Boolean(hub) && !hubQuery.isError
  const grouped = hub ? groupTerritoryTiles(hub.tiles) : null
  // A tile with a figure: a series whose latest cell is confidential has data, but nothing to show.
  const indicatorCount =
    unfilteredHub?.tiles.filter((tile) => tile.tileState === 'available' && tile.value !== null).length ?? 0

  const placeName = hub?.identity.name ? comparisonPlaceName(hub.identity.name).name : null
  useClientDocumentTitle(placeName ? `${placeName} · ${t`Statistici INS`} — Transparenta.eu` : null)

  // Merge, never replace: a future search key must survive a period change.
  const handlePeriodChange = (value: string | null) => {
    void navigate({
      to: '/ins/teritorii/$siruta',
      params: { siruta },
      search: (previous) => ({ ...previous, period: value ?? undefined }),
    })
  }

  if (!isValidSiruta) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 md:px-6">
          <StatisticsBackLink to="/ins">
            <Trans>Înapoi la statistici</Trans>
          </StatisticsBackLink>
          <EmptyState title={t`Teritoriu negăsit`} description={t`Adresa nu conține un cod SIRUTA valid.`} />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 md:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <StatisticsBackLink to="/ins">
            <Trans>Înapoi la statistici</Trans>
          </StatisticsBackLink>
          <ShareFilteredView label={t`Copiază link`} />
        </div>

        {hubQuery.isPending ? <TerritorySkeleton /> : null}

        {hubQuery.isError ? (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            <AlertTitle>
              <Trans>Nu am putut încărca teritoriul</Trans>
            </AlertTitle>
            <AlertDescription className="space-y-3">
              <p>
                <Trans>Adresa rămâne neschimbată. Poți încerca din nou.</Trans>
              </p>
              <Button variant="outline" size="sm" onClick={() => void hubQuery.refetch()}>
                <Trans>Reîncearcă</Trans>
              </Button>
            </AlertDescription>
          </Alert>
        ) : null}

        {hubQuery.isSuccess && hub === null ? (
          <EmptyState title={t`Teritoriu negăsit`} description={t`Nu am găsit un teritoriu INS pentru acest SIRUTA.`} />
        ) : null}

        {shouldShowHub && hub && grouped ? (
          // One provider for the seventy compare buttons' tooltips.
          <TooltipProvider delayDuration={300}>
            <header className="space-y-4">
              <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <TerritoryHeader
                  identity={hub.identity}
                  indicatorCount={indicatorCount}
                  latestDataPeriod={hub.latestDataPeriod}
                />
                <TerritoryPeriodControl
                  years={years}
                  active={activePeriod}
                  available={periodAvailable}
                  onChange={handlePeriodChange}
                />
              </div>
              {hub.benchmarksUnavailable ? (
                <p role="status" className={statisticsTheme.note}>
                  <Trans>Reperele pe județ și pe țară nu s-au încărcat de această dată; cifrele localității sunt complete.</Trans>
                </p>
              ) : null}
            </header>

            {hub.tiles.length === 0 ? (
              <EmptyState
                title={t`Date indisponibile încă`}
                description={t`Teritoriul există, dar nu avem observații INS încărcate pentru indicatorii prioritari.`}
              />
            ) : null}

            {grouped.headline.length > 0 ? (
              <section className="space-y-3" aria-labelledby="territory-headline-title">
                <div>
                  <h2 id="territory-headline-title" className={statisticsTheme.sectionLabel}>
                    <Trans>Pe scurt</Trans>
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {activePeriod ? (
                      <Trans>
                        Valorile pentru perioada aleasă. Reperele pe județ și pe țară sunt fapte despre ultima perioadă,
                        așa că nu apar cât timp filtrezi o perioadă anume.
                      </Trans>
                    ) : (
                      <Trans>Cele mai recente valori, cu județul și țara ca reper. Fiecare deschide seria completă.</Trans>
                    )}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                  {grouped.headline.map((tile) => (
                    <TerritoryHeadlineTile
                      key={tile.datasetCode}
                      tile={tile}
                      siruta={hub.identity.siruta}
                      countyCode={hub.identity.countyCode}
                      countyName={hub.identity.countyName}
                      activePeriod={activePeriod}
                      // The capital is its own county cell: the reference would repeat the figure.
                      showCountyReference={hub.identity.siruta !== BUCHAREST_MUNICIPALITY_SIRUTA}
                      {...(!activePeriod && hub.benchmarks[tile.datasetCode]
                        ? { benchmark: hub.benchmarks[tile.datasetCode] }
                        : {})}
                    />
                  ))}
                </div>
              </section>
            ) : null}

            {grouped.groups.length > 0 ? (
              <section className="space-y-3" aria-labelledby="territory-groups-title">
                <div>
                  <h2 id="territory-groups-title" className={statisticsTheme.sectionLabel}>
                    <Trans>Toți indicatorii, pe domenii</Trans>
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    <Trans>
                      Ultima valoare a fiecărui indicator și evoluția lui, fără interpolarea perioadelor lipsă. Fiecare
                      rând deschide seria completă.
                    </Trans>
                  </p>
                </div>
                <Accordion
                  type="multiple"
                  defaultValue={grouped.groups.slice(0, 2).map((group) => group.definition.key)}
                  className={cn(statisticsTheme.band, 'px-4')}
                >
                  {grouped.groups.map((group) => (
                    <AccordionItem key={group.definition.key} value={group.definition.key}>
                      <AccordionTrigger className="py-3 text-sm hover:no-underline">
                        <span className="flex items-baseline gap-2">
                          <span className="font-semibold">{i18n._(group.definition.label)}</span>
                          {/* The count is a word for assistive tech, a figure for the eye:
                              „Populație18" was one word to a screen reader. */}
                          <span className="tabular-nums text-xs font-normal text-muted-foreground" aria-hidden="true">
                            {group.tiles.length}
                          </span>
                          <span className="sr-only">
                            {plural(group.tiles.length, { one: ', un indicator', few: ', # indicatori', other: ', # de indicatori' })}
                          </span>
                        </span>
                      </AccordionTrigger>
                      <AccordionContent className="pb-2">
                        <ul className="-mx-4 divide-y divide-border/70 border-t border-border/70">
                          {group.tiles.map((tile) => (
                            <TerritoryIndicatorRow
                              key={tile.datasetCode}
                              tile={tile}
                              siruta={hub.identity.siruta}
                              countyCode={hub.identity.countyCode}
                              activePeriod={activePeriod}
                            />
                          ))}
                        </ul>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </section>
            ) : null}

            {/* Under the source figures, what they mean per inhabitant: the
                place's rates beside its county's and Romania's. */}
            {hub.tiles.length > 0 ? (
              <TerritoryDerivedSection identity={hub.identity} activePeriod={activePeriod} />
            ) : null}

            <RelatedLinksRail identity={hub.identity} />
          </TooltipProvider>
        ) : null}
      </div>
    </div>
  )
}
