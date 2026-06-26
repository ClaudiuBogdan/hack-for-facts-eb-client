import { Link } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { AlertTriangle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { useStatisticsLanding } from '../hooks/use-statistics'
import { CoverageRibbon } from '../components/coverage-ribbon'
import { DataStatusBadge } from '../components/data-status-badge'
import { FreshnessBadge } from '../components/freshness-badge'
import { RequestDatasetAction } from '../components/request-dataset-action'
import { ShareFilteredView } from '../components/share-filtered-view'

const TERRITORY_ENTRIES = [
  { siruta: '54975', label: t`Municipiul Cluj-Napoca` },
  { siruta: '179132', label: t`Municipiul București` },
] as const

function LandingSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-20 w-full" />
      <div className="grid gap-3 md:grid-cols-2">
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  )
}

export function StatisticsLandingPage() {
  const landingQuery = useStatisticsLanding()
  const landing = landingQuery.data
  const shouldShowLanding = Boolean(landing) && !landingQuery.isError

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 md:px-6">
        <header className="space-y-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold tracking-tight">
                <Trans>Statistici</Trans>
              </h1>
              <p className="max-w-3xl text-sm text-muted-foreground">
                <Trans>Date oficiale INS Tempo, ancorate în teritorii SIRUTA.</Trans>
              </p>
            </div>
            <ShareFilteredView />
          </div>
          {shouldShowLanding && landing ? (
            <CoverageRibbon
              coverage={landing.coverage}
              latestDataPeriod={landing.latestDataPeriod}
            />
          ) : null}
        </header>

        {landingQuery.isLoading ? <LandingSkeleton /> : null}

        {landingQuery.isError ? (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            <AlertTitle>
              <Trans>Nu am putut încărca statistica</Trans>
            </AlertTitle>
            <AlertDescription className="space-y-3">
              <p>
                <Trans>Încearcă din nou fără să pierzi adresa curentă.</Trans>
              </p>
              <Button variant="outline" size="sm" onClick={() => landingQuery.refetch()}>
                <Trans>Reîncearcă</Trans>
              </Button>
            </AlertDescription>
          </Alert>
        ) : null}

        {shouldShowLanding && landing?.topDatasets.length === 0 ? (
          <EmptyState
            title={t`Nu există seturi de afișat`}
            description={t`Catalogul INS nu a returnat seturi pentru această suprafață.`}
          />
        ) : null}

        {shouldShowLanding ? (
          <section className="space-y-4">
            <div>
              <h2 className="text-base font-semibold">
                <Trans>Alege un teritoriu</Trans>
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                <Trans>Prima versiune livrează hub-ul teritorial pentru exemple SIRUTA, cu aceleași contracte de date ca API-ul live.</Trans>
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {TERRITORY_ENTRIES.map((entry) => (
                <Link
                  key={entry.siruta}
                  to="/statistici/teritorii/$siruta"
                  params={{ siruta: entry.siruta }}
                  className="rounded-lg border border-border/70 p-4 text-sm transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <span className="block font-medium text-foreground">{entry.label}</span>
                  <span className="mt-1 block text-muted-foreground">
                    <Trans>SIRUTA</Trans> {entry.siruta}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {shouldShowLanding && landing ? (
          <section className="space-y-4">
            <div>
              <h2 className="text-base font-semibold">
                <Trans>Seturi INS prioritare</Trans>
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                <Trans>Codul matricei este afișat ca proveniență, nu ca etichetă principală.</Trans>
              </p>
            </div>
            <div className="rounded-lg border border-border/70">
              <div className="divide-y">
                {landing.topDatasets.map((dataset) => (
                  <div
                    key={dataset.code}
                    className="grid gap-3 px-4 py-4 md:grid-cols-[1fr_auto] md:items-center"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-medium">
                          {dataset.nameRo || dataset.nameEn || dataset.code}
                        </h3>
                        <DataStatusBadge status={dataset.dataStatus} />
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {dataset.code}
                        {dataset.contextNameRo ? ` · ${dataset.contextNameRo}` : ''}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 md:justify-end">
                      <FreshnessBadge period={dataset.latestPeriod} />
                      {dataset.dataStatus === 'catalog-only' ? (
                        <RequestDatasetAction
                          datasetCode={dataset.code}
                          datasetName={dataset.nameRo || dataset.nameEn}
                        />
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ) : null}
      </div>
    </main>
  )
}
