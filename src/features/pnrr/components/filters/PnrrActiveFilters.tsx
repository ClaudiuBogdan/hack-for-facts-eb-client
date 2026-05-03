import { useMemo } from 'react'
import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import type { usePnrrFilterState } from '../../hooks/usePnrrFilterState'
import { X } from 'lucide-react'
import { PNRR_COMPONENTS } from '../../data/component-definitions'
import { PNRR_CRIS } from '../../data/cri-definitions'
import { getMeasureDisplayLabel } from '../../lib/allocations'
import {
  getAnomalyLabel,
  getDataQualitySignalLabel,
} from '../../lib/anomaly-definitions'
import {
  PROGRESS_CATEGORY_LABELS,
  FUNDING_SOURCE_LABELS,
  ENTITY_TYPE_LABELS,
  BENEFICIARY_TYPE_LABELS,
  type ProgressCategoryKey,
} from '../../lib/filter-constants'
import { getPnrrUatLabel } from '../../lib/pnrr-uat-labels'

function formatUatFilterLabel(
  siruta: string,
  labelsBySiruta: ReadonlyMap<string, string> | undefined,
  explicitName?: string,
): string {
  return explicitName || labelsBySiruta?.get(siruta) || getPnrrUatLabel(siruta) || siruta
}

export function PnrrActiveFilters({
  filterState,
  uatLabelsBySiruta,
  compact = false,
}: {
  readonly filterState: ReturnType<typeof usePnrrFilterState>
  readonly uatLabelsBySiruta?: ReadonlyMap<string, string>
  readonly compact?: boolean
}) {
  const { search } = filterState

  const chips = useMemo(() => {
    const result: {
      key: string
      prefix?: string
      value: string
      onRemove: () => void
    }[] = []

    if (search.search) {
      result.push({
        key: 'search',
        prefix: t`Project`,
        value: search.search,
        onRemove: () => filterState.setSearch(undefined),
      })
    }

    if (search.beneficiarySearch) {
      result.push({
        key: 'beneficiary-search',
        prefix: t`Beneficiary`,
        value: search.beneficiarySearch,
        onRemove: () => filterState.setBeneficiarySearch(undefined),
      })
    }

    if (search.beneficiaryCui) {
      result.push({
        key: 'beneficiary-cui',
        prefix: t`Beneficiary CUI`,
        value: search.beneficiaryCui,
        onRemove: () => filterState.setBeneficiaryCui(undefined),
      })
    }

    if (search.uatSiruta) {
      result.push({
        key: 'uat-siruta',
        prefix: t`UAT`,
        value: formatUatFilterLabel(
          search.uatSiruta,
          uatLabelsBySiruta,
          search.uatName,
        ),
        onRemove: () => filterState.setUatFilter(undefined),
      })
    }

    search.uatSirutas?.forEach((siruta) => {
      result.push({
        key: `uat-${siruta}`,
        prefix: t`UAT`,
        value: formatUatFilterLabel(siruta, uatLabelsBySiruta),
        onRemove: () =>
          filterState.setUatFilters(
            search.uatSirutas?.filter((value) => value !== siruta) ?? [],
          ),
      })
    })

    search.components?.forEach((c) => {
      const comp = PNRR_COMPONENTS[c]
      result.push({
        key: `comp-${c}`,
        prefix: t`Component`,
        value: comp ? `${c} — ${comp.nameRo}` : c,
        onRemove: () =>
          filterState.setComponents(
            search.components?.filter((x) => x !== c) ?? [],
          ),
      })
    })

    search.counties?.forEach((c) => {
      result.push({
        key: `county-${c}`,
        prefix: t`County`,
        value: c,
        onRemove: () =>
          filterState.setCounties(
            search.counties?.filter((x) => x !== c) ?? [],
          ),
      })
    })

    search.fundingSources?.forEach((c) => {
      result.push({
        key: `fund-${c}`,
        prefix: t`Funding`,
        value: FUNDING_SOURCE_LABELS[c] ?? c,
        onRemove: () =>
          filterState.setFundingSources(
            search.fundingSources?.filter((x) => x !== c) ?? [],
          ),
      })
    })

    search.measures?.forEach((c) => {
      result.push({
        key: `measure-${c}`,
        prefix: t`Measure`,
        value: getMeasureDisplayLabel(c),
        onRemove: () =>
          filterState.setMeasures(
            search.measures?.filter((x) => x !== c) ?? [],
          ),
      })
    })

    search.progressCategories?.forEach((c) => {
      result.push({
        key: `prog-${c}`,
        prefix: t`Progress`,
        value: PROGRESS_CATEGORY_LABELS[c as ProgressCategoryKey] ?? c,
        onRemove: () =>
          filterState.setProgressCategories(
            search.progressCategories?.filter((x) => x !== c) ?? [],
          ),
      })
    })

    search.cris?.forEach((c) => {
      const fullName = PNRR_CRIS[c]?.nameRo
      result.push({
        key: `cri-${c}`,
        prefix: t`CRI`,
        value: fullName ? `${c} — ${fullName}` : c,
        onRemove: () =>
          filterState.setCris(search.cris?.filter((x) => x !== c) ?? []),
      })
    })

    search.anomalyTypes?.forEach((c) => {
      result.push({
        key: `anom-${c}`,
        prefix: t`Risk`,
        value: getAnomalyLabel(c as Parameters<typeof getAnomalyLabel>[0]) ?? c,
        onRemove: () =>
          filterState.setAnomalyTypes(
            search.anomalyTypes?.filter((x) => x !== c) ?? [],
          ),
      })
    })

    search.dataQualitySignalTypes?.forEach((c) => {
      result.push({
        key: `quality-${c}`,
        prefix: t`Data`,
        value:
          getDataQualitySignalLabel(
            c as Parameters<typeof getDataQualitySignalLabel>[0],
          ) ?? c,
        onRemove: () =>
          filterState.setDataQualitySignalTypes(
            search.dataQualitySignalTypes?.filter((x) => x !== c) ?? [],
          ),
      })
    })

    search.entityTypes?.forEach((c) => {
      result.push({
        key: `entity-${c}`,
        prefix: t`Entity`,
        value: ENTITY_TYPE_LABELS[c] ?? c,
        onRemove: () =>
          filterState.setEntityTypes(
            search.entityTypes?.filter((x) => x !== c) ?? [],
          ),
      })
    })

    search.beneficiaryTypes?.forEach((c) => {
      result.push({
        key: `beneficiary-type-${c}`,
        prefix: t`Beneficiary type`,
        value: BENEFICIARY_TYPE_LABELS[c] ?? c,
        onRemove: () =>
          filterState.setBeneficiaryTypes(
            search.beneficiaryTypes?.filter((x) => x !== c) ?? [],
          ),
      })
    })

    if (search.onlyAnomalies) {
      result.push({
        key: 'only-anomalies',
        value: t`Only risks`,
        onRemove: () => filterState.setOnlyAnomalies(false),
      })
    }

    if (search.excludeMicro) {
      result.push({
        key: 'exclude-micro',
        value: t`Without micro-projects`,
        onRemove: () => filterState.setExcludeMicro(false),
      })
    }

    if (search.includeNational === false) {
      result.push({
        key: 'exclude-national',
        value: t`No national projects`,
        onRemove: () => filterState.setIncludeNational(true),
      })
    }

    return result
  }, [
    search.search,
    search.beneficiarySearch,
    search.beneficiaryCui,
    search.uatSiruta,
    search.uatName,
    search.uatSirutas,
    uatLabelsBySiruta,
    search.components,
    search.counties,
    search.fundingSources,
    search.measures,
    search.progressCategories,
    search.cris,
    search.anomalyTypes,
    search.dataQualitySignalTypes,
    search.entityTypes,
    search.beneficiaryTypes,
    search.onlyAnomalies,
    search.excludeMicro,
    search.includeNational,
    filterState,
  ])

  if (chips.length === 0) return null

  if (compact) {
    return (
      <div className="flex min-w-0 flex-wrap items-center gap-2.5 pb-2 pt-1">
        <span
          className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center bg-[var(--pnrr-fg)] px-1.5 text-[11px] font-semibold"
          style={{ color: 'var(--pnrr-bg)' }}
        >
          {chips.length}
        </span>
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
          {chips.map((chip) => (
            <span
              key={chip.key}
              className="group inline-flex max-w-full items-center gap-1.5 bg-[var(--pnrr-green)] px-2.5 py-1.5 text-sm text-[var(--pnrr-fg)]"
              title={chip.prefix ? `${chip.prefix}: ${chip.value}` : chip.value}
            >
              <span className="min-w-0 truncate">
                {chip.prefix ? (
                  <>
                    <span className="text-[var(--pnrr-fg)]/80">
                      {chip.prefix}:
                    </span>{' '}
                    <span className="font-bold">{chip.value}</span>
                  </>
                ) : (
                  <span className="font-bold">{chip.value}</span>
                )}
              </span>
              <button
                type="button"
                onClick={chip.onRemove}
                className="inline-flex h-4 w-4 shrink-0 items-center justify-center text-[var(--pnrr-fg)]/70 transition-colors hover:text-[var(--pnrr-fg)]"
                aria-label={t`Remove filter`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
        <button
          type="button"
          onClick={filterState.clearFilters}
          className="hidden shrink-0 text-sm text-[var(--pnrr-fg)] underline underline-offset-4 transition-colors hover:text-[var(--pnrr-muted)] sm:inline-flex"
        >
          <Trans>Clear all</Trans>
        </button>
      </div>
    )
  }

  return (
    <div className="flex min-w-0 flex-col items-start gap-3 pb-4 pt-2 sm:flex-row sm:justify-between sm:gap-4">
      <div className="flex min-w-0 w-full flex-1 flex-wrap items-center gap-2 sm:w-auto">
        {chips.map((chip) => (
          <span
            key={chip.key}
            className="group inline-flex max-w-full items-center gap-1.5 bg-[var(--pnrr-green)] px-3 py-2 text-sm text-[var(--pnrr-fg)]"
          >
            <span className="min-w-0 max-w-[min(100%,18rem)] truncate sm:max-w-[360px]">
              {chip.prefix ? (
                <>
                  <span className="text-[var(--pnrr-fg)]/80">
                    {chip.prefix}:
                  </span>{' '}
                  <span className="font-bold">{chip.value}</span>
                </>
              ) : (
                <span className="font-bold">{chip.value}</span>
              )}
            </span>
            <button
              type="button"
              onClick={chip.onRemove}
              className="inline-flex h-5 w-5 items-center justify-center text-[var(--pnrr-fg)]/70 transition-all hover:text-[var(--pnrr-fg)]"
              aria-label={t`Remove filter`}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </span>
        ))}
      </div>

      <button
        type="button"
        onClick={filterState.clearFilters}
        className="shrink-0 text-sm text-[var(--pnrr-fg)] underline underline-offset-4 transition-colors hover:text-[var(--pnrr-muted)] sm:mt-1"
      >
        <Trans>Clear all</Trans>
      </button>
    </div>
  )
}
