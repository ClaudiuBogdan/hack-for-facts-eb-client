import { t } from '@lingui/core/macro'
import { eventShort, eventTitle, familyPlural, officeLabel, roundLabel, scopeLabel } from '../shared/labels'
import type { ScopeType } from '../shared/model'
import { ROUND_UNREPORTED, type Axis, type Catalog, type FilterKey, type Measure, type Query, type Tab } from './model'

/** The analysis page's words: the tabs, the measures, the question as a sentence, the chips (Guidelines G2, G10). */

export function tabLabel(tab: Tab): string {
  switch (tab) {
    case 'randuri':
      return t`Rânduri`
    case 'alegeri':
      return t`Alegeri`
    case 'editii':
      return t`Ediții`
    case 'functii':
      return t`Funcții`
    case 'niveluri':
      return t`Niveluri`
    case 'tururi':
      return t`Tururi`
    case 'judete':
      return t`Județe`
    case 'localitati':
      return t`Localități`
    case 'timp':
      return t`În timp`
  }
}

export function measureLabel(measure: Measure): string {
  switch (measure) {
    case 'randuri':
      return t`Rânduri de scrutin`
    case 'editii':
      return t`Ediții de date`
    case 'alegeri':
      return t`Alegeri`
  }
}

/** The measure as the headline's subject: „Rândurile de scrutin", „Edițiile de date", „Alegerile". */
function measureSubject(measure: Measure): string {
  switch (measure) {
    case 'randuri':
      return t`Rândurile de scrutin`
    case 'editii':
      return t`Edițiile de date`
    case 'alegeri':
      return t`Alegerile`
  }
}

/** An office as a reader says it; a label the table does not know is quoted as the source's. */
export function officeText(office: string): { readonly label: string; readonly known: boolean } {
  const known = officeLabel(office)
  return known ? { label: known, known: true } : { label: office, known: false }
}

export function roundText(round: string): string {
  return roundLabel(round === ROUND_UNREPORTED ? null : round)
}

/** The scope type as a level, in the headline: „raportate pe localități", „la nivel de țară". */
function levelPhrase(scope: ScopeType): string {
  switch (scope) {
    case 'siruta':
      return t`raportate pe localități`
    case 'source_constituency':
      return t`raportate pe numerotarea sursei`
    case 'county':
      return t`raportate pe județe`
    case 'diaspora':
      return t`raportate în străinătate`
    case 'national':
      return t`raportate la nivel de țară`
    case 'chamber':
      return t`raportate pe camere`
  }
}

export interface HeadlinePart {
  /** The filter the phrase stands for, or `measure` for the words that are not a filter (the axis is said after the sentence). */
  readonly role: FilterKey | 'measure'
  readonly before: string
  readonly text: string
}

/**
 * The question as one sentence, each filter a phrase: „Rândurile de scrutin
 * din alegerile locale din 2024, pentru primar, raportate pe localități din
 * județul Cluj, pe tururi". The family and the year fold into the election's
 * name when one is picked; a county folds the level into itself.
 */
export function headlineParts(query: Query, cat: Catalog): readonly HeadlinePart[] {
  const parts: HeadlinePart[] = [{ role: 'measure', before: '', text: measureSubject(query.masura) }]
  const event = query.alegere ? cat.data.events.find((item) => item.key === query.alegere) : undefined
  if (query.editie && event) {
    parts.push({ role: 'editie', before: ' ', text: t`din ediția ${query.editie}` })
    parts.push({ role: 'alegere', before: ' ', text: `(${eventShort(event)})` })
  } else if (event) {
    parts.push({ role: 'alegere', before: ' ', text: t`din ${eventTitle(event).toLocaleLowerCase('ro-RO')}` })
  } else {
    if (query.tip) parts.push({ role: 'tip', before: ' ', text: t`din alegerile ${familyPlural(query.tip).toLocaleLowerCase('ro-RO')}` })
    else parts.push({ role: 'measure', before: ' ', text: query.masura === 'alegeri' ? t`din date` : t`din toate alegerile din date` })
    if (query.an !== null) parts.push({ role: 'an', before: ' ', text: t`din ${query.an}` })
  }
  if (query.functie) {
    const office = officeText(query.functie)
    parts.push({ role: 'functie', before: ', ', text: office.known ? t`pentru ${office.label.toLocaleLowerCase('ro-RO')}` : t`cu eticheta „${office.label}"` })
  }
  if (query.judet) {
    const county = cat.countyOf.get(query.judet)?.name ?? query.judet
    parts.push({ role: 'judet', before: ', ', text: t`raportate pe localități din județul ${county}` })
  } else if (query.nivel) {
    parts.push({ role: 'nivel', before: ', ', text: levelPhrase(query.nivel) })
  }
  if (query.tur) parts.push({ role: 'tur', before: ', ', text: query.tur === ROUND_UNREPORTED ? t`cu tur neraportat` : t`în ${roundText(query.tur)}` })
  return parts
}

/** „pe alegeri", „în timp": the axis, after the question. */
export function axisPhrase(tab: Tab): string {
  switch (tab) {
    case 'randuri':
      return t`rând cu rând`
    case 'alegeri':
      return t`pe alegeri`
    case 'editii':
      return t`pe ediții`
    case 'functii':
      return t`pe funcții`
    case 'niveluri':
      return t`pe niveluri`
    case 'tururi':
      return t`pe tururi`
    case 'judete':
      return t`pe județe`
    case 'localitati':
      return t`pe localități`
    case 'timp':
      return t`în timp`
  }
}

export function headlineText(query: Query, cat: Catalog): string {
  return `${headlineParts(query, cat)
    .map((part) => part.before + part.text)
    .join('')}, ${axisPhrase(query.dupa)}`
}

/** A filter's value in a few words, for a chip. */
export function chipLabel(query: Query, key: FilterKey, cat: Catalog): string {
  switch (key) {
    case 'tip':
      return query.tip ? familyPlural(query.tip) : ''
    case 'an':
      return query.an !== null ? String(query.an) : ''
    case 'alegere': {
      const event = cat.data.events.find((item) => item.key === query.alegere)
      return event ? eventTitle(event) : (query.alegere ?? '')
    }
    case 'editie':
      return query.editie ?? ''
    case 'functie':
      return query.functie ? officeText(query.functie).label : ''
    case 'nivel':
      return query.nivel ? scopeLabel(query.nivel) : ''
    case 'tur':
      return query.tur ? roundText(query.tur) : ''
    case 'judet':
      return query.judet ? (cat.countyOf.get(query.judet)?.name ?? query.judet) : ''
  }
}

export function filterLabel(key: FilterKey): string {
  switch (key) {
    case 'tip':
      return t`Tipul`
    case 'an':
      return t`Anul`
    case 'alegere':
      return t`Alegerea`
    case 'editie':
      return t`Ediția`
    case 'functie':
      return t`Funcția`
    case 'nivel':
      return t`Nivelul`
    case 'tur':
      return t`Turul`
    case 'judet':
      return t`Județul`
  }
}

/** A group's name on an axis. */
export function groupLabel(axis: Axis, key: string, cat: Catalog): { readonly label: string; readonly meta: string | null; readonly mono: boolean } {
  switch (axis) {
    case 'alegeri': {
      const event = cat.data.events.find((item) => item.key === key)
      return { label: event ? eventTitle(event) : key, meta: null, mono: false }
    }
    case 'editii': {
      const event = cat.eventOf.get(key)
      return { label: key, meta: event ? eventShort(event) : null, mono: true }
    }
    case 'functii': {
      // The source's own label beside the word: two spellings of one office („county_council", „consiliu-judetean") stay two rows.
      const office = officeText(key)
      return office.known ? { label: office.label, meta: key, mono: false } : { label: key, meta: t`etichetă din sursă`, mono: true }
    }
    case 'niveluri':
      return { label: scopeLabel(key as ScopeType), meta: null, mono: false }
    case 'tururi':
      return { label: roundText(key), meta: null, mono: false }
    case 'judete':
      return key === 'unlisted'
        ? { label: t`Localități care nu sunt în lista INS de azi`, meta: null, mono: false }
        : { label: cat.countyOf.get(key)?.name ?? key, meta: null, mono: false }
    case 'timp':
      return { label: key, meta: null, mono: false }
    case 'localitati':
      return { label: key, meta: null, mono: false }
  }
}
