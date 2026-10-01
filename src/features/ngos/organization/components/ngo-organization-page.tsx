import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { Trans, useLingui } from '@lingui/react/macro'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { RevealStyles, useRevealOnView } from '@/components/landing-skin/reveal'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { SmearFilters, countUpWithin, stopCounting } from '@/features/landing/components/count-up'
import { CornerTicks, CruxMarks, TwoLayerLattice } from '@/features/landing/components/hero-chrome'
import { formatNgoMoney } from '@/features/ngos/hub/ngo-format'
import { HomeBand, HomeSectionNav } from '@/features/procurement/components/home/home-section-nav'
import { HUB_BESIDE_TITLE_CLASS, HubSectionHead } from '@/features/statistics/components/hub/hub-chrome'
import { HubFiguresBand, type HubFact } from '@/features/statistics/components/hub/hub-figures'
import { cn } from '@/lib/utils'
import type { NgoOrganization, NgoStatementsRead } from '../api'
import { keyFigures, latestStatement, placeOf, yearSeries } from '../model'
import { categoryLabel, organizationName, profileFacts, purposeText, type ProfileFacts } from '../words'
import {
  AnafFacts,
  Identifiers,
  ProfileChips,
  ProfileSentence,
  ProfileSources,
  RegistryFacts,
  RevenueSources,
  StatementTable,
  YearSelect,
  YearsChart,
} from './profile-parts'
import { PurposeSection } from './purpose-section'
import { YearsMatrix } from './years-matrix'

/**
 * `/ngos/$cui` — one NGO in the companies profile's language
 * (`docs/design/ngos/design.md` §14): the name, what it says it does and one
 * sentence with the chips, its last years beside them, the pinned bar, four
 * figures, then one band per question — the money, the statement as filed,
 * the key rows year by year, and what ANAF and the registry say.
 *
 * The statements are read apart from the profile: where they fail, the page
 * stands and says so, with a way to read them again.
 */

export function NgoOrganizationPage({
  organization,
  statementsRead,
  year,
  onYear,
  onRetry,
  retrying = false,
}: {
  readonly organization: NgoOrganization
  readonly statementsRead: NgoStatementsRead
  /** The statement read row by row (`?an=`); the latest when absent or not filed. */
  readonly year: number | undefined
  readonly onYear: (year: number) => void
  /** Reads the statements again after a failure. */
  readonly onRetry: () => void
  /** A read again is under way. */
  readonly retrying?: boolean
}) {
  const { i18n } = useLingui()
  const rootRef = useRef<HTMLDivElement>(null)
  useRevealOnView(rootRef, (block, delay) => countUpWithin(block, delay))
  // The count-up driver is module state; an unmount mid-flight would leave it ticking against removed nodes.
  useEffect(() => () => stopCounting(), [])

  const statements = statementsRead.status === 'ready' ? statementsRead.statements : []
  const failed = statementsRead.status === 'failed'
  const series = yearSeries(statements)
  const latest = latestStatement(statements)
  const chosen = statements.find((statement) => statement.fiscalYear === (year ?? latest?.fiscalYear)) ?? latest
  const facts = profileFacts(statements)
  const purpose = purposeText(organization)
  const name = organizationName(organization)
  // A year the address asks for that has no statement on the platform: said, and the latest shown instead.
  const unfiled = year !== undefined && chosen !== null && chosen.fiscalYear !== year ? year : null
  const sections = [
    ...(purpose ? [{ id: 'scop', label: t`Scopul` }] : []),
    { id: 'bani', label: t`Banii` },
    ...(chosen ? [{ id: 'situatie', label: t`Situația financiară` }] : []),
    ...(series.length > 0 ? [{ id: 'an-cu-an', label: t`An cu an` }] : []),
    { id: 'registru', label: t`ANAF și registru` },
  ]
  /** „02 / An cu an": a band's number is its place in the bar, which drops a band when there is nothing to show in it. */
  const indexOf = (id: string) => {
    const position = sections.findIndex((section) => section.id === id)
    return `${String(position + 1).padStart(2, '0')} / ${sections[position]?.label ?? ''}`
  }
  // A year chosen in the matrix opens its statement in the band above it, and the reader's focus goes with it.
  const openYear = (next: number) => {
    onYear(next)
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    document.getElementById('situatie')?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' })
    const heading = document.getElementById('ngo-profile-statement')
    if (heading) {
      heading.tabIndex = -1
      heading.focus({ preventScroll: true })
    }
  }
  const figures = latest ? keyFigures(latest) : null
  // Said once, in the money band: with no statement, the statement's and the years' bands are not drawn at all.
  const missing = failed ? <StatementsFailed onRetry={onRetry} retrying={retrying} /> : <NoStatements organization={organization} />

  return (
    <div ref={rootRef} className="relative w-full overflow-x-clip bg-background">
      <RevealStyles />
      <SmearFilters />

      <section className="relative border-b">
        <TwoLayerLattice idPrefix="ngo-profile" />
        <RuledFrame marker="hero" className="py-10 sm:py-14">
          <CornerTicks />
          <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-12 lg:gap-8">
            <div className="min-w-0 lg:col-span-8">
              <Crumbs organization={organization} />
              <h1 className="mt-5 text-[clamp(2rem,7vw+0.5rem,2.75rem)] font-extrabold leading-[0.95] tracking-tighter text-foreground sm:text-5xl lg:text-6xl">
                {name}
              </h1>
              {/* The registry's observations disagree on the name: the one shown is one of them, not an agreed name. */}
              {organization.name === null && organization.conflicts.includes('name') ? (
                <p className="mt-3 text-sm text-muted-foreground">
                  <Trans>Registrul o trece sub mai multe nume; toate sunt la „Ce spun ANAF și registrul".</Trans>
                </p>
              ) : null}
              <p className="mt-5 max-w-[42rem] text-lg leading-relaxed text-muted-foreground">
                <ProfileSentence organization={organization} />
              </p>
              <div className="mt-5 space-y-3">
                <ProfileChips organization={organization} />
                <Identifiers organization={organization} />
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
                  <NoStatementsShort organization={organization} failed={failed} />
                </p>
              )}
            </div>
          </div>
          {/* The crux on the head's bottom rule, where the pinned bar begins; above the bar, which would cover its lower half. */}
          <span className="absolute inset-x-0 top-full z-30 mt-px" aria-hidden="true">
            <CruxMarks />
          </span>
        </RuledFrame>
      </section>

      <HomeSectionNav title={name} sections={sections} />

      {facts ? (
        <section className="border-b bg-muted/20" aria-label={t`Cifre-cheie`}>
          <RuledFrame>
            <HubFiguresBand facts={profileFactRow(facts)} locale={i18n.locale === 'en' ? 'en' : 'ro'} />
          </RuledFrame>
        </section>
      ) : null}

      {purpose ? <PurposeSection organization={organization} text={purpose} index={indexOf('scop')} /> : null}

      <HomeBand id="bani" labelledBy="ngo-profile-money">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <HubSectionHead
              titleId="ngo-profile-money"
              index={indexOf('bani')}
              title={<Trans>De unde vin banii</Trans>}
              lede={facts && figures?.revenue?.value != null ? <MoneyLede facts={facts} /> : null}
            />
            {latest ? (
              <div className="mt-8" data-reveal>
                <MonoLabel className="block text-muted-foreground">
                  <LatestSourcesLabel year={latest.fiscalYear} />
                </MonoLabel>
                <div className="mt-3">
                  <RevenueSources statement={latest} />
                </div>
              </div>
            ) : (
              <div className="mt-8">{missing}</div>
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

      {chosen ? (
        <HomeBand id="situatie" labelledBy="ngo-profile-statement">
          <HubSectionHead
            titleId="ngo-profile-statement"
            index={indexOf('situatie')}
            title={<Trans>Situația financiară, rând cu rând</Trans>}
            aside={chosen ? <YearSelect series={series} value={chosen.fiscalYear} onChange={onYear} /> : null}
          />
          <div className="mt-8" data-reveal>
            {unfiled !== null ? (
              <p className="mb-6 text-sm text-muted-foreground">
                <UnfiledYear asked={unfiled} shown={chosen.fiscalYear} />
              </p>
            ) : null}
            <StatementTable statement={chosen} />
          </div>
        </HomeBand>
      ) : null}

      {series.length > 0 ? (
        <HomeBand id="an-cu-an" labelledBy="ngo-profile-years">
          <HubSectionHead
            titleId="ngo-profile-years"
            index={indexOf('an-cu-an')}
            title={<Trans>Situațiile financiare, an cu an</Trans>}
            lede={
              <Trans>
                Fiecare coloană e o situație depusă. Un an fără situație pe platformă rămâne gol: nu e un zero. „—" e o celulă goală în sursă; un rând pe
                care formularul anului nu îl are rămâne gol.
              </Trans>
            }
          />
          <div className="mt-8" data-reveal>
            <YearsMatrix statements={statements} chosenYear={chosen?.fiscalYear ?? null} onChoose={openYear} />
          </div>
        </HomeBand>
      ) : null}

      <HomeBand id="registru" labelledBy="ngo-profile-registry">
        <HubSectionHead titleId="ngo-profile-registry" index={indexOf('registru')} title={<Trans>Ce spun ANAF și registrul</Trans>} />
        <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-12" data-reveal>
          <div>
            <MonoLabel className="block text-primary">
              <Trans>ANAF</Trans>
            </MonoLabel>
            <div className="mt-3">
              <AnafFacts organization={organization} />
            </div>
          </div>
          <div>
            <MonoLabel className="block text-primary">
              <Trans>Registrul național ONG</Trans>
            </MonoLabel>
            <div className="mt-3">
              <RegistryFacts organization={organization} />
            </div>
          </div>
        </div>
      </HomeBand>

      <footer className="border-b bg-muted/20">
        <RuledFrame className="py-6">
          <ProfileSources organization={organization} statements={statements} />
        </RuledFrame>
      </footer>
    </div>
  )
}

function Crumbs({ organization }: { readonly organization: NgoOrganization }) {
  const place = placeOf(organization)
  return (
    <MonoLabel className="text-muted-foreground">
      <Link to="/ngos" className="hover:text-foreground">
        ← <Trans>ONG-uri</Trans>
      </Link>
      {place ? ` / ${place.split(', ').pop()}` : ''} / {categoryLabel(organization.category)}
    </MonoLabel>
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

/**
 * The latest statement's figures; with none, no band at all. A figure its
 * year's form does not give (a blank cell, or no such row) is left out,
 * never drawn as a zero, and a zero result is neither surplus nor deficit.
 */
function profileFactRow(facts: ProfileFacts): readonly HubFact[] {
  // The figures band counts up to a number: the money's scale (as formatNgoMoney's) picked here, the figure kept numeric.
  const money = (value: number) => {
    const magnitude = Math.abs(value)
    if (magnitude >= 1e9) return { value: Math.round(value / 1e8) / 10, digits: 1, unit: t`mld. lei` }
    if (magnitude >= 1e6) return { value: Math.round(value / 1e5) / 10, digits: 1, unit: t`mil. lei` }
    return { value, digits: 0, unit: t`lei` }
  }
  const { year, previousYear, change, revenue, expenses, result } = facts
  const [first, last] = facts.span ?? [null, null]
  const row: HubFact[] = []
  if (revenue !== null)
    row.push({
      key: 'revenue',
      ...money(revenue),
      label: <Trans>Venituri, {year}</Trans>,
      note: change ? (
        <Trans>
          {change} față de {previousYear}
        </Trans>
      ) : facts.previousFiled ? (
        ''
      ) : (
        <Trans>Fără situație pe platformă pentru {previousYear}</Trans>
      ),
      link: toBand('bani'),
    })
  if (expenses !== null) row.push({ key: 'expenses', ...money(expenses), label: <Trans>Cheltuieli, {year}</Trans>, note: '', link: toBand('bani') })
  if (result !== null)
    row.push({
      key: 'result',
      ...money(Math.abs(result)),
      label: result < 0 ? <Trans>Deficit, {year}</Trans> : result > 0 ? <Trans>Excedent, {year}</Trans> : <Trans>Rezultat, {year}</Trans>,
      note: '',
      link: toBand('situatie'),
    })
  row.push({
    key: 'filed',
    value: facts.filed,
    digits: 0,
    label: <Trans>Situații financiare publicate</Trans>,
    note:
      first !== null ? (
        <Trans>
          {first}–{last}
        </Trans>
      ) : (
        ''
      ),
    link: toBand('situatie'),
  })
  return row
}

function LatestSourcesLabel({ year }: { readonly year: number }) {
  return <Trans>Veniturile din {year}, după activitate</Trans>
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
  if (facts.result === 0) return <Trans>În {year}, venituri de {revenue} și cheltuieli de {expenses}: nici excedent, nici deficit.</Trans>
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

function NoStatements({ organization }: { readonly organization: NgoOrganization }) {
  return (
    <p className="max-w-[60ch] border-y py-4 text-sm text-muted-foreground">
      {organization.financials.availability === 'not_released' ? (
        <Trans>Situațiile financiare ale acestei organizații nu sunt publicate pe platformă.</Trans>
      ) : organization.financials.availability === 'not_loaded' ? (
        <Trans>Situațiile financiare nu sunt încă încărcate pentru acest CUI. Lipsa lor nu înseamnă că organizația nu le-a depus.</Trans>
      ) : (
        <Trans>Nicio situație financiară pe platformă pentru acest CUI. Asta nu dovedește că organizația nu a depus.</Trans>
      )}
    </p>
  )
}

/** The statements could not be read this time: the page says so, never „none", and offers to read them again. */
function StatementsFailed({ onRetry, retrying }: { readonly onRetry: () => void; readonly retrying: boolean }) {
  return (
    <div role="alert" className="max-w-[60ch] space-y-3 border-y py-4 text-sm text-muted-foreground">
      <p>
        <Trans>Situațiile financiare nu s-au încărcat. Asta nu spune nimic despre organizație.</Trans>
      </p>
      <button
        type="button"
        onClick={onRetry}
        disabled={retrying}
        aria-busy={retrying}
        className="inline-flex min-h-9 items-center rounded-sm border px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-60"
      >
        {retrying ? <Trans>Se încarcă…</Trans> : <Trans>Încearcă din nou</Trans>}
      </button>
    </div>
  )
}

/** The head's word for no statement to draw: why, in short, as the money band says it in full. */
function NoStatementsShort({ organization, failed }: { readonly organization: NgoOrganization; readonly failed: boolean }) {
  if (failed) return <Trans>Situațiile financiare nu s-au încărcat.</Trans>
  switch (organization.financials.availability) {
    case 'not_released':
      return <Trans>Situații financiare nepublicate pe platformă.</Trans>
    case 'not_loaded':
      return <Trans>Situații financiare încă neîncărcate.</Trans>
    default:
      return <Trans>Nicio situație financiară pe platformă.</Trans>
  }
}

/** The address asked for a year with no statement on the platform: said, with the year shown instead. */
function UnfiledYear({ asked, shown }: { readonly asked: number; readonly shown: number }) {
  return <Trans>Nicio situație pe platformă pentru {asked}; se arată {shown}.</Trans>
}
