/**
 * Words and numbers for the national budget's analysis page, in the hubs'
 * formats (`moneyText`, `percentText`, `monthText` are the procurement hub's,
 * in the reader's own notation): a real minus sign, billions for a table
 * headed „mld. lei", a long name cut for a figure, the bulletin's lines named
 * as a reader names them.
 */
import { t } from '@lingui/core/macro'

import { monthText, percentText as hubPercentText } from '@/features/procurement/lib/home-format'
import { exactBillions, exactCompact } from './exact'

export { monthText }

const NBSP = '\u00a0'

/**
 * The hubs' „18,0 mld. lei", „966,9 mil. lei", „8.948 lei", from the exact
 * amount: rounded on its digits, never through a float; a real minus sign
 * („−3,0 mld. lei": a refund line is negative). A value that isn't a decimal
 * is shown as it came.
 */
export function moneyText(exact: string): string {
  const compact = exactCompact(exact)
  if (!compact) return exact
  const unit = compact.scale === 'billion' ? t`mld. lei` : compact.scale === 'million' ? t`mil. lei` : t`lei`
  return `${compact.value}${NBSP}${unit}`
}

export function percentText(fraction: number, digits = 1): string {
  return hubPercentText(fraction, digits).replace(/^-/u, '−')
}

/** Billions with one decimal, rounded on the exact digits, for a table whose header says „mld. lei". */
export function billionsText(exact: string): string {
  return exactBillions(exact) ?? exact
}

/** A long name cut for a figure's label: „Ministerul Muncii Familiei…". */
export function shortName(name: string, max = 34): string {
  if (name.length <= max) return name
  const cut = name.slice(0, max)
  return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), 20)).trimEnd()}…`
}

/** The bulletin's lines as a reader names them (the source writes them lowercase, without diacritics). */
const LINE_LABELS: Readonly<Record<string, () => string>> = {
  'venituri totale': () => t({ message: `Venituri totale`, context: 'national budget classification' }),
  'venituri curente': () => t({ message: `Venituri curente`, context: 'national budget classification' }),
  'venituri fiscale': () => t({ message: `Venituri fiscale`, context: 'national budget classification' }),
  'impozitul pe profit, salarii, venit si castiguri din capital': () => t({ message: `Impozite pe profit, salarii și venit`, context: 'national budget classification' }),
  'impozitul pe profit': () => t({ message: `Impozitul pe profit`, context: 'national budget classification' }),
  'impozitul pe salarii si venit': () => t({ message: `Impozitul pe salarii și venit`, context: 'national budget classification' }),
  'alte impozite pe venit, profit si castiguri din capital': () => t({ message: `Alte impozite pe venit și profit`, context: 'national budget classification' }),
  'impozite si taxe pe proprietate': () => t({ message: `Impozite și taxe pe proprietate`, context: 'national budget classification' }),
  'impozite si taxe pe bunuri si servicii': () => t({ message: `Impozite pe bunuri și servicii`, context: 'national budget classification' }),
  tva: () => t({ message: `TVA`, context: 'national budget classification' }),
  accize: () => t({ message: `Accize`, context: 'national budget classification' }),
  'alte impozite si taxe pe bunuri si servicii': () => t({ message: `Alte taxe pe bunuri și servicii`, context: 'national budget classification' }),
  'taxe pe utilizarea bunurilor, autorizarea utilizarii bunurilor sau pe desfasurarea de activitati': () => t({ message: `Taxe pe utilizarea bunurilor și pe activități`, context: 'national budget classification' }),
  'impozit pe comertul exterior si tranzactiile internationale (taxe vamale)': () => t({ message: `Taxe vamale`, context: 'national budget classification' }),
  'alte impozite si taxe fiscale': () => t({ message: `Alte impozite și taxe`, context: 'national budget classification' }),
  'contributii de asigurari': () => t({ message: `Contribuții sociale`, context: 'national budget classification' }),
  'venituri nefiscale': () => t({ message: `Venituri nefiscale`, context: 'national budget classification' }),
  subventii: () => t({ message: `Subvenții`, context: 'national budget classification' }),
  'venituri din capital': () => t({ message: `Venituri din capital`, context: 'national budget classification' }),
  donatii: () => t({ message: `Donații`, context: 'national budget classification' }),
  'sume primite de la ue/alti donatori in contul platilor efectuate si prefinantari': () => t({ message: `Bani de la UE pentru plăți și prefinanțări`, context: 'national budget classification' }),
  'operatiuni financiare': () => t({ message: `Operațiuni financiare`, context: 'national budget classification' }),
  'sume in curs de distribuire': () => t({ message: `Sume în curs de distribuire`, context: 'national budget classification' }),
  'alte sume primite de la ue': () => t({ message: `Alte sume de la UE`, context: 'national budget classification' }),
  'sume primite de la ue/alti donatori in contul platilor efectuate si prefinantari aferente cadrului financiar 2014-2020': () => t({ message: `Bani de la UE, cadrul 2014–2020`, context: 'national budget classification' }),
  'sume aferente asistentei financiare nerambursabile alocate pentru pnrr': () => t({ message: `Granturi PNRR`, context: 'national budget classification' }),
  'cheltuieli totale': () => t({ message: `Cheltuieli totale`, context: 'national budget classification' }),
  'cheltuieli curente': () => t({ message: `Cheltuieli curente`, context: 'national budget classification' }),
  'cheltuieli de personal': () => t({ message: `Cheltuieli de personal`, context: 'national budget classification' }),
  'bunuri si servicii': () => t({ message: `Bunuri și servicii`, context: 'national budget classification' }),
  dobanzi: () => t({ message: `Dobânzi`, context: 'national budget classification' }),
  'transferuri intre unitati ale administratiei publice': () => t({ message: `Transferuri către alte bugete`, context: 'national budget classification' }),
  'alte transferuri': () => t({ message: `Alte transferuri`, context: 'national budget classification' }),
  'proiecte cu finantare din fonduri externe nerambursabile': () => t({ message: `Proiecte cu fonduri UE`, context: 'national budget classification' }),
  'asistenta sociala': () => t({ message: `Asistență socială`, context: 'national budget classification' }),
  'proiecte cu finantare din fonduri externe nerambursabile aferente cadrului financiar 2014-2020 si din fondul de modernizare': () =>
    t({ message: `Proiecte UE 2014–2020 și Fondul de modernizare`, context: 'national budget classification' }),
  'alte cheltuieli': () => t({ message: `Alte cheltuieli`, context: 'national budget classification' }),
  'proiecte cu finantare din sumele reprezentand asistenta financiara nerambursabila aferenta pnrr': () => t({ message: `Proiecte PNRR din granturi`, context: 'national budget classification' }),
  'proiecte cu finantare din sumele aferente componentei de imprumut a pnrr': () => t({ message: `Proiecte PNRR din împrumuturi`, context: 'national budget classification' }),
  'cheltuieli aferente programelor cu finantare rambursabila': () => t({ message: `Programe cu finanțare rambursabilă`, context: 'national budget classification' }),
  'cheltuieli de capital': () => t({ message: `Cheltuieli de capital`, context: 'national budget classification' }),
  'active nefinanciare': () => t({ message: `Investiții (active nefinanciare)`, context: 'national budget classification' }),
  'active financiare': () => t({ message: `Active financiare`, context: 'national budget classification' }),
  imprumuturi: () => t({ message: `Împrumuturi acordate`, context: 'national budget classification' }),
  'rambursari de credite': () => t({ message: `Rambursări de credite`, context: 'national budget classification' }),
  'plati efectuate in anii precedenti si recuperate in anul curent': () => t({ message: `Plăți din anii trecuți, recuperate`, context: 'national budget classification' }),
  'excedent(+) / deficit(-)': () => t({ message: `Sold`, context: 'national budget classification' }),
}

/** A bulletin line's name; one the page doesn't know yet keeps the source's words, capitalised. */
export function lineLabel(lineItem: string): string {
  return LINE_LABELS[lineItem]?.() ?? lineItem.charAt(0).toUpperCase() + lineItem.slice(1)
}

/** First letter lowered, for a name inside a sentence; an acronym („TVA") or a name with capitals of its own („EximBank") stays. */
export function inSentence(label: string): string {
  const word = label.split(/\s/u)[0] ?? ''
  if (/\p{Lu}/u.test(word.slice(1))) return label
  return label.charAt(0).toLocaleLowerCase('ro-RO') + label.slice(1)
}
