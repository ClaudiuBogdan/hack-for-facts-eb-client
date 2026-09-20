import { ArrowRight, ChevronDown, Download, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { DetailObservationsTable } from '@/features/statistics/components/detail-observations-table'
import { formatSourceDate } from '@/features/statistics/lib/format'
import { formatHubPeriod } from '@/features/statistics/lib/hub-format'
import { insTempoDatasetUrl } from '@/features/statistics/lib/ins-tempo'
import { periodicityLabel } from '@/features/statistics/lib/periodicity-labels'
import { statisticsTheme } from '@/features/statistics/lib/statistics-theme'
import { classificationTypeCode } from '@/features/statistics/lib/dataset-selection'
import { dimensionTypeLabel } from '@/features/statistics/lib/dimension-labels'
import { useDatasetPrototypeModel } from './dataset-detail.data'
import {
  formatValue,
  PROTOTYPE_MARKER,
  PrototypeChart,
  seriesSentence,
  VariantError,
  VariantSkeleton,
} from './dataset-detail.parts'

/**
 * Variant „workbench" — the selection is a rail, the data is the page.
 *
 * The premise: this page is used twice. Once to read a number, and then many
 * times to move around inside the same matrix — another county, another
 * classification, another window. Today every one of those moves goes through
 * a chip row that sits above the figure and pushes it down.
 *
 * So the axes become a standing left rail: every axis visible at once, each
 * naming its current value, the window and the actions underneath. The right
 * column is nothing but data — figure, then the table, open, because a reader
 * who is comparing selections is reading rows, not chevrons.
 */
export function DatasetDetailWorkbench({ code }: { readonly code: string }) {
  const model = useDatasetPrototypeModel(code)

  if (model.isLoading) return <VariantSkeleton />
  if (model.isError || !model.dataset) return <VariantError code={code} />

  const { dataset, stats, chart, unitLabel, unitWord, span, scope } = model
  const sentence = seriesSentence(stats, unitWord)
  const cadence = (dataset.periodicity ?? []).map(periodicityLabel).join(', ')
  const axes = (dataset.dimensions ?? []).filter((d) => d.type !== 'TEMPORAL')

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
          {dataset.context_name_ro ? <span>{dataset.context_name_ro}</span> : null}
          <span className="tabular-nums">
            {span ? `${span.from}–${span.to}` : null}
          </span>
        </p>
      </header>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[15rem_minmax(0,1fr)]">
        {/* The rail. Sticky, so the axes stay reachable while the table
            scrolls — the move this layout exists to make cheap. */}
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
              <p className="text-xs font-medium text-muted-foreground">
                Interval de ani
              </p>
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
              <Button size="sm" variant="outline" className="w-full justify-start gap-2">
                <Download className="h-3.5 w-3.5" aria-hidden />
                Descarcă CSV
              </Button>
              <Button size="sm" variant="outline" className="w-full justify-start gap-2">
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

        <div className="min-w-0 space-y-6">
          <section className={statisticsTheme.band}>
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
                    {stats.mean === null ? '—' : formatValue(stats.mean)}
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
                  treatment="plain"
                  mean
                  height="h-72"
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
                  className="-mx-1 inline-flex items-center gap-1 rounded-sm px-1 py-1 font-medium underline-offset-4 hover:text-foreground hover:underline"
                >
                  Deschide pe INS Tempo
                  <ExternalLink className="h-3 w-3" aria-hidden />
                </a>
              </p>
            </div>
          </section>

          {sentence ? (
            <p className="text-sm leading-relaxed text-muted-foreground">
              {sentence}
            </p>
          ) : null}

          {/* Open, not behind a chevron: this column exists to be read. */}
          <section className="space-y-2">
            <div className="flex items-baseline justify-between gap-2">
              <h2 className={statisticsTheme.sectionLabel}>Tabelul seriei</h2>
              <p className="text-xs tabular-nums text-muted-foreground">
                {model.rows.length} rânduri
              </p>
            </div>
            <div className="max-h-[28rem] overflow-auto">
              <DetailObservationsTable
                observations={model.rows}
                sourceDescriptor={model.sourceDescriptor}
              />
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

function RailControl({
  label,
  value,
  fixed,
  count,
}: {
  readonly label: string
  readonly value: string
  readonly fixed?: boolean
  readonly count?: number | null
}) {
  const content = (
    <>
      <span className="flex min-w-0 flex-col items-start">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="mt-0.5 w-full truncate text-left text-sm font-medium">
          {value}
        </span>
      </span>
      {fixed ? null : (
        <span className="ml-2 flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
          {count ? <span className="tabular-nums">{count}</span> : null}
          <ChevronDown className="h-3.5 w-3.5" aria-hidden />
        </span>
      )}
    </>
  )

  if (fixed) {
    return (
      <div className="flex items-center justify-between px-4 py-2.5">
        {content}
      </div>
    )
  }

  return (
    <button
      type="button"
      className="flex w-full items-center justify-between px-4 py-2.5 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
    >
      {content}
    </button>
  )
}

function RailFact({
  label,
  point,
}: {
  readonly label: string
  readonly point: { readonly value: number; readonly period: string } | null
}) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium tabular-nums">
        {point ? formatValue(point.value) : '—'}
        {point ? (
          <span className="ml-1 font-normal text-muted-foreground">
            {formatHubPeriod(point.period)}
          </span>
        ) : null}
      </dd>
    </div>
  )
}
