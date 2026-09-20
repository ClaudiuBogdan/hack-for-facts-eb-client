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
import { useDatasetPrototypeModel } from './dataset-detail.data'
import {
  DocumentNote,
  formatDerived,
  formatValue,
  PROTOTYPE_MARKER,
  PrototypeChart,
  seriesReading,
  VariantError,
  VariantSkeleton,
} from './dataset-detail.parts'

/**
 * Variant „report" — the page as a published statistical release.
 *
 * The premise: this surface's job is to be TRUSTED and quoted. A release from
 * a statistical office is a document, not an app: a title block that says who
 * published what and when, a lede, a numbered figure whose source note sits
 * under the figure, a numbered table, and then numbered sections of
 * methodology. Nothing is hidden, nothing is a chevron, and a reader can print
 * it or cite „Figura 1" and be understood.
 *
 * What it gives up is density and any pretence of being a workbench. The scope
 * row is a one-line statement of what the figure covers, not a control panel —
 * changing the selection is a secondary act here, offered at the end.
 */
export function DatasetDetailReport({ code }: { readonly code: string }) {
  const model = useDatasetPrototypeModel(code)

  if (model.isLoading) return <VariantSkeleton />
  if (model.isError || !model.dataset) return <VariantError code={code} />

  const { dataset, stats, chart, unitLabel, unitWord, span, scope } = model
  const reading = seriesReading(stats, unitWord)
  const cadence = (dataset.periodicity ?? []).map(periodicityLabel).join(', ')

  return (
    <article
      className="mx-auto w-full max-w-3xl px-4 py-8 md:px-6"
      data-dev-marker={PROTOTYPE_MARKER}
    >
      {/* Title block. The rule under it is the document's, not a card's.

          The masthead is OURS, and says so. An earlier pass set „Institutul
          Național de Statistică" here because it looked like a release — but
          this page is published by Transparenta.eu over INS data, and a
          document that wears the institute's name as its byline claims an
          authorship it does not have. DESIGN.md §Data Trust: the source is
          named as a source, never as the publisher. */}
      <header className="border-b-2 border-foreground/80 pb-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Transparenta.eu · date INS Tempo, matricea {dataset.code}
        </p>
        <h1 className="mt-2 text-balance text-2xl font-semibold leading-snug tracking-tight">
          {dataset.name_ro ?? dataset.code}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {dataset.context_name_ro}
          {cadence ? ` · serie ${cadence.toLowerCase()}` : null}
          {span ? ` · ${span.from}–${span.to}` : null}
          {dataset.source_last_update
            ? ` · publicată ${formatSourceDate(dataset.source_last_update)}`
            : null}
        </p>
      </header>

      {/* The lede: what the series says, in one sentence, set as prose. */}
      {reading ? (
        <p className="mt-6 text-lg leading-relaxed">
          <span className="font-semibold tabular-nums">{reading.figure}</span>
          {reading.unit ? ` ${reading.unit}` : null} {reading.clause}
        </p>
      ) : null}

      {dataset.definition_ro ? (
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          {dataset.definition_ro}
        </p>
      ) : null}

      {/* Figure 1 — caption above, source note below, the way a release sets
          a figure. No band, no border: the document IS the container. */}
      {chart ? (
        <figure className="mt-8">
          <figcaption className="text-sm">
            <span className="font-semibold">Figura 1.</span>{' '}
            {dataset.name_ro ?? dataset.code}
            {scope.territory ? `, ${scope.territory}` : null},{' '}
            {span ? `${span.from}–${span.to}` : null}
            {unitLabel ? ` (${unitLabel})` : null}
          </figcaption>
          <div className="mt-3">
            <PrototypeChart
              series={chart}
              unitLabel={unitLabel}
              stats={stats}
              height="h-72"
            />
          </div>
          <p className="mt-2 border-t border-border/70 pt-2 text-xs text-muted-foreground">
            Sursa: INS Tempo, matricea{' '}
            <span className="font-mono tabular-nums">{dataset.code}</span>
            {dataset.source_last_update
              ? `, actualizată ${formatSourceDate(dataset.source_last_update)}`
              : null}
            . Selecție:{' '}
            {[
              scope.territory,
              ...scope.members.map((member) => member.valueName),
              unitLabel,
              cadence.toLowerCase(),
            ]
              .filter(Boolean)
              .join(', ')}
            .{' '}
            <a
              href={insTempoDatasetUrl(dataset.code, 'ro')}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-medium underline underline-offset-4"
            >
              Deschide pe INS Tempo
              <ExternalLink className="h-3 w-3" aria-hidden />
            </a>
          </p>
        </figure>
      ) : null}

      {/* The numbers behind the figure, as prose a reader can quote. */}
      <section className="mt-8">
        <h2 className="text-sm font-semibold">Repere</h2>
        <dl className="mt-2 divide-y divide-border/70 border-y border-border/70 text-sm">
          <ReportFact
            term="Ultima valoare"
            detail={stats.latest ? formatHubPeriod(stats.latest.period) : null}
            value={stats.latest ? formatValue(stats.latest.value) : '—'}
          />
          <ReportFact
            term="Valoarea maximă"
            detail={stats.peak ? formatHubPeriod(stats.peak.period) : null}
            value={stats.peak ? formatValue(stats.peak.value) : '—'}
          />
          <ReportFact
            term="Valoarea minimă"
            detail={stats.trough ? formatHubPeriod(stats.trough.period) : null}
            value={stats.trough ? formatValue(stats.trough.value) : '—'}
          />
          <ReportFact
            term="Media perioadei"
            detail={span ? `${span.from}–${span.to}` : null}
            value={stats.mean === null ? '—' : formatDerived(stats.mean)}
          />
          <ReportFact
            term="Observații"
            detail={scope.territory}
            value={String(stats.count)}
          />
        </dl>
      </section>

      <section className="mt-8">
        <p className="text-sm">
          <span className="font-semibold">Tabelul 1.</span> Seria completă, aşa
          cum a fost publicată.
        </p>
        <div className="mt-3 max-h-[26rem] overflow-auto">
          <DetailObservationsTable
            observations={model.rows}
            sourceDescriptor={model.sourceDescriptor}
          />
        </div>
      </section>

      {/* Numbered document sections rather than a stack of chevrons. */}
      <section className="mt-10 space-y-6 border-t border-border/70 pt-6">
        <h2 className={statisticsTheme.sectionLabel}>Note</h2>
        {dataset.methodology_ro ? (
          <DocumentNote index={1} title="Metodologie">
            <PublishedText
              text={dataset.methodology_ro}
              className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground"
            />
          </DocumentNote>
        ) : null}
        {(dataset.data_sources ?? []).length > 0 ? (
          <DocumentNote index={2} title="Surse de date">
            <ul className="space-y-1 text-sm text-muted-foreground">
              {(dataset.data_sources ?? []).map((source) => (
                <li key={source.name}>{source.name}</li>
              ))}
            </ul>
          </DocumentNote>
        ) : null}
        {dataset.observations_ro ? (
          <DocumentNote index={3} title="Observații INS">
            <PublishedText
              text={dataset.observations_ro}
              className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground"
            />
          </DocumentNote>
        ) : null}
      </section>

      <footer className="mt-8 flex flex-wrap items-center gap-3 border-t border-border/70 pt-5">
        <Button size="sm" variant="outline" className="gap-1.5">
          <Download className="h-3.5 w-3.5" aria-hidden />
          Descarcă CSV
        </Button>
        <Button size="sm" variant="outline" className="gap-1.5">
          Compară teritorii
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </Button>
        <button
          type="button"
          className={cn(
            'ml-auto rounded-sm px-1 py-1 text-sm font-medium underline-offset-4 hover:underline',
          )}
        >
          Schimbă selecția
        </button>
      </footer>
    </article>
  )
}

function ReportFact({
  term,
  value,
  detail,
}: {
  readonly term: string
  readonly value: string
  readonly detail: string | null
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <dt className="min-w-0">
        {term}
        {detail ? (
          <span className="ml-2 text-xs text-muted-foreground">{detail}</span>
        ) : null}
      </dt>
      <dd className="shrink-0 font-medium tabular-nums">{value}</dd>
    </div>
  )
}
