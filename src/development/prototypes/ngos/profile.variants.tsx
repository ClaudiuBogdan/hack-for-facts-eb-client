import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { RevealStyles, useRevealOnView } from '@/components/landing-skin/reveal'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { SmearFilters, countUpWithin, stopCounting } from '@/features/landing/components/count-up'
import { CornerTicks, CruxMarks, TwoLayerLattice } from '@/features/landing/components/hero-chrome'
import { formatNgoMoney } from '@/features/ngos/hub/ngo-format'
import { HomeBand, HomeSectionNav } from '@/features/procurement/components/home/home-chrome'
import { HUB_BESIDE_TITLE_CLASS, HubSectionHead } from '@/features/statistics/components/hub/hub-chrome'
import { HubFiguresBand, type HubFact } from '@/features/statistics/components/hub/hub-figures'
import { cn } from '@/lib/utils'
import { formatExact, keyFigures as figuresOf, type FigureKey } from './profile.model'
import {
  AnafFacts,
  FixturePicker,
  Identifiers,
  ProfileChips,
  ProfileSentence,
  ProfileSources,
  RegistryFacts,
  RevenueSources,
  StatementTable,
  YearSelect,
  YearsChart,
  categoryLabel,
  displayNgoName,
  latestStatement,
  placeOf,
  profileFacts,
  useFixture,
  useNumberLocale,
  yearSeries,
  type ProfileFacts,
} from './profile.parts'
import type { RawProfile } from './profile.types'

/** Literal marker. `yarn build:validate` fails if this reaches `.output/`. */
const PROTOTYPE_MARKER = 'TRANSPARENTA_PROTOTYPE_MUST_NOT_SHIP'

function Shell({ children }: { readonly children: ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null)
  useRevealOnView(rootRef, (block, delay) => countUpWithin(block, delay))
  useEffect(() => () => stopCounting(), [])
  return (
    <div data-dev-marker={PROTOTYPE_MARKER}>
      <FixturePicker />
      <div ref={rootRef} className="relative w-full overflow-x-clip bg-background">
        <RevealStyles />
        <SmearFilters />
        {children}
      </div>
    </div>
  )
}

function Crumbs({ profile }: { readonly profile: RawProfile }) {
  const place = placeOf(profile)
  return (
    <MonoLabel className="text-muted-foreground">
      <Link to="/ngos" className="hover:text-foreground">
        ← <Trans>ONG-uri</Trans>
      </Link>
      {place ? ` / ${place.split(', ').pop()}` : ''} / {categoryLabel(profile.category)}
    </MonoLabel>
  )
}

function Title({ profile }: { readonly profile: RawProfile }) {
  return (
    <h1 className="mt-5 text-[clamp(2rem,7vw+0.5rem,2.75rem)] font-extrabold leading-[0.95] tracking-tighter text-foreground sm:text-5xl lg:text-6xl">
      {displayNgoName(profile.name)}
    </h1>
  )
}

function toBand(hash: string): HubFact['link'] {
  return function BandLink(label: ReactNode, className: string) {
    return (
      <a href={`#${hash}`} className={className}>
        {label}
      </a>
    )
  }
}

/** The four figures of the latest statement; with none, no band at all. */
function profileFactRow(facts: ProfileFacts): readonly HubFact[] {
  const money = (value: number | null) => {
    if (value === null) return { value: 0, digits: 0, unit: undefined }
    const magnitude = Math.abs(value)
    if (magnitude >= 1e9) return { value: Math.round(value / 1e8) / 10, digits: 1, unit: t`mld. lei` }
    if (magnitude >= 1e6) return { value: Math.round(value / 1e5) / 10, digits: 1, unit: t`mil. lei` }
    return { value, digits: 0, unit: t`lei` }
  }
  const { year, previousYear } = facts
  const result = facts.result
  return [
    {
      key: 'revenue',
      ...money(facts.revenue),
      label: <Trans>Venituri, {year}</Trans>,
      note: facts.change ? (
        <Trans>
          {facts.change} față de {previousYear}
        </Trans>
      ) : facts.previousFiled ? (
        ''
      ) : (
        <Trans>Fără situație pe {previousYear}</Trans>
      ),
      link: toBand('bani'),
    },
    {
      key: 'expenses',
      ...money(facts.expenses),
      label: <Trans>Cheltuieli, {year}</Trans>,
      note: '',
      link: toBand('bani'),
    },
    {
      key: 'result',
      ...money(result === null ? null : Math.abs(result)),
      label: result !== null && result < 0 ? <Trans>Deficit, {year}</Trans> : <Trans>Excedent, {year}</Trans>,
      note: '',
      link: toBand('situatie'),
    },
    {
      key: 'filed',
      value: facts.filed,
      digits: 0,
      label: <Trans>Situații financiare publicate</Trans>,
      note: facts.span ? (
        <Trans>
          {facts.span[0]}–{facts.span[1]}
        </Trans>
      ) : (
        ''
      ),
      link: toBand('situatie'),
    },
  ]
}

function NoStatements({ profile }: { readonly profile: RawProfile }) {
  return (
    <p className="max-w-[60ch] border-y py-4 text-sm text-muted-foreground">
      {profile.financials.availability === 'not_released' ? (
        <Trans>Situațiile financiare ale acestei organizații nu sunt publicate pe platformă.</Trans>
      ) : profile.financials.availability === 'not_loaded' ? (
        <Trans>Situațiile financiare nu sunt încă încărcate pentru acest CUI. Lipsa lor nu înseamnă că organizația nu le-a depus.</Trans>
      ) : (
        <Trans>Nicio situație financiară în fișierele publicate de Ministerul Finanțelor pentru acest CUI.</Trans>
      )}
    </p>
  )
}

// ═══════════════════════════════════════════════════════ A · benzi ══

/**
 * The companies profile's language: the name and one sentence with the
 * chips, the last years beside it, the pinned bar, four figures, then one
 * band per question — the money, the statement as filed, the key rows year
 * by year, and what ANAF and the registry say.
 */
export function ProfileBands() {
  const profile = useFixture()
  const series = yearSeries(profile)
  const latest = latestStatement(profile)
  const [year, setYear] = useState<number | null>(null)
  const chosen = profile.financials.statements.find((statement) => statement.fiscalYear === (year ?? latest?.fiscalYear)) ?? latest
  const facts = profileFacts(profile)
  const name = displayNgoName(profile.name)
  const sections = [
    { id: 'bani', label: t`Banii` },
    { id: 'situatie', label: t`Situația financiară` },
    ...(series.length > 0 ? [{ id: 'an-cu-an', label: t`An cu an` }] : []),
    { id: 'registru', label: t`ANAF și registru` },
  ]
  /** „03 / An cu an": a band's number is its place in the bar, which drops the matrix when there is nothing to tabulate. */
  const indexOf = (id: string) => {
    const position = sections.findIndex((section) => section.id === id)
    return `${String(position + 1).padStart(2, '0')} / ${sections[position]?.label ?? ''}`
  }
  // A year chosen in the matrix opens its statement in the band above it.
  const openYear = (next: number) => {
    setYear(next)
    document.getElementById('situatie')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  const figures = latest ? figuresOf(latest) : null
  return (
    <Shell>
      <section key={profile.cui} className="relative border-b">
        <TwoLayerLattice idPrefix="ngo-profile-a" />
        <RuledFrame marker="hero" className="py-10 sm:py-14">
          <CornerTicks />
          <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-12 lg:gap-8">
            <div className="min-w-0 lg:col-span-8">
              <Crumbs profile={profile} />
              <Title profile={profile} />
              <p className="mt-5 max-w-[56ch] text-lg leading-relaxed text-muted-foreground">
                <ProfileSentence profile={profile} />
              </p>
              <div className="mt-5 space-y-3">
                <ProfileChips profile={profile} />
                <Identifiers profile={profile} />
              </div>
            </div>
            <div className="min-w-0 lg:col-span-4 lg:border-l lg:pl-8">
              <MonoLabel className="text-primary">
                <Trans>Ultimii ani cu situații financiare</Trans>
              </MonoLabel>
              {series.length > 0 ? (
                <div className="mt-6">
                  <YearsChart series={series.slice(-6)} height="h-28" compact />
                </div>
              ) : (
                <p className="mt-4 text-sm text-muted-foreground">
                  <Trans>Nicio situație financiară.</Trans>
                </p>
              )}
            </div>
          </div>
        </RuledFrame>
      </section>

      <HomeSectionNav title={name} sections={sections} />

      {facts ? (
        <section className="border-b bg-muted/20" aria-label={t`Cifre-cheie`}>
          <RuledFrame>
            <CruxMarks />
            <HubFiguresBand facts={profileFactRow(facts)} locale="ro" />
          </RuledFrame>
        </section>
      ) : null}

      <HomeBand id="bani" labelledBy="ngo-profile-a-money">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <HubSectionHead
              titleId="ngo-profile-a-money"
              index={indexOf('bani')}
              title={<Trans>De unde vin banii</Trans>}
              lede={
                facts && figures?.revenue?.value != null ? (
                  <MoneyLede facts={facts} />
                ) : null
              }
            />
            {latest ? (
              <div className="mt-8" data-reveal>
                <MonoLabel className="block text-muted-foreground">
                  <Trans>Veniturile din {latest.fiscalYear}, după activitate</Trans>
                </MonoLabel>
                <div className="mt-3">
                  <RevenueSources statement={latest} />
                </div>
              </div>
            ) : (
              <div className="mt-8">
                <NoStatements profile={profile} />
              </div>
            )}
          </div>
          {series.length > 0 ? (
            <div className={cn('lg:col-span-6 lg:col-start-7', HUB_BESIDE_TITLE_CLASS)} data-reveal>
              <MonoLabel className="block text-muted-foreground">
                <Trans>Venituri și cheltuieli pe an, lei</Trans>
              </MonoLabel>
              <div className="mt-2">
                <YearsChart series={series} />
              </div>
            </div>
          ) : null}
        </div>
      </HomeBand>

      <HomeBand id="situatie" labelledBy="ngo-profile-a-statement">
        <HubSectionHead
          titleId="ngo-profile-a-statement"
          index={indexOf('situatie')}
          title={<Trans>Situația financiară, rând cu rând</Trans>}
          aside={chosen ? <YearSelect series={series} value={chosen.fiscalYear} onChange={setYear} /> : null}
        />
        <div className="mt-8" data-reveal>
          {chosen ? <StatementTable statement={chosen} /> : <NoStatements profile={profile} />}
        </div>
      </HomeBand>

      {series.length > 0 ? (
        <HomeBand id="an-cu-an" labelledBy="ngo-profile-a-years">
          <HubSectionHead
            titleId="ngo-profile-a-years"
            index={indexOf('an-cu-an')}
            title={<Trans>Situațiile financiare, an cu an</Trans>}
            lede={<Trans>Fiecare coloană e o situație depusă. Un an fără situație în fișierele publicate rămâne gol: nu e un zero.</Trans>}
          />
          <div className="mt-8" data-reveal>
            <YearsMatrix profile={profile} chosenYear={chosen?.fiscalYear ?? null} onChoose={openYear} />
          </div>
        </HomeBand>
      ) : null}

      <HomeBand id="registru" labelledBy="ngo-profile-a-registry">
        <HubSectionHead titleId="ngo-profile-a-registry" index={indexOf('registru')} title={<Trans>Ce spun ANAF și registrul</Trans>} />
        <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-12" data-reveal>
          <div>
            <MonoLabel className="block text-primary">
              <Trans>ANAF</Trans>
            </MonoLabel>
            <div className="mt-3">
              <AnafFacts profile={profile} />
            </div>
          </div>
          <div>
            <MonoLabel className="block text-primary">
              <Trans>Registrul național ONG</Trans>
            </MonoLabel>
            <div className="mt-3">
              <RegistryFacts profile={profile} />
            </div>
          </div>
        </div>
      </HomeBand>

      <footer className="border-b bg-muted/20">
        <RuledFrame className="py-6">
          <ProfileSources profile={profile} />
        </RuledFrame>
      </footer>
    </Shell>
  )
}

function MoneyLede({ facts }: { readonly facts: ProfileFacts }) {
  const text = (value: number | null) => {
    if (value === null) return '—'
    const money = formatNgoMoney(Math.abs(value))
    return `${money.value} ${money.unit}`
  }
  const year = facts.year
  const revenue = text(facts.revenue)
  const expenses = text(facts.expenses)
  const result = text(facts.result)
  if (facts.result === null) return <Trans>În {year}, venituri de {revenue} și cheltuieli de {expenses}.</Trans>
  return facts.result < 0 ? (
    <Trans>
      În {year}, venituri de {revenue} și cheltuieli de {expenses}: un deficit de {result}.
    </Trans>
  ) : (
    <Trans>
      În {year}, venituri de {revenue} și cheltuieli de {expenses}: un excedent de {result}.
    </Trans>
  )
}

// ═══════════════════════════════════════════════════ the years matrix ══

const MATRIX_ROWS: readonly { readonly key: FigureKey; readonly label: () => string; readonly strong?: boolean; readonly indent?: boolean }[] = [
  { key: 'revenue', label: () => t`Venituri totale`, strong: true },
  { key: 'nonProfit', label: () => t`din activități fără scop patrimonial`, indent: true },
  { key: 'economic', label: () => t`din activități economice`, indent: true },
  { key: 'special', label: () => t`cu destinație specială`, indent: true },
  { key: 'expenses', label: () => t`Cheltuieli totale`, strong: true },
  { key: 'surplus', label: () => t`Excedent` },
  { key: 'deficit', label: () => t`Deficit` },
  { key: 'cash', label: () => t`Casa și conturi la bănci` },
  { key: 'debts', label: () => t`Datorii` },
]

/**
 * Year by year: the rows a reader compares across time as one matrix, every
 * year a column, newest first — the year a reader comes for is in view, the
 * older ones a scroll away. A year without a statement in the published
 * files stays an empty, shaded column: unknown, not a zero. A cell's exact
 * value is in its title; a year's header opens that statement, row by row,
 * in the band above.
 */
function YearsMatrix({
  profile,
  chosenYear,
  onChoose,
}: {
  readonly profile: RawProfile
  readonly chosenYear: number | null
  readonly onChoose: (year: number) => void
}) {
  const locale = useNumberLocale()
  const columns = [...yearSeries(profile)].reverse().map((point) => ({ ...point, figures: point.statement ? figuresOf(point.statement) : null }))
  if (columns.length === 0) return <NoStatements profile={profile} />
  return (
    <div className="overflow-x-auto">
      {/* On a phone the row names wrap so two or three years fit beside them; wider, every column keeps one line. */}
      <table className="w-full border-collapse text-sm sm:min-w-max">
        <thead>
          <tr className="border-b border-border/70">
            <th scope="col" className="sticky left-0 z-10 bg-background pb-2 pr-4 text-left font-normal">
              {/* The unit once, where the table starts and where it stays pinned while the years scroll; the cells keep only their scale. */}
              <MonoLabel className="text-muted-foreground">
                <Trans>Sume în lei</Trans>
              </MonoLabel>
            </th>
            {columns.map((column) => (
              <th key={column.year} scope="col" className="px-2 pb-2 text-right font-normal">
                {column.statement ? (
                  <button
                    type="button"
                    onClick={() => onChoose(column.year)}
                    aria-label={t`Situația din ${column.year}, rând cu rând`}
                    className={cn(
                      'inline-flex min-h-8 items-center font-mono text-xs tabular-nums underline-offset-4 hover:underline',
                      chosenYear === column.year ? 'font-bold text-foreground' : 'text-muted-foreground',
                    )}
                  >
                    {column.year}
                  </button>
                ) : (
                  <MonoLabel className="text-muted-foreground/60">
                    {column.year}
                    <span className="sr-only">{t`: nicio situație în fișierele publicate`}</span>
                  </MonoLabel>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {MATRIX_ROWS.map((row) => (
            <tr key={row.key} className="border-b border-border/60">
              <th
                scope="row"
                className={cn(
                  'sticky left-0 z-10 w-36 min-w-36 bg-background py-2 pr-3 text-left font-normal leading-snug sm:w-auto sm:pr-4',
                  row.strong ? 'text-foreground' : 'text-muted-foreground',
                  row.indent && 'pl-4',
                )}
              >
                {row.label()}
              </th>
              {columns.map((column) => {
                const amount = column.figures?.[row.key] ?? null
                const short = amount?.value != null ? formatNgoMoney(amount.value).value : null
                return (
                  <td
                    key={column.year}
                    className={cn(
                      'whitespace-nowrap px-2 py-2 text-right tabular-nums',
                      !column.statement && 'bg-muted/40',
                      chosenYear === column.year && 'bg-muted/50',
                      row.strong ? 'font-semibold text-foreground' : 'text-muted-foreground',
                    )}
                    title={amount?.raw != null ? `${formatExact(amount.raw, locale)} lei` : undefined}
                  >
                    {column.statement ? (short ?? '—') : ''}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
