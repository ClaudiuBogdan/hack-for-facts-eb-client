import { useMemo } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Trans } from '@lingui/react/macro'
import { Skeleton } from '@/components/ui/skeleton'
import { createLogger } from '@/lib/logger'
import type {
  StatisticsLandingCatalog,
  StatisticsLandingData,
  StatisticsLandingSearch,
  StatisticsTerritorySearchRow,
} from '@/schemas/statistics'
import {
  useStatisticsLandingCatalog,
  useStatisticsLandingData,
  useStatisticsUatSnapshot,
} from '../hooks/use-statistics'
import { buildDecadeStory } from '../lib/decade'
import { buildLandingExample } from '../lib/landing-example'
import {
  DECADE_END_YEAR,
  DECADE_START_YEAR,
} from '../lib/landing-constants'
import { statisticsTheme } from '../lib/statistics-theme'
import { LandingDecadeSection } from '../components/landing/landing-decade-section'
import { LandingExampleCard } from '../components/landing/landing-example-card'
import { LandingHero } from '../components/landing/landing-hero'
import { LandingHonestySection } from '../components/landing/landing-honesty-section'
import { LandingThemesSection } from '../components/landing/landing-themes-section'
import { ShareFilteredView } from '../components/share-filtered-view'

const logger = createLogger('statistics-landing')

type StatisticsLandingPageProps = {
  readonly search: StatisticsLandingSearch
  readonly initialLandingData?: StatisticsLandingData
  readonly initialLandingCatalog?: StatisticsLandingCatalog
}

/**
 * The statistici landing. The app shell owns the <main> landmark — this page
 * renders bands only. Two aggregates, two query keys: a failing POST degrades
 * its own bands, never the page.
 */
export function StatisticsLandingPage({
  search,
  initialLandingData,
  initialLandingCatalog,
}: StatisticsLandingPageProps) {
  const navigate = useNavigate()
  const landingDataQuery = useStatisticsLandingData(initialLandingData)
  const catalogQuery = useStatisticsLandingCatalog(initialLandingCatalog)
  const loc = typeof search.loc === 'string' ? search.loc : undefined
  const snapshotQuery = useStatisticsUatSnapshot(loc)

  const decadeStory = useMemo(() => {
    if (!landingDataQuery.data) return null
    return buildDecadeStory({
      rows: landingDataQuery.data.decadeRows,
      startYear: DECADE_START_YEAR,
      endYear: DECADE_END_YEAR,
    })
  }, [landingDataQuery.data])

  const example = useMemo(() => {
    if (!landingDataQuery.data) return null
    const built = buildLandingExample(landingDataQuery.data.exampleRows)
    if (built && built.ambiguousCellCount > 0) {
      // No silent caps: the example dataset grew a classification dimension
      // upstream and cells became ambiguous — the card degrades VISIBLY.
      logger.warn('Landing example rejected ambiguous cells', {
        ambiguousCellCount: built.ambiguousCellCount,
      })
    }
    return built
  }, [landingDataQuery.data])

  const handleTermChange = (q: string | undefined) => {
    void navigate({
      to: '/statistici',
      search: {
        ...(q ? { q } : {}),
        ...(loc ? { loc } : {}),
      },
    })
  }

  const handlePickTerritory = (row: StatisticsTerritorySearchRow) => {
    if (!row.siruta) return
    void navigate({ to: '/statistici', search: { loc: row.siruta } })
  }

  const handleClearPick = () => {
    void navigate({
      to: '/statistici',
      search: typeof search.q === 'string' ? { q: search.q } : {},
    })
  }

  return (
    <div className="min-h-screen bg-background">
      <div className={statisticsTheme.page}>
        <header className="space-y-2">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold tracking-tight">
                <Trans>Statistici</Trans>
              </h1>
              <p className="max-w-3xl text-sm text-muted-foreground">
                <Trans>
                  Date oficiale INS Tempo pentru fiecare localitate, județ și
                  pentru întreaga țară.
                </Trans>
              </p>
            </div>
            <ShareFilteredView />
          </div>
        </header>

        <LandingHero
          searchTerm={typeof search.q === 'string' ? search.q : undefined}
          onTermChange={handleTermChange}
          onPickTerritory={handlePickTerritory}
          onClearPick={handleClearPick}
          loc={loc}
          landingData={landingDataQuery.data}
          landingDataError={landingDataQuery.isError}
          landingDataLoading={landingDataQuery.isLoading}
          onRetryLandingData={() => void landingDataQuery.refetch()}
          snapshot={snapshotQuery.data}
          snapshotLoading={Boolean(search.loc) && snapshotQuery.isLoading}
          snapshotError={snapshotQuery.isError}
        />

        {landingDataQuery.isLoading ? (
          <div className="space-y-4" aria-busy="true">
            <Skeleton className="h-8 w-72" />
            <div className="grid gap-4 md:grid-cols-2">
              <Skeleton className="h-64" />
              <Skeleton className="h-64" />
            </div>
            <Skeleton className="h-48 w-full" />
          </div>
        ) : (
          <>
            <LandingDecadeSection
              story={decadeStory}
              unitLabel={
                landingDataQuery.data?.decadeRows.find((row) => row.unitNameRo)
                  ?.unitNameRo ?? null
              }
            />

            <LandingExampleCard example={example} />
          </>
        )}

        {catalogQuery.isError ? (
          <p className="text-sm text-muted-foreground">
            <Trans>
              Temele nu au putut fi încărcate — catalogul complet rămâne
              disponibil în explorator.
            </Trans>
          </p>
        ) : (
          <LandingThemesSection catalog={catalogQuery.data} />
        )}

        <LandingHonestySection
          catalog={catalogQuery.data}
          catalogError={catalogQuery.isError}
        />
      </div>
    </div>
  )
}
