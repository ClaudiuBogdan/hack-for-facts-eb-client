import { t } from '@lingui/core/macro'
import { INS_ROOT_CONTEXTS } from '@/lib/ins/ins-metric-registry'
import type { StatisticsDatasetExplorerSearch } from '@/schemas/statistics'
import type { StatisticsContextIndex } from './context-tree'

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
 * `pagina` is dropped from every `next` because removing a filter invalidates
 * the current offset.
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

/** A chip's two halves: the dimension it narrows, and the value it holds. */
export interface ExplorerChipParts {
  /** The dimension's name. `null` when the value names itself. */
  readonly name: string | null
  readonly value: string
}

/**
 * The chip's name and its value apart, so the row can set the dimension quiet
 * and the value in weight — which is what makes a row of chips scannable
 * rather than four phrases to read. `explorerChipLabel` joins them back into
 * the one phrase assistive tech hears.
 */
export function explorerChipParts(
  chip: ExplorerChip,
  contextIndex?: StatisticsContextIndex,
): ExplorerChipParts {
  switch (chip.kind) {
    case 'q':
      return { name: t`Conține`, value: chip.value ?? '' }
    case 'context':
      return {
        name: t`Temă`,
        value: explorerContextLabel(chip.value, contextIndex),
      }
    case 'frecventa':
      return {
        name: t`Periodicitate`,
        value: explorerPeriodicityLabel(chip.value as ExplorerPeriodicity),
      }
    case 'uat':
      return { name: t`Acoperire`, value: t`UAT` }
    case 'judet':
      return { name: t`Acoperire`, value: t`județ` }
  }
}

/** Localized chip label, e.g. `Periodicitate: Anual`. */
export function explorerChipLabel(
  chip: ExplorerChip,
  contextIndex?: StatisticsContextIndex,
): string {
  const { name, value } = explorerChipParts(chip, contextIndex)
  return name === null ? value : `${name}: ${value}`
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
 * The label of the selected context. The tree names every level of the INS
 * hierarchy; without it — the rail's read has not landed yet — only the eight
 * domains have a name, and an unknown code renders as itself rather than as an
 * empty chip.
 */
export function explorerContextLabel(
  code: string | null,
  contextIndex?: StatisticsContextIndex,
): string {
  if (!code) return ''
  const fromTree = contextIndex?.get(code)?.node.label
  if (fromTree) return fromTree
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
