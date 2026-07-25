import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import { cn } from '@/lib/utils'
import type {
  ProcurementAnalysisGrain,
  ProcurementInstitutionPopulation,
} from '@/schemas/procurement'
import { formatFlowCount, formatRon } from '../lib/formatting'
import { procurementSectionClassName } from '../lib/procurement-theme'

type Props = {
  readonly populations: readonly ProcurementInstitutionPopulation[]
  readonly active: ProcurementAnalysisGrain
  readonly onSelect: (grain: ProcurementAnalysisGrain) => void
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

function populationLabel(grain: ProcurementAnalysisGrain): string {
  switch (grain) {
    case 'procedure':
      return t`Proceduri`
    case 'contract':
      return t`Contracte`
    case 'direct_acquisition':
      return t`Achiziții directe`
    case 'framework':
      return t`Acorduri-cadru`
    case 'calloff':
      return t`Contracte subsecvente`
    case 'modification':
      return t`Modificări`
  }
}

/**
 * What the population's money MEANS. Each population carries its own anchor
 * measure — a ceiling is not spending, a call-off is not a contract award —
 * so the label travels with the figure and the two are never conflated.
 */
function moneyLabel(grain: ProcurementAnalysisGrain): string | null {
  switch (grain) {
    case 'framework':
      return t`plafon angajat`
    case 'calloff':
      return t`valoare comandată`
    case 'modification':
      return null
    default:
      return t`valoare atribuită`
  }
}

/**
 * The populations row doubles as the page's switcher: every record type this
 * buyer appears in, with its own count and its own anchor money. Counts are
 * always answerable; money can be withheld by its population's gate, which
 * reads as "indisponibil", never as zero.
 */
export function ProcurementInstitutionPopulations({
  populations,
  active,
  onSelect,
  className,
}: Props) {
  const byGrain = new Map(populations.map((entry) => [entry.grain, entry]))
  const ordered = POPULATION_ORDER.map((grain) => byGrain.get(grain)).filter(
    (entry): entry is ProcurementInstitutionPopulation => entry !== undefined,
  )

  return (
    <section
      aria-label={t`Tipuri de înregistrări`}
      className={cn(
        'grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6',
        className,
      )}
    >
      {ordered.map((population) => {
        const isActive = population.grain === active
        const money = moneyLabel(population.grain)
        return (
          <button
            key={population.grain}
            type="button"
            aria-pressed={isActive}
            onClick={() => onSelect(population.grain)}
            className={cn(
              procurementSectionClassName,
              'p-3 text-left transition-colors',
              isActive
                ? 'bg-[var(--pnrr-accent)] text-white'
                : 'hover:bg-[var(--pnrr-bg)]',
            )}
          >
            <p
              className={cn(
                'text-xs font-bold uppercase tracking-wide',
                isActive ? 'text-white/80' : 'text-[var(--pnrr-muted)]',
              )}
            >
              {populationLabel(population.grain)}
            </p>
            <p className="mt-1 text-xl font-semibold tabular-nums">
              {population.recordCount === null
                ? '—'
                : formatFlowCount(population.recordCount)}
            </p>
            {population.recordCount === '0' ? (
              // An EMPTY population is not a withheld one: printing the money
              // formatter's "indisponibil" here would claim the gate hid
              // something that simply does not exist for this buyer.
              <p
                className={cn(
                  'mt-1 text-xs',
                  isActive ? 'text-white/70' : 'text-[var(--pnrr-muted)]',
                )}
              >
                <Trans>fără înregistrări</Trans>
              </p>
            ) : money === null ? (
              <p
                className={cn(
                  'mt-1 text-xs',
                  isActive ? 'text-white/70' : 'text-[var(--pnrr-muted)]',
                )}
              >
                <Trans>doar număr</Trans>
              </p>
            ) : (
              <p
                className={cn(
                  'mt-1 text-xs',
                  isActive ? 'text-white/70' : 'text-[var(--pnrr-muted)]',
                )}
              >
                {formatRon(population.anchorValueRon, 'compact')} · {money}
              </p>
            )}
          </button>
        )
      })}
    </section>
  )
}
