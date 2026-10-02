import { plural, t } from '@lingui/core/macro'
import { i18n } from '@lingui/core'
import { displayCompanyName } from '@/features/private-companies/lib/company-profile-model'
import { cpvDivisionLabelEn, cpvDivisionLabelRo } from './cpv-labels'
import { bigCountText, countText, lowerFirst, moneyText, monthText, percentText } from './home-format'
import { procedureLabel, tidyName } from './home-model'
import { cpvKey, cpvPrefix, POPULATIONS, type AxisId, type GroupBy, type Measure, type PopulationId, type Query, type ResolvedPeriod } from './analytics-model'
import { bucharestWholeLabel } from './analytics-places'
import type { Names } from '../api/procurement-analytics-api'

/**
 * The page's words: the headline the query reads as (generated, never
 * edited — Romanian agreement changes with every slot), the period, the
 * names of what a key stands for, and the figures' labels.
 */

// ──────────────────────────────────────────────────────────────── names ──

export interface Namer {
  readonly names: Names | undefined
  readonly divisions: ReadonlyMap<string, { readonly ro: string | null; readonly en: string | null }>
  readonly counties: ReadonlyMap<string, string>
  readonly localities: ReadonlyMap<string, { readonly name: string; readonly kind: string | null }> | null
}

/** A name in the page's language, else the other. */
function inLocale(name: { readonly ro: string | null; readonly en: string | null } | undefined): string | null {
  if (!name) return null
  return i18n.locale === 'en' ? (name.en ?? name.ro) : (name.ro ?? name.en)
}

/**
 * A CPV code's label, in the page's language: for a division the client's
 * short name where it has one (the nine most bought, checked against the
 * CPV), else the API's; the code when nothing is known.
 */
export function cpvLabel(prefix: string, namer: Namer): string {
  if (prefix.length === 2) {
    const short = cpvDivisionLabelRo(prefix) !== null ? inLocale({ ro: cpvDivisionLabelRo(prefix), en: cpvDivisionLabelEn(prefix) }) : null
    const division = short ?? inLocale(namer.divisions.get(prefix))
    if (division) return division
  }
  return inLocale(namer.names?.cpv.get(cpvKey(prefix))) ?? t`Cod CPV ${prefix}`
}

/** What a key stands for, as a reader names it. */
export function keyLabel(axis: AxisId, level: string, key: string, namer: Namer): string {
  if (axis === 'cumparator') {
    const name = namer.names?.orgs.get(key)
    return name ? tidyName(name) : t`Instituția cu CUI ${key}`
  }
  if (axis === 'furnizor') {
    const name = namer.names?.orgs.get(key)
    return name ? displayCompanyName(name) : t`Firma cu CUI ${key}`
  }
  if (axis === 'cpv') return cpvLabel(cpvPrefix(key, level), namer)
  if (axis === 'procedura') {
    const label = procedureLabel(key.toLocaleLowerCase('ro-RO'))
    return label ? i18n._(label) : key
  }
  if (level === 'judet') return countyName(key, namer)
  if (level === 'localitate') return namer.localities?.get(key)?.name ?? t`SIRUTA ${key}`
  return key
}

function countyName(code: string, namer: Namer): string {
  const name = namer.counties.get(code)
  if (!name) return code
  // As a county, București is the whole city: its own institutions are the locality 179132.
  return code === 'B' ? bucharestWholeLabel() : name
}

/** A bucket SEAP could not place on the axis: named for what it is on each axis, never drilled. */
export function unknownLabel(axis: AxisId | 'timp'): string {
  switch (axis) {
    case 'cumparator':
      return t`Fără CUI al instituției`
    case 'furnizor':
      return t`Fără CUI al firmei (firme străine, persoane)`
    case 'cpv':
      return t`Fără cod la acest nivel (codificate mai general)`
    case 'loc':
      return t`Instituții fără loc cunoscut`
    case 'loc_firma':
      return t`Firme fără loc cunoscut (inclusiv străine)`
    case 'procedura':
      return t`Fără tip de procedură`
    default:
      return t`Necunoscut`
  }
}

// ────────────────────────────────────────────────────────────── counts ──

export function recordsCount(tip: PopulationId, value: number): string {
  if (tip === 'directe') return value >= 1_000_000 ? t`${bigCountText(value)} de achiziții directe` : plural(value, { one: '# achiziție directă', few: '# achiziții directe', other: '# de achiziții directe' })
  if (tip === 'contracte') return plural(value, { one: '# contract atribuit', few: '# contracte atribuite', other: '# de contracte atribuite' })
  return plural(value, { one: '# acord-cadru', few: '# acorduri-cadru', other: '# de acorduri-cadru' })
}

/** The population's name, as the control and the gallery say it. */
export function populationLabel(tip: PopulationId): string {
  if (tip === 'directe') return t`Achiziții directe`
  if (tip === 'contracte') return t`Contracte atribuite`
  return t`Acorduri-cadru`
}

export function populationGloss(tip: PopulationId): string {
  if (tip === 'directe') return t`Cumpărături din catalogul SEAP, fără licitație. Bani verificați, fără TVA.`
  if (tip === 'contracte') return t`Contractele de sine stătătoare din anunțurile de atribuire, fără acorduri-cadru și fără contracte subsecvente. Numărăm rânduri: o asociere are un rând pe firmă. Banii sunt provizorii.`
  return t`Acorduri care fixează un plafon; banii se cheltuiesc prin contracte subsecvente. Le numărăm, nu le adunăm banii.`
}

/** Said where a window reaches before the population compares with itself. */
export function beforeComparableNote(tip: PopulationId): string {
  if (tip === 'directe') return t`Înainte de 2019, achizițiile directe din SEAP le cuprind și pe cele refuzate: numărul și banii acelor ani nu se compară cu anii de după.`
  return t`Înainte de 2019, sursele cuprind mai puține contracte: anii aceia nu se compară cu cei de după.`
}

/** The API's own verdict on an answer it gives with a gap: „degraded" said as what the gap is. */
export function degradedNote(undated: number | null, undatedMoney: number | null): string {
  if (!undated) return t`Răspuns parțial: sursa nu acoperă toată selecția.`
  return undatedMoney
    ? t`Răspuns parțial: ${plural(undated, { one: '# rând', few: '# rânduri', other: '# de rânduri' })} fără dată (${moneyText(undatedMoney)}) nu intră în nicio perioadă.`
    : t`Răspuns parțial: ${plural(undated, { one: '# rând', few: '# rânduri', other: '# de rânduri' })} fără dată nu intră în nicio perioadă.`
}

export function residentsText(value: number): string {
  return plural(value, { one: '# locuitor', few: '# locuitori', other: '# de locuitori' })
}

export function listTotalText(value: number): string {
  return plural(value, { one: 'Lista are o înregistrare.', few: 'Lista are # înregistrări.', other: 'Lista are # de înregistrări.' })
}

export function undatedText(value: number): string {
  return plural(value, { one: 'O înregistrare fără dată nu intră în nicio perioadă.', few: '# înregistrări fără dată nu intră în nicio perioadă.', other: '# de înregistrări fără dată nu intră în nicio perioadă.' })
}

/** Said where a contract or framework selection reaches past the month the source mix changes. */
export function kindSplitNote(tip: PopulationId): string {
  if (tip === 'contracte') return t`Din 2026, rândurile vin mai ales din e-licitație: comparați cu anii dinainte cu grijă. Se numără tot doar contractele de sine stătătoare.`
  return t`Din 2026, rândurile vin mai ales din e-licitație: comparați cu anii dinainte cu grijă.`
}

// ───────────────────────────────────────────────────────────── headline ──

/** A phrase of the headline and what it says: the population, a filter (by its axis, the title, the value) or the group-by. */
export interface HeadlinePart {
  readonly text: string
  readonly role: 'tip' | AxisId | 'titlu' | 'valoare' | 'dupa'
  /** What joins it to the phrase before: the subject's own phrases by a space, the rest by a comma. */
  readonly before: '' | ' ' | ', '
}

/** The headline as its phrases, for a page that makes each one a control. */
export function headlineParts(query: Query, namer: Namer, withGroup = true): readonly HeadlinePart[] {
  const { tip, filters } = query
  const parts: HeadlinePart[] = [{ text: tip === 'directe' ? t`Achizițiile directe` : tip === 'contracte' ? t`Contractele atribuite` : t`Acordurile-cadru`, role: 'tip', before: '' }]
  const buyer = buyerPhrase(query, namer)
  if (buyer) parts.push({ text: buyer, role: filters.cumparator ? 'cumparator' : 'loc', before: ' ' })
  const seller = sellerPhrase(query, namer)
  if (seller) parts.push({ text: seller, role: filters.furnizor ? 'furnizor' : 'loc_firma', before: ' ' })
  if (filters.cpv) parts.push({ text: t`pentru ${lowerFirst(cpvLabel(filters.cpv.values[0]!, namer))}`, role: 'cpv', before: ', ' })
  if (filters.procedura) parts.push({ text: t`prin ${lowerFirst(keyLabel('procedura', 'tip', filters.procedura.values[0]!, namer))}`, role: 'procedura', before: ', ' })
  if (query.titlu) parts.push({ text: t`cu „${query.titlu}" în titlu`, role: 'titlu', before: ', ' })
  if (query.valoare) parts.push({ text: valueText(query.valoare), role: 'valoare', before: ', ' })
  if (withGroup && groupPhrase(query.dupa)) parts.push({ text: groupPhrase(query.dupa), role: 'dupa', before: ', ' })
  return parts
}

/** „Achizițiile directe ale instituțiilor din județul Cluj, pentru lucrări de construcții, pe firme". */
export function headline(query: Query, namer: Namer, withGroup = true): string {
  return headlineParts(query, namer, withGroup)
    .map((part) => part.before + part.text)
    .join('')
}

function buyerPhrase(query: Query, namer: Namer): string | null {
  const { tip, filters } = query
  const org = filters.cumparator?.values[0]
  const place = filters.loc
  if (org) {
    const name = keyLabel('cumparator', 'cui', org, namer)
    return tip === 'directe' ? t`ale instituției ${name}` : tip === 'contracte' ? t`de ${name}` : t`încheiate de ${name}`
  }
  if (!place) return null
  const where = placePhrase(place.level, place.values[0]!, namer)
  return tip === 'directe' ? t`ale instituțiilor ${where}` : tip === 'contracte' ? t`de instituțiile ${where}` : t`încheiate de instituțiile ${where}`
}

function sellerPhrase(query: Query, namer: Namer): string | null {
  const { tip, filters } = query
  const org = filters.furnizor?.values[0]
  const place = filters.loc_firma
  if (org) {
    const name = keyLabel('furnizor', 'cui', org, namer)
    return tip === 'directe' ? t`de la ${name}` : tip === 'contracte' ? t`firmei ${name}` : t`cu ${name}`
  }
  if (!place) return null
  const where = placePhrase(place.level, place.values[0]!, namer)
  return tip === 'directe' ? t`de la firme ${where}` : tip === 'contracte' ? t`firmelor ${where}` : t`cu firme ${where}`
}

/** „din județul Cluj", „din București", „din regiunea Nord-Vest", „din Cluj-Napoca". */
function placePhrase(level: string, value: string, namer: Namer): string {
  if (level === 'judet') {
    const name = countyName(value, namer)
    return value === 'B' ? t`din București` : t`din județul ${name}`
  }
  if (level === 'regiune') return t`din regiunea ${value}`
  const name = keyLabel('loc', 'localitate', value, namer)
  return t`din ${name}`
}

function valueText(valoare: NonNullable<Query['valoare']>): string {
  const { min, max } = valoare
  if (min != null && max != null) return t`între ${moneyText(min)} și ${moneyText(max)}`
  if (min != null) return t`de cel puțin ${moneyText(min)}`
  return t`de cel mult ${moneyText(max ?? 0)}`
}

export function groupPhrase(group: GroupBy): string {
  // The records themselves: no „pe …" to say.
  if (group.axis === 'inregistrari') return ''
  if (group.axis === 'timp') return group.bucket === 'year' ? t`pe ani` : group.bucket === 'quarter' ? t`pe trimestre` : t`pe luni`
  const labels: Record<string, string> = {
    'cumparator:cui': t`pe instituții`,
    'furnizor:cui': t`pe firme`,
    'cpv:diviziune': t`pe categorii`,
    'cpv:grup': t`pe grupe de categorii`,
    'cpv:clasa': t`pe clase de categorii`,
    'cpv:categorie': t`pe subcategorii`,
    'cpv:cod': t`pe coduri CPV`,
    'loc:regiune': t`pe regiuni`,
    'loc:judet': t`pe județe`,
    'loc:localitate': t`pe localități`,
    'loc_firma:regiune': t`pe regiunile firmelor`,
    'loc_firma:judet': t`pe județele firmelor`,
    'loc_firma:localitate': t`pe localitățile firmelor`,
    'procedura:tip': t`pe proceduri`,
  }
  return labels[`${group.axis}:${group.level}`] ?? ''
}

/** The records' tab, named for what they are: „Achiziții", „Contracte", „Acorduri-cadru". */
export function recordsTab(tip: PopulationId): string {
  if (tip === 'directe') return t`Achiziții`
  if (tip === 'contracte') return t`Contracte`
  return t`Acorduri-cadru`
}

/** The group-by's name on its tab: „Instituție", „Firmă", „Categorie"… */
export function groupTab(axis: AxisId | 'timp'): string {
  switch (axis) {
    case 'cumparator':
      return t`Instituție`
    case 'furnizor':
      return t`Firmă`
    case 'cpv':
      return t`Categorie`
    case 'loc':
      return t`Unde cumpără`
    case 'loc_firma':
      return t`De unde vând`
    case 'procedura':
      return t`Procedură`
    default:
      return t`În timp`
  }
}

/** A level's name on the group-by bar: „diviziuni", „județe", „luni". */
export function levelLabel(level: string): string {
  switch (level) {
    case 'diviziune':
      return t`diviziuni`
    case 'grup':
      return t`grupe`
    case 'clasa':
      return t`clase`
    case 'categorie':
      return t`categorii`
    case 'cod':
      return t`coduri`
    case 'regiune':
      return t`regiuni`
    case 'judet':
      return t`județe`
    case 'localitate':
      return t`localități`
    case 'year':
      return t`ani`
    case 'quarter':
      return t`trimestre`
    case 'month':
      return t`luni`
    default:
      return ''
  }
}

// ───────────────────────────────────────────────────────────── period ──

/** „iun. 2025 – mai 2026", „2025", „2026, până în mai". */
export function periodText(period: ResolvedPeriod, query: Query): string {
  if (query.period.kind === 'year' && !period.replaced) {
    const year = query.period.year
    if (period.to === `${year}-12`) return String(year)
    const month = monthText(period.to).split(' ')[0]
    return t`${year}, până în ${month}`
  }
  const from = monthText(period.from)
  const to = monthText(period.to)
  return from === to ? from : `${from} – ${to}`
}

export function periodGloss(period: ResolvedPeriod, query: Query): string | null {
  if (period.replaced) return t`Perioada cerută e după ultimele date; arătăm ultimele 12 luni (până în ${monthText(period.to)}).`
  if (query.period.kind !== 'recent') return period.throughCutoff ? t`Datele SEAP disponibile ajung până în ${monthText(period.to)}.` : null
  return t`Ultimele 12 luni cu date disponibile în SEAP (până în ${monthText(period.to)}).`
}

/** „ian. 2025 – mai 2025", „mai 2025". */
export function monthsText(months: { readonly from: string; readonly to: string }): string {
  const from = monthText(months.from)
  const to = monthText(months.to)
  return from === to ? from : `${from} – ${to}`
}

// ─────────────────────────────────────────────────────────────── figures ──

export function measureLabel(measure: Measure, tip: PopulationId): string {
  if (measure === 'numar') return t`Număr`
  if (measure === 'locuitor') return POPULATIONS[tip].money === 'clean' ? t`Lei pe locuitor` : t`La 100.000 de locuitori`
  return POPULATIONS[tip].money === 'provisional' ? t`Lei, provizoriu` : t`Lei`
}

/** A change against the window before: „+12%", „−3%"; none when the window before had nothing. */
export function changeText(now: number | null, before: number | null): string | null {
  if (now === null || before === null || before <= 0) return null
  const change = now / before - 1
  if (Math.abs(change) < 0.0005) return t`la fel ca înainte`
  const sign = change > 0 ? '+' : '−'
  return `${sign}${percentText(Math.abs(change), Math.abs(change) < 0.1 ? 1 : 0)}`
}

export { countText, moneyText, percentText }
