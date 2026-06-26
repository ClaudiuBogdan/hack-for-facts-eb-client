import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { AlertTriangle, ArrowLeft } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import type {
  StatisticsTerritoryHubResult,
  StatisticsTerritoryHubSearch,
} from '@/schemas/statistics'
import { CoverageRibbon } from '../components/coverage-ribbon'
import { IndicatorTile } from '../components/indicator-tile'
import { RelatedLinksRail } from '../components/related-links-rail'
import { ShareFilteredView } from '../components/share-filtered-view'
import { TerritoryHeader } from '../components/territory-header'
import { useStatisticsTerritoryHub } from '../hooks/use-statistics'

type StatisticsTerritoryHubPageProps = {
  readonly siruta: string
  readonly search: StatisticsTerritoryHubSearch
}

function TerritorySkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-24 w-full" />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-56" />
        ))}
      </div>
    </div>
  )
}

function getPeriodOptions(
  hub: StatisticsTerritoryHubResult | null | undefined,
): readonly string[] {
  const periods = new Set<string>()

  for (const tile of hub?.tiles ?? []) {
    for (const [period] of tile.sparkline) {
      periods.add(period.iso_period)
    }
  }

  return [...periods].sort((left, right) => right.localeCompare(left)).slice(0, 5)
}

export function StatisticsTerritoryHubPage({
  siruta,
  search,
}: StatisticsTerritoryHubPageProps) {
  const hubQuery = useStatisticsTerritoryHub({ siruta, search })
  const hub = hubQuery.data
  const shouldShowHub = Boolean(hub) && !hubQuery.isError
  const activePeriod = search.period && search.period !== 'latest' ? search.period : null
  const periodSourceQuery = useStatisticsTerritoryHub({
    siruta,
    search: {},
    enabled: Boolean(activePeriod),
  })
  const periodOptions = getPeriodOptions(
    activePeriod ? periodSourceQuery.data : hub,
  )

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 md:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button variant="outline" size="sm" asChild>
            <Link to="/statistici">
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
              <Trans>Înapoi la statistici</Trans>
            </Link>
          </Button>
          <ShareFilteredView />
        </div>

        {hubQuery.isLoading ? <TerritorySkeleton /> : null}

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
              <Button variant="outline" size="sm" onClick={() => hubQuery.refetch()}>
                <Trans>Reîncearcă</Trans>
              </Button>
            </AlertDescription>
          </Alert>
        ) : null}

        {hubQuery.isSuccess && hub === null ? (
          <EmptyState
            title={t`Teritoriu negăsit`}
            description={t`Nu am găsit un teritoriu INS pentru acest SIRUTA.`}
          />
        ) : null}

        {shouldShowHub && hub ? (
          <>
            <header className="space-y-4">
              <TerritoryHeader identity={hub.identity} />
              {activePeriod ? (
                <Badge variant="outline">
                  <Trans>Filtrat</Trans>: {activePeriod}
                </Badge>
              ) : null}
              {periodOptions.length > 0 ? (
                <div className="flex flex-wrap gap-2" aria-label={t`Filtru perioadă`}>
                  <Button
                    variant={activePeriod ? 'outline' : 'default'}
                    size="sm"
                    asChild
                  >
                    <Link
                      to="/statistici/teritorii/$siruta"
                      params={{ siruta }}
                      search={{}}
                      aria-current={!activePeriod ? 'true' : undefined}
                    >
                      <Trans>Ultima perioadă</Trans>
                    </Link>
                  </Button>
                  {periodOptions.map((period) => (
                    <Button
                      key={period}
                      variant={activePeriod === period ? 'default' : 'outline'}
                      size="sm"
                      asChild
                    >
                      <Link
                        to="/statistici/teritorii/$siruta"
                        params={{ siruta }}
                        search={{ period }}
                        aria-current={activePeriod === period ? 'true' : undefined}
                      >
                        {period}
                      </Link>
                    </Button>
                  ))}
                </div>
              ) : null}
              <CoverageRibbon
                coverage={hub.coverage}
                latestDataPeriod={hub.latestDataPeriod}
                partialNote={
                  hub.partial
                    ? t`Rezultate parțiale — unele serii pot lipsi.`
                    : null
                }
              />
            </header>

            <section className="space-y-3">
              <div>
                <h2 className="text-base font-semibold">
                  <Trans>Prezentare generală</Trans>
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  <Trans>Indicatorii afișează valorile disponibile pentru teritoriu, fără interpolarea perioadelor lipsă.</Trans>
                </p>
              </div>
              {hub.tiles.length > 0 ? (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {hub.tiles.map((tile) => (
                    <IndicatorTile
                      key={tile.datasetCode}
                      tile={tile}
                      siruta={hub.identity.siruta}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState
                  title={t`Date indisponibile încă`}
                  description={t`Teritoriul există, dar nu avem observații INS încărcate pentru indicatorii prioritari.`}
                />
              )}
            </section>

            <section className="grid gap-4 lg:grid-cols-[1fr_320px]">
              <div className="rounded-lg border border-border/70 p-4 text-sm text-muted-foreground">
                <h2 className="font-semibold text-foreground">
                  <Trans>Acoperire indicatori</Trans>
                </h2>
                <p className="mt-2">
                  <Trans>Fiecare indicator păstrează perioada, unitatea și starea disponibilității la nivel de set.</Trans>
                </p>
              </div>
              <RelatedLinksRail
                links={hub.relatedLinks}
                originSiruta={hub.identity.siruta}
              />
            </section>
          </>
        ) : null}
      </div>
    </main>
  )
}
