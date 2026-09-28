import type { I18n } from '@lingui/core'
import { plural, t } from '@lingui/core/macro'
import { countyName, inCounty } from './buyer-text'
import { OTHER_CATEGORY, UNKNOWN_CATEGORY, type CategoryFigure } from './home-categories'
import { contractsCount, directPurchasesCount, firmsCount, institutionsCount, lowerFirst, moneyText, percentText } from './home-format'
import { DIRECT_COMPARABLE_FROM, isUnpublishedProcedure } from './home-model'
import type { PartyYears } from './profile-model'
import { contractClients, hasAnyRecord, knownClientName, scanIsWhole, steadyClients, type SupplierProfile, type SupplierView } from './supplier-model'

/**
 * A firm's page's sentences. Each states a fact computed from the read and
 * returns null when the data would contradict it or has nothing worth a line
 * — never a judgement: „83% din bani au venit de la o instituție", not
 * „depinde de". An institution is named in a sentence only when its name is
 * known, never by a bare CUI.
 */

export function countiesCount(value: number): string {
  return plural(value, { one: '# județ', few: '# județe', other: '# de județe' })
}

/** „alt județ", „alte 3 județe", „alte 25 de județe": the counties past the firm's own. */
function otherCounties(value: number): string {
  return plural(value, { one: 'alt județ', few: 'alte # județe', other: 'alte # de județe' })
}

/** „1 contract câștigat", „3 contracte câștigate", „21 de contracte câștigate". */
function contractsWon(value: number): string {
  return plural(value, { one: '# contract câștigat', few: '# contracte câștigate', other: '# de contracte câștigate' })
}

/** What the firm sold to the state in the year, in one sentence: the head's, after the registry's. */
export function headSentence(profile: SupplierProfile): string {
  const { year } = profile
  if (!hasAnyRecord(profile)) return t`Nu apare ca furnizor în achizițiile publice (SEAP) din ${DIRECT_COMPARABLE_FROM} încoace.`
  const directCount = profile.direct.count ?? 0
  const contracts = profile.contracts.count
  if (directCount === 0 && contracts === 0) return t`Nu a vândut nimic instituțiilor publice prin SEAP în ${year}.`
  const together = profile.contracts.together
  // How many were won with others is said only when the scan covered every row: else it is a floor.
  const won =
    contracts === 0
      ? null
      : together === 0 || !scanIsWhole(profile)
        ? t`a câștigat ${contractsCount(contracts)}`
        : together === contracts
          ? contracts === 1
            ? t`a câștigat ${contractsCount(contracts)}, împreună cu alte firme`
            : t`a câștigat ${contractsCount(contracts)}, toate împreună cu alte firme`
          : together === 1
            ? t`a câștigat ${contractsCount(contracts)}, unul împreună cu alte firme`
            : t`a câștigat ${contractsCount(contracts)}, ${together} împreună cu alte firme`
  if (directCount === 0) return t`În ${year} ${won ?? ''}.`
  const money = profile.direct.value !== null ? moneyText(profile.direct.value) : null
  const clients = profile.direct.clients
  const sold = money
    ? clients
      ? t`a vândut direct de ${money}, fără TVA, la ${institutionsCount(clients)}`
      : t`a vândut direct de ${money}, fără TVA`
    : t`a avut ${directPurchasesCount(directCount)}`
  return won ? t`În ${year} ${sold} și ${won}.` : t`În ${year} ${sold}.`
}

/**
 * How much of the firm's direct money its largest clients paid — and the other
 * side: the institution the firm weighed most for, its share of that
 * institution's own direct purchases, and whether it led them.
 */
export function clientsLede(profile: SupplierProfile): string | null {
  const { year } = profile
  const rows = profile.directClients.rows
  const [top] = rows
  const parts: string[] = []
  const topName = top ? knownClientName(profile, top.cui) : null
  if (profile.directClients.rankedBy === 'value' && top?.share != null && topName) {
    if (top.share >= 0.995) parts.push(t`Toate achizițiile directe din ${year} au venit de la ${topName}.`)
    else {
      const three = rows.slice(0, 3).reduce((sum, row) => sum + (row.share ?? 0), 0)
      parts.push(
        rows.length >= 4 && three - top.share >= 0.05
          ? t`${topName} a plătit ${percentText(top.share, 0)} din banii achizițiilor directe ale firmei în ${year}; primele trei instituții, ${percentText(three, 0)}.`
          : t`${topName} a plătit ${percentText(top.share, 0)} din banii achizițiilor directe ale firmei în ${year}.`,
      )
    }
  } else if ((profile.direct.count ?? 0) === 0) {
    const ranking = contractClients(profile)
    const [first, second] = ranking.rows
    const firstName = first ? knownClientName(profile, first.cui) : null
    if (first && firstName) {
      if (!second) parts.push(t`Toate contractele din ${year} au venit de la ${firstName}.`)
      // „The most" only when no other institution matched it.
      else if (second.count < first.count) parts.push(t`${firstName} i-a atribuit ${contractsCount(first.count)} în ${year}, cele mai multe.`)
      else parts.push(t`${firstName} i-a atribuit ${contractsCount(first.count)} în ${year}.`)
    }
  }
  const weighed = [...profile.weights.entries()]
    .filter(([cui, weight]) => weight.share !== null && weight.share >= 0.1 && knownClientName(profile, cui) !== null)
    .sort((a, b) => (b[1].share ?? 0) - (a[1].share ?? 0))[0]
  if (weighed) {
    const [cui, weight] = weighed
    const name = knownClientName(profile, cui) ?? cui
    const share = percentText(weight.share ?? 0, 0)
    parts.push(
      weight.first
        ? t`Pentru ${name}, firma a fost cel mai mare furnizor direct: ${share} din achizițiile ei directe.`
        : t`Pentru ${name}, firma a însemnat ${share} din achizițiile ei directe.`,
    )
  }
  return parts.length > 0 ? parts.join(' ') : null
}

/** The institutions that bought from the firm every year, or all but one, since its first. */
export function steadyLede(profile: SupplierProfile, rows: readonly PartyYears[]): string | null {
  const from = Math.max(profile.firstYear ?? DIRECT_COMPARABLE_FROM, DIRECT_COMPARABLE_FROM)
  const steady = steadyClients(rows, from, profile.latest)
  const [first, second] = steady.map((row) => knownClientName(profile, row.cui))
  if (!first) return null
  const span = `${from}–${profile.latest}`
  if (steady.length === 1) return t`${first} a cumpărat direct de la firmă în aproape fiecare an din ${span}.`
  if (steady.length === 2 && second) return t`${first} și ${second} au cumpărat direct de la firmă în aproape fiecare an din ${span}.`
  return t`${institutionsCount(steady.length)} au cumpărat direct de la firmă în aproape fiecare an din ${span}, între ele ${first}.`
}

/** What the firm sells most: by the direct purchases' money, or by the contracts' whole value. */
export function whatLede(rows: readonly CategoryFigure[], grain: 'direct' | 'contract', year: number, i18n: I18n): string | null {
  const named = (row: CategoryFigure) => row.category.key !== OTHER_CATEGORY.key && row.category.key !== UNKNOWN_CATEGORY.key
  const top = rows.find(named)
  if (!top || top.share === null) return null
  // „Altele" or the records with no CPV code may hold more: the named leader is then no headline.
  if (rows.some((row) => !named(row) && (row.share ?? 0) > (top.share ?? 0))) return null
  const label = lowerFirst(i18n._(top.category.label))
  if (grain === 'contract') {
    return top.share >= 0.5 ? t`Mai mult de jumătate din valoarea contractelor din ${year} e la ${label}.` : t`Cea mai mare valoare a contractelor din ${year} e la ${label}.`
  }
  if (top.share >= 0.995) return t`Tot ce a vândut direct în ${year} ține de ${label}.`
  if (top.share >= 0.5) return t`Vinde mai ales ${label}: ${percentText(top.share, 0)} din banii achizițiilor directe din ${year}.`
  // Below a half it is the category with the most money, not „the largest part" (DESIGN, §13).
  return t`Categoria cu cei mai mulți bani din ${year} e ${label} (${percentText(top.share, 0)}); firma vinde și altceva.`
}

/**
 * Local or national: the firm's own county's part, or how many counties its
 * buyers are in — always saying which sales it counts (the direct purchases,
 * or, for a firm with none, the contracts), since a firm's buyers of the one
 * may sit elsewhere than those of the other.
 */
export function whereLede(profile: SupplierView): string | null {
  const rows = profile.counties
  const [top] = rows
  if (!top) return null
  const { year } = profile
  const direct = profile.countiesOf === 'direct'
  if (rows.length === 1 && (top.share ?? 0) >= 0.995) {
    const where = inCounty(top.code)
    if (top.code === profile.county) {
      return direct
        ? t`Toate instituțiile care au cumpărat direct de la firmă în ${year} sunt din ${where}, județul firmei.`
        : t`Toate instituțiile care i-au atribuit contracte în ${year} sunt din ${where}, județul firmei.`
    }
    return direct
      ? t`Toate instituțiile care au cumpărat direct de la firmă în ${year} sunt din ${where}.`
      : t`Toate instituțiile care i-au atribuit contracte în ${year} sunt din ${where}.`
  }
  const home = profile.county ? rows.find((row) => row.code === profile.county) : undefined
  if (home?.share != null && home.share >= 0.5) {
    const share = percentText(home.share, 0)
    const where = inCounty(home.code)
    const others = otherCounties(rows.length - 1)
    if (!direct) return t`${share} din contracte au venit de la instituții din ${where}, județul firmei; restul, din ${others}.`
    return profile.countiesRankedBy === 'value'
      ? t`${share} din banii achizițiilor directe au venit de la instituții din ${where}, județul firmei; restul, din ${others}.`
      : t`${share} din achizițiile directe au venit de la instituții din ${where}, județul firmei; restul, din ${others}.`
  }
  if (top.share === null) return null
  if (!direct) return t`A câștigat contracte de la instituții din ${countiesCount(rows.length)}; cele mai multe, din ${countyName(top.code)}.`
  return profile.countiesRankedBy === 'value'
    ? t`A vândut direct instituțiilor din ${countiesCount(rows.length)}; cei mai mulți bani au venit din ${countyName(top.code)} (${percentText(top.share, 0)}).`
    : t`A vândut direct instituțiilor din ${countiesCount(rows.length)}; cele mai multe achiziții, din ${countyName(top.code)}.`
}

/**
 * The contracts negotiated without a public notice, out of those whose
 * procedure SEAP gives. When that count differs from the page's contracts
 * (the analysis counts a few rows otherwise), no second total is written.
 */
function unpublishedText(unpublished: number, listed: number, contracts: number): string {
  if (listed !== contracts) return unpublished === 1 ? t`Unul dintre ele a fost negociat fără anunț public.` : t`${unpublished} dintre ele au fost negociate fără anunț public.`
  if (unpublished === listed) return listed === 1 ? t`A fost negociat fără anunț public.` : t`Toate au fost negociate fără anunț public.`
  return unpublished === 1
    ? t`Unul din ${contractsCount(listed)} a fost negociat fără anunț public.`
    : t`${unpublished} din ${contractsCount(listed)} au fost negociate fără anunț public.`
}

/** The two routes, in plain words, and the contracts negotiated without a public notice. */
export function howLede(profile: SupplierProfile): string | null {
  const { year } = profile
  const direct = profile.direct.count ?? 0
  const contracts = profile.contracts.count
  const parts: string[] = []
  if (direct > 0 && contracts > 0) {
    parts.push(t`În ${year}, ${directPurchasesCount(direct)}, adică vânzări fără licitație, și ${contractsWon(contracts)} printr-o procedură: licitație, negociere sau alta.`)
  } else if (direct > 0) {
    parts.push(t`În ${year} a vândut doar prin achiziții directe: instituția alege firma fără licitație, pentru sume sub pragurile legii.`)
  } else if (contracts > 0) {
    parts.push(t`În ${year} n-a vândut nimic prin achiziții directe; a câștigat ${contractsCount(contracts)} printr-o procedură.`)
  }
  const unpublished = profile.procedures.filter((row) => isUnpublishedProcedure(row.key)).reduce((sum, row) => sum + row.count, 0)
  const listed = profile.procedures.reduce((sum, row) => sum + row.count, 0) + profile.proceduresUnlisted
  if (unpublished > 0) parts.push(unpublishedText(unpublished, listed, contracts))
  return parts.length > 0 ? parts.join(' ') : null
}

/** The contracts won together with other firms, and the partner seen most often. */
export function partnersLede(profile: SupplierProfile): string | null {
  const { contracts, year } = profile
  const { count, scanned, together } = contracts
  if (together === 0) return null
  const first = contracts.partners[0]
  const opening =
    scanned < count
      ? together === 1
        ? t`Dintre cele mai mari ${contractsCount(scanned)} din ${year}, unul a fost câștigat împreună cu alte firme, în asociere.`
        : t`Dintre cele mai mari ${contractsCount(scanned)} din ${year}, ${together} au fost câștigate împreună cu alte firme, în asociere.`
      : together === count
        ? count === 1
          ? t`Singurul contract din ${year} a fost câștigat împreună cu alte firme, în asociere.`
          : t`Toate contractele din ${year} au fost câștigate împreună cu alte firme, în asociere.`
        : together === 1
          ? t`Unul din cele ${contractsCount(count)} din ${year} a fost câștigat împreună cu alte firme, în asociere.`
          : t`${together} din cele ${contractsCount(count)} din ${year} au fost câștigate împreună cu alte firme, în asociere.`
  const partner =
    first && first.contracts > 1
      ? t`Cel mai des, cu ${first.name}: ${contractsCount(first.contracts)}.`
      : contracts.partners.length > 1
        ? t`Partenerii sunt ${firmsCount(contracts.partners.length)}, fiecare într-un singur contract.`
        : null
  // Rows SEAP publishes without a notice or contract number cannot be matched: the count is then a floor.
  const unknown =
    contracts.unresolved === 0
      ? null
      : contracts.unresolved === 1
        ? t`Pentru un contract, datele SEAP nu arată dacă a avut parteneri.`
        : t`Pentru ${contractsCount(contracts.unresolved)}, datele SEAP nu arată dacă au avut parteneri.`
  return [opening, partner, unknown].filter(Boolean).join(' ')
}
