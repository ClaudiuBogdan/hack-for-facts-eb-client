import { ANAF_FIRST_YEAR } from '@/features/national-budget/home/lib/home-data'
import { moneyText } from '@/features/national-budget/home/lib/home-format'
import { type StateLine, useStateBudget } from './persoana.data'
import { TwoLists, type HundredPart } from './persoana.rows'
import { REST_FILL, inPeriod, toneOf } from './persoana.sections'
import { Section, usePersonYear } from './persoana.shell'

/**
 * The working version's second section: the state budget alone (the
 * payments reported to ANAF), as lei out of every 100 it paid — on what
 * domains, and through which ministries and central institutions. The same
 * two lists as the first section, with a bar per line in place of a chart.
 */

/** What a chapter holds, in a reader's words (the live page's hints, `home-domains.tsx`). */
const CHAPTER_HINTS: Readonly<Record<string, string>> = {
  '51': 'Guvernul și ministerele, contribuția României la bugetul UE, cofinanțarea proiectelor europene',
  '54': 'alte servicii ale statului, garanții plătite din bugetul de stat',
  '55': 'dobânzile la datoria publică: banii împrumutați în anii trecuți',
  '56': 'bani trimiși altor bugete, mai ales celui de pensii, ca să-și acopere plățile',
  '60': 'armata',
  '61': 'poliție, protecție civilă și pompieri, instanțe, penitenciare',
  '65': 'școli: salariile profesorilor, învățământul primar și gimnazial',
  '66': 'programe naționale de sănătate, spitalele ministerelor',
  '67': 'culte, sport, cultură',
  '68': 'pensii plătite din bugetul de stat, alocații, indemnizații, ajutor social',
  '70': 'locuințe, apă și canalizare, dezvoltarea localităților',
  '74': 'mediu, poluare, ape',
  '80': 'programe de dezvoltare regională și socială',
  '81': 'energie',
  '83': 'subvenții pentru agricultori, păduri',
  '84': 'drumuri și poduri, căi ferate',
}

function partsOf(lines: readonly StateLine[], more: (line: StateLine) => Partial<HundredPart>): HundredPart[] {
  return lines.map((line, rank) => ({ ...line, hint: null, fill: { style: toneOf(rank, lines.length).style }, ...more(line) }))
}

/** Institutions named one by one; the smaller ones share a line (owner: keep the two lists close in length). */
const NAMED = 15

function institutionsOf(lines: readonly StateLine[]): HundredPart[] {
  const named = partsOf(lines.slice(0, NAMED), (line) => ({ cui: line.key }))
  const rest = lines.slice(NAMED)
  if (rest.length === 0) return named
  const count = `${rest.length} ${rest.length % 100 === 0 || rest.length % 100 >= 20 ? 'de ' : ''}ministere și instituții mai mici`
  return [
    ...named,
    {
      key: 'rest',
      label: 'Alte instituții',
      hint: count,
      exact: rest.reduce((sum, line) => sum + Number(line.exact), 0).toFixed(2),
      lei: rest.reduce((sum, line) => sum + line.lei, 0),
      change: null,
      fill: { className: REST_FILL },
    },
  ]
}

function StateBudget() {
  const { view } = usePersonYear()
  const state = useStateBudget(view)
  const previous = view.partial ? `aceleași luni din ${view.year - 1}` : String(view.year - 1)
  return (
    <div>
      <p className="max-w-[60ch] text-base leading-relaxed">
        Din bugetul de stat s-au plătit <strong className="font-semibold tabular-nums">{moneyText(state.whole)}</strong> {inPeriod(view.text)}
        {state.change ? (
          <>
            , <strong className="font-semibold tabular-nums">{state.change}</strong> față de {previous}
          </>
        ) : null}
        . Din fiecare <strong className="font-semibold">100 de lei</strong>:
      </p>
      <TwoLists
        className="mt-8"
        swatches={false}
        left={{ title: 'Pe domenii', parts: partsOf(state.domains, (line) => ({ hint: CHAPTER_HINTS[line.key] ?? null })) }}
        right={{ title: 'Pe instituții', parts: institutionsOf(state.authorities) }}
        previous={previous}
        note={`Plățile din bugetul de stat raportate la ANAF de ordonatorii principali de credite, ${view.text}: pe capitolele clasificației funcționale și pe ministere și instituții centrale (cele mai mari ${NAMED} cu numele, celelalte într-un rând). Variația, față de ${previous}, în lei curenți. Leii din 100 sunt rotunjiți la întreg; „<1" înseamnă sub un leu. Numele unei instituții deschide pagina ei.`}
      />
    </div>
  )
}

/** Hooks only for a year ANAF covers. */
function StateBudgetOrNone() {
  const { view } = usePersonYear()
  if (view.year < ANAF_FIRST_YEAR) {
    return (
      <p className="max-w-[60ch] text-sm text-muted-foreground">
        Plățile pe domenii și pe instituții vin din rapoartele de execuție depuse la ANAF, care încep în {ANAF_FIRST_YEAR}. Pentru {view.year} nu le avem; alege un an din {ANAF_FIRST_YEAR} încoace.
      </p>
    )
  }
  return <StateBudget />
}

export function StateSection() {
  return (
    <Section
      id="stat"
      title="Bugetul de stat, pe domenii și pe instituții"
      lede="Doar bugetul de stat. Cele mai multe pensii se plătesc din bugetul asigurărilor sociale, iar spitalele, din Fondul de sănătate: apar aici doar cu partea plătită din bugetul de stat."
    >
      <StateBudgetOrNone />
    </Section>
  )
}
