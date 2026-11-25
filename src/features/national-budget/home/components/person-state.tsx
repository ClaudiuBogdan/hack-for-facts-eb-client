import { plural, t } from '@lingui/core/macro'

import { plotOf } from '@/features/national-budget/analytics/lib/exact'
import { sumDecimals } from '@/lib/exact-decimal'
import { ANAF_FIRST_YEAR } from '../lib/home-data'
import { chapterHint, moneyText } from '../lib/home-format'
import { outOfHundred } from '../lib/per-resident'
import { REST_FILL, inPeriod, toneOf, previousText } from '../lib/person-format'
import { useStateBudget, type StateLine } from '../hooks/use-person-data'
import { TwoLists, type HundredPart } from './person-rows'
import { Section } from './person-shell'
import { usePageYear } from '../hooks/use-page-year'

/**
 * The state budget alone (the payments reported to ANAF), as lei out of
 * every 100 it paid: on what domains, and through which ministries and
 * central institutions — the fifteen largest named, the rest on one line.
 */

/** Institutions named one by one; the smaller ones share a line (owner: the two lists end close together). */
const NAMED = 15

function partsOf(lines: readonly StateLine[], more: (line: StateLine) => Partial<HundredPart>): HundredPart[] {
  return lines.map((line, rank) => ({ ...line, hint: null, fill: { style: toneOf(rank, lines.length) }, ...more(line) }))
}

/** The largest institutions by name, the others on one line: its amount and its lei both from their own rows. */
function institutionsOf(lines: readonly StateLine[]): HundredPart[] {
  const shown = lines.slice(0, NAMED)
  const rest = lines.slice(NAMED)
  const exact = rest.length ? sumDecimals(rest.map((line) => line.exact)) : null
  if (!rest.length || !exact) return partsOf(shown, (line) => ({ cui: line.key }))
  // The rest is one line of the hundred: whole lei apportioned once over the named lines and it, never its small rows'
  // lei added up (each rounds to nothing, and the named lines would take their share).
  const lei = outOfHundred([...shown.map((line) => plotOf(line.exact) ?? 0), plotOf(exact) ?? 0])
  const named = partsOf(
    shown.map((line, index) => ({ ...line, lei: lei[index] ?? 0 })),
    (line) => ({ cui: line.key }),
  )
  return [
    ...named,
    {
      key: 'rest',
      label: t`Alte instituții`,
      hint: plural(rest.length, { one: '# minister sau instituție mai mică', few: '# ministere și instituții mai mici', other: '# de ministere și instituții mai mici' }),
      exact,
      lei: lei[shown.length] ?? 0,
      change: null,
      fill: { className: REST_FILL },
    },
  ]
}

function StateBudget() {
  const { view } = usePageYear()
  const state = useStateBudget(view)
  const previous = previousText(view)
  const paid = moneyText(state.whole)
  const period = inPeriod(view.text)
  return (
    <div>
      <p className="max-w-[60ch] text-base leading-relaxed">
        {state.change ? t`Din bugetul de stat s-au plătit ${paid} ${period}, ${state.change} față de ${previous}. Din fiecare 100 de lei:` : t`Din bugetul de stat s-au plătit ${paid} ${period}. Din fiecare 100 de lei:`}
      </p>
      <TwoLists
        className="mt-8"
        swatches={false}
        left={{ title: t`Pe domenii`, parts: partsOf(state.domains, (line) => ({ hint: chapterHint(line.key) })) }}
        right={{ title: t`Pe instituții`, parts: institutionsOf(state.authorities) }}
        previous={previous}
        note={t`Plățile din bugetul de stat raportate la ANAF de ordonatorii principali de credite, ${view.text}: pe capitolele clasificației funcționale și pe ministere și instituții centrale (cele mai mari ${NAMED} cu numele, celelalte într-un rând). Variația, față de ${previous}, în lei curenți. Leii din 100 sunt rotunjiți la întreg; „<1" înseamnă sub un leu. Numele unei instituții deschide pagina ei.`}
      />
    </div>
  )
}

/** Hooks only for a year ANAF covers. */
function StateBudgetOrNone() {
  const { view } = usePageYear()
  if (view.year < ANAF_FIRST_YEAR) {
    return (
      <p className="max-w-[60ch] text-sm text-muted-foreground">
        {t`Plățile pe domenii și pe instituții vin din rapoartele de execuție depuse la ANAF, care încep în ${ANAF_FIRST_YEAR}. Pentru ${view.year} nu le avem; alege un an din ${ANAF_FIRST_YEAR} încoace.`}
      </p>
    )
  }
  return <StateBudget />
}

export function StateSection() {
  return (
    <Section
      id="stat"
      title={t`Bugetul de stat, pe domenii și pe instituții`}
      lede={t`Doar bugetul de stat. Cele mai multe pensii se plătesc din bugetul asigurărilor sociale, iar spitalele, din Fondul de sănătate: apar aici doar cu partea plătită din bugetul de stat.`}
    >
      <StateBudgetOrNone />
    </Section>
  )
}
