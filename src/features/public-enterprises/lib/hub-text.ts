import { plural, t } from '@lingui/core/macro'

import { divisionLabel } from '@/features/private-companies/lib/caen-divisions'
import type { PublicEnterprisePopulation } from '@/schemas/public-enterprises'
import { displayName, enterpriseCount, formatCount, formatLei, formatShare } from './hub-format'
import { countyRanking, leadingAuthority, populationTotal, s1001Count, sectorRanking, sourcesIn } from './hub-model'
import type { PublicEnterpriseAuthorityKind, PublicEnterpriseHubSnapshot, PublicEnterpriseLevel, PublicEnterpriseSourceFamily } from './hub-snapshot-types'

/**
 * Every sentence the public-enterprise hub computes: one per band, read off
 * the snapshot, so a refresh rewrites them and no figure is ever typed in by
 * hand. Resolved at render, in the page's language.
 */

export function hubLede(snapshot: PublicEnterpriseHubSnapshot, locale: string): string {
  const members = snapshot.members.current
  const shown = formatCount(members, locale)
  return plural(members, {
    one: 'O întreprindere publică: cine o controlează, ce face și cum îi merge.',
    few: `${shown} întreprinderi publice: cine le controlează, ce fac și cum le merge.`,
    other: `${shown} de întreprinderi publice: cine le controlează, ce fac și cum le merge.`,
  })
}

/**
 * The kind of authority an enterprise answers to, as the authority's own
 * budget record gives it; one with no record is named by ANAF's level alone.
 */
export function authorityKindLabel(kind: PublicEnterpriseAuthorityKind, level: PublicEnterpriseLevel): string {
  switch (kind) {
    case 'county':
      return t`Consiliile județene`
    case 'municipality':
      return t`Consiliile municipiilor`
    case 'town':
      return t`Consiliile orașelor`
    case 'commune':
      return t`Consiliile comunelor`
    case 'sector':
      return t`Sectoarele Bucureștiului`
    case 'central_authority':
      return t`Autorități centrale`
    case 'public_entity':
      return t`Alte instituții publice centrale`
    case 'education':
      return t`Autoritățile din educație`
    case 'unresolved':
      return level === 'central' ? t`Autorități centrale fără fișă în buget` : t`Autorități locale fără fișă în buget`
  }
}

/** Who controls them, by ANAF's two levels, and the authority with the most, whichever its level. */
export function controlLede(snapshot: PublicEnterpriseHubSnapshot, locale: string): string {
  const local = enterpriseCount(snapshot.control.local, locale)
  const central = formatCount(snapshot.control.central, locale)
  const lead = leadingAuthority(snapshot)
  const first = t`Autoritățile locale au în subordine ${local}, cele ale statului central ${central}.`
  return lead ? `${first} ${t`${displayName(lead.name)} are cele mai multe: ${formatCount(lead.enterprises, locale)}.`}` : first
}

/** The counties with the most enterprises of the population the band shows. */
export function countiesLede(snapshot: PublicEnterpriseHubSnapshot, population: PublicEnterprisePopulation, locale: string): string | null {
  const [first, second, third] = countyRanking(snapshot, population)
  if (!first || !second || !third) return null
  const n = (value: number) => formatCount(value, locale)
  return t`Cele mai multe au sediul în ${first.name}: ${n(first.value)}. Urmează ${second.name} (${n(second.value)}) și ${third.name} (${n(third.value)}).`
}

/** The activities with the most enterprises of the population the band shows, the first one's share of that population. */
export function sectorsLede(snapshot: PublicEnterpriseHubSnapshot, population: PublicEnterprisePopulation, locale: string): string | null {
  const [first, second, third] = sectorRanking(snapshot, population)
  if (!first || !second || !third) return null
  const n = (value: number) => formatCount(value, locale)
  const share = formatShare(first.count, populationTotal(snapshot, population), locale)
  const lower = (division: string) => divisionLabel(division).toLocaleLowerCase(locale === 'en' ? 'en-GB' : 'ro-RO')
  const lead = share ? t`${divisionLabel(first.division)}: ${n(first.count)}, ${share} dintre ele.` : t`${divisionLabel(first.division)}: ${n(first.count)}.`
  return `${lead} ${t`Urmează ${lower(second.division)} (${n(second.count)}) și ${lower(third.division)} (${n(third.count)}).`}`
}

/** The year's largest turnover, then the loss-makers among the statements whose net result was admitted. */
export function sizeLede(snapshot: PublicEnterpriseHubSnapshot, locale: string): string {
  const { year, loss, netReported } = snapshot.financials
  const leader = snapshot.financials.largest.turnover[0]
  const base = formatCount(netReported, locale)
  const losses = plural(loss, {
    one: `Una din cele ${base} cu rezultatul net admis pe ${year} a încheiat anul cu pierdere.`,
    other: `${formatCount(loss, locale)} din cele ${base} cu rezultatul net admis pe ${year} au încheiat anul cu pierdere.`,
  })
  return leader ? `${t`Cea mai mare cifră de afaceri în ${year}: ${displayName(leader.name)}, ${formatLei(leader.value, locale)}.`} ${losses}` : losses
}

/**
 * ANAF's list's statuses, then where the trade registry disagrees: a floor,
 * since the registry gives no status where its own evidence conflicts.
 */
export function statusLede(snapshot: PublicEnterpriseHubSnapshot, locale: string): string {
  const n = (value: number) => formatCount(value, locale)
  const listed = t`În lista ANAF, ${n(s1001Count(snapshot, 'ACTIV'))} sunt active și ${n(s1001Count(snapshot, 'INACTIV'))} inactive.`
  const radiated = snapshot.status.crossings.radiatedButS1001Active
  if (radiated === 0) return listed
  return `${listed} ${plural(radiated, {
    one: 'Registrul comerțului nu spune mereu la fel: cel puțin una e radiată, deși e activă în listă.',
    other: `Registrul comerțului nu spune mereu la fel: cel puțin ${n(radiated)} sunt radiate, deși sunt active în listă.`,
  })}`
}

/** ANAF's S1001 status word, as a reader says it; a word it may add later stays its own; a blank cell says so. */
export function s1001StatusLabel(status: string | null): string {
  if (status === 'ACTIV') return t`Activă`
  if (status === 'INACTIV') return t`Inactivă`
  return sourceStatusLabel(status)
}

/**
 * The trade registry's headline status. Its null is not an empty cell: the
 * companies module gives none where the registry's evidence conflicts or is
 * partial, so the label says no certain status, not no status.
 */
export function registryStatusLabel(status: string | null): string {
  return status === null ? t`Fără o stare sigură în registru` : sourceStatusLabel(status)
}

/** A registry's own status words, capitalised; a code with no name says so; none says none. */
export function sourceStatusLabel(status: string | null): string {
  if (status === null) return t`Fără stare în sursă`
  if (/^\d+$/u.test(status)) return t`Cod ${status}, fără nume în sursă`
  return status.charAt(0).toLocaleUpperCase('ro-RO') + status.slice(1)
}

/** Who buys and sells in SEAP: floors, said so, where SEAP withheld some answers. */
export function moneyLede(snapshot: PublicEnterpriseHubSnapshot, locale: string): string {
  const { buyers, sellers, unknown } = snapshot.procurement
  const n = (value: number) => formatCount(value, locale)
  return unknown > 0
    ? t`Cel puțin ${n(buyers)} cumpără prin SEAP și cel puțin ${n(sellers)} vând instituțiilor prin achiziții directe. Pe pagina fiecărei firme, cât și de la cine.`
    : t`${n(buyers)} cumpără prin SEAP și ${n(sellers)} vând instituțiilor prin achiziții directe. Pe pagina fiecărei firme, cât și de la cine.`
}

/**
 * What a reader must know before trusting a figure on the page: behind one
 * marker in the head, hidden, never dropped. Each line is computed, so a
 * refresh that clears a problem drops its line.
 */
export function hubCaveats(snapshot: PublicEnterpriseHubSnapshot, locale: string): readonly string[] {
  const n = (value: number) => formatCount(value, locale)
  const partial = sourcesIn(snapshot, 'partial')
  const unavailable = sourcesIn(snapshot, 'unavailable')
  const { disagreements, noS1001 } = snapshot.control
  const radiated = snapshot.status.crossings.radiatedButS1001Active
  const historical = snapshot.members.historical
  return [
    ...(partial.length > 0 ? [t`Încărcate parțial: ${sourceNames(partial)}. Sursele nu spun ce lipsește.`] : []),
    ...(unavailable.length > 0 ? [t`Neîncărcate: ${sourceNames(unavailable)}. Pagina nu spune nimic din ele.`] : []),
    t`„Controlează" înseamnă autoritatea pe care o numește sursa, nu cine deține acțiunile. Numele autorităților sunt scrise ca în sursă.`,
    ...(disagreements > 0 ? [t`Pentru ${enterpriseCount(disagreements, locale)}, lista ANAF și anunțurile AMEPIP numesc autorități diferite; pagina urmează lista ANAF.`] : []),
    ...(radiated > 0
      ? [
          plural(radiated, {
            one: 'Cel puțin o întreprindere radiată din registrul comerțului e activă în lista ANAF; fiecare stare e arătată cu sursa ei.',
            few: `Cel puțin ${n(radiated)} întreprinderi radiate din registrul comerțului sunt active în lista ANAF; fiecare stare e arătată cu sursa ei.`,
            other: `Cel puțin ${n(radiated)} de întreprinderi radiate din registrul comerțului sunt active în lista ANAF; fiecare stare e arătată cu sursa ei.`,
          }),
        ]
      : []),
    ...(noS1001 > 0
      ? [
          plural(noS1001, {
            one: 'O întreprindere nu e în lista ANAF: numărată, dar fără autoritate în listă.',
            few: `${n(noS1001)} întreprinderi nu sunt în lista ANAF: numărate, dar fără autoritate în listă.`,
            other: `${n(noS1001)} de întreprinderi nu sunt în lista ANAF: numărate, dar fără autoritate în listă.`,
          }),
        ]
      : []),
    ...(historical > 0
      ? [
          plural(historical, {
            one: 'O întreprindere a ieșit din liste și nu e numărată.',
            few: `${n(historical)} întreprinderi au ieșit din liste și nu sunt numărate.`,
            other: `${n(historical)} de întreprinderi au ieșit din liste și nu sunt numărate.`,
          }),
        ]
      : []),
    t`Nicio sumă pe toate întreprinderile: populația e provizorie, iar bilanțurile lipsesc la unele. Clasamentele folosesc anul ${snapshot.financials.year}.`,
    ...(snapshot.financials.filed > snapshot.financials.netReported ? [unadmittedText(snapshot, locale)] : []),
    ...(snapshot.procurement.unknown > 0 ? [t`SEAP nu a răspuns pentru ${enterpriseCount(snapshot.procurement.unknown, locale)}: cifrele achizițiilor sunt minime.`] : []),
    ...snapshot.financials.implausibleEmployees.map((row) => t`Un număr de salariați imposibil (${n(Number(row.employees))}, CUI ${row.cui}) e lăsat afară din clasament.`),
  ]
}

/** The source lanes by the names the page uses for them. */
function sourceNames(families: readonly PublicEnterpriseSourceFamily[]): string {
  const name: Record<PublicEnterpriseSourceFamily, string> = {
    s1001: t`lista ANAF`,
    amepip: t`registrul AMEPIP`,
    json_apt: t`anunțurile de selecție AMEPIP`,
  }
  return families.map((family) => name[family]).join(', ')
}

/** The statements the year's net results could not be read from: counted and said. */
function unadmittedText(snapshot: PublicEnterpriseHubSnapshot, locale: string): string {
  const { filed, netReported, year } = snapshot.financials
  const missing = filed - netReported
  const all = formatCount(filed, locale)
  return plural(missing, {
    one: `Din bilanțuri intră doar valorile admise de verificarea firmelor: unul din cele ${all} pe ${year} nu are rezultatul net admis și nu e numărat la profit sau pierdere.`,
    other: `Din bilanțuri intră doar valorile admise de verificarea firmelor: ${formatCount(missing, locale)} din cele ${all} pe ${year} nu au rezultatul net admis și nu sunt numărate la profit sau pierdere.`,
  })
}

/** Who published the financial year's statements, as the companies module records it; never assumed, neutral when it records none. */
export function publishersText(publishers: readonly string[]): string {
  const anaf = publishers.includes('anaf')
  const mfp = publishers.includes('mfp')
  if (anaf && mfp) return t`publicate de ANAF și de Ministerul Finanțelor`
  if (mfp) return t`publicate de Ministerul Finanțelor`
  if (anaf) return t`depuse la ANAF`
  return t`ale firmelor`
}

/** The statements, by their publisher, as the page's source line names them. */
export function statementsSource(publishers: readonly string[]): string {
  const anaf = publishers.includes('anaf')
  const mfp = publishers.includes('mfp')
  if (anaf && mfp) return t`bilanțurile ANAF și ale Ministerului Finanțelor`
  if (mfp) return t`bilanțurile publicate de Ministerul Finanțelor`
  if (anaf) return t`bilanțurile ANAF`
  return t`bilanțurile firmelor`
}

/** How many statements the year after already has: a count, never a claim that it is complete. */
export function nextYearText(snapshot: PublicEnterpriseHubSnapshot, locale: string): string {
  const next = snapshot.financials.year + 1
  const count = snapshot.financials.nextYearFiled
  if (count === 0) return t`Pe ${next} nu e încă niciunul.`
  return plural(count, {
    one: `Pe ${next} e deocamdată unul.`,
    other: `Pe ${next} sunt deocamdată ${formatCount(count, locale)}.`,
  })
}

/** „una inactivă", „19 inactive", „56 de inactive": the count agreed with its adjective. */
export function inactiveCount(value: number, locale: string): string {
  const shown = formatCount(value, locale)
  return plural(value, { one: 'una inactivă', few: `${shown} inactive`, other: `${shown} de inactive` })
}
