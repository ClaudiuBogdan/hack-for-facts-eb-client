import type { ReactNode } from 'react'
import { ArrowRight, Download, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { DetailObservationsTable } from '@/features/statistics/components/detail-observations-table'
import { PublishedText } from '@/features/statistics/components/published-text'
import { classificationTypeCode } from '@/features/statistics/lib/dataset-selection'
import { dimensionTypeLabel } from '@/features/statistics/lib/dimension-labels'
import { formatSourceDate } from '@/features/statistics/lib/format'
import { formatHubPeriod } from '@/features/statistics/lib/hub-format'
import { insTempoDatasetUrl } from '@/features/statistics/lib/ins-tempo'
import { periodicityLabel } from '@/features/statistics/lib/periodicity-labels'
import { statisticsTheme } from '@/features/statistics/lib/statistics-theme'
import { useDatasetPrototypeModel } from './dataset-detail.data'
import {
  DocumentNote,
  formatDerived,
  formatValue,
  PROTOTYPE_MARKER,
  PrototypeChart,
  RailControl,
  RailFact,
  seriesReading,
  VariantError,
  VariantSkeleton,
} from './dataset-detail.parts'

/**
 * Variant „combined" — the parts of the other four that survived the review.
 *
 * The spine is `workbench`: a standing selection rail on the left, a data
 * column on the right, so changing one axis never pushes the figure down the
 * page. Into that column go the pieces the other panes won on:
 *
 * - `workbench`'s own opening — the value LARGE, and the series' extremes,
 *   mean and count as a quiet fact row on the same baseline. The numbers that
 *   give „10" its scale sit beside it, not three sections below.
 * - `brief`'s marked extremes. The fact row says what the peak and trough ARE;
 *   the marks say WHERE they are. Neither answers the other's question.
 * - `editorial`'s area tint, which reads the line as a quantity rather than as
 *   a path — right for a count that has a meaningful zero.
 * - `report`'s reading text and numbered notes. The sentence and the
 *   definition sit under the figure, where a reader who has seen the shape
 *   comes looking for what it measures; methodology and the institute's own
 *   notes are numbered sections rather than a row of chevrons.
 *
 * The one thing deliberately NOT combined is `brief`'s „nothing is collapsed"
 * for the definition column: SOM101F's published definition runs some 1,500
 * words, so the prose here is measured (`max-w-prose`) and the table keeps its
 * own scroller instead of setting the page's height.
 */
export function DatasetDetailCombined({ code }: { readonly code: string }) {
  const model = useDatasetPrototypeModel(code)

  if (model.isLoading) return <VariantSkeleton />
  if (model.isError || !model.dataset) return <VariantError code={code} />

  const { dataset, stats, chart, unitLabel, unitWord, span, scope } = model
  const reading = seriesReading(stats, unitWord)
  const cadence = (dataset.periodicity ?? []).map(periodicityLabel).join(', ')
  const axes = (dataset.dimensions ?? []).filter((d) => d.type !== 'TEMPORAL')
  const sources = dataset.data_sources ?? []

  // Built as a list, then numbered: „2. Surse de date" under no „1." reads as
  // a section that failed to load rather than as one INS never published.
  const notes: readonly { readonly title: string; readonly body: ReactNode }[] =
    [
      dataset.methodology_ro
        ? {
            title: 'Metodologie',
            body: (
              <PublishedText
                text={dataset.methodology_ro}
                className={cn(statisticsTheme.prose, 'whitespace-pre-line')}
              />
            ),
          }
        : null,
      sources.length > 0
        ? {
            title: 'Surse de date',
            body: (
              <ul className={cn(statisticsTheme.prose, 'space-y-1')}>
                {sources.map((source) => (
                  <li key={source.name}>{source.name}</li>
                ))}
              </ul>
            ),
          }
        : null,
      dataset.observations_ro
        ? {
            title: 'Observații INS',
            body: (
              <PublishedText
                text={dataset.observations_ro}
                className={cn(statisticsTheme.prose, 'whitespace-pre-line')}
              />
            ),
          }
        : null,
      model.related.length > 0
        ? {
            title: `Seturi înrudite (${model.relatedTotalCount ?? model.related.length})`,
            body: (
              <ul className="space-y-1">
                {model.related.slice(0, 6).map((related) => (
                  <li key={related.code} className="text-sm">
                    <span className="font-mono text-xs tabular-nums text-muted-foreground">
                      {related.code}
                    </span>{' '}
                    <span className="text-muted-foreground">
                      {related.nameRo}
                    </span>
                  </li>
                ))}
              </ul>
            ),
          }
        : null,
    ].filter((note) => note !== null)

  return (
    <div
      className="mx-auto w-full max-w-6xl px-4 py-6 md:px-6"
      data-dev-marker={PROTOTYPE_MARKER}
    >
      <header className="border-b border-border/70 pb-4">
        <h1 className="text-balance text-xl font-semibold tracking-tight">
          {dataset.name_ro ?? dataset.code}
        </h1>
        <p className={cn(statisticsTheme.metaLine, 'mt-2')}>
          <span className={statisticsTheme.provenanceChip}>{dataset.code}</span>
          <span>INS Tempo</span>
          {cadence ? <span>{cadence}</span> : null}
          {dataset.context_name_ro ? (
            <span>{dataset.context_name_ro}</span>
          ) : null}
          <span className="tabular-nums">
            {span ? `${span.from}–${span.to}` : null}
          </span>
        </p>
      </header>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[15rem_minmax(0,1fr)]">
        {/* Sticky, so the axes stay reachable while the table and the notes
            scroll past — the move this layout exists to make cheap. */}
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <div className={cn(statisticsTheme.band, 'divide-y divide-border/70')}>
            <div className="px-4 py-2.5">
              <h2 className={statisticsTheme.sectionLabel}>Selecție</h2>
            </div>

            <RailControl
              label="Teritoriu"
              value={scope.territory ?? 'România'}
            />
            {axes.map((axis) => (
              <RailControl
                key={axis.index}
                label={axis.label_ro ?? dimensionTypeLabel(axis.type)}
                // Read off the rows, never assumed: a matrix with no „Total"
                // member resolves to something else entirely, and a rail that
                // says TOTAL anyway is lying about what is plotted.
                value={
                  axis.type === 'UNIT_OF_MEASURE'
                    ? (unitLabel ?? '—')
                    : (scope.members.find(
                        (member) =>
                          member.typeCode === classificationTypeCode(axis),
                      )?.valueName ?? '—')
                }
                fixed={axis.option_count === 1}
                count={axis.option_count}
              />
            ))}
            <RailControl label="Frecvență" value={cadence} fixed />

            <div className="px-4 py-3">
              <p className="text-xs text-muted-foreground">Interval de ani</p>
              <div className="mt-2 flex items-center gap-2">
                <span className="rounded-md border border-border/70 px-2 py-1 text-sm tabular-nums">
                  {span?.from}
                </span>
                <span className="text-muted-foreground">–</span>
                <span className="rounded-md border border-border/70 px-2 py-1 text-sm tabular-nums">
                  {span?.to}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2 px-4 py-3">
              <Button
                size="sm"
                variant="outline"
                className="w-full justify-start gap-2"
              >
                <Download className="h-3.5 w-3.5" aria-hidden />
                Descarcă CSV
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="w-full justify-start gap-2"
              >
                Compară teritorii
                <ArrowRight className="ml-auto h-3.5 w-3.5" aria-hidden />
              </Button>
            </div>
          </div>

          <p className="mt-3 px-1 text-xs leading-relaxed text-muted-foreground">
            Valorile marcate „implicit" au fost alese automat. Apasă pe ele ca
            să le schimbi.
          </p>
        </aside>

        <div className="min-w-0 space-y-8">
          <section className={statisticsTheme.band}>
            {/* The figure and the numbers that scale it, on one baseline. */}
            <div className="flex flex-wrap items-end justify-between gap-4 px-5 pt-5">
              <div>
                <p className={statisticsTheme.sectionLabel}>Ultima valoare</p>
                <p className="mt-1 flex items-baseline gap-2">
                  <span className="text-4xl font-semibold tabular-nums tracking-tight">
                    {stats.latest ? formatValue(stats.latest.value) : '—'}
                  </span>
                  {unitWord ? (
                    <span className="text-base text-muted-foreground">
                      {unitWord}
                    </span>
                  ) : null}
                  <span className="text-sm tabular-nums text-muted-foreground">
                    {stats.latest ? formatHubPeriod(stats.latest.period) : null}
                  </span>
                </p>
              </div>
              <dl className="flex flex-wrap items-end gap-x-6 gap-y-2">
                <RailFact label="minim" point={stats.trough} />
                <RailFact label="maxim" point={stats.peak} />
                <div>
                  <dt className="text-xs text-muted-foreground">medie</dt>
                  <dd className="text-sm font-medium tabular-nums">
                    {stats.mean === null ? '—' : formatDerived(stats.mean)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">observații</dt>
                  <dd className="text-sm font-medium tabular-nums">
                    {stats.count}
                  </dd>
                </div>
              </dl>
            </div>

            {chart ? (
              <div className="px-2 pb-4 pt-4 md:px-4">
                <PrototypeChart
                  series={chart}
                  unitLabel={unitLabel}
                  stats={stats}
                  area
                  annotate
                  mean
                  height="h-80"
                />
              </div>
            ) : null}

            <div className={statisticsTheme.bandFooter}>
              <p className={statisticsTheme.metaLine}>
                <span>Sursă: INS Tempo</span>
                <span>
                  matricea{' '}
                  <span className="font-mono tabular-nums">{dataset.code}</span>
                </span>
                {dataset.source_last_update ? (
                  <span className="tabular-nums">
                    actualizată {formatSourceDate(dataset.source_last_update)}
                  </span>
                ) : null}
                <a
                  href={insTempoDatasetUrl(dataset.code, 'ro')}
                  target="_blank"
                  rel="noreferrer"
                  className="-mx-1 inline-flex items-center gap-1 rounded-sm px-1 py-1 font-medium underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Deschide pe INS Tempo
                  <ExternalLink className="h-3 w-3" aria-hidden />
                </a>
              </p>
            </div>
          </section>

          {/* What the shape says, then what it measures. Both read AFTER the
              figure: a definition before the number is an obstacle, and after
              it is an answer. */}
          <section className="space-y-3">
            {reading ? (
              <p className="text-base leading-relaxed">
                <span className="font-semibold tabular-nums">
                  {reading.figure}
                </span>
                {reading.unit ? ` ${reading.unit}` : null} {reading.clause}
              </p>
            ) : null}
            {dataset.definition_ro ? (
              <p className={statisticsTheme.prose}>{dataset.definition_ro}</p>
            ) : null}
          </section>

          <section className="space-y-2">
            <div className="flex items-baseline justify-between gap-2">
              <h2 className={statisticsTheme.sectionLabel}>Tabelul seriei</h2>
              <p className="text-xs tabular-nums text-muted-foreground">
                {model.rows.length} rânduri
              </p>
            </div>
            {/* Its own scroller: a 197-row matrix must not set the height of
                the page the notes below it live on. */}
            <div className="max-h-[28rem] overflow-auto">
              <DetailObservationsTable
                observations={model.rows}
                sourceDescriptor={model.sourceDescriptor}
              />
            </div>
          </section>

          {notes.length > 0 ? (
            <section className="space-y-5 border-t border-border/70 pt-6">
              <h2 className={statisticsTheme.sectionLabel}>Note</h2>
              {notes.map((note, index) => (
                <DocumentNote
                  key={note.title}
                  index={index + 1}
                  title={note.title}
                >
                  {note.body}
                </DocumentNote>
              ))}
            </section>
          ) : null}
        </div>
      </div>
    </div>
  )
}
