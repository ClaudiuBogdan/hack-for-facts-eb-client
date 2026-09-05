import { Link } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Pagination } from '@/components/ui/pagination'
import type { InsDatasetDetails, InsObservation } from '@/schemas/ins'
import type { StatisticsRelatedDataset } from '@/schemas/statistics'
import { DataStatusBadge } from './data-status-badge'
import { DetailObservationsTable } from './detail-observations-table'
import { ValueStatusLegend } from './detail-value-status-legend'
import { DETAIL_PAGE_SIZE } from '../lib/dataset-selection'
import { statisticsTheme } from '../lib/statistics-theme'
import { formatObservationValue } from '../lib/format'

type Props = {
  readonly dataset: InsDatasetDetails
  readonly sourceDescriptor?: unknown
  /** The exact-cell rows backing the chart; the table pages over them. */
  readonly observations: readonly InsObservation[]
  readonly observedSpan: { readonly from: number; readonly to: number } | null
  readonly related: readonly StatisticsRelatedDataset[]
  readonly relatedTotalCount: number | null
  readonly page: number
  readonly onPageChange: (page: number) => void
  readonly onSelectSource?: (observation: InsObservation) => void
  /** The compare bundle for this dataset+territory — the note points there. */
  readonly compareSearch: {
    readonly cod: string
    readonly teritorii: [string, ...string[]]
  }
}

/**
 * Tiers 2–3 — ONE closed accordion, each row labeled with its own answer
 * (a count, a coverage fact) so a closed row still says something. Content
 * mounts on open (Radix unmounts closed items), so nothing here costs a
 * request or a render until asked for.
 */
export function DetailAccordion({
  dataset,
  sourceDescriptor,
  observations,
  observedSpan,
  related,
  relatedTotalCount,
  page,
  onPageChange,
  onSelectSource,
  compareSearch,
}: Props) {
  const dimensions = dataset.dimensions ?? []
  const territorial = dimensions.find(
    (dimension) => dimension.type === 'TERRITORIAL',
  )
  const presentStatuses = [
    ...new Set(
      observations
        .map((observation) => observation.value_status?.trim() || null)
        .filter((status): status is string => status !== null),
    ),
  ].sort()

  const pageRows = observations.slice(
    (page - 1) * DETAIL_PAGE_SIZE,
    page * DETAIL_PAGE_SIZE,
  )

  const catalogFrom = dataset.year_range?.length
    ? Math.min(...dataset.year_range)
    : null
  const catalogTo = dataset.year_range?.length
    ? Math.max(...dataset.year_range)
    : null

  return (
    <Accordion type="multiple" className="rounded-lg border border-border/70">
      <AccordionItem value="tabel" className="px-4">
        <AccordionTrigger className="text-sm font-medium">
          <Trans>
            Tabelul seriei (
            {formatObservationValue(String(observations.length))})
          </Trans>
        </AccordionTrigger>
        <AccordionContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            <Trans>
              Observațiile selecției curente păstrează coordonatele originale
              INS. Alege seria unui rând pentru istoricul complet. Pentru alte
              teritorii,{' '}
              <Link
                to="/statistici/comparatii"
                search={compareSearch}
                className="underline underline-offset-2 hover:text-foreground"
              >
                compară teritorii
              </Link>
              .
            </Trans>
          </p>
          {observations.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              <Trans>Selecția curentă nu are observații.</Trans>
            </p>
          ) : (
            <>
              <DetailObservationsTable
                observations={pageRows}
                sourceDescriptor={sourceDescriptor}
                onSelectSource={onSelectSource}
              />
              <ValueStatusLegend statuses={presentStatuses} />
              {observations.length > DETAIL_PAGE_SIZE ? (
                <Pagination
                  currentPage={page}
                  pageSize={DETAIL_PAGE_SIZE}
                  totalCount={observations.length}
                  onPageChange={onPageChange}
                  isLoading={false}
                />
              ) : null}
            </>
          )}
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="dimensiuni" className="px-4">
        <AccordionTrigger className="text-sm font-medium">
          <Trans>Dimensiuni și clasificări ({dimensions.length} axe)</Trans>
        </AccordionTrigger>
        <AccordionContent>
          <ul className="divide-y divide-border/70">
            {dimensions.map((dimension) => (
              <li
                key={dimension.index}
                className="flex items-center justify-between gap-3 py-2 text-sm"
              >
                <span>
                  {dimension.label_ro ??
                    dimension.classification_type?.name_ro ??
                    `#${dimension.index}`}
                </span>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                  {dimensionTypeLabel(dimension.type)}
                  {dimension.option_count
                    ? ` · ${formatObservationValue(String(dimension.option_count))} ${t`opțiuni`}`
                    : ''}
                </span>
              </li>
            ))}
          </ul>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="acoperire" className="px-4">
        <AccordionTrigger className="text-sm font-medium">
          <Trans>Acoperire teritorială</Trans>
        </AccordionTrigger>
        <AccordionContent className="space-y-2 text-sm">
          <CoverageFact
            label={t`Localități (SIRUTA)`}
            covered={dataset.has_uat_data}
          />
          <CoverageFact label={t`Județe`} covered={dataset.has_county_data} />
          {territorial?.option_count ? (
            <p className="text-xs text-muted-foreground">
              <Trans>
                Dimensiunea teritorială are{' '}
                {formatObservationValue(String(territorial.option_count))}{' '}
                opțiuni.
              </Trans>
            </p>
          ) : null}
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="provenienta" className="px-4">
        <AccordionTrigger className="text-sm font-medium">
          <Trans>Proveniență și limite</Trans>
        </AccordionTrigger>
        <AccordionContent className="space-y-2 text-sm">
          <p className="flex flex-wrap items-center gap-2">
            <span className={statisticsTheme.provenanceChip}>INS Tempo</span>
            <span className={statisticsTheme.provenanceChip}>
              {dataset.code}
            </span>
            {dataset.context_name_ro ? (
              <span className="text-xs text-muted-foreground">
                {dataset.context_name_ro}
              </span>
            ) : null}
          </p>
          {catalogFrom !== null && catalogTo !== null ? (
            <p className="text-muted-foreground">
              <Trans>
                Catalogul INS declară intervalul {catalogFrom}–{catalogTo};
                observațiile încărcate aici acoperă{' '}
                {observedSpan
                  ? `${observedSpan.from}–${observedSpan.to}`
                  : t`— (nicio observație pentru selecția curentă)`}
                .
              </Trans>
            </p>
          ) : null}
          <p className="text-muted-foreground">
            <Trans>
              Datele sunt un instantaneu al INS Tempo. Fiecare valoare își arată
              perioada de referință; valorile lipsă rămân goluri, niciodată
              zero.
            </Trans>
          </p>
        </AccordionContent>
      </AccordionItem>

      {related.length > 0 ? (
        <AccordionItem value="inrudite" className="border-b-0 px-4">
          <AccordionTrigger className="text-sm font-medium">
            <Trans>
              Seturi înrudite ({formatObservationValue(String(related.length))}
              {relatedTotalCount !== null &&
              relatedTotalCount - 1 > related.length
                ? ` din ${formatObservationValue(String(relatedTotalCount - 1))}`
                : ''}
              )
            </Trans>
          </AccordionTrigger>
          <AccordionContent>
            <ul className="divide-y divide-border/70">
              {related.map((entry) => (
                <li key={entry.code}>
                  <Link
                    to="/statistici/seturi/$cod"
                    params={{ cod: entry.code }}
                    className="flex items-center justify-between gap-3 py-2 text-sm transition-colors hover:text-primary"
                  >
                    <span className="min-w-0 truncate">
                      {entry.nameRo ?? entry.code}
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <span className={statisticsTheme.provenanceChip}>
                        {entry.code}
                      </span>
                      <DataStatusBadge status={entry.dataStatus} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </AccordionContent>
        </AccordionItem>
      ) : null}
    </Accordion>
  )
}

function dimensionTypeLabel(type: string): string {
  switch (type) {
    case 'TEMPORAL':
      return t`timp`
    case 'TERRITORIAL':
      return t`teritoriu`
    case 'CLASSIFICATION':
      return t`clasificare`
    case 'UNIT_OF_MEASURE':
      return t`unitate`
    default:
      return type
  }
}

function CoverageFact({
  label,
  covered,
}: {
  readonly label: string
  readonly covered: boolean
}) {
  return (
    <p className="flex items-center justify-between gap-3">
      <span>{label}</span>
      <span className={covered ? 'text-foreground' : 'text-muted-foreground'}>
        {covered ? <Trans>acoperit</Trans> : <Trans>fără date</Trans>}
      </span>
    </p>
  )
}
