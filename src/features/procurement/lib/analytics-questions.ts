import type { MessageDescriptor } from '@lingui/core'
import { msg } from '@lingui/core/macro'
import { DEFAULT_QUERY, POPULATIONS, repaired, type PopulationId, type Query } from './analytics-model'

/**
 * Ready questions: each a query on the same engine, so a question is a link
 * and its answer the page itself. The example values (Cluj, a town hall) are
 * slots the reader changes on the answer; `trap` is what the answer must not
 * be read as, said beside it.
 */

export type QuestionGroup = 'cumpara' | 'vinde' | 'ce' | 'unde' | 'cand' | 'cum'

export interface Question {
  readonly id: string
  readonly group: QuestionGroup
  readonly text: MessageDescriptor
  readonly query: Query
  readonly trap?: MessageDescriptor
}

const CLUJ = { level: 'judet', values: ['CJ'] }
// The questions over years run to the end of the current one: the page stops at the data's cutoff.
const THROUGH = `${new Date().getFullYear()}-12`

function question(id: string, group: QuestionGroup, text: MessageDescriptor, patch: Partial<Query> & { readonly tip?: PopulationId }, trap?: MessageDescriptor): Question {
  const tip = patch.tip ?? DEFAULT_QUERY.tip
  const query = repaired({ ...DEFAULT_QUERY, masura: POPULATIONS[tip].defaultMeasure, ...patch, tip })
  return { id, group, text, query, ...(trap ? { trap } : {}) }
}

export const QUESTION_GROUPS: readonly { readonly id: QuestionGroup; readonly title: MessageDescriptor }[] = [
  { id: 'cumpara', title: msg`Cine cumpără` },
  { id: 'vinde', title: msg`Cine vinde` },
  { id: 'ce', title: msg`Ce se cumpără` },
  { id: 'unde', title: msg`Unde` },
  { id: 'cand', title: msg`Când` },
  { id: 'cum', title: msg`Cum` },
]

export const QUESTIONS: readonly Question[] = [
  question('cheltuie-direct', 'cumpara', msg`Ce instituții cheltuie cel mai mult prin achiziții directe?`, { dupa: { axis: 'cumparator', level: 'cui' } }, msg`Instituțiile centrale își au sediul în București.`),
  question('cumpara-judet', 'cumpara', msg`Cine cumpără cel mai mult în județul Cluj?`, { filters: { loc: CLUJ }, dupa: { axis: 'cumparator', level: 'cui' } }),
  question('atribuie-contracte', 'cumpara', msg`Ce instituții atribuie cele mai multe contracte?`, { tip: 'contracte', dupa: { axis: 'cumparator', level: 'cui' } }, msg`Numărăm rânduri: o asociere sau un lot contează de mai multe ori.`),
  question(
    'negociere',
    'cumpara',
    msg`Cine atribuie contracte prin negociere fără anunț?`,
    { tip: 'contracte', filters: { procedura: { level: 'tip', values: ['Negociere fara publicare prealabila'] } }, dupa: { axis: 'cumparator', level: 'cui' } },
    msg`E o cale legală, în anumite cazuri (urgență, un singur furnizor posibil) — nu o abatere.`),
  question('acorduri', 'cumpara', msg`Cine încheie cele mai multe acorduri-cadru?`, { tip: 'acorduri', dupa: { axis: 'cumparator', level: 'cui' } }, msg`Un acord-cadru fixează un plafon, nu o cheltuială.`),
  question(
    'un-furnizor',
    'cumpara',
    msg`De la cine cumpără Municipiul Cluj-Napoca direct?`,
    { filters: { cumparator: { level: 'cui', values: ['4305857'] } }, dupa: { axis: 'furnizor', level: 'cui' } },
  ),

  question('vand-direct', 'vinde', msg`Ce firme vând cel mai mult statului direct?`, { dupa: { axis: 'furnizor', level: 'cui' } }, msg`În frunte: telefonia, magazinele en-gros și de bricolaj, farmaciile — cumpărături mici și multe; nicio firmă nu ia nici jumătate de procent din bani.`),
  question('castiga-contracte', 'vinde', msg`Ce firme câștigă cele mai multe contracte?`, { tip: 'contracte', dupa: { axis: 'furnizor', level: 'cui' } }, msg`Rânduri, nu contracte; o firmă cu două CUI-uri apare de două ori.`),
  question(
    'constructii',
    'vinde',
    msg`Cine câștigă contractele de construcții?`,
    { tip: 'contracte', filters: { cpv: { level: 'diviziune', values: ['45'] } }, dupa: { axis: 'furnizor', level: 'cui' } },
    msg`Banii drumurilor merg mai ales la asocieri: de aceea numărăm, nu adunăm lei.`),
  question('furnizori-judet', 'vinde', msg`De la cine cumpără instituțiile din județul Cluj?`, { filters: { loc: CLUJ }, dupa: { axis: 'furnizor', level: 'cui' } }),
  question('firme-judet', 'vinde', msg`Ce firme din județul Cluj vând statului?`, { filters: { loc_firma: CLUJ }, dupa: { axis: 'furnizor', level: 'cui' } }, msg`Județul sediului firmei, nu al lucrării.`),

  question('pe-ce', 'ce', msg`Pe ce se duc banii achizițiilor directe?`, { dupa: { axis: 'cpv', level: 'diviziune' } }, msg`Un singur cod CPV pe achiziție, chiar pentru un coș.`),
  question('licitatie', 'ce', msg`Ce se cumpără cel mai des prin contracte?`, { tip: 'contracte', dupa: { axis: 'cpv', level: 'diviziune' } }),
  question('medicamente', 'ce', msg`Cine vinde medicamente instituțiilor?`, { filters: { cpv: { level: 'grup', values: ['336'] } }, dupa: { axis: 'furnizor', level: 'cui' } }, msg`Nu știm tipul instituției: nu spunem „spitalelor".`),
  question('lucrari-directe', 'ce', msg`Ce lucrări se fac prin achiziție directă?`, { filters: { cpv: { level: 'diviziune', values: ['45'] } }, dupa: { axis: 'cpv', level: 'grup' } }),
  question('laptop', 'ce', msg`Cine cumpără laptopuri?`, { titlu: 'laptop', dupa: { axis: 'cumparator', level: 'cui' } }, msg`Caută „laptop" în titlu: un coș numit altfel nu apare.`),

  question('pe-locuitor', 'unde', msg`Unde se cumpără cel mai mult, pe locuitor?`, { dupa: { axis: 'loc', level: 'judet' }, masura: 'locuitor' }, msg`București ține instituțiile centrale.`),
  question('localitati', 'unde', msg`Ce localități din județul Cluj cheltuie cel mai mult?`, { filters: { loc: CLUJ }, dupa: { axis: 'loc', level: 'localitate' } }, msg`Consiliul județean și instituțiile lui au codul SIRUTA al județului: apar ca „Județul Cluj", nu în Cluj-Napoca.`),
  question('local', 'unde', msg`Cumpără local instituțiile din județul Cluj?`, { filters: { loc: CLUJ }, dupa: { axis: 'loc_firma', level: 'judet' } }, msg`Sediul firmei nu e locul lucrării.`),
  question('unde-castiga', 'unde', msg`Unde câștigă contracte firmele din județul Cluj?`, { tip: 'contracte', filters: { loc_firma: CLUJ }, dupa: { axis: 'loc', level: 'judet' } }),

  question('din-2019', 'cand', msg`Cum au evoluat achizițiile directe din 2019?`, { period: { kind: 'months', from: '2019-01', to: THROUGH }, dupa: { axis: 'timp', bucket: 'year' } }, msg`Lei ai fiecărui an, neajustați cu inflația; anul în curs e parțial.`),
  question('decembrie', 'cand', msg`Se cumpără mai mult în decembrie?`, { period: { kind: 'months', from: '2023-01', to: THROUGH }, dupa: { axis: 'timp', bucket: 'month' } }),
  question('trimestre', 'cand', msg`Cum au evoluat contractele, pe trimestre?`, { tip: 'contracte', period: { kind: 'months', from: '2022-01', to: THROUGH }, dupa: { axis: 'timp', bucket: 'quarter' } }, msg`Sursele acoperă diferit fiecare an, iar din 2026 rândurile vin mai ales din e-licitație: urmăriți forma, nu nivelul.`),

  question('proceduri', 'cum', msg`Cum atribuie statul contractele?`, { tip: 'contracte', dupa: { axis: 'procedura', level: 'tip' } }, msg`Se numără doar contractele de sine stătătoare: plafoanele acordurilor-cadru și contractele subsecvente nu intră.`),
  question(
    'directe-mari',
    'cum',
    msg`Cine face achiziții directe de cel puțin 100.000 lei?`,
    { valoare: { min: 100000, max: null }, dupa: { axis: 'cumparator', level: 'cui' }, masura: 'numar' },
    msg`Valoare fără TVA; pragurile legale diferă după tip și an.`),
]
