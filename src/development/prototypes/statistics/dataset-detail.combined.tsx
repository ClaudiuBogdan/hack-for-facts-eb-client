import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowRight, Download, ExternalLink } from 'lucide-react'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { DataStatusBadge } from '@/features/statistics/components/data-status-badge'
import { DetailObservationsTable } from '@/features/statistics/components/detail-observations-table'
import { PublishedText } from '@/features/statistics/components/published-text'
import { classificationTypeCode } from '@/features/statistics/lib/dataset-selection'
import { dimensionTypeLabel } from '@/features/statistics/lib/dimension-labels'
import { formatSourceDate } from '@/features/statistics/lib/format'
import { formatHubPeriod } from '@/features/statistics/lib/hub-format'
import { insTempoDatasetUrl } from '@/features/statistics/lib/ins-tempo'
import { periodicityLabel } from '@/features/statistics/lib/periodicity-labels'
import { statisticsTheme } from '@/features/statistics/lib/statistics-theme'
import { describeUnitSymbol } from '@/features/statistics/lib/hub-format'
import { useDatasetPrototypeModel } from './dataset-detail.data'
import {
  DocumentNote,
  formatDerived,
  formatValue,
  PROTOTYPE_MARKER,
  PrototypeChart,
  RailControl,
  SummaryFact,
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

  const { dataset, stats, chart, unitLabel, unitWord, unitSymbol, span, scope } =
    model
  const cadence = (dataset.periodicity ?? []).map(periodicityLabel).join(', ')
  /**
   * The unit beside the figure.
   *
   * `unitWord` is the Romanian word („persoane", „%") and is deliberately
   * empty for a bare count, because „10 numar" is not a sentence. But a figure
   * with no unit at all leaves the reader to guess what 10 counts, so the
   * symbol is worded instead. `describeUnitSymbol` is the right fallback and
   * `unitLabel` is not: the label is `name_ro ?? symbol`, so a unit INS
   * published without a Romanian name would have printed the API's own
   * „count" to the reader. It also spells „număr" with its diacritic.
   */
  const heroUnit =
    unitWord || (unitSymbol ? describeUnitSymbol(unitSymbol) : null)
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
              <ul className="divide-y divide-border/70">
                {model.related.slice(0, 8).map((related) => (
                  <li key={related.code}>
                    {/*
                      Inside the prototype, not out of it: the link carries
                      `cod` back into this same variant, so a reader comparing
                      designs can follow a related set and still be looking at
                      the pane they are judging. The affordance — full-width
                      row, name, code chip, data status — is the production
                      one; on promotion only the destination changes, to
                      `to="/ins/seturi/$cod" params={{ cod }}`.
                    */}
                    <Link
                      to="/development/$"
                      params={{ _splat: 'statistics/dataset-detail' }}
                      // A function, not a literal: rebuilding the search from
                      // scratch silently dropped `layout`, so following a
                      // related set from the stacked comparison came back
                      // side-by-side. Carry everything, change `cod`.
                      search={(previous) => ({
                        ...previous,
                        v: 'combined',
                        cod: related.code,
                      })}
                      className="flex items-center justify-between gap-3 py-2 text-sm transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <span className="min-w-0 truncate">
                        {related.nameRo ?? related.code}
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        <span className={statisticsTheme.provenanceChip}>
                          {related.code}
                        </span>
                        {/* Only the exception wears a badge. „Date
                            disponibile" down every row of an all-available
                            list is the noise §6f removed from the header and
                            the catalog; a set we hold no observations for is
                            worth stopping on. */}
                        {related.dataStatus === 'available' ? null : (
                          <DataStatusBadge status={related.dataStatus} />
                        )}
                      </span>
                    </Link>
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
      {/*
        Everything the page knows ABOUT the dataset lives here, once.
        The figure used to close on a source strip repeating the matrix code
        and the source that the line under the title already named — two
        statements of the same fact, 500px apart, and the reader had to scroll
        past the chart to learn when INS last refreshed it.

        Ordered identity → placement → provenance:

          ACC101B · 10. CONDITII DE MUNCA · Sursă: INS Tempo, actualizată 5 noiembrie 2025

        Cadence and span are NOT here. The rail states both a hundred and fifty
        pixels to the left, and „Interval de ani" is the control you change
        them with — restating a control's current value as static text beside
        it is the same duplication the footer was.

        „Sursă" and the way back are ONE item, because the source's name is
        the link — a separate „INS Tempo" beside „Deschide pe INS Tempo" said
        the same words twice. Spacing separates the items, never „·": a bullet
        between flex items has nowhere good to go when the line wraps (§6f).
      */}
      <header className="border-b border-border/70 pb-4">
        <h1 className="text-balance text-xl font-semibold tracking-tight">
          {dataset.name_ro ?? dataset.code}
        </h1>
        <p className={cn(statisticsTheme.metaLine, 'mt-2.5')}>
          <span className={statisticsTheme.provenanceChip}>{dataset.code}</span>
          {dataset.context_name_ro ? (
            <span>{dataset.context_name_ro}</span>
          ) : null}
          <span className="tabular-nums">
            Sursă:{' '}
            <a
              href={insTempoDatasetUrl(dataset.code, 'ro')}
              target="_blank"
              rel="noreferrer"
              // Visibly the source's name; announced as the action it is.
              // „INS Tempo" read out of context says where the link goes but
              // not that it goes anywhere, and the „Sursă:" that supplies that
              // context sits outside the link.
              aria-label={`Deschide matricea ${dataset.code} pe INS Tempo (se deschide într-un tab nou)`}
              // `-mx-1 px-1 py-1` is the hit area: a 16px line of text is
              // under WCAG 2.2 AA's 24px minimum target (2.5.8).
              className="-mx-1 inline-flex items-center gap-1 rounded-sm px-1 py-1 font-medium underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              INS Tempo
              <ExternalLink className="h-3 w-3" aria-hidden />
            </a>
            {dataset.source_last_update
              ? `, actualizată ${formatSourceDate(dataset.source_last_update)}`
              : null}
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

            {/* Omitted, not defaulted: ACC101C has no territorial axis, and a
                rail reading „Teritoriu: România" would invent one. */}
            {scope.territory ? (
              <RailControl label="Teritoriu" value={scope.territory} />
            ) : null}
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
                {/*
                  The figure and its unit are ONE span, as in `DetailTier0Hero`:
                  a flex gap between a number and its unit lets them land on
                  different lines, and „21.646.220" over „persoane" is two
                  facts where there was one. The theme's own `heroValue` and
                  `heroUnit` carry the sizes, rather than a local copy of them.

                  The dot before the period lives INSIDE the period's span,
                  not between two flex children, so it travels with what it
                  separates rather than ending a wrapped line — which is the
                  whole of §6f's objection to „·" between flex items. It is a
                  real node, never `before:content-['·']`: the prototype rules
                  forbid an arbitrary-value utility carrying text, because
                  full-checkout CSS is generated from this source. It shows
                  only from `sm` up — below that a long figure fills the line
                  and the period drops to its own, where a separator has
                  nothing left to separate.
                */}
                <p className="mt-1.5 flex flex-wrap items-baseline gap-x-4 gap-y-1">
                  <span className={statisticsTheme.heroValue}>
                    {stats.latest ? formatValue(stats.latest.value) : '—'}
                    {heroUnit ? (
                      <>
                        {/* A literal space, not only the margin: adjacent text
                            nodes with no whitespace between them are spoken as
                            one word („10număr"). The margin shrinks to keep the
                            visible gap where it was. */}
                        {' '}
                        <span className={cn(statisticsTheme.heroUnit, 'ml-0.5')}>
                          {heroUnit}
                        </span>
                      </>
                    ) : null}
                  </span>
                  {stats.latest ? (
                    <span className="text-sm tabular-nums text-muted-foreground">
                      <span
                        aria-hidden
                        className="mr-3 hidden text-muted-foreground/50 sm:inline"
                      >
                        ·
                      </span>
                      {formatHubPeriod(stats.latest.period)}
                    </span>
                  ) : null}
                </p>
              </div>
              {/*
                The unit is the row's FIRST fact, not a heading over it: given
                its own column it is one more thing the series is, beside its
                extremes and its mean, and it is stated once rather than
                repeated after every figure („5 număr · 50 număr · 31,3
                număr", or three „persoane" beside three twenty-million
                figures).
              */}
              <dl className="flex flex-wrap items-end gap-x-6 gap-y-2">
                {heroUnit ? (
                  <SummaryFact label="unitate" value={heroUnit} />
                ) : null}
                <SummaryFact
                  label="minim"
                  value={stats.trough ? formatValue(stats.trough.value) : '—'}
                  period={
                    stats.trough ? formatHubPeriod(stats.trough.period) : null
                  }
                />
                <SummaryFact
                  label="maxim"
                  value={stats.peak ? formatValue(stats.peak.value) : '—'}
                  period={stats.peak ? formatHubPeriod(stats.peak.period) : null}
                />
                <SummaryFact
                  label="medie"
                  value={stats.mean === null ? '—' : formatDerived(stats.mean)}
                />
                <SummaryFact label="observații" value={String(stats.count)} />
              </dl>
            </div>

            {chart ? (
              <div className="px-2 pb-5 pt-4 md:px-4">
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
          </section>

          {/* What it measures, read AFTER the figure: a definition before the
              number is an obstacle, and after it is an answer.

              The derived sentence („10 în 2024, față de un maxim de 50 în
              1997") used to open this section and no longer does — every one
              of its facts is now in the summary row above, stated once. */}
          {dataset.definition_ro ? (
            <section>
              <p className={statisticsTheme.prose}>{dataset.definition_ro}</p>
            </section>
          ) : null}

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

          {/* The appendix. Last, because it is the thing a reader consults
              after the figure and the notes have told them what they are
              looking at — and CLOSED, because that consultation is the
              exception. The trigger carries the row count, so the one fact an
              unopened table still owes the reader is on its face. Open, it
              keeps its own scroller: 197 rows must not set the height of the
              page they end. */}
          <section className="border-t border-border/70 pt-2">
            <Accordion type="single" collapsible>
              <AccordionItem value="table" className="border-b-0">
                <AccordionTrigger className="gap-3 hover:no-underline">
                  <span className={statisticsTheme.sectionLabel}>
                    Tabelul seriei
                  </span>
                  <span className="ml-auto text-xs font-normal tabular-nums text-muted-foreground">
                    {model.rows.length} rânduri
                  </span>
                </AccordionTrigger>
                <AccordionContent className="pb-2">
                  <div className="max-h-[28rem] overflow-auto">
                    <DetailObservationsTable
                      observations={model.rows}
                      sourceDescriptor={model.sourceDescriptor}
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </section>
        </div>
      </div>
    </div>
  )
}
