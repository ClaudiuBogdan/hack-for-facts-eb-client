import { t } from '@lingui/core/macro'
import { JUSTICE_HUB_SNAPSHOT } from '@/features/justice/lib/hub-snapshot'
import { JUSTICE_FIRST_WHOLE_YEAR, JUSTICE_LAST_CAPTURE_YEAR } from '@/features/justice/lib/hub-years'
import { monthText } from '@/features/justice/lib/judicial-format'
import type { Question } from './analize.model'

/** The page's dates and caveats, behind the head's one marker. */

/** The newest modification the Portal capture holds: what the page's figures run to. */
export const ASOF = JUSTICE_HUB_SNAPSHOT.asOf.portalModifiedAt

/** The month the capture's last year stops in, as a word („iunie"). */
export function lastMonthText(): string {
  return monthText(ASOF.slice(0, 7), 'long').split(' ')[0] ?? ASOF.slice(0, 7)
}

/**
 * What the reader should know before the numbers: the warnings the question
 * itself raises (a part-year, a rate), then what holds for every answer.
 */
export function analysisNotes(question: Question): {
  readonly warnings: readonly string[]
  readonly notes: readonly string[]
} {
  const warnings: string[] = []
  if (question.year === JUSTICE_LAST_CAPTURE_YEAR) warnings.push(t`${question.year} e un an parțial: preluarea de pe portal s-a oprit în ${lastMonthText()} ${question.year}. Nu se compară cu un an întreg.`)
  if (question.masura === 'locuitori' && question.dupa === 'judete')
    warnings.push(
      t`La 1.000 de locuitori: dosarele instanțelor din județ, la locuitorii lui (INS, 1 ianuarie 2025), calculat de Transparenta.eu. O instanță judecă și pentru alte județe, iar un dosar e judecat unde e competentă instanța, nu unde locuiesc părțile.`,
    )
  return {
    warnings,
    notes: [
      t`Anul unui dosar e anul datei lui din sursă — antetul de pe portal sau data din arhiva ÎCCJ —, nu neapărat data înregistrării.`,
      t`Anii dinainte de ${JUSTICE_FIRST_WHOLE_YEAR} au doar dosarele încă active după 2013, când a început preluarea: nu sunt volumul instanțelor.`,
      t`Un dosar e numărat la fiecare instanță unde e înregistrat: același dosar, ajuns în apel, apare și la instanța de apel, sub același număr.`,
      t`Portalul nu publică soluțiile, iar părțile nu sunt numite: datele nu conțin persoane.`,
    ],
  }
}
