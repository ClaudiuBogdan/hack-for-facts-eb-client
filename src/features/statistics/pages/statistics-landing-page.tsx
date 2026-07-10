import { Link, useNavigate } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { AlertTriangle, ArrowRight } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import type { StatisticsLandingSearch } from '@/schemas/statistics'
import { useStatisticsLanding } from '../hooks/use-statistics'
import { CoverageRibbon } from '../components/coverage-ribbon'
import { DataStatusBadge } from '../components/data-status-badge'
import { FreshnessBadge } from '../components/freshness-badge'
import { RequestDatasetAction } from '../components/request-dataset-action'
import { ShareFilteredView } from '../components/share-filtered-view'
import { TerritorySearch } from '../components/territory-search'

type StatisticsLandingPageProps = {
  readonly search: StatisticsLandingSearch
}

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

export function StatisticsLandingPage({ search }: StatisticsLandingPageProps) {
  const navigate = useNavigate()
  const landingQuery = useStatisticsLanding()
  const landing = landingQuery.data
  const shouldShowLanding = Boolean(landing) && !landingQuery.isError

  const handleTermChange = (q: string | undefined) => {
    void navigate({ to: '/statistici', search: q ? { q } : {} })
  }

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

        <TerritorySearch term={search.q} onTermChange={handleTermChange} />

        <section className="space-y-3">
          <h2 className="text-base font-semibold">
            <Trans>Explorează</Trans>
          </h2>
          <div className="grid gap-3 md:grid-cols-2">
            <ExploreCard
              to="/statistici/seturi"
              title={t`Toate seturile de date`}
              description={t`Caută în catalogul INS și vezi ce are date încărcate.`}
            />
            <ExploreCard
              to="/statistici/comparatii"
              title={t`Compară teritorii`}
              description={t`Pune până la șase localități față în față pe același indicator.`}
            />
          </div>
        </section>

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

function ExploreCard({
  to,
  title,
  description,
}: {
  readonly to: '/statistici/seturi' | '/statistici/comparatii'
  readonly title: string
  readonly description: string
}) {
  return (
    <Link
      to={to}
      className="group flex items-start justify-between gap-3 rounded-lg border border-border/70 p-4 text-sm transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <div>
        <span className="block font-medium text-foreground">{title}</span>
        <span className="mt-1 block text-muted-foreground">{description}</span>
      </div>
      <ArrowRight
        aria-hidden
        className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
      />
    </Link>
  )
}
