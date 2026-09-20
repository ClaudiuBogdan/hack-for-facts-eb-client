import { Fragment, useState } from 'react'
import { ArrowRight, ChevronDown, Download, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
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
  Delta,
  formatValue,
  PROTOTYPE_MARKER,
  PrototypeChart,
  seriesSentence,
  VariantError,
  VariantSkeleton,
} from './dataset-detail.parts'

/**
 * Variant „editorial" — the figure leads, and the page says what it means.
 *
 * The premise: a reader who opens one INS matrix wants to know what the number
 * IS before they can care how it was selected. So the opening block is the
 * value, the sentence that reads it, and the two comparisons that give it
 * scale — and the scope sentence moves BELOW the figure, where it reads as the
 * figure's caption („acestea sunt datele pe care le vezi") rather than as a
 * form to fill in before anything appears.
 *
 * Everything else keeps today's disclosure ladder, so what is being judged
 * here is the opening, not a different information architecture.
 */
export function DatasetDetailEditorial({ code }: { readonly code: string }) {
  const model = useDatasetPrototypeModel(code)
  const [openDefinition, setOpenDefinition] = useState(false)

  if (model.isLoading) return <VariantSkeleton />
  if (model.isError || !model.dataset) return <VariantError code={code} />

  const { dataset, stats, chart, unitLabel, unitWord, span, scope } = model
  const sentence = seriesSentence(stats, unitWord)
  const cadence = (dataset.periodicity ?? []).map(periodicityLabel).join(', ')

  return (
    <div
      className="mx-auto w-full max-w-4xl space-y-8 px-4 py-6 md:px-6"
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
      </header>

      {/* The lede. One figure, one sentence, two comparisons — the whole point
          of the page above the fold, before any control. */}
      <section className={statisticsTheme.band}>
        <div className="space-y-4 p-5 md:p-6">
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
            <p className="text-5xl font-semibold tabular-nums tracking-tight">
              {stats.latest ? formatValue(stats.latest.value) : '—'}
              {unitWord ? (
                <span className="ml-2 text-xl font-normal text-muted-foreground">
                  {unitWord}
                </span>
              ) : null}
            </p>
            <p className="text-base tabular-nums text-muted-foreground">
              {stats.latest ? formatHubPeriod(stats.latest.period) : null}
            </p>
          </div>

          {sentence ? (
            <p className="max-w-prose text-base leading-relaxed">{sentence}</p>
          ) : null}

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-border/70 pt-3">
            <Delta
              percent={stats.changeVsPrevious}
              label={
                stats.previous
                  ? `față de ${formatHubPeriod(stats.previous.period)}`
                  : ''
              }
            />
            <Delta
              percent={stats.changeVsFirst}
              label={
                stats.first
                  ? `față de ${formatHubPeriod(stats.first.period)}`
                  : ''
              }
            />
            {stats.peak ? (
              <span className="text-sm text-muted-foreground">
                maxim{' '}
                <span className="font-medium tabular-nums text-foreground">
                  {formatValue(stats.peak.value)}
                </span>{' '}
                în {formatHubPeriod(stats.peak.period)}
              </span>
            ) : null}
          </div>
        </div>

        {chart ? (
          <div className="border-t border-border/70 px-2 pb-4 pt-5 md:px-4">
            <PrototypeChart
              series={chart}
              unitLabel={unitLabel}
              stats={stats}
              treatment="area"
              height="h-80"
            />
          </div>
        ) : null}

        {/* The scope reads as the figure's caption. Below the chart it answers
            „ce am văzut?"; above it, it asked „ce vrei să vezi?" before the
            reader had any reason to have an opinion. */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 border-t border-border/70 px-4 py-3 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">
            {scope.territory ?? 'România'}
          </span>
          {scope.members.map((member) => (
            <Fragment key={member.typeCode}>
              <span aria-hidden>·</span>
              <span className="font-medium text-foreground">
                {member.valueName}
              </span>
            </Fragment>
          ))}
          <span aria-hidden>·</span>
          <span className="font-medium text-foreground">{unitLabel}</span>
          <span aria-hidden>·</span>
          <span className="font-medium text-foreground">{cadence}</span>
          <span aria-hidden>·</span>
          <span className="font-medium tabular-nums text-foreground">
            {span ? `${span.from}–${span.to}` : null}
          </span>
          <button
            type="button"
            className="ml-auto inline-flex items-center gap-1 rounded-sm px-1 py-1 font-medium underline-offset-4 hover:text-foreground hover:underline"
          >
            schimbă selecția
            <ChevronDown className="h-3 w-3" aria-hidden />
          </button>
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

      {/* The definition is prose about the concept, not about this series. It
          reads AFTER the number, where a reader who wants it comes looking. */}
      {dataset.definition_ro ? (
        <section className="space-y-2">
          <h2 className={statisticsTheme.sectionLabel}>Ce măsoară</h2>
          <p
            className={cn(
              statisticsTheme.prose,
              !openDefinition && 'line-clamp-3',
            )}
          >
            {dataset.definition_ro}
          </p>
          <button
            type="button"
            onClick={() => setOpenDefinition((open) => !open)}
            className="-mx-1 inline-flex items-center gap-1 rounded-sm px-1 py-1 text-sm font-medium underline-offset-4 hover:underline"
          >
            {openDefinition ? 'Restrânge' : 'Citește definiția completă'}
            <ChevronDown
              className={cn('h-3.5 w-3.5 transition-transform', openDefinition && 'rotate-180')}
              aria-hidden
            />
          </button>
        </section>
      ) : null}

      <section className="space-y-2">
        <h2 className={statisticsTheme.sectionLabel}>Explorează datele</h2>
        <Accordion type="single" collapsible className={statisticsTheme.band}>
          <AccordionItem value="table" className="px-4">
            <AccordionTrigger>Tabelul seriei ({model.rows.length})</AccordionTrigger>
            <AccordionContent>
              <DetailObservationsTable
                observations={model.rows}
                sourceDescriptor={model.sourceDescriptor}
              />
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="method" className="px-4 last:border-b-0">
            <AccordionTrigger>Metodologie</AccordionTrigger>
            <AccordionContent>
              <PublishedText text={dataset.methodology_ro ?? ''} />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </section>
    </div>
  )
}
