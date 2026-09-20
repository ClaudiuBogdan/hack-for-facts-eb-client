import { ArrowRight, Download, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { DetailObservationsTable } from '@/features/statistics/components/detail-observations-table'
import { PublishedText } from '@/features/statistics/components/published-text'
import { formatSourceDate } from '@/features/statistics/lib/format'
import { formatHubPeriod } from '@/features/statistics/lib/hub-format'
import { insTempoDatasetUrl } from '@/features/statistics/lib/ins-tempo'
import { periodicityLabel } from '@/features/statistics/lib/periodicity-labels'
import { statisticsTheme } from '@/features/statistics/lib/statistics-theme'
import { dimensionTypeLabel } from '@/features/statistics/lib/dimension-labels'
import { useDatasetPrototypeModel } from './dataset-detail.data'
import {
  Delta,
  formatValue,
  PROTOTYPE_MARKER,
  PrototypeChart,
  seriesSentence,
  StatTile,
  VariantError,
  VariantSkeleton,
} from './dataset-detail.parts'

/**
 * Variant „brief" — everything the matrix says, on one screen, no chevrons.
 *
 * The premise: the production page hides eight sections behind eight identical
 * closed rows. Each one is cheap to open and expensive to find, and the reader
 * cannot tell from the outside which of them holds the thing they came for.
 *
 * So nothing here is collapsed. A stat band carries the summary, the figure
 * runs full width under it, and the two things that were accordion rows —
 * the series table and what INS publishes about the matrix — become two
 * columns, read rather than opened. The bet: for a 3-axis annual matrix the
 * whole page fits, and the disclosure ladder was solving a problem the small
 * matrices do not have.
 */
export function DatasetDetailBrief({ code }: { readonly code: string }) {
  const model = useDatasetPrototypeModel(code)

  if (model.isLoading) return <VariantSkeleton />
  if (model.isError || !model.dataset) return <VariantError code={code} />

  const { dataset, stats, chart, unitLabel, unitWord, span, scope } = model
  const sentence = seriesSentence(stats, unitWord)
  const cadence = (dataset.periodicity ?? []).map(periodicityLabel).join(', ')

  return (
    <div
      className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 md:px-6"
      data-dev-marker={PROTOTYPE_MARKER}
    >
      <header>
        <h1 className="text-balance text-2xl font-semibold tracking-tight">
          {dataset.name_ro ?? dataset.code}
        </h1>
        <p className={cn(statisticsTheme.metaLine, 'mt-2')}>
          <span className={statisticsTheme.provenanceChip}>{dataset.code}</span>
          <span>INS Tempo</span>
          {cadence ? <span>{cadence}</span> : null}
          {dataset.context_name_ro ? <span>{dataset.context_name_ro}</span> : null}
        </p>
        {sentence ? (
          <p className="mt-3 max-w-prose text-base leading-relaxed">{sentence}</p>
        ) : null}
      </header>

      {/* The stat band. One tile is the figure, the rest are its scale. Four
          numbers a reader can compare at a glance beat one number they have to
          take on trust. */}
      <section
        className={cn(
          statisticsTheme.band,
          'grid grid-cols-2 divide-x divide-y divide-border/70 sm:grid-cols-3 lg:grid-cols-5 lg:divide-y-0',
        )}
      >
        <StatTile
          accent
          label="Ultima valoare"
          value={stats.latest ? formatValue(stats.latest.value) : '—'}
          caption={
            stats.latest
              ? `${formatHubPeriod(stats.latest.period)}${unitLabel ? ` · ${unitLabel}` : ''}`
              : null
          }
        />
        <StatTile
          label="Față de perioada anterioară"
          value={<Delta percent={stats.changeVsPrevious} label="" className="text-lg" />}
          caption={
            stats.previous
              ? `${formatValue(stats.previous.value)} în ${formatHubPeriod(stats.previous.period)}`
              : null
          }
        />
        <StatTile
          label="Maxim"
          value={stats.peak ? formatValue(stats.peak.value) : '—'}
          caption={stats.peak ? formatHubPeriod(stats.peak.period) : null}
        />
        <StatTile
          label="Minim"
          value={stats.trough ? formatValue(stats.trough.value) : '—'}
          caption={stats.trough ? formatHubPeriod(stats.trough.period) : null}
        />
        <StatTile
          label="Acoperire"
          value={span ? `${span.from}–${span.to}` : '—'}
          caption={[`${stats.count} observații`, scope.territory]
            .filter(Boolean)
            .join(' · ')}
        />
      </section>

      {chart ? (
        <section className={statisticsTheme.band}>
          <div className={statisticsTheme.bandHeader}>
            <h2 className={statisticsTheme.sectionLabel}>Evoluție în timp</h2>
            <p className="text-xs text-muted-foreground">{unitLabel}</p>
          </div>
          <div className="px-2 py-4 md:px-4">
            <PrototypeChart
              series={chart}
              unitLabel={unitLabel}
              stats={stats}
              annotate
              height="h-80"
            />
          </div>
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
            <div className="flex shrink-0 items-center gap-2">
              <Button size="sm" variant="outline" className="gap-1.5">
                <Download className="h-3.5 w-3.5" aria-hidden />
                CSV
              </Button>
              <Button size="sm" variant="outline" className="gap-1.5">
                Compară teritorii
                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Button>
            </div>
          </div>
        </section>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <section className="min-w-0 space-y-2">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className={statisticsTheme.sectionLabel}>Tabelul seriei</h2>
            <p className="text-xs tabular-nums text-muted-foreground">
              {model.rows.length} rânduri
            </p>
          </div>
          {/* One scroller, one border: `DetailObservationsTable` brings its own
              frame, so the wrapper only caps the height. `overflow-auto` — not
              `overflow-y-auto` — or the table's own horizontal scroller is
              defeated and the PAGE scrolls sideways on a phone. */}
          <div className="max-h-[32rem] overflow-auto">
            <DetailObservationsTable
              observations={model.rows}
              sourceDescriptor={model.sourceDescriptor}
            />
          </div>
        </section>

        {/* What was three accordion rows, as one readable column. */}
        <aside className="space-y-6">
          <section className="space-y-1.5">
            <h2 className={statisticsTheme.sectionLabel}>Ce măsoară</h2>
            <p className={statisticsTheme.prose}>{dataset.definition_ro}</p>
          </section>

          <section className="space-y-1.5">
            <h2 className={statisticsTheme.sectionLabel}>Axe</h2>
            <ul className="divide-y divide-border/70 rounded-lg border border-border/70">
              {(dataset.dimensions ?? []).map((dimension) => (
                <li
                  key={dimension.index}
                  className="flex items-baseline justify-between gap-3 px-3 py-2 text-sm"
                >
                  <span className="min-w-0 truncate">
                    {dimension.label_ro ?? `#${dimension.index}`}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {dimensionTypeLabel(dimension.type)} ·{' '}
                    <span className="tabular-nums">{dimension.option_count}</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>

          {dataset.methodology_ro ? (
            <section className="space-y-1.5">
              <h2 className={statisticsTheme.sectionLabel}>Metodologie</h2>
              <PublishedText
                text={dataset.methodology_ro}
                className={cn(statisticsTheme.prose, 'whitespace-pre-line')}
              />
            </section>
          ) : null}

          {dataset.observations_ro ? (
            <section className="space-y-1.5">
              <h2 className={statisticsTheme.sectionLabel}>Observații INS</h2>
              <PublishedText
                text={dataset.observations_ro}
                className={cn(statisticsTheme.prose, 'whitespace-pre-line')}
              />
            </section>
          ) : null}

          {model.related.length > 0 ? (
            <section className="space-y-1.5">
              <h2 className={statisticsTheme.sectionLabel}>
                Seturi înrudite ({model.relatedTotalCount ?? model.related.length})
              </h2>
              <ul className="space-y-1">
                {model.related.slice(0, 6).map((related) => (
                  <li key={related.code} className="text-sm">
                    <span className="font-mono text-xs tabular-nums text-muted-foreground">
                      {related.code}
                    </span>{' '}
                    <span className="text-muted-foreground">{related.nameRo}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </aside>
      </div>
    </div>
  )
}
