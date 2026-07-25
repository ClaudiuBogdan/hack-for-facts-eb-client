/**
 * The supplier-concentration tile's copy, derived from the STRUCTURED
 * concentration answer rather than from the English caveat prose.
 *
 * The tile used to claim the uncovered remainder had "furnizor neidentificat".
 * That is a different population: consortium awards belong to a group of
 * suppliers whose internal split the source never publishes, so the money is
 * attributable to no one — and on some buyers it is the WHOLE awarded total.
 * The server now returns that amount (`withheldConsortiumRon`), so this reads
 * the number instead of guessing at what is missing.
 */
import { t } from '@lingui/core/macro'

import { formatRon, formatScopeShare } from './formatting'

import type { ProcurementInstitutionSignals } from '@/schemas/procurement'

export type ConcentrationSignal = NonNullable<
  ProcurementInstitutionSignals['concentration']
>

export type ConcentrationCopy = {
  readonly value: string
  readonly hint?: string
  readonly detail?: string
}

/** A money string the server actually observed, above zero. */
const hasMoney = (ron: string | null): ron is string =>
  ron !== null && Number(ron) > 0

export function concentrationSignalCopy(options: {
  readonly concentration: ConcentrationSignal | null
  /** The buyer's contract-grain awarded total — what the ranking is a share OF. */
  readonly contractAwardedRon: string | null
}): ConcentrationCopy {
  const { concentration, contractAwardedRon } = options
  if (concentration === null) return { value: '—' }

  const rankedRon = concentration.totalRon
  const withheldRon = concentration.withheldConsortiumRon
  // A gate-blocked block read nothing at all, so its nulls mean "withheld",
  // not "no attributable money" — the page notice carries the reason.
  const blocked = concentration.meta.answerability === 'abstained'

  if (concentration.top5Share !== null) {
    return {
      value: formatScopeShare(concentration.top5Share),
      hint: t`primii 5 din ${concentration.supplierCount ?? 0} furnizori`,
      detail: hasMoney(withheldRon)
        ? t`Clasamentul acoperă ${formatRon(rankedRon, 'compact')} din ${formatRon(contractAwardedRon, 'compact')} atribuit. Alte ${formatRon(withheldRon, 'compact')} provin din contracte încredințate unor asocieri cu mai mulți membri, unde repartiția pe furnizori nu este publicată.`
        : t`Clasamentul acoperă ${formatRon(rankedRon, 'compact')} din ${formatRon(contractAwardedRon, 'compact')} atribuit.`,
    }
  }

  // No percentage is invented when no supplier money can be attributed: the
  // metric keeps its dash and the copy explains what stands in its place.
  if (blocked) {
    return {
      value: '—',
      hint: t`indisponibil`,
      detail: t`Indisponibil pentru această selecție — vezi nota de acoperire de mai sus.`,
    }
  }

  return {
    value: '—',
    hint: t`valoare nerepartizată pe furnizori`,
    detail: hasMoney(withheldRon)
      ? t`Nu se poate calcula: în această perioadă nicio sumă atribuită nu revine unui furnizor anume. Cele ${formatRon(withheldRon, 'compact')} atribuite provin din contracte încredințate unor asocieri cu mai mulți membri, iar repartiția între membri nu este publicată.`
      : t`Nu se poate calcula: în această perioadă nicio sumă atribuită nu revine unui furnizor anume.`,
  }
}
