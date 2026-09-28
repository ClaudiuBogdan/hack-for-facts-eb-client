import { plural, t } from '@lingui/core/macro'
import { contractsSince, type ContractSheet, type CtContext, type CtContract, type CtOffers, type CtValue, type CtYear } from './contract-model'
import { contextYearText, leiExact, leiShort } from './direct-purchase-text'
import { percentText } from './home-format'

/** The contract page's sentences, from the record — left out when the data would not support them. */

export function contractsCount(value: number): string {
  return plural(value, { one: '# contract', few: '# contracte', other: '# de contracte' })
}

export function frameworksCount(value: number): string {
  return plural(value, { one: '# acord-cadru', few: '# acorduri-cadru', other: '# de acorduri-cadru' })
}

export function firmsCount(value: number): string {
  return plural(value, { one: '# firmă', few: '# firme', other: '# de firme' })
}

export function valuesCount(value: number): string {
  return plural(value, { one: '# valoare', few: '# valori', other: '# de valori' })
}

export function directCount(value: number): string {
  return plural(value, { one: '# achiziție directă', few: '# achiziții directe', other: '# de achiziții directe' })
}

export function offersCount(value: number): string {
  return plural(value, { one: 'o singură ofertă', few: '# oferte', other: '# de oferte' })
}

export function monthsCount(value: number): string {
  return plural(value, { one: 'o lună', few: '# luni', other: '# de luni' })
}

export function daysCount(value: number): string {
  return plural(value, { one: 'o zi', few: '# zile', other: '# de zile' })
}

export function modificationsCount(value: number): string {
  return plural(value, { one: 'o modificare', few: '# modificări', other: '# de modificări' })
}

export function amendmentsCount(value: number): string {
  return plural(value, { one: 'un act adițional', few: '# acte adiționale', other: '# de acte adiționale' })
}

/** „republicat o dată, pe 1 octombrie 2025", „republicat de 8 ori, ultima dată pe 28 aprilie 2026". */
export function republishedText(times: number, last: string): string {
  if (times === 1) return t`republicat o dată, pe ${last}`
  const count = plural(times, { one: 'republicat o dată', few: 'republicat de # ori', other: 'republicat de # de ori' })
  return t`${count}, ultima dată pe ${last}`
}

/** What happened to the offers: „1 admisă · 2 inacceptabile · 1 neconformă"; for a lone offer admitted, „admisă". */
export function offersFate(offers: CtOffers): string | null {
  const parts = [
    offers.admitted ? plural(offers.admitted, { one: '# admisă', few: '# admise', other: '# de admise' }) : null,
    offers.unaccepted ? plural(offers.unaccepted, { one: '# inacceptabilă', few: '# inacceptabile', other: '# de inacceptabile' }) : null,
    offers.nonconformed ? plural(offers.nonconformed, { one: '# neconformă', few: '# neconforme', other: '# de neconforme' }) : null,
    offers.withdrawn ? plural(offers.withdrawn, { one: '# retrasă', few: '# retrase', other: '# de retrase' }) : null,
  ].filter((part): part is string => Boolean(part))
  if (offers.received === 1 && offers.admitted === 1 && parts.length === 1) return t`admisă`
  return parts.length > 0 ? parts.join(' · ') : null
}

/** Who sent them: „2 de la IMM-uri · 1 dintr-un alt stat UE". */
export function offersFrom(offers: CtOffers): string | null {
  const parts = [
    offers.sme ? (offers.sme === offers.received ? (offers.received === 1 ? t`de la un IMM` : t`toate de la IMM-uri`) : plural(offers.sme, { one: 'una de la un IMM', few: '# de la IMM-uri', other: '# de la IMM-uri' })) : null,
    offers.eu ? plural(offers.eu, { one: '# dintr-un alt stat UE', few: '# din alte state UE', other: '# din alte state UE' }) : null,
    offers.nonEu ? plural(offers.nonEu, { one: '# din afara UE', few: '# din afara UE', other: '# din afara UE' }) : null,
  ].filter((part): part is string => Boolean(part))
  return parts.length > 0 ? parts.join(' · ') : null
}

/** The estimate's line under it: how far the contract came from it. */
export function estimateGap(estimate: number, value: number | null): string | null {
  if (value === null || estimate <= 0) return null
  const change = value / estimate - 1
  if (Math.abs(change) < 0.005) return null
  const part = percentText(Math.abs(change), 0)
  return change < 0 ? t`contractul: cu ${part} sub estimare` : t`contractul: cu ${part} peste estimare`
}

const CRITERIA: Readonly<Record<string, () => string>> = {
  'pretul cel mai scazut': () => t`prețul cel mai scăzut`,
  'costul cel mai scazut': () => t`costul cel mai scăzut`,
  'cel mai bun raport calitate - pret': () => t`cel mai bun raport calitate–preț`,
  'cel mai bun raport calitate-pret': () => t`cel mai bun raport calitate–preț`,
  'cel mai bun raport calitate – pret': () => t`cel mai bun raport calitate–preț`,
  'cel mai bun raport calitate-cost': () => t`cel mai bun raport calitate–cost`,
}

/** SEAP's criterion, spelled as a reader writes it. */
export function criterionText(criterion: string): string {
  const key = criterion.trim().toLocaleLowerCase('ro-RO').replace(/\s+/g, ' ')
  return CRITERIA[key]?.() ?? criterion.trim()
}

/** „Tehnostrade, Spedition UMB și SA & PE Construct". */
export function namesList(names: readonly string[]): string {
  if (names.length <= 1) return names[0] ?? ''
  const head = names.slice(0, -1).join(', ')
  const last = names[names.length - 1]!
  return t`${head} și ${last}`
}

/** An association: several firms at one value under one contract number (or named winners of it) — a framework's operators are not one. */
export function isAssociation(contract: CtContract): boolean {
  return !contract.framework && contract.association
}

/** A framework shared by several firms: the institution buys from any of them, up to its ceiling. */
export function isSharedFramework(contract: CtContract): boolean {
  return contract.framework && contract.firms.length > 1
}

/** The record's kind in two or three words, above the title. */
export function kindLabel(sheet: ContractSheet): string {
  if (sheet.kind === 'framework') return t`Acord-cadru`
  if (sheet.kind === 'call-off') return t`Contract subsecvent`
  return isAssociation(sheet.contract) ? t`Contract, în asociere` : t`Contract`
}

/** The money in the head's sentence. */
export function headMoney(value: CtValue): string {
  switch (value.kind) {
    case 'accepted':
      return leiShort(value.value)
    case 'converted': {
      const amount = leiShort(value.value)
      const currency = value.currency
      return currency ? t`${amount} (echivalentul în lei al unei valori în ${currency})` : t`${amount} (echivalentul în lei al unei valori în valută)`
    }
    case 'ceiling':
      return value.value !== null ? leiShort(value.value) : t`o valoare nepublicată`
    case 'unverified':
      return t`o valoare neverificată`
    case 'missing':
      return value.reason === 'foreign' ? t`o valoare publicată doar în valută` : t`o valoare nepublicată`
  }
}

/** The value box: its label, the figure, and a line under it when the figure needs one. */
export function valueBox(sheet: ContractSheet): { readonly label: string; readonly figure: string; readonly note: string | null; readonly muted: boolean } {
  const { value } = sheet
  switch (value.kind) {
    case 'accepted':
      return { label: t`Valoarea contractului`, figure: leiExact(value.value), note: null, muted: false }
    case 'converted': {
      const currency = value.currency
      return {
        label: t`Valoarea, în lei`,
        figure: leiExact(value.value),
        note: currency ? t`Contractul e în ${currency}; SEAP publică echivalentul în lei.` : t`Contractul e în valută; SEAP publică echivalentul în lei.`,
        muted: false,
      }
    }
    case 'ceiling':
      return {
        label: t`Valoarea maximă`,
        figure: value.value !== null ? leiExact(value.value) : '—',
        note: t`Un acord-cadru fixează cât se poate cheltui, cel mult. Banii se cheltuiesc prin contractele subsecvente: aceasta nu e o cheltuială.`,
        muted: false,
      }
    case 'unverified': {
      const published = value.published !== null ? leiExact(value.published) : null
      const note =
        published === null
          ? t`SEAP nu publică o valoare care să se poată verifica.`
          : value.reason === 'conflicting'
            ? t`SEAP publică ${published}, dar sursele SEAP nu se potrivesc între ele.`
            : value.reason === 'invalid'
              ? t`SEAP publică ${published}, o valoare care nu se poate citi corect.`
              : value.reason === 'call-off'
                ? t`SEAP publică ${published}; platforma o numără cu acordul-cadru.`
                : value.reason === 'not-counted'
                  ? t`SEAP publică ${published}; platforma nu o numără ca atribuire (o dublură, un anunț fără atribuire sau o procedură anulată).`
                  : t`SEAP publică ${published}; platforma nu a verificat încă dacă e valoarea unui singur contract.`
      return { label: t`Valoarea`, figure: '—', note, muted: true }
    }
    case 'missing':
      return { label: t`Valoarea`, figure: '—', note: value.reason === 'foreign' ? t`SEAP publică valoarea doar în valută.` : t`SEAP nu publică valoarea.`, muted: true }
  }
}

/** Under an association's value: whose it is; under a shared framework's: whose ceiling. */
export function associationNote(contract: CtContract): string | null {
  const firms = firmsCount(contract.firms.length)
  if (isSharedFramework(contract)) return t`E a întregului acord-cadru, cu ${firms}: instituția cumpără de la oricare dintre ele.`
  if (!isAssociation(contract)) return null
  return t`Valoarea e a întregului contract: SEAP o publică pe numele fiecăreia dintre cele ${firms} și nu spune cât revine fiecăreia.`
}

/** Versions: one contract number at several values — which is in force only the notice's value today can say, when it is one of them. */
export function versionsText(contract: CtContract, current: { readonly value: number; readonly modified: number } | null): string | null {
  if (contract.versions.length < 2) return null
  const values = valuesCount(contract.versions.length)
  const today = current !== null && contract.versions.some((version) => version.value !== null && Math.abs(version.value - current.value) <= 1)
  if (today && current) {
    const amount = leiShort(current.value)
    const modifications = modificationsCount(current.modified)
    return t`SEAP publică acest contract cu ${values} diferite; anunțul îl dă azi la ${amount}, după ${modifications}.`
  }
  return t`SEAP publică acest contract cu ${values} diferite și nu spune care e în vigoare.`
}

/** A change with its sign: „+1,81 mil. lei", „−28.209 lei". */
export function signedLei(value: number): string {
  return `${value < 0 ? '−' : '+'}${leiShort(Math.abs(value))}`
}

/**
 * The amendments in one sentence: how the reported value moved — unless the
 * reported values disagree with the acts' own texts, which is said instead,
 * with the first act that does.
 */
export function amendmentsLede(sheet: ContractSheet): string | null {
  const list = sheet.amendments
  if (list.length === 0) return null
  const valued = list.filter((item) => item.before !== null && item.after !== null)
  const count = amendmentsCount(list.length)
  const wrong = list.find((item) => item.mismatch)
  if (wrong && wrong.stated !== null && wrong.before !== null && wrong.after !== null) {
    const act = wrong.number ?? '—'
    const stated = signedLei(wrong.stated)
    const reported = signedLei(wrong.after - wrong.before)
    return t`În SEAP: ${count}. Valorile raportate nu se potrivesc cu textul actelor: actul nr. ${act} spune ${stated}, dar valoarea raportată se schimbă cu ${reported}.`
  }
  if (valued.length > 0) {
    const from = leiShort(valued[0]!.before!)
    const to = leiShort(valued[valued.length - 1]!.after!)
    if (valued[0]!.before !== valued[valued.length - 1]!.after) return t`În SEAP: ${count}. Valoarea raportată a trecut de la ${from} la ${to}.`
  }
  return t`În SEAP: ${count}.`
}

/** The procedure's route, when it is unusual enough to explain — never that it is suspect. */
export function unpublishedText(): string {
  return t`Instituția nu a publicat un anunț de participare: a negociat direct. Legea permite asta doar în anumite cazuri (urgență, un singur furnizor posibil).`
}

/** „SEAP îl mai publică o dată" / „de 2 ori". */
export function againText(times: number): string {
  return plural(times, {
    one: 'SEAP îl mai publică o dată; Transparenta îl numără o singură dată.',
    few: 'SEAP îl mai publică de # ori; Transparenta îl numără o singură dată.',
    other: 'SEAP îl mai publică de # de ori; Transparenta îl numără o singură dată.',
  })
}

/** The export file a row comes from: „T2 2024" (a quarterly report), „2010" (a yearly one). */
export function fileText(file: { readonly year: string; readonly quarter: string | null }): string {
  const { year, quarter } = file
  return quarter ? t`T${quarter} ${year}` : year
}

/** Where a contract's other lots stand: „Anunțul are 44 de loturi, 11 anulate." */
export function lotsText(lots: { readonly total: number; readonly cancelled: number }): string {
  const total = plural(lots.total, { one: '# lot', few: '# loturi', other: '# de loturi' })
  if (lots.cancelled === 0) return t`Anunțul are ${total}.`
  const cancelled = plural(lots.cancelled, { one: '# anulat', few: '# anulate', other: '# de anulate' })
  return t`Anunțul are ${total}, ${cancelled}.`
}

// ─────────────────────────────────────────────────────────── the context ──

/** The pair since 2019 in one sentence; none when the years were not read or hold nothing. */
export function historyText(context: CtContext, isFramework: boolean): string | null {
  const since = contractsSince(context)
  if (!since || since.since === null) return null
  const { awards, frameworks } = since
  if (awards + frameworks === 1) return isFramework ? t`Din 2019 încoace, e singurul acord-cadru dintre ele.` : t`Din 2019 încoace, e singurul contract dintre ele.`
  const first = since.since
  const parts = [awards > 0 ? contractsCount(awards) : null, frameworks > 0 ? frameworksCount(frameworks) : null].filter((part): part is string => part !== null)
  const what = parts.length === 2 ? t`${parts[0]} și ${parts[1]}` : parts[0]!
  return t`Din 2019 încoace, instituția i-a atribuit firmei ${what}; primul, în ${first}.`
}

/** The direct purchases between them, with their money — clean, checked, without VAT — when every year that has some has its money. */
export function directText(context: CtContext): string | null {
  if (!context.years) return null
  const count = context.years.reduce((sum, year) => sum + year.direct, 0)
  if (count === 0) return null
  const purchases = directCount(count)
  const known = context.years.every((year) => year.direct === 0 || year.directLei !== null)
  if (!known) return t`Firma i-a vândut și direct: ${purchases}.`
  const money = leiShort(context.years.reduce((sum, year) => sum + (year.directLei ?? 0), 0))
  return t`Firma i-a vândut și direct: ${purchases}, ${money}.`
}

/** „65 de contracte, 1 acestei firme" — or „niciunul acestei firme". */
function sharePart(total: string, mine: number): string {
  return mine === 0 ? t`${total}, niciunul acestei firme` : t`${total}, ${mine} acestei firme`
}

/** The institution's year: its contracts and frameworks, and how many of each went to this firm. */
export function buyerYearText(context: CtContext): string | null {
  const { buyer, pair } = context
  if (!buyer || !pair || (buyer.awards === 0 && buyer.frameworks === 0)) return null
  const year = contextYearText(context)
  const frameworks = pair.frameworks > 0 ? sharePart(frameworksCount(buyer.frameworks), pair.frameworks) : frameworksCount(buyer.frameworks)
  if (buyer.awards === 0) return t`În ${year}, instituția nu a atribuit contracte, doar ${frameworks}.`
  const contracts = sharePart(contractsCount(buyer.awards), pair.awards)
  if (buyer.frameworks > 0) return t`În ${year}, instituția a atribuit ${contracts}; și ${frameworks}.`
  return t`În ${year}, instituția a atribuit ${contracts}.`
}

/**
 * The firm's year: the contracts it won, and how many from this institution.
 * The counts are contracts, not frameworks: on a framework's page, a single
 * contract won is another record, never „this one".
 */
export function sellerYearText(context: CtContext, isFramework: boolean): string | null {
  const { seller, pair } = context
  if (!seller || !pair || seller.awards === 0) return null
  const year = contextYearText(context)
  const contracts = contractsCount(seller.awards)
  const mine = pair.awards
  if (mine === 0 && pair.frameworks > 0) {
    const frameworks = frameworksCount(pair.frameworks)
    return t`Pentru firmă: în ${year} a câștigat ${contracts}, niciunul de la această instituție; de la ea are ${frameworks}.`
  }
  if (mine === 0) return t`Pentru firmă: în ${year} a câștigat ${contracts}, niciunul de la această instituție.`
  if (mine >= seller.awards && seller.awards === 1) return isFramework ? t`Pentru firmă: în ${year} a câștigat un singur contract, de la această instituție.` : t`Pentru firmă, e singurul contract câștigat în ${year}.`
  if (mine >= seller.awards) return t`Pentru firmă: în ${year} a câștigat ${contracts}, toate de la această instituție.`
  return t`Pentru firmă: în ${year} a câștigat ${contracts}, ${mine} de la această instituție.`
}

/** A column's figures, for the chart's line: „1 contract, 41 de acorduri-cadru, 14 achiziții directe". */
export function yearFigures(year: CtYear): string {
  const parts = [year.awards > 0 ? contractsCount(year.awards) : null, year.frameworks > 0 ? frameworksCount(year.frameworks) : null, year.direct > 0 ? directCount(year.direct) : null].filter(
    (part): part is string => part !== null,
  )
  return parts.length > 0 ? parts.join(', ') : t`nimic între ele`
}
