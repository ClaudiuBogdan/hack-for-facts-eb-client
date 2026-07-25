import { t } from '@lingui/core/macro'
import { cn } from '@/lib/utils'
import type {
  ProcurementAnalysisGrain,
  ProcurementInstitutionPopulation,
} from '@/schemas/procurement'
import { formatFlowCount } from '../lib/formatting'
import { populationLabel } from '../lib/grain-labels'

type Props = {
  readonly populations: readonly ProcurementInstitutionPopulation[]
  readonly active: ProcurementAnalysisGrain
  readonly onSelect: (grain: ProcurementAnalysisGrain) => void
  /** Sticky-bar variant: tighter, and counts drop below `sm` to fit the row. */
  readonly compact?: boolean
  readonly className?: string
}

/** Display order: how a buyer's process actually runs, not alphabetical. */
const POPULATION_ORDER: readonly ProcurementAnalysisGrain[] = [
  'procedure',
  'contract',
  'direct_acquisition',
  'framework',
  'calloff',
  'modification',
]

/**
 * The page's population switcher, as tabs — every record type this buyer
 * appears in, with its volume on the tab itself. The selected population's
 * money is a header stat rather than a column here: it is one figure with one
 * basis, and it belongs next to the institution it describes.
 *
 * Populations with no rows stay selectable — a reader may want to confirm the
 * absence — but they are muted so they don't compete with the ones carrying
 * the activity.
 */
export function ProcurementInstitutionPopulations({
  populations,
  active,
  onSelect,
  compact = false,
  className,
}: Props) {
  const byGrain = new Map(populations.map((entry) => [entry.grain, entry]))
  const ordered = POPULATION_ORDER.map((grain) => byGrain.get(grain)).filter(
    (entry): entry is ProcurementInstitutionPopulation => entry !== undefined,
  )

  return (
    <nav
      role="tablist"
      aria-label={t`Tipuri de înregistrări`}
      className={cn(
        // No bottom rule of its own: the header band supplies it, and the
        // active indicator sits on that single line.
        'flex min-w-0 items-end gap-1 overflow-x-auto hide-scrollbar',
        className,
      )}
    >
      {ordered.map((population) => {
        const isActive = population.grain === active
        const isQuiet =
          !isActive &&
          (population.recordCount === '0' || population.recordCount === null)
        return (
          <button
            key={population.grain}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onSelect(population.grain)}
            className={cn(
              'group relative flex select-none items-baseline gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)]',
              compact ? 'px-2 py-1.5' : 'px-3 py-3 sm:px-4',
            )}
          >
            <span
              className={cn(
                compact ? 'text-[13px] transition-colors' : 'text-sm transition-colors',
                isActive
                  ? 'font-extrabold text-[var(--pnrr-fg)]'
                  : cn(
                      'font-semibold group-hover:text-[var(--pnrr-fg)]',
                      isQuiet
                        ? 'text-[var(--pnrr-muted)]/70'
                        : 'text-[var(--pnrr-muted)]',
                    ),
              )}
            >
              {populationLabel(population.grain)}
            </span>
            <span
              className={cn(
                compact
                  ? 'hidden text-[13px] tabular-nums transition-colors sm:inline'
                  : 'text-sm tabular-nums transition-colors',
                isActive
                  ? 'font-extrabold text-[var(--pnrr-fg)]'
                  : cn(
                      'font-bold group-hover:text-[var(--pnrr-fg)]',
                      isQuiet
                        ? 'text-[var(--pnrr-muted)]/70'
                        : 'text-[var(--pnrr-muted)]',
                    ),
              )}
            >
              {population.recordCount === null
                ? '—'
                : formatFlowCount(population.recordCount)}
            </span>
            <span
              className={cn(
                'absolute bottom-[-2px] left-0 right-0 bg-[#1d70b8] transition-all duration-200 dark:bg-[#3b82f6]',
                compact ? 'h-[3px]' : 'h-[5px]',
                isActive ? 'scale-x-100 opacity-100' : 'scale-x-0 opacity-0',
              )}
              aria-hidden
            />
          </button>
        )
      })}
    </nav>
  )
}
