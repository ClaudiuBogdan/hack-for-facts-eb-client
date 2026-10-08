import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { useLingui } from '@lingui/react/macro'
import { ArrowLeft } from 'lucide-react'

import { IndicatorToggle } from '@/components/landing-skin/indicator-toggle'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { RevealStyles, useRevealOnView } from '@/components/landing-skin/reveal'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { SmearFilters, countUpWithin, stopCounting } from '@/features/landing/components/count-up'
import { CornerTicks, CruxMarks, TwoLayerLattice } from '@/features/landing/components/hero-chrome'
import { CopyCui } from '@/features/private-companies/components/profile/company-profile-head'
import { nameLength } from '@/features/private-companies/lib/company-profile-text'
import { HomeBand, HomeSectionNav } from '@/features/procurement/components/home/home-chrome'
import { BandColumns, BandNote, CaveatsMarker, RankedRows } from '@/features/public-enterprises/components/hub/hub-parts'
import { displayName } from '@/features/public-enterprises/lib/hub-format'
import { HubSectionHead } from '@/features/statistics/components/hub/hub-chrome'
import { HubFiguresBand, type HubFact } from '@/features/statistics/components/hub/hub-figures'
import { cn } from '@/lib/utils'
import { PORTFOLIO, type PortfolioAuthority } from './portfolio.data'
import {
  activities,
  amepipYearSpan,
  counties,
  disagreements,
  figureOf,
  filterRows,
  isContradicted,
  listState,
  missingFigure,
  portfolioFigures,
  portfolioRows,
  rankBy,
  registryState,
  sortRows,
  sourceTallies,
  statusGroups,
  type Disagreement,
  type PortfolioRow,
  type SizeMeasure,
  type TableFilter,
  type TableSort,
} from './portfolio.model'
import {
  BudgetLink,
  CountRows,
  DisagreementList,
  PortfolioTable,
  SamplePicker,
  SizeRanking,
  StatusGroups,
  StatusPanel,
  WithoutFigure,
  sizeRows,
  usePortfolioCui,
  type PanelSource,
} from './portfolio.parts'
import {
  activityLabel,
  amepipSegmentLabel,
  authorityTitle,
  countyLabel,
  disagreementLede,
  fiscalSegmentLabel,
  headSentence,
  heldNote,
  kickerText,
  listStateLabel,
  nameSourceNote,
  portfolioCaveats,
  portfolioSourceLine,
  registryStateLabel,
} from './portfolio.text'

/**
 * `/public-enterprises/authorities/$cui` (proposed): one authority's public
 * enterprises, on the snapshot the hub's generator reads (`?cui=`, fourteen
 * samples picked above the page). The enterprise page's rhythm: a compact
 * head with the authority's name and a sentence saying what each source
 * gives it, the pinned bar, four counts, then one band per question. Three
 * variants, one per form of the list: a table, groups by ANAF's list's word,
 * a ranking by size. No money is summed across enterprises.
 */

/** Literal marker. `yarn build:validate` fails if this reaches `.output/`. */
const PROTOTYPE_MARKER = 'TRANSPARENTA_PROTOTYPE_MUST_NOT_SHIP'

type Variant = 'tabel' | 'stare' | 'marime'
type BandKey = 'intreprinderi' | 'surse' | 'domenii'

const BAND_LABEL: Readonly<Record<BandKey, () => string>> = {
  intreprinderi: () => t`Întreprinderile`,
  surse: () => t`Surse`,
  domenii: () => t`Ce fac`,
}

/** Activities and seats say something from five enterprises on. */
const MIN_FOR_PLACES = 5

const HEADING: Readonly<Record<ReturnType<typeof nameLength>, string>> = {
  short: 'text-4xl sm:text-6xl lg:text-7xl',
  medium: 'text-3xl sm:text-5xl lg:text-6xl',
  long: 'text-2xl sm:text-4xl lg:text-5xl',
}

type PageData = {
  readonly authority: PortfolioAuthority
  readonly rows: readonly PortfolioRow[]
  readonly parts: readonly Disagreement[]
  /** The enterprises in ANAF's list under it for which the announcements name only another authority. */
  readonly elsewhere: ReadonlySet<string>
  readonly year: number
  readonly locale: string
}

export function PortfolioTableVariant() {
  return <PortfolioPage variant="tabel" />
}

export function PortfolioStatusVariant() {
  return <PortfolioPage variant="stare" />
}

export function PortfolioSizeVariant() {
  return <PortfolioPage variant="marime" />
}

function PortfolioPage({ variant }: { readonly variant: Variant }) {
  const { i18n } = useLingui()
  const cui = usePortfolioCui()
  const rootRef = useRef<HTMLDivElement>(null)
  useRevealOnView(rootRef, (block, delay) => countUpWithin(block, delay))
  useEffect(() => () => stopCounting(), [])
  const authority = PORTFOLIO.authorities.find((candidate) => candidate.cui === cui)
  let body: ReactNode
  if (!authority) {
    body = (
      <RuledFrame className="py-16">
        <p className="max-w-[56ch] text-base text-muted-foreground">{t`CUI-ul ${cui} nu e în eșantionul prototipului. Alege o autoritate de mai sus.`}</p>
      </RuledFrame>
    )
  } else {
    const rows = portfolioRows(authority, PORTFOLIO.enterprises)
    const parts = disagreements(authority.cui, rows)
    const data: PageData = {
      authority,
      rows,
      parts,
      elsewhere: new Set(parts.filter((part) => part.kind === 'announcements-elsewhere').map((part) => part.row.enterprise.cui)),
      year: PORTFOLIO.financialYear,
      locale: i18n.locale,
    }
    body = <Loaded key={authority.cui} variant={variant} data={data} />
  }
  return (
    <div ref={rootRef} className="relative w-full overflow-x-clip bg-background" data-prototype-marker={PROTOTYPE_MARKER}>
      <RevealStyles />
      <SmearFilters />
      <SamplePicker />
      {body}
    </div>
  )
}

function Loaded({ variant, data }: { readonly variant: Variant; readonly data: PageData }) {
  const bands: BandKey[] = ['intreprinderi']
  if (data.parts.length > 0) bands.push('surse')
  if (data.rows.length >= MIN_FOR_PLACES) bands.push('domenii')
  const index = (band: BandKey) => `${String(bands.indexOf(band) + 1).padStart(2, '0')} / ${BAND_LABEL[band]()}`
  const name = authorityTitle(data.authority)
  return (
    <>
      <Head data={data} name={name} beside={variant === 'stare' ? <LargestPanel data={data} /> : <SourcesPanel data={data} />} />
      <HomeSectionNav title={name} sections={bands.map((band) => ({ id: band, label: BAND_LABEL[band]() }))} />
      <Figures data={data} />
      {variant === 'tabel' ? <TableBand data={data} index={index('intreprinderi')} /> : null}
      {variant === 'stare' ? <StatusBand data={data} index={index('intreprinderi')} /> : null}
      {variant === 'marime' ? <SizeBand data={data} index={index('intreprinderi')} /> : null}
      {bands.includes('surse') ? <SourcesBand data={data} index={index('surse')} /> : null}
      {bands.includes('domenii') ? <PlacesBand data={data} index={index('domenii')} /> : null}
    </>
  )
}

// ───────────────────────────────────────────────────────────── head ──

function Kicker({ authority }: { readonly authority: PortfolioAuthority }) {
  const place = kickerText(authority)
  return (
    <MonoLabel className="flex flex-wrap items-center gap-2 text-muted-foreground **:[text-box:trim-both_cap_alphabetic]">
      <Link to="/public-enterprises" preload="intent" className="group inline-flex min-h-11 items-center gap-1.5 hover:text-foreground sm:min-h-0">
        <ArrowLeft className="size-3 transition-transform group-hover:-translate-x-0.5 motion-reduce:transition-none" aria-hidden="true" />
        <span>{t`Întreprinderi publice`}</span>
      </Link>
      {place ? (
        <>
          <span aria-hidden="true">/</span>
          <span>{place}</span>
        </>
      ) : null}
    </MonoLabel>
  )
}

function Head({ data, name, beside }: { readonly data: PageData; readonly name: string; readonly beside: ReactNode }) {
  const { authority, rows, locale } = data
  const note = nameSourceNote(authority)
  return (
    <section id="portfolio-head" className="relative scroll-mt-14 border-b" aria-labelledby="portfolio-title">
      <TwoLayerLattice idPrefix="public-enterprise-portfolio" />
      <RuledFrame className="py-10 sm:py-12 lg:py-14">
        <CornerTicks />
        <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-12 lg:gap-8">
          <div className="min-w-0 lg:col-span-7">
            <div className="flex min-h-11 items-center justify-between gap-4 sm:min-h-0">
              <Kicker authority={authority} />
              <CaveatsMarker notes={portfolioCaveats(PORTFOLIO, locale)} />
            </div>
            <h1 id="portfolio-title" className={cn('mt-4 font-extrabold leading-[0.95] tracking-tighter text-foreground [overflow-wrap:anywhere]', HEADING[nameLength(name)])}>
              {name}
            </h1>
            {note ? <MonoLabel className="mt-2 block normal-case tracking-normal text-muted-foreground">{note}</MonoLabel> : null}
            <p className="mt-4 max-w-[60ch] text-base leading-relaxed text-muted-foreground sm:text-lg">{headSentence(authority, rows, locale)}</p>
            <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2">
              <CopyCui cui={authority.cui} />
              {authority.hasBudget ? <BudgetLink cui={authority.cui} /> : <span className="text-sm text-muted-foreground">{t`Fără fișă în buget`}</span>}
            </div>
            <MonoLabel className="mt-6 block max-w-[70ch] normal-case leading-relaxed tracking-normal text-muted-foreground/80">{portfolioSourceLine(PORTFOLIO, locale)}</MonoLabel>
          </div>
          <div className="min-w-0 lg:col-span-5">{beside}</div>
        </div>
        <span className="absolute inset-x-0 top-full z-30 mt-px">
          <CruxMarks />
        </span>
      </RuledFrame>
    </section>
  )
}

/** Each source's word on the page's enterprises, apart (the table and ranking variants). */
function SourcesPanel({ data }: { readonly data: PageData }) {
  const tallies = sourceTallies(data.rows)
  const span = amepipYearSpan(data.rows)
  let amepipTitle = t`AMEPIP`
  if (span) {
    const { from, to } = span
    amepipTitle = from === to ? t`AMEPIP, ${to}` : t`AMEPIP, ultimul an al fiecăreia (${from}–${to})`
  }
  const sources: PanelSource[] = [
    { key: 'list', title: t`Lista ANAF a întreprinderilor publice`, segments: tallies.list, label: (key) => listStateLabel(key as ReturnType<typeof listState>) },
    { key: 'amepip', title: amepipTitle, segments: tallies.amepip, label: amepipSegmentLabel },
    { key: 'registry', title: t`Registrul comerțului`, segments: tallies.registry, label: (key) => registryStateLabel(key as Parameters<typeof registryStateLabel>[0], registryLabelOf(data.rows, key)) },
    { key: 'fiscal', title: t`ANAF, contribuabili inactivi`, segments: tallies.fiscal, label: fiscalSegmentLabel },
  ]
  return <StatusPanel title={t`Ce spune fiecare sursă`} sources={sources} locale={data.locale} />
}

/** The registry's own labels for a state (a state groups several codes); several are said together. */
function registryLabelOf(rows: readonly PortfolioRow[], state: string): string | null {
  const labels = [...new Set(rows.flatMap((row) => (row.enterprise.registry?.label && registryState(row.enterprise) === state ? [row.enterprise.registry.label] : [])))]
  return labels.length > 0 ? labels.join(', ') : null
}

/** The five largest by the year's turnover (the status variant: its band groups by status). */
function LargestPanel({ data }: { readonly data: PageData }) {
  const { ranked } = rankBy(data.rows, 'cifra')
  const year = data.year
  return (
    <section className="border bg-card/80 p-5 backdrop-blur-[2px] sm:p-6" aria-labelledby="portfolio-largest-title">
      <MonoLabel id="portfolio-largest-title" className="block text-muted-foreground">
        {t`Cele mai mari, după cifra de afaceri din ${year}`}
      </MonoLabel>
      {ranked.length > 0 ? (
        <RankedRows className="mt-3" rows={sizeRows(ranked.slice(0, 5), 'cifra', data.locale)} numbered dense />
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">{t`Niciuna nu are o cifră de afaceri admisă pentru ${year}.`}</p>
      )}
    </section>
  )
}

// ────────────────────────────────────────────────────────── figures ──

function Figures({ data }: { readonly data: PageData }) {
  const figures = portfolioFigures(data.rows)
  const year = data.year
  const total = data.rows.length
  const span = `${PORTFOLIO.seapSpan.from.slice(0, 4)}–${PORTFOLIO.seapSpan.to.slice(0, 4)}`
  const floor = figures.seapUnknown > 0
  const toList = (label: ReactNode, className: string) => (
    <a href="#intreprinderi" className={className}>
      {label}
    </a>
  )
  const netReported = figures.netReported
  const facts: HubFact[] = [
    { key: 'filed', value: figures.filed, digits: 0, label: t`Cu bilanț pe ${year}`, note: t`din ${total}`, link: toList },
    { key: 'loss', value: figures.loss, digits: 0, label: t`Pe pierdere în ${year}`, note: t`din ${netReported} cu rezultat raportat`, link: toList },
    { key: 'buyers', value: figures.buyers, digits: 0, label: t`Cumpără prin SEAP`, note: floor ? t`${span}, cel puțin` : span, link: toList },
    { key: 'sellers', value: figures.sellers, digits: 0, label: t`Vând prin SEAP`, note: floor ? t`${span}, cel puțin` : span, link: toList },
  ]
  return (
    <section className="border-b bg-muted/20" aria-label={t`Cifre-cheie`}>
      <RuledFrame>
        <CruxMarks />
        <HubFiguresBand facts={facts} locale={data.locale === 'en' ? 'en' : 'ro'} />
      </RuledFrame>
    </section>
  )
}

// ──────────────────────────────────────────────────────────── bands ──

/** The table variant: every enterprise in one table, filtered by the list's word, sorted by any figure. */
function TableBand({ data, index }: { readonly data: PageData; readonly index: string }) {
  const [filter, setFilter] = useState<TableFilter>('toate')
  const [sort, setSort] = useState<TableSort>('cifra')
  const { rows, year, locale } = data
  const count = (value: TableFilter) => filterRows(rows, value).length
  const all = count('toate')
  const active = count('active')
  const inactive = count('inactive')
  const other = count('altele')
  // Counted labels, each its own message: a bare „Active" would take another page's translation.
  const options = [
    { key: 'toate' as const, label: t`Toate · ${all}`, count: all },
    { key: 'active' as const, label: t`Active · ${active}`, count: active },
    { key: 'inactive' as const, label: t`Inactive · ${inactive}`, count: inactive },
    { key: 'altele' as const, label: t`Altfel · ${other}`, count: other },
  ].filter((option) => option.key === 'toate' || option.count > 0)
  return (
    <HomeBand id="intreprinderi" labelledBy="portfolio-table-title">
      <HubSectionHead
        titleId="portfolio-table-title"
        index={index}
        title={t`Toate întreprinderile`}
        lede={t`Cuvântul listei ANAF, apoi cifrele admise din bilanțurile pe ${year}. Ce spun celelalte surse, când nu e „în funcțiune”, stă sub nume.`}
      />
      <div className="mt-8" data-reveal>
        {options.length > 2 ? <IndicatorToggle label={t`După lista ANAF`} options={options} value={filter} onChange={setFilter} className="mb-4" /> : null}
        <PortfolioTable rows={filterRows(rows, filter)} sort={sort} onSort={setSort} year={year} elsewhere={data.elsewhere} caption={t`Întreprinderile autorității, cu cifrele din ${year}`} locale={locale} />
        <HeldNote rows={rows} measures={['cifra', 'salariati', 'pierdere']} year={year} />
      </div>
    </HomeBand>
  )
}

/** The status variant: groups by the list's word; in the active group, those another source contradicts come first. */
function StatusBand({ data, index }: { readonly data: PageData; readonly index: string }) {
  const groups = statusGroups(data.rows).map((group) =>
    group.state === 'active' ? { ...group, rows: [...group.rows.filter((row) => isContradicted(row.enterprise)), ...group.rows.filter((row) => !isContradicted(row.enterprise))] } : group,
  )
  const contradicted = data.rows.filter((row) => isContradicted(row.enterprise)).length
  const year = data.year
  const lede =
    contradicted > 0
      ? t`Grupate după cuvântul listei ANAF. ${contradicted} dintre cele active au altă stare într-o altă sursă și sunt primele în grupul lor. În dreapta, cifra de afaceri din ${year}, sau de când nu mai e bilanț.`
      : t`Grupate după cuvântul listei ANAF. În dreapta, cifra de afaceri din ${year}, sau de când nu mai e bilanț.`
  return (
    <HomeBand id="intreprinderi" labelledBy="portfolio-status-title">
      <BandColumns titleId="portfolio-status-title" index={index} title={t`Care mai funcționează`} lede={lede}>
        <StatusGroups groups={groups} year={data.year} elsewhere={data.elsewhere} locale={data.locale} />
      </BandColumns>
    </HomeBand>
  )
}

/** The size variant: a ranking by the year's turnover, headcount or loss; the rest named, with why. */
function SizeBand({ data, index }: { readonly data: PageData; readonly index: string }) {
  const [measure, setMeasure] = useState<SizeMeasure>('cifra')
  const { ranked, without } = rankBy(data.rows, measure)
  const year = data.year
  // Off the ranking: a zero (or, for the loss, a profit) is a value and is counted; only a missing one is listed, with why.
  const missing = sortRows(
    without.filter((row) => figureOf(row.enterprise, measure) === null),
    'nume',
  )
  const valued = without.length - missing.length
  const withoutTitle = { cifra: t`Fără cifră de afaceri admisă pe ${year}`, salariati: t`Fără număr de salariați admis pe ${year}`, pierdere: t`Fără rezultat net admis pe ${year}` }[measure]
  return (
    <HomeBand id="intreprinderi" labelledBy="portfolio-size-title">
      <BandColumns
        titleId="portfolio-size-title"
        index={index}
        title={t`Cât de mari sunt`}
        lede={t`După cifrele admise din bilanțurile pe ${year}, ca pe pagina firmei. Nu sunt adunate.`}
      >
        <IndicatorToggle
          label={t`Măsura`}
          className="mb-4"
          options={[
            { key: 'cifra', label: t`Cifra de afaceri` },
            { key: 'salariati', label: t`Salariați` },
            { key: 'pierdere', label: t`Pierdere` },
          ]}
          value={measure}
          onChange={setMeasure}
        />
        {ranked.length > 0 ? <SizeRanking key={measure} ranked={ranked} measure={measure} locale={data.locale} /> : <p className="text-sm text-muted-foreground">{t`Niciuna, pe ${year}.`}</p>}
        {valued > 0 ? <p className="mt-3 text-xs text-muted-foreground">{measure === 'pierdere' ? t`Încă ${valued} au raportat profit sau zero.` : t`Încă ${valued} au raportat zero.`}</p> : null}
        <WithoutFigure key={`without-${measure}`} title={withoutTitle} rows={missing} year={year} measure={measure} locale={data.locale} />
        <HeldNote rows={missing} measures={[measure]} year={year} />
      </BandColumns>
    </HomeBand>
  )
}

/** Under a list that shows a held value: why it is held, once. */
function HeldNote({ rows, measures, year }: { readonly rows: readonly PortfolioRow[]; readonly measures: readonly SizeMeasure[]; readonly year: number }) {
  const reasons = new Set(
    rows.flatMap((row) =>
      measures.flatMap((measure) => {
        const missing = figureOf(row.enterprise, measure) === null ? missingFigure(row.enterprise, measure, year) : null
        return missing?.kind === 'held' ? [missing.reason] : []
      }),
    ),
  )
  return reasons.size > 0 ? <BandNote>{heldNote(reasons)}</BandNote> : null
}

function SourcesBand({ data, index }: { readonly data: PageData; readonly index: string }) {
  return (
    <HomeBand id="surse" labelledBy="portfolio-sources-title">
      <BandColumns titleId="portfolio-sources-title" index={index} title={t`Unde sursele nu se potrivesc`} lede={disagreementLede(data.parts, data.locale)}>
        <DisagreementList parts={data.parts} />
      </BandColumns>
    </HomeBand>
  )
}

function PlacesBand({ data, index }: { readonly data: PageData; readonly index: string }) {
  const byActivity = activities(data.rows)
  const byCounty = counties(data.rows)
  const oneCounty = byCounty.length === 1 && byCounty[0]!.key !== null
  const lede = oneCounty
    ? t`După activitatea principală din fișa ANAF. Toate au sediul în ${displayName(byCounty[0]!.key)}.`
    : t`După activitatea principală din fișa ANAF și județul sediului, din registrul comerțului.`
  return (
    <HomeBand id="domenii" labelledBy="portfolio-places-title">
      <BandColumns titleId="portfolio-places-title" index={index} title={t`Ce fac și unde sunt`} lede={lede}>
        <MonoLabel className="block pb-2 text-muted-foreground">{t`Activitatea principală`}</MonoLabel>
        <CountRows counts={byActivity} label={activityLabel} locale={data.locale} />
        {oneCounty ? null : (
          <>
            <MonoLabel className="mt-8 block pb-2 text-muted-foreground">{t`Județul sediului`}</MonoLabel>
            <CountRows counts={byCounty} label={countyLabel} locale={data.locale} />
          </>
        )}
      </BandColumns>
    </HomeBand>
  )
}
