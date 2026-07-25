import { t } from '@lingui/core/macro'
import { Info } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type { ProcurementInstitutionSignals } from '@/schemas/procurement'
import { formatRon } from '../lib/formatting'
import { concentrationSignalCopy } from '../lib/concentration-copy'
import { procurementStripClassName } from '../lib/procurement-theme'

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

/**
 * One signal inside the strip. Below `lg` it is a single line (label left,
 * figure right) so four signals cost four lines on a phone; from `lg` it
 * stacks into the three-tier column the desktop grid reads best as.
 */
function SignalCell({
  label,
  value,
  hint,
  detail,
}: {
  readonly label: string
  readonly value: string
  readonly hint?: string
  /** Full methodology sentence, behind an (i) tooltip — the hint stays one line. */
  readonly detail?: string
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 px-3 py-2.5 lg:block lg:px-4 lg:py-3">
      <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-[var(--pnrr-muted)]">
        <span className="min-w-0 truncate">{label}</span>
        {detail ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label={t`How this is measured`}
                className="inline-flex h-4 w-4 shrink-0 items-center justify-center text-[var(--pnrr-muted)] transition-colors hover:text-[var(--pnrr-fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)]"
              >
                <Info className="h-3.5 w-3.5" aria-hidden />
              </button>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">{detail}</TooltipContent>
          </Tooltip>
        ) : null}
      </p>
      <div className="flex shrink-0 items-baseline gap-2 lg:mt-1.5 lg:block">
        <p className="text-lg font-semibold tabular-nums text-[var(--pnrr-fg)] lg:text-xl">
          {value}
        </p>
        {hint ? (
          <p
            className="truncate text-xs leading-snug text-[var(--pnrr-muted)] lg:mt-0.5"
            title={hint}
          >
            {hint}
          </p>
        ) : null}
      </div>
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

  // What the ranking covers, and what it cannot. Consortium money belongs to a
  // group of suppliers whose internal split is never published, so it is not
  // attributable to anyone — the old copy called this remainder "furnizor
  // neidentificat", which is a different (and here false) statement.
  const concentrationCopy = concentrationSignalCopy({
    concentration,
    contractAwardedRon,
  })

  return (
    <section
      aria-label={t`Semnale`}
      className={cn(
        procurementStripClassName,
        'grid grid-cols-1 divide-y divide-[#b1b4b6]/50 lg:grid-cols-4 lg:divide-x-2 lg:divide-y-0 lg:divide-[var(--pnrr-border)] dark:divide-[var(--pnrr-border)]/60',
        className,
      )}
    >
      {/* The dash stays when no supplier money can be attributed — the copy
          explains what stands in its place instead of inventing a share. */}
      <SignalCell
        label={t`Concentrare furnizori`}
        value={concentrationCopy.value}
        hint={concentrationCopy.hint}
        detail={concentrationCopy.detail}
      />

      <SignalCell
        label={t`Atribuit fără publicare`}
        value={
          procedureMix.length === 0
            ? '—'
            : formatRon(String(nonCompetitiveValue), 'compact')
        }
        hint={
          procedureMix.length === 0
            ? undefined
            : t`${nonCompetitiveCount} contracte`
        }
        detail={
          procedureMix.length === 0
            ? undefined
            : t`Contracte atribuite prin negociere fără publicare prealabilă.`
        }
      />

      <SignalCell
        label={t`Efectul actelor adiționale`}
        value={amendment === null ? '—' : formatRon(amendment.deltaRon, 'compact')}
        hint={
          amendment === null
            ? t`indisponibil`
            : t`față de ${formatRon(amendment.matchedRon, 'compact')} atribuit inițial`
        }
        detail={
          amendment === null
            ? t`Indisponibil: lanțurile de modificări nu se pot ordona.`
            : t`Calculat pe contractele cu lanț de modificări verificabil.`
        }
      />

      <SignalCell
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
                t`nu are acorduri-cadru`
              : t`comenzi raportate: ${formatRon(frameworkExposure.calloffRon, 'compact')}`
        }
        detail={
          frameworkExposure === null ||
          frameworkExposure.frameworkCount === '0'
            ? undefined
            : t`Plafonul este angajatul maxim, nu o cheltuială; comenzile sunt contractele subsecvente raportate.`
        }
      />
    </section>
  )
}
