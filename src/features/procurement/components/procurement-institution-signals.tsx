import { t } from '@lingui/core/macro'
import { cn } from '@/lib/utils'
import type { ProcurementInstitutionSignals } from '@/schemas/procurement'
import { formatRon, formatScopeShare } from '../lib/formatting'
import { procurementSectionClassName } from '../lib/procurement-theme'

type Props = {
  readonly signals: ProcurementInstitutionSignals
  /** Contract-grain awarded total, for the concentration coverage disclosure. */
  readonly contractAwardedRon: string | null
  readonly className?: string
}

/**
 * Procedure tokens that award without a competitive call. Kept as an explicit
 * list rather than a heuristic: the vocabulary is closed and short, and a
 * substring match on "negociere" would sweep in negotiated procedures that DID
 * publish a notice.
 */
const NON_COMPETITIVE_PROCEDURE_TYPES = new Set([
  'Negociere fara publicare prealabila',
  'Negociere fără publicare prealabilă',
])

function SignalTile({
  label,
  value,
  hint,
  className,
}: {
  readonly label: string
  readonly value: string
  readonly hint?: string
  readonly className?: string
}) {
  return (
    <div className={cn(procurementSectionClassName, 'p-4', className)}>
      <p className="text-xs font-bold uppercase tracking-wide text-[var(--pnrr-muted)]">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-[var(--pnrr-fg)]">
        {value}
      </p>
      {hint ? (
        <p className="mt-1 text-xs leading-snug text-[var(--pnrr-muted)]">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

/**
 * The four signals that make a buyer profile worth reading. Every tile states
 * the population it measures, because none of them cover the same rows:
 * concentration ranks only KNOWN suppliers, the amendment effect covers only
 * contracts whose amendment chains resolve, and framework ceilings are
 * commitments rather than spending.
 */
export function ProcurementInstitutionSignals({
  signals,
  contractAwardedRon,
  className,
}: Props) {
  const { concentration, procedureMix, amendment, frameworkExposure } = signals

  const nonCompetitive = procedureMix.filter(
    (bucket) => bucket.key !== null && NON_COMPETITIVE_PROCEDURE_TYPES.has(bucket.key),
  )
  const nonCompetitiveValue = nonCompetitive.reduce(
    (total, bucket) =>
      bucket.valueRon === null ? total : total + Number(bucket.valueRon),
    0,
  )
  const nonCompetitiveCount = nonCompetitive.reduce(
    (total, bucket) =>
      bucket.recordCount === null ? total : total + Number(bucket.recordCount),
    0,
  )

  return (
    <section
      aria-label={t`Semnale`}
      className={cn('grid gap-3 sm:grid-cols-2 lg:grid-cols-4', className)}
    >
      <SignalTile
        label={t`Concentrare furnizori`}
        value={
          concentration?.top5Share
            ? formatScopeShare(concentration.top5Share)
            : '—'
        }
        hint={
          concentration
            ? t`primii 5 furnizori din ${concentration.supplierCount ?? 0}; clasamentul acoperă ${formatRon(concentration.totalRon, 'compact')} din ${formatRon(contractAwardedRon, 'compact')} (restul are furnizor neidentificat)`
            : undefined
        }
      />

      <SignalTile
        label={t`Atribuit fără publicare`}
        value={
          procedureMix.length === 0
            ? '—'
            : formatRon(String(nonCompetitiveValue), 'compact')
        }
        hint={
          procedureMix.length === 0
            ? undefined
            : t`${nonCompetitiveCount} contracte prin negociere fără publicare prealabilă`
        }
      />

      <SignalTile
        label={t`Efectul actelor adiționale`}
        value={amendment === null ? '—' : formatRon(amendment.deltaRon, 'compact')}
        hint={
          amendment === null
            ? t`indisponibil: lanțurile de modificări nu se pot ordona`
            : t`față de ${formatRon(amendment.matchedRon, 'compact')} atribuit inițial, pe contractele cu lanț de modificări verificabil`
        }
      />

      <SignalTile
        label={t`Plafon acorduri-cadru`}
        value={
          frameworkExposure === null || frameworkExposure.frameworkCount === '0'
            ? '—'
            : formatRon(frameworkExposure.ceilingRon, 'compact')
        }
        hint={
          frameworkExposure === null
            ? undefined
            : frameworkExposure.frameworkCount === '0'
              ? // No frameworks at all — distinct from a withheld ceiling.
                t`această instituție nu are acorduri-cadru înregistrate`
              : t`angajat maxim; comenzi raportate: ${formatRon(frameworkExposure.calloffRon, 'compact')}`
        }
      />
    </section>
  )
}
