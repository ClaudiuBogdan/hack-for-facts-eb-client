import { useEffect, useRef } from 'react'
import { Link } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { Trans, useLingui } from '@lingui/react/macro'
import { AlertTriangle, X } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type {
  StatisticsLandingData,
  StatisticsLatestValue,
  StatisticsTerritorySearchRow,
  StatisticsUatSnapshot,
} from '@/schemas/statistics'
import { LANDING_NATIONAL_DATASETS } from '../../lib/landing-constants'
import { buildNationalComparison } from '../../lib/national-compare'
import { statisticsTheme } from '../../lib/statistics-theme'
import { TerritorySearch } from '../territory-search'
import { formatObservationValue, formatPercent } from '../../lib/format'
import { NationalStatTile, UatStatTile } from './landing-stat-tile'

type LandingHeroProps = {
  readonly searchTerm: string | undefined
  readonly onTermChange: (term: string | undefined) => void
  readonly onPickTerritory: (row: StatisticsTerritorySearchRow) => void
  readonly onClearPick: () => void
  readonly loc: string | undefined
  readonly landingData: StatisticsLandingData | undefined
  readonly landingDataError: boolean
  readonly landingDataLoading: boolean
  readonly onRetryLandingData: () => void
  readonly snapshot: StatisticsUatSnapshot | undefined
  readonly snapshotLoading: boolean
  readonly snapshotError: boolean
}

function TileGridSkeleton() {
  return (
    <div
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
      aria-busy="true"
      aria-label={t`Se încarcă indicatorii`}
    >
      {Array.from({ length: 4 }, (_, index) => (
        <Skeleton key={index} className="h-32 w-full" />
      ))}
    </div>
  )
}

/**
 * B1 — „România în cifre" + „Locul tău". The search is the hero control; the
 * band renders four national tiles by default and re-renders for the picked
 * UAT (`?loc=`), each tile carrying a one-line „față de România" comparison.
 */
export function LandingHero({
  searchTerm,
  onTermChange,
  onPickTerritory,
  onClearPick,
  loc,
  landingData,
  landingDataError,
  landingDataLoading,
  onRetryLandingData,
  snapshot,
  snapshotLoading,
  snapshotError,
}: LandingHeroProps) {
  const { i18n } = useLingui()
  const nationalByCode = new Map(
    (landingData?.nationalValues ?? []).map((value) => [value.datasetCode, value]),
  )
  const uatMode = Boolean(loc)
  const territoryName = snapshot?.territory?.name ?? null
  const countyName = snapshot?.territory?.countyName ?? null
  // Unknown but valid-shaped ?loc: the snapshot answers with no identity and
  // no values — an explicit state, never a titled empty grid.
  const unknownLoc =
    uatMode &&
    snapshot !== undefined &&
    snapshot.territory === null &&
    snapshot.values.length === 0

  // After a pick, focus moves to the band heading so the re-render is
  // announced and keyboard users land where the answer is.
  const headingRef = useRef<HTMLHeadingElement>(null)
  const previousLoc = useRef(loc)
  useEffect(() => {
    if (loc && loc !== previousLoc.current) {
      headingRef.current?.focus()
    }
    previousLoc.current = loc
  }, [loc])

  return (
    <section
      className="space-y-4"
      aria-labelledby="landing-hero-heading"
      aria-live="polite"
    >
      <div>
        <h2
          id="landing-hero-heading"
          ref={headingRef}
          tabIndex={-1}
          className={statisticsTheme.sectionTitle}
        >
          {uatMode && territoryName ? (
            <Trans>Locul tău în cifre</Trans>
          ) : (
            <Trans>România în cifre</Trans>
          )}
        </h2>
        <p className={statisticsTheme.sectionSubtitle}>
          <Trans>
            Caută localitatea ta ca să vezi aceleași cifre pentru ea, față de
            țară.
          </Trans>
        </p>
      </div>

      <TerritorySearch
        term={searchTerm}
        onTermChange={onTermChange}
        onSelectTerritory={onPickTerritory}
      />

      {uatMode ? (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-medium">
            {territoryName ?? <Trans>Teritoriu necunoscut</Trans>}
          </span>
          {countyName ? (
            <span className="text-muted-foreground">
              · <Trans>județul</Trans> {countyName}
            </span>
          ) : null}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 px-2 text-xs"
            onClick={onClearPick}
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
            <Trans>Înapoi la țară</Trans>
          </Button>
        </div>
      ) : null}

      {landingDataError && !uatMode ? (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          <AlertTitle>
            <Trans>Nu am putut încărca indicatorii naționali</Trans>
          </AlertTitle>
          <AlertDescription className="space-y-3">
            <Button variant="outline" size="sm" onClick={onRetryLandingData}>
              <Trans>Reîncearcă</Trans>
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      {snapshotError && uatMode ? (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          <AlertTitle>
            <Trans>Nu am putut încărca cifrele pentru acest teritoriu</Trans>
          </AlertTitle>
          <AlertDescription>
            <Trans>Cifrele naționale rămân disponibile mai jos.</Trans>
          </AlertDescription>
        </Alert>
      ) : null}

      {unknownLoc ? (
        <div className="rounded-lg border border-dashed border-border/70 p-4 text-sm text-muted-foreground">
          <p>
            <Trans>
              Nu am găsit un teritoriu INS pentru codul din adresă. Cifrele
              naționale rămân mai jos.
            </Trans>
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={onClearPick}
          >
            <Trans>Înapoi la țară</Trans>
          </Button>
        </div>
      ) : null}

      {(uatMode && snapshotLoading) || (!uatMode && landingDataLoading) ? (
        <TileGridSkeleton />
      ) : null}

      {uatMode && snapshot && !unknownLoc && loc ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {LANDING_NATIONAL_DATASETS.map((entry) => {
            const local = snapshot.values.find(
              (value) => value.datasetCode === entry.code,
            )
            if (!local) return null
            return (
              <UatStatTile
                key={entry.code}
                shortLabel={i18n._(entry.shortLabel)}
                latest={local}
                siruta={loc}
                comparison={
                  <ComparisonLine
                    local={local}
                    national={nationalByCode.get(entry.code)}
                  />
                }
              />
            )
          })}
        </div>
      ) : null}

      {!uatMode && landingData ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {LANDING_NATIONAL_DATASETS.map((entry) => {
            const latest = nationalByCode.get(entry.code)
            if (!latest) return null
            return (
              <NationalStatTile
                key={entry.code}
                shortLabel={i18n._(entry.shortLabel)}
                latest={latest}
              />
            )
          })}
        </div>
      ) : null}

      {!uatMode && landingData ? (
        <p className="text-xs text-muted-foreground">
          <Trans>Valori pentru întreaga țară, la cea mai recentă perioadă raportată.</Trans>
        </p>
      ) : null}

      {uatMode && loc ? (
        <p className="text-xs text-muted-foreground">
          <Link
            to="/statistici/teritorii/$siruta"
            params={{ siruta: loc }}
            className="font-medium text-primary underline-offset-2 hover:underline"
          >
            <Trans>Deschide profilul complet al teritoriului</Trans>
          </Link>
        </p>
      ) : null}
    </section>
  )
}

function ComparisonLine({
  local,
  national,
}: {
  readonly local: StatisticsLatestValue
  readonly national: StatisticsLatestValue | undefined
}) {
  const comparison = buildNationalComparison({ local, national })
  if (!comparison) return null

  if (comparison.kind === 'reference') {
    const formatted = formatObservationValue(comparison.nationalValue)
    if (formatted === null) return null
    return (
      <span className="text-xs text-muted-foreground">
        <Trans>România:</Trans>{' '}
        <span className="tabular-nums">
          {formatted}
          {comparison.unitSymbol ?? ''}
        </span>
      </span>
    )
  }

  return (
    <span className="text-xs text-muted-foreground">
      <span className="tabular-nums">
        {formatPercent(comparison.shareOfCountryPct)}
      </span>{' '}
      <Trans>din totalul României</Trans>
    </span>
  )
}
