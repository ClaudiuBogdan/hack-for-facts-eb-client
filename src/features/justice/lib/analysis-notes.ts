import { t } from '@lingui/core/macro'
import { rateAllowed, sourceOf, type AnalysisSource, type Question } from './analysis-model'
import { COUNTY_POPULATION } from './county-population'
import { JUSTICE_HUB_SNAPSHOT } from './hub-snapshot'
import { JUSTICE_FIRST_WHOLE_YEAR, JUSTICE_LAST_CAPTURE_YEAR } from './hub-years'
import { dayText, monthText } from './judicial-format'

/** The analysis page's dates and caveats, behind the head's one marker (design.md §15–16). */

const PORTAL_AS_OF = JUSTICE_HUB_SNAPSHOT.asOf.portalModifiedAt
const ICCJ_AS_OF = JUSTICE_HUB_SNAPSHOT.asOf.iccjArchiveDate

/** The newest date a source's cases carry: the Portal's last modification, the ÎCCJ archive's last case date; both sources stop with the Portal's. */
export function asOfOf(source: AnalysisSource): string {
  return source === 'iccj' ? ICCJ_AS_OF : PORTAL_AS_OF
}

/** The day a question's data stops: one date, or the Portal's with the ÎCCJ archive's when it reads both. */
export function cutoffText(source: AnalysisSource): string {
  return source === 'both' ? t`${dayText(PORTAL_AS_OF)} (Înalta Curte: ${dayText(ICCJ_AS_OF)})` : dayText(asOfOf(source))
}

/** How recent a question's data is, as the head says it. */
export function freshnessText(source: AnalysisSource): string {
  return t`Date până la ${cutoffText(source)}`
}

const monthOf = (asOf: string) => monthText(asOf.slice(0, 7), 'long').split(' ')[0] ?? asOf.slice(0, 7)

/** The month the capture's last year stops in, as a word („iunie") — the Portal's with the ÎCCJ archive's when a question reads both („iunie; ÎCCJ: iulie"). */
export function lastMonthText(source: AnalysisSource): string {
  return source === 'both' ? t`${monthOf(PORTAL_AS_OF)}; ÎCCJ: ${monthOf(ICCJ_AS_OF)}` : monthOf(asOfOf(source))
}

/** What the reader should know before the numbers: the warnings the question itself raises (a part-year, a rate, the ÎCCJ's archive), then what holds for every answer. */
export function analysisNotes(question: Question): { readonly warnings: readonly string[]; readonly notes: readonly string[] } {
  const source = sourceOf(question)
  const warnings: string[] = []
  if (question.year === JUSTICE_LAST_CAPTURE_YEAR) warnings.push(t`${question.year} e un an parțial: datele se opresc la ${cutoffText(source)}. Nu se compară cu un an întreg.`)
  if (question.masura === 'locuitori' && rateAllowed(question, COUNTY_POPULATION.year))
    warnings.push(
      t`La 1.000 de locuitori: dosarele instanțelor din județ, la locuitorii lui la 1 ianuarie ${COUNTY_POPULATION.year} (INS), calculat de Transparenta.eu. O instanță judecă și pentru alte județe, iar un dosar e judecat unde e competentă instanța, nu unde locuiesc părțile.`,
    )
  if (source === 'iccj') warnings.push(t`Arhiva Înaltei Curți e un set parțial, mai plin în anii recenți: anii ei nu se compară între ei.`)
  return {
    warnings,
    notes: [
      t`Anul unui dosar e anul datei lui din sursă — antetul de pe portal sau data din arhiva ÎCCJ —, nu neapărat data înregistrării.`,
      t`Anii dinainte de ${JUSTICE_FIRST_WHOLE_YEAR} au doar dosarele încă active după 2013, când a început preluarea: nu sunt volumul instanțelor.`,
      t`Un dosar e numărat la fiecare instanță unde e înregistrat: același dosar, ajuns în apel, apare și la instanța de apel, sub același număr.`,
      ...(source === 'both' ? [t`Arhiva Înaltei Curți e parțială și mai plină în anii recenți: nu i se arată o schimbare față de anul trecut, iar în totaluri mărește puțin schimbarea.`] : []),
      t`Portalul nu publică soluțiile, iar părțile nu sunt numite: datele nu conțin persoane.`,
    ],
  }
}
