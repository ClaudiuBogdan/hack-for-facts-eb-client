import { sourceRowSelection } from '@/lib/ins/source-series'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { AlertTriangle, ArrowRight } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { InsDatasetDetails, InsDimension } from '@/schemas/ins'
import type {
  StatisticsDatasetDetailSearch,
  StatisticsLatestValue,
  StatisticsRelatedDataset,
} from '@/schemas/statistics'
import { useScopeLabels } from '../hooks/use-scope-labels'
import {
  classificationTypeCode,
  DETAIL_PAGE_SIZE,
  type DetailSearchPatch,
  type EffectiveScope,
} from '../lib/dataset-selection'
import { buildCompareSearch } from '../lib/detail-compare-link'
import type { ResolvedDatasetSeries } from '../lib/detail-series-resolution'
import { deriveDetailSeriesView } from '../lib/detail-series-view'
import { statisticsTheme } from '../lib/statistics-theme'
import { hasAnyValue } from '../lib/time-series'
import { parseWireDecimal } from '../lib/value-status'
import { DetailAccordion } from './detail-accordion'
import { DetailDefinition } from './detail-definition'
import { DetailEmptyState } from './detail-empty-state'
import { DetailExportButton, DetailExportNote } from './detail-export-button'
import { DetailMetadataSection } from './detail-metadata-section'
import { DetailObservationsChart } from './detail-observations-chart'
import { DetailScopePrompt } from './detail-scope-prompt'
import { DetailScopeSentence } from './detail-scope-sentence'
import { DetailSeriesSummary } from './detail-series-summary'
import { DetailSeriesSkeleton } from './detail-skeletons'
import { DetailTier0Hero } from './detail-tier0-hero'

/** What the body reads off the series query. */
export type DetailSeriesQuery = {
  readonly data: ResolvedDatasetSeries | undefined
  readonly isPending: boolean
  readonly isError: boolean
  readonly isSuccess: boolean
  readonly refetch: () => unknown
}

type Props = {
  readonly dataset: InsDatasetDetails
  /** The definition in the reader's language, when INS published one. */
  readonly definition: string | null
  readonly search: StatisticsDatasetDetailSearch
  readonly scope: EffectiveScope
  readonly latest: StatisticsLatestValue | null
  readonly seriesQuery: DetailSeriesQuery
  readonly canDerive: boolean
  /** True when this page, not the server, chose the axes the series shows. */
  readonly representativeDefaults: boolean
  readonly unresolvedDimensions: readonly InsDimension[]
  readonly related: readonly StatisticsRelatedDataset[]
  readonly relatedTotalCount: number | null
  readonly onSearchChange: (patch: DetailSearchPatch) => void
}

/**
 * The rail, the series band, the definition, the notes and the appendix:
 * everything under the header once the dataset is known and has data.
 *
 * The band's facts are one pure derivation (`deriveDetailSeriesView`) and
 * its labels one hook (`useScopeLabels`); this component only lays them out.
 */
export function DetailBody({
  dataset,
  definition,
  search,
  scope,
  latest,
  seriesQuery,
  canDerive,
  representativeDefaults,
  unresolvedDimensions,
  related,
  relatedTotalCount,
  onSearchChange,
}: Props) {
  const answered = seriesQuery.isSuccess
  const series = seriesQuery.data?.series ?? undefined
  const view = deriveDetailSeriesView({ series, scope, canDerive, search, answered })
  const labels = useScopeLabels({ dataset, scope, sampleRow: view.sampleRow, answered })

  const missingClassificationLabels = unresolvedDimensions.map(
    (dimension) =>
      dimension.classification_type?.name_ro ??
      dimension.label_ro ??
      classificationTypeCode(dimension),
  )
  if (scope.unitCode === null) missingClassificationLabels.push(t`Unitate de măsură`)
  if (scope.periodicity === null) missingClassificationLabels.push(t`Frecvență`)

  const hasGeographyAxis = dataset.dimensions.some((dimension) => dimension.type === 'TERRITORIAL')
  const compareSearch = buildCompareSearch({
    dataset,
    scope,
    sampleRow: view.sampleRow,
    periodicity: view.periodicity,
    complete: missingClassificationLabels.length === 0,
  })

  // A read that answered with nothing is a fact to name, not a selection to
  // finish; the prompt is for a selection the rows can still complete — and
  // while the read is still resolving, nothing is known to prompt about.
  const showPrompt =
    !seriesQuery.isPending && (!canDerive || scope.periodicity === null) && view.emptyReason === null

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
      {/*
        The selection is a standing rail, not a strip above the figure.

        This page is used twice: once to read a number, then many times to move
        around inside the same matrix — another county, another classification,
        another window. Sticky on the left, the axes stay reachable while the
        notes and the table scroll past, and the figure never moves.

        Tier 1 renders WHENEVER the dataset is loaded: the scope controls are
        the way OUT of an unresolved state, so they can never hide behind it.
        On a phone the rail becomes the shared bottom sheet — six axes never
        become six popovers.
      */}
      <aside className="lg:sticky lg:top-6 lg:self-start">
        <DetailScopeSentence
          dataset={dataset}
          search={search}
          scope={scope}
          canDerive={canDerive}
          unresolvedDimensions={unresolvedDimensions}
          territoryLabel={labels.territoryLabel}
          classificationLabels={labels.classificationLabels}
          unitLabel={labels.unitLabel}
          observedSpan={view.observedSpan}
          yearWindow={view.yearWindow}
          yearWindowPinned={view.yearWindowPinned}
          onChange={onSearchChange}
        />
      </aside>

      <div className="min-w-0 space-y-8">
        <section className={statisticsTheme.band}>
          <div className={cn(statisticsTheme.bandBody, 'space-y-5')}>
            {showPrompt ? (
              <DetailScopePrompt missingClassificationLabels={missingClassificationLabels} />
            ) : null}

            {seriesQuery.isPending ? <DetailSeriesSkeleton /> : null}

            {seriesQuery.isError ? (
              <>
                {/* POST B failing must not discard POST A: the resolved latest
                    value stays on screen, the retry sits beside it. */}
                {canDerive && latest && latest.hasData ? (
                  <DetailTier0Hero
                    latest={latest}
                    matchChip={representativeDefaults ? 'representative' : null}
                  />
                ) : null}
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                  <AlertTitle>
                    <Trans>Nu am putut încărca seria de date</Trans>
                  </AlertTitle>
                  <AlertDescription className="space-y-3">
                    <Button variant="outline" size="sm" onClick={() => void seriesQuery.refetch()}>
                      <Trans>Reîncearcă</Trans>
                    </Button>
                  </AlertDescription>
                </Alert>
              </>
            ) : null}

            {answered && view.latestSourceRow ? (
              <DetailSeriesSummary
                stats={view.windowStats}
                unitWord={labels.summaryUnitWord}
                valueStatus={view.latestSourceRow.value_status ?? null}
                absent={
                  // The latest PUBLISHED cell, not the latest readable one.
                  parseWireDecimal(view.latestSourceRow.value) === null
                    ? {
                        period: view.latestSourceRow.time_period.iso_period,
                        valueStatus: view.latestSourceRow.value_status ?? null,
                      }
                    : null
                }
                matchChip={representativeDefaults ? 'representative' : null}
              />
            ) : null}

            {answered &&
            canDerive &&
            scope.periodicity !== null &&
            view.sourceUnavailable &&
            view.emptyReason === null ? (
              <Alert>
                <AlertTitle>
                  <Trans>Seria necesită o selecție din sursă</Trans>
                </AlertTitle>
                <AlertDescription>
                  <Trans>
                    Observațiile includ alternative sau calificări geografice.
                    Inspectează datele din tabel înainte de a le compara.
                  </Trans>
                </AlertDescription>
              </Alert>
            ) : null}

            {view.yearWindowOutside && view.observedSpan ? (
              <div role="status" className={cn(statisticsTheme.note, 'flex flex-wrap items-center justify-between gap-3')}>
                <span>
                  {view.yearWindowOutside.from === view.yearWindowOutside.to ? (
                    <Trans>
                      Anul {view.yearWindowOutside.from} din adresă este în afara seriei; se arată tot
                      intervalul {view.observedSpan.from}–{view.observedSpan.to}.
                    </Trans>
                  ) : (
                    <Trans>
                      Anii {view.yearWindowOutside.from}–{view.yearWindowOutside.to} din adresă sunt
                      în afara seriei; se arată tot intervalul {view.observedSpan.from}–
                      {view.observedSpan.to}.
                    </Trans>
                  )}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onSearchChange({ din: undefined, pana: undefined })}
                >
                  <Trans>Șterge anii din adresă</Trans>
                </Button>
              </div>
            ) : null}

            {view.emptyReason ? (
              <DetailEmptyState
                reason={view.emptyReason}
                yearWindow={view.yearWindow}
                observedSpan={view.observedSpan}
                onSearchChange={onSearchChange}
              />
            ) : null}

            {view.chartSeries && hasAnyValue(view.chartSeries) ? (
              <DetailObservationsChart
                series={view.chartSeries}
                title={t`Evoluție în timp`}
                // The same word the figure uses — „număr", „%" — not
                // INS's own spelling of the unit („Numar").
                unitLabel={labels.summaryUnitWord || labels.unitLabel || null}
                // The extremes the summary names are marked where they
                // happened; the mean gives the line a reference; the tint
                // reads the series as a quantity rather than a path.
                area
                annotate
                mean
                stats={view.windowStats}
                height="h-80"
              />
            ) : null}

            {series?.inspectionTruncated ? (
              <p role="status" className={statisticsTheme.note}>
                <Trans>
                  Sunt disponibile mai multe observații. Tabelul arată o
                  pagină de explorare; restrânge selecția sau alege seria unui
                  rând pentru istoricul complet.
                </Trans>
              </p>
            ) : null}
          </div>

          {/* What the reader can take away, in the band's own closing strip:
              the export's note opposite the actions. The strip lays out on
              its OWN width — a container query, not a breakpoint: beside the
              rail at 1024px the band is narrower than a phone in landscape.
              Comparing territories is offered only where the matrix has a
              territory to vary — a national series has one. */}
          {answered && series ? (
            <div className="@container border-t border-border/70 px-4 py-3 md:px-5">
              <div className="flex flex-col gap-3 @2xl:flex-row @2xl:items-center @2xl:justify-between @2xl:gap-6">
                {view.windowedRows.length > 0 ? (
                  <div className="min-w-0 max-w-md">
                    <DetailExportNote complete={view.completeSourceSelection} />
                  </div>
                ) : null}
                <div className="flex shrink-0 flex-wrap items-center gap-2 @2xl:ml-auto">
                  <DetailExportButton
                    datasetCode={dataset.code}
                    sourceDescriptor={series.sourceDescriptor}
                    observations={view.windowedRows}
                    disabled={view.windowedRows.length === 0}
                    complete={view.completeSourceSelection}
                    showNote={false}
                  />
                  {hasGeographyAxis ? (
                    <Button variant="outline" size="sm" asChild className="gap-1.5">
                      <Link to="/ins/comparatii" search={compareSearch}>
                        <Trans>Compară teritorii</Trans>
                        <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </Link>
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}
        </section>

        {/* What the matrix measures, read AFTER the figure: a definition before
            the number is an obstacle, and after it is an answer. */}
        {definition ? <DetailDefinition text={definition} /> : null}

        {/* What INS publishes about the matrix: rendered whatever the series
            state, because methodology and continuity explain the data even when
            the selection is unresolved. */}
        <DetailMetadataSection dataset={dataset} />

        {/* The appendix, LAST: the table, the axes, the coverage and the related
            sets are what a reader consults once the figure and the notes have
            told them what they are looking at. */}
        {answered && series ? (
          <DetailAccordion
            dataset={dataset}
            sourceDescriptor={series.sourceDescriptor}
            observations={view.windowedRows}
            observedSpan={view.observedSpan}
            related={related}
            relatedTotalCount={relatedTotalCount}
            page={Math.min(
              Math.max(1, typeof search.pagina === 'number' ? search.pagina : 1),
              Math.max(1, Math.ceil(view.windowedRows.length / DETAIL_PAGE_SIZE)),
            )}
            compareSearch={hasGeographyAxis ? compareSearch : null}
            onSelectSource={
              series.sourceDescriptor
                ? (observation) => {
                    const selected = sourceRowSelection(series.sourceDescriptor, observation)
                    if (selected)
                      onSearchChange({
                        // Empty means „no pins", and the canonical way to say
                        // that is to leave the parameter out — the same
                        // normalisation `editSourcePin` does when the last pin
                        // is cleared. A matrix with no classification axes
                        // would otherwise get `?clasificari=[]` in its URL.
                        clasificari:
                          selected.clasificari.length > 0 ? [...selected.clasificari] : undefined,
                        unitate: selected.unitate,
                        pagina: undefined,
                        // The row pins every axis, its geography included,
                        // and a pinned geography names the territory itself.
                        ...(hasGeographyAxis ? { teritoriu: undefined } : {}),
                      })
                  }
                : undefined
            }
            onPageChange={(next) => onSearchChange({ pagina: next > 1 ? next : undefined })}
          />
        ) : null}
      </div>
    </div>
  )
}
