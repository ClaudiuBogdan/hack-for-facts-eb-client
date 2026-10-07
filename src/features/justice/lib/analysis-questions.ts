import type { MessageDescriptor } from '@lingui/core'
import { msg } from '@lingui/core/macro'
import { DEFAULT_QUESTION, type Question } from './analysis-model'
import { COUNTY_POPULATION } from './county-population'

/**
 * The analysis page's ready questions: each a question on the same engine,
 * so a question is a link and its answer the page itself. The example values
 * (Cluj, insolvency) are slots the reader changes on the answer.
 */

export type QuestionGroup = 'unde' | 'ce' | 'trepte'

export interface ReadyQuestion {
  readonly id: string
  readonly group: QuestionGroup
  readonly text: MessageDescriptor
  readonly patch: Partial<Question>
}

export const QUESTION_GROUPS: readonly { readonly id: QuestionGroup; readonly title: MessageDescriptor }[] = [
  { id: 'unde', title: msg`Unde` },
  { id: 'ce', title: msg`Ce se judecă` },
  { id: 'trepte', title: msg`Pe trepte` },
]

export const QUESTIONS: readonly ReadyQuestion[] = [
  { id: 'incarcate', group: 'unde', text: msg`Ce instanțe au cele mai multe dosare?`, patch: { dupa: 'instante' } },
  {
    id: 'locuitori',
    group: 'unde',
    text: msg`Unde sunt cele mai multe dosare la 1.000 de locuitori?`,
    // The residents are counted for one year: the rate is that year's.
    patch: { year: COUNTY_POPULATION.year, levels: ['judecatorie'], dupa: 'judete', masura: 'locuitori' },
  },
  { id: 'cluj', group: 'unde', text: msg`Care sunt cele mai încărcate instanțe din județul Cluj?`, patch: { counties: ['CJ'], dupa: 'instante' } },
  { id: 'faliment', group: 'unde', text: msg`Unde se judecă falimentele?`, patch: { matters: ['faliment'], dupa: 'instante' } },
  { id: 'munca', group: 'unde', text: msg`Unde se judecă cele mai multe litigii de muncă?`, patch: { matters: ['litigiidemunca'], dupa: 'judete' } },
  { id: 'materii', group: 'ce', text: msg`Ce se judecă în România?`, patch: { dupa: 'materii' } },
  { id: 'curti', group: 'ce', text: msg`Ce judecă curțile de apel?`, patch: { levels: ['curte_de_apel'], dupa: 'materii' } },
  { id: 'iccj', group: 'ce', text: msg`Ce ajunge la Înalta Curte?`, patch: { levels: ['inalta_curte'], dupa: 'materii' } },
  { id: 'apel', group: 'trepte', text: msg`Unde ajung apelurile?`, patch: { stages: ['apel'], dupa: 'instante' } },
  { id: 'penal', group: 'trepte', text: msg`În ce etapă sunt dosarele penale?`, patch: { matters: ['penal'], dupa: 'etape' } },
  { id: 'niveluri', group: 'trepte', text: msg`Cum se împart dosarele pe niveluri de instanță?`, patch: { dupa: 'niveluri' } },
]

/** A ready question as a whole question: the year stays the reader's unless the question names its own; every other filter is the question's. */
export function askedQuestion(current: Question, ready: ReadyQuestion): Question {
  return { ...DEFAULT_QUESTION, year: current.year, ...ready.patch }
}
