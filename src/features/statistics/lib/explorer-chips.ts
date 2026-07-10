import { t } from '@lingui/core/macro'
import { INS_ROOT_CONTEXTS } from '@/lib/ins/ins-metric-registry'
import type { StatisticsDatasetExplorerSearch } from '@/schemas/statistics'

/** Periodicity values the explorer can filter on, in display order. */
export const EXPLORER_PERIODICITY_VALUES = [
  'ANNUAL',
  'QUARTERLY',
  'MONTHLY',
] as const

export type ExplorerPeriodicity = (typeof EXPLORER_PERIODICITY_VALUES)[number]

/** Which filter a chip stands for. */
export type ExplorerChipKind = 'q' | 'context' | 'frecventa' | 'uat' | 'judet'

export interface ExplorerChip {
  readonly id: string
  readonly kind: ExplorerChipKind
  /** The filter value the chip carries; `null` for boolean coverage flags. */
  readonly value: string | null
  /** Search state with exactly this filter removed — ready to navigate to. */
  readonly next: StatisticsDatasetExplorerSearch
}

/**
 * The removable chips for a given explorer URL state.
 *
 * `stare` is deliberately absent: it is a visible segmented control, so a chip
 * would duplicate a control the user is already looking at. `pagina` is dropped
 * from every `next` because removing a filter invalidates the current offset.
 */
export function buildExplorerChips(
  search: StatisticsDatasetExplorerSearch,
): readonly ExplorerChip[] {
  const base: StatisticsDatasetExplorerSearch = { ...search, pagina: undefined }
  const chips: ExplorerChip[] = []

  if (search.q) {
    chips.push({
      id: 'q',
      kind: 'q',
      value: search.q,
      next: { ...base, q: undefined },
    })
  }

  if (search.context) {
    chips.push({
      id: 'context',
      kind: 'context',
      value: search.context,
      next: { ...base, context: undefined },
    })
  }

  for (const value of search.frecventa ?? []) {
    chips.push({
      id: `frecventa:${value}`,
      kind: 'frecventa',
      value,
      next: {
        ...base,
        frecventa: nonEmpty(
          (search.frecventa ?? []).filter((entry) => entry !== value),
        ),
      },
    })
  }

  if (search.uat) {
    chips.push({
      id: 'uat',
      kind: 'uat',
      value: null,
      next: { ...base, uat: undefined },
    })
  }

  if (search.judet) {
    chips.push({
      id: 'judet',
      kind: 'judet',
      value: null,
      next: { ...base, judet: undefined },
    })
  }

  return chips
}

/** Localized chip label, e.g. `Periodicitate: Anual`. */
export function explorerChipLabel(chip: ExplorerChip): string {
  switch (chip.kind) {
    case 'q':
      return t`Conține: ${chip.value ?? ''}`
    case 'context':
      return t`Temă: ${explorerContextLabel(chip.value)}`
    case 'frecventa':
      return t`Periodicitate: ${explorerPeriodicityLabel(chip.value as ExplorerPeriodicity)}`
    case 'uat':
      return t`Acoperire: UAT`
    case 'judet':
      return t`Acoperire: județ`
  }
}

/** Romanian periodicity word — never the raw enum member. */
export function explorerPeriodicityLabel(value: ExplorerPeriodicity): string {
  switch (value) {
    case 'ANNUAL':
      return t`Anual`
    case 'QUARTERLY':
      return t`Trimestrial`
    case 'MONTHLY':
      return t`Lunar`
  }
}

/**
 * Root-context label for a `rootContextCode`. Unknown codes render as the code
 * itself rather than as an empty chip.
 */
export function explorerContextLabel(code: string | null): string {
  if (!code) return ''
  const root = INS_ROOT_CONTEXTS.find((entry) => entry.code === code)
  return root ? root.label : code
}

function nonEmpty(
  values: readonly ExplorerPeriodicity[],
): StatisticsDatasetExplorerSearch['frecventa'] {
  if (values.length === 0) return undefined
  return values as unknown as NonNullable<
    StatisticsDatasetExplorerSearch['frecventa']
  >
}
