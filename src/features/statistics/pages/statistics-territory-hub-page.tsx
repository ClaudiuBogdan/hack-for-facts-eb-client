import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { AlertTriangle, ArrowLeft } from 'lucide-react'
import { Link, useNavigate } from '@tanstack/react-router'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import type { StatisticsTerritoryHubSearch } from '@/schemas/statistics'
import { applyHubPeriod, collectHubPeriodOptions } from '../lib/hub-period'
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

const LATEST_PERIOD_VALUE = 'latest'

export function StatisticsTerritoryHubPage({
  siruta,
  search,
}: StatisticsTerritoryHubPageProps) {
  const navigate = useNavigate()
  // Malformed SIRUTA must never cost a request — the query is gated, and the
  // early return below (after the hooks, per the rules of hooks) renders the
  // not-found state.
  const isValidSiruta = /^\d{1,6}$/.test(siruta.trim())
  const hubQuery = useStatisticsTerritoryHub({ siruta, enabled: isValidSiruta })
  const unfilteredHub = hubQuery.data
  // The router merges the RAW parent search over the validated child output,
  // so a key the validator dropped (e.g. ?period=2009 parsed as a NUMBER)
  // still arrives here with its raw type — read defensively, always.
  const activePeriod =
    typeof search.period === 'string' && search.period !== 'latest'
      ? search.period
      : null
  const periodOptions = collectHubPeriodOptions(unfilteredHub)
  const hub = unfilteredHub ? applyHubPeriod(unfilteredHub, activePeriod) : unfilteredHub
  const shouldShowHub = Boolean(hub) && !hubQuery.isError

  // Merge, never replace: a future search key must survive a period change.
  const handlePeriodChange = (value: string) => {
    void navigate({
      to: '/statistici/teritorii/$siruta',
      params: { siruta },
      search: (previous) => ({
        ...previous,
        ...(value === LATEST_PERIOD_VALUE
          ? { period: undefined }
          : { period: value }),
      }),
    })
  }

  if (!isValidSiruta) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-6xl px-4 py-6 md:px-6">
          <EmptyState
            title={t`Teritoriu negăsit`}
            description={t`Adresa nu conține un cod SIRUTA valid.`}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
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
              {activePeriod &&
              !periodOptions.some(
                (option) => option.iso_period === activePeriod,
              ) ? (
                <Alert>
                  <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                  <AlertTitle>
                    <Trans>Perioada {activePeriod} nu este disponibilă în rezultatele încărcate</Trans>
                  </AlertTitle>
                  <AlertDescription className="space-y-3">
                    <p>
                      <Trans>
                        Filtrul rămâne în adresă. Istoricul poate fi incomplet sau selecția din sursă poate necesita clarificare.
                      </Trans>
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePeriodChange(LATEST_PERIOD_VALUE)}
                    >
                      <Trans>Șterge filtrul de perioadă</Trans>
                    </Button>
                  </AlertDescription>
                </Alert>
              ) : null}
              {periodOptions.length > 0 || activePeriod ? (
                <div className="flex flex-wrap items-center gap-2">
                  <label
                    htmlFor="statistics-hub-period"
                    className="text-sm font-medium"
                  >
                    <Trans>Perioadă</Trans>
                  </label>
                  <Select
                    value={activePeriod ?? LATEST_PERIOD_VALUE}
                    onValueChange={handlePeriodChange}
                  >
                    <SelectTrigger
                      id="statistics-hub-period"
                      className="w-48"
                      aria-label={t`Filtru perioadă`}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={LATEST_PERIOD_VALUE}>
                        {t`Ultima perioadă`}
                      </SelectItem>
                      {periodOptions.map((period) => (
                        <SelectItem
                          key={period.iso_period}
                          value={period.iso_period}
                        >
                          {period.iso_period}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {activePeriod ? (
                    <>
                      <Badge variant="outline">
                        <Trans>Filtrat</Trans>: {activePeriod}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => handlePeriodChange(LATEST_PERIOD_VALUE)}
                      >
                        <Trans>Șterge filtrul</Trans>
                      </Button>
                    </>
                  ) : null}
                </div>
              ) : null}
              {hub.coverage ? (
              <CoverageRibbon
                coverage={hub.coverage}
                latestDataPeriod={hub.latestDataPeriod}
                partialNote={
                  hub.partial
                    ? t`Rezultate parțiale — unele serii pot lipsi.`
                    : null
                }
              />
              ) : null}
            </header>

            <section className="space-y-3">
              <div>
                <h2 className="text-base font-semibold">
                  <Trans>Prezentare generală</Trans>
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  <Trans>Indicatorii afișează valorile disponibile pentru teritoriu, fără interpolarea perioadelor lipsă.</Trans>
                </p>
                {activePeriod ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    <Trans>
                      Reperele pe județ și pe țară sunt fapte despre ultima
                      perioadă, așa că nu apar cât timp filtrezi o perioadă
                      anume.
                    </Trans>
                  </p>
                ) : null}
              </div>
              {hub.tiles.length > 0 ? (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {hub.tiles.map((tile) => (
                    <IndicatorTile
                      key={tile.datasetCode}
                      tile={tile}
                      siruta={hub.identity.siruta}
                      {...(!activePeriod && hub.benchmarks[tile.datasetCode]
                        ? { benchmark: hub.benchmarks[tile.datasetCode] }
                        : {})}
                      countyCode={hub.identity.countyCode}
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
    </div>
  )
}
