import { useEffect, useRef, useState, type ReactNode } from 'react'
import { t } from '@lingui/core/macro'
import { useLingui } from '@lingui/react/macro'
import { Landmark } from 'lucide-react'

import { IndicatorToggle } from '@/components/landing-skin/indicator-toggle'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { RevealStyles, useRevealOnView } from '@/components/landing-skin/reveal'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { SmearFilters, countUpWithin, stopCounting } from '@/features/landing/components/count-up'
import { CornerTicks, CruxMarks, TwoLayerLattice } from '@/features/landing/components/hero-chrome'
import { LandingSearch } from '@/features/landing/components/search/landing-search'
import {
  useAnafStateBudget,
  useApprovedSeries,
  useAuthorities,
  useApprovedTotals,
  useBudgetCatalog,
  useExecutionRelease,
} from '@/features/national-budget/page/hooks/use-national-budget-page'
import { approvedAmountToLei } from '@/features/national-budget/page/model/amounts'
import { Bone, HomeBand, HomeSectionNav, RULED_NOTE_CLASS, SHOW_MORE_CLASS, ShowMorePending, TextPending } from '@/features/procurement/components/home/home-chrome'
import { PendingRows } from '@/features/procurement/components/home/home-rows'
import { HUB_BESIDE_TITLE_CLASS, HUB_SHORTCUT_LINK_CLASS, HubSectionHead } from '@/features/statistics/components/hub/hub-chrome'
import { HubFiguresBand, type HubFact } from '@/features/statistics/components/hub/hub-figures'
import { useIsMobile } from '@/hooks/use-mobile'
import { cn } from '@/lib/utils'
import type { BudgetCatalog } from '@/schemas/national-budget-page'
import {
  allRowsText,
  authorityName,
  coverageText,
  fundName,
  inSentence,
  lineLabel,
  missingText,
  moneyText,
  percentText,
  scopeOf,
  throughText,
  untilText,
  type BudgetScope,
} from './budget.format'
import { anafRanking, cellLei, headlineOf, lineRows, type LineRow } from './budget.model'
import { DraftMark, RankedRows, SampleMark, analyzeHref, entityHref, type RankedRow } from './budget.parts'
import { BandRead, BudgetShell } from './budget.shell'
import { useHubState, type HubState } from './budget.state'
import { YearsChart, type YearPoint } from './budget.years'

/**
 * The national budget's front door, in the procurement, INS and NGO hubs'
 * language: the lattice head with the question as the headline, a search and
 * the shortcuts, the ministries that spend the most beside it; the pinned bar
 * of numbered bands; four figures; one band per question — what the money is
 * spent on, where it comes from, what the law approves, the years — and the
 * ways into the analysis page. Every band reads, waits and fails on its own.
 */

type Section = { readonly id: string; readonly label: string }

function indexOf(sections: readonly Section[], id: string): string {
  const position = sections.findIndex((section) => section.id === id)
  return `${String(position + 1).padStart(2, '0')} / ${sections[position]?.label ?? ''}`
}

function startArrivalEffects(block: Element, delay: number) {
  countUpWithin(block, delay)
}

export function BudgetHubVariant() {
  const { state, set } = useHubState()
  return (
    <BudgetShell demo={state.demo}>
      {state.demo === 'loading' ? <HubPending /> : <Hub state={state} set={set} />}
    </BudgetShell>
  )
}

/** The year the hub describes: the newest year whose December bulletin the data holds. */
function hubYear(catalog: BudgetCatalog): number | null {
  const decembers = catalog.releases.filter((release) => release.status === 'selected' && release.inSample && release.periodEnd.endsWith('-12-31'))
  const last = decembers[decembers.length - 1]
  return last ? Number(last.periodEnd.slice(0, 4)) : null
}

function Hub({ state, set }: { readonly state: HubState; readonly set: (patch: Partial<HubState>) => void }) {
  const rootRef = useRef<HTMLDivElement>(null)
  useRevealOnView(rootRef, startArrivalEffects, true)
  useEffect(() => () => stopCounting(), [])
  const sections: readonly Section[] = [
    { id: 'pe-ce', label: t`Pe ce` },
    { id: 'de-unde', label: t`De unde` },
    { id: 'legea', label: t`Legea` },
    { id: 'in-timp', label: t`În timp` },
  ]
  return (
    <div ref={rootRef} className="relative w-full overflow-x-clip bg-background">
      <RevealStyles />
      <SmearFilters />
      <HubHero state={state} set={set} />
      <HomeSectionNav title={t`Bugetul statului`} sections={sections} />
      <BandRead framed fallback={<FiguresPending />}>
        <HubBody state={state} set={set} sections={sections} />
      </BandRead>
    </div>
  )
}

// ──────────────────────────────────────────────────────────── the hero ──

function BudgetSearch() {
  const isMobile = useIsMobile()
  return (
    <LandingSearch
      docTypes={['organization']}
      fixedScope={{ label: t`Bugete`, Icon: Landmark }}
      placeholder={t`Minister, instituție sau CUI…`}
      autoFocus={!isMobile}
      scrollToTopOnFocus={isMobile}
    />
  )
}

function HubHero({ state, set }: { readonly state: HubState; readonly set: (patch: Partial<HubState>) => void }) {
  return (
    <section className="relative border-b">
      <TwoLayerLattice idPrefix="budget-hub" />
      <RuledFrame marker="hero" className="py-12 sm:py-16 lg:py-20">
        <CornerTicks />
        <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-12 lg:gap-8">
          <div className="min-w-0 lg:col-span-7">
            <div className="flex items-center justify-between gap-4">
              <MonoLabel className="text-muted-foreground">{t`Buget / Național`}</MonoLabel>
              <SampleMark />
            </div>
            <h1 className="mt-5 text-[clamp(2.2rem,8vw+0.6rem,2.75rem)] font-extrabold leading-[0.92] tracking-tighter text-foreground sm:text-6xl lg:text-7xl">
              {t`Ce încasează statul`}
              <br />
              {t`și pe ce cheltuie`}
            </h1>
            <p className="mt-5 max-w-[46ch] text-lg leading-relaxed text-muted-foreground sm:text-xl">
              {t`Cât încasează și cât plătesc bugetele publice, ce aprobă legea și cât cheltuie fiecare minister.`}
            </p>
            <div className="mt-6 sm:mt-7">
              <BudgetSearch />
            </div>
            <nav aria-label={t`Scurtături`} className="mt-4">
              <MonoLabel className="block text-muted-foreground/70 sm:inline sm:align-middle">{t`Sau mergi direct la`}</MonoLabel>
              <span className="flex flex-wrap gap-x-4 sm:ml-4 sm:inline-flex sm:gap-y-1.5 sm:align-middle">
                <a href={analyzeHref({})} className={HUB_SHORTCUT_LINK_CLASS}>
                  {t`Toate analizele`}
                </a>
                <a href={analyzeHref({ tip: 'ministere' })} className={HUB_SHORTCUT_LINK_CLASS}>
                  {t`Plățile ministerelor`}
                </a>
                <a href="/budget-explorer" className={HUB_SHORTCUT_LINK_CLASS}>
                  {t`Exploratorul bugetelor`}
                </a>
              </span>
            </nav>
          </div>
          <div className="min-w-0 lg:col-span-5">
            <section className="border bg-card/80 p-5 backdrop-blur-[2px] sm:p-6" aria-labelledby="budget-hub-authorities-title">
              <BandRead fallback={<HeroPending />}>
                <HeroAuthorities state={state} set={set} />
              </BandRead>
            </section>
          </div>
          <BandRead
            fallback={
              <p className="text-sm">
                <Bone className="w-80" />
              </p>
            }
            quiet={<p className="min-w-0 text-sm text-muted-foreground lg:absolute lg:inset-x-8 lg:bottom-6">{t`Surse: Ministerul Finanțelor · ANAF · legile bugetului`}</p>}
          >
            <HubSourceLine className="min-w-0 lg:absolute lg:inset-x-8 lg:bottom-6" />
          </BandRead>
        </div>
        <span className="absolute inset-x-0 top-full z-30 mt-px">
          <CruxMarks />
        </span>
      </RuledFrame>
    </section>
  )
}

const HERO_ROWS = 5
const HERO_ROWS_OPEN = 10

function HeroPending() {
  return (
    <>
      <MonoLabel className="block text-primary">
        <Bone className="w-56" />
      </MonoLabel>
      <PendingRows className="mt-4" shape="party" rows={HERO_ROWS} dense />
      <ShowMorePending className="w-32" />
    </>
  )
}

/** The ministries that spend the most: what ANAF says they paid, or what the March 2026 draft proposes; never the two in one list. */
function HeroAuthorities({ state, set }: { readonly state: HubState; readonly set: (patch: Partial<HubState>) => void }) {
  const [open, setOpen] = useState(false)
  const { data: anaf } = useAnafStateBudget()
  const { data: draft } = useAuthorities({ edition: '2026-draft', targetYear: 2026, creditType: 'budget_credits' })
  const proposed = state.ordonatori === 'propus'
  const year = anaf.status === 'ok' ? anaf.lastCompleteYear : null
  const ranking = anaf.status === 'ok' && year !== null ? anafRanking(anaf, year) : null
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <MonoLabel id="budget-hub-authorities-title" className="text-primary">
          {proposed ? t`Cine primește cel mai mult, 2026` : year ? t`Cine cheltuie cel mai mult, ${year}` : t`Cine cheltuie cel mai mult`}
        </MonoLabel>
        <IndicatorToggle
          label={t`Clasamentul după`}
          options={[
            { key: 'platit', label: t`Plătit` },
            { key: 'propus', label: t`Propus` },
          ]}
          value={state.ordonatori}
          onChange={(ordonatori) => set({ ordonatori })}
        />
      </div>
      {proposed ? (
        <DraftAuthorities open={open} />
      ) : anaf.status !== 'ok' ? (
        <p className="mt-4 text-sm text-muted-foreground">{missingText(anaf.reason)}</p>
      ) : !ranking || ranking.rows.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">{t`Nicio plată raportată pentru acest an.`}</p>
      ) : (
        <>
          <RankedRows
            numbered
            dense
            className="mt-4"
            rows={ranking.rows.slice(0, open ? HERO_ROWS_OPEN : HERO_ROWS).map<RankedRow>((row) => ({
              key: row.cui,
              label: authorityName(row.name),
              title: row.name,
              caption: percentText(row.share),
              value: moneyText(row.lei),
              fraction: row.lei / ranking.rows[0]!.lei,
              href: entityHref(row.cui),
            }))}
          />
          <ShowMore open={open} onToggle={() => setOpen(!open)} />
          <p className="mt-3 text-xs text-muted-foreground">{t`Plățile ordonatorilor principali din bugetul de stat, raportate la ANAF; cota, din plățile întregului buget de stat.`}</p>
        </>
      )}
      {proposed && draft.status === 'ok' ? <ShowMore open={open} onToggle={() => setOpen(!open)} /> : null}
      {proposed ? (
        <p className="mt-3 text-xs text-muted-foreground">
          {t`Creditele bugetare propuse pe ordonatori, în proiectul legii pe 2026.`} <DraftMark />
        </p>
      ) : null}
    </>
  )
}

/** The March 2026 draft's authorities, by the credits it proposes; its own list, never joined to ANAF's. */
function DraftAuthorities({ open }: { readonly open: boolean }) {
  const { data } = useAuthorities({ edition: '2026-draft', targetYear: 2026, creditType: 'budget_credits' })
  if (data.status !== 'ok') return <p className="mt-4 text-sm text-muted-foreground">{missingText(data.reason)}</p>
  const limit = open ? HERO_ROWS_OPEN : HERO_ROWS
  const top = Number(data.rows[0]?.amountThousandLei ?? 1)
  const total = data.totalThousandLei ? Number(data.totalThousandLei) : null
  return (
    <RankedRows
      numbered
      dense
      draft
      className="mt-4"
      rows={data.rows.slice(0, limit).map<RankedRow>((row) => ({
        key: row.key,
        label: row.name,
        caption: total ? percentText(Number(row.amountThousandLei) / total) : undefined,
        value: moneyText(approvedAmountToLei(row.amountThousandLei ?? '0')),
        fraction: Number(row.amountThousandLei) / top,
      }))}
    />
  )
}

function ShowMore({ open, onToggle }: { readonly open: boolean; readonly onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle} className={SHOW_MORE_CLASS} aria-expanded={open}>
      {open ? t`Arată mai puține` : t`Arată mai multe`}
    </button>
  )
}

/** The page's sources, once: the bulletin and the date it runs to, ANAF and its date, the laws. */
function HubSourceLine({ className }: { readonly className?: string }) {
  const { data: catalog } = useBudgetCatalog()
  const { data: anaf } = useAnafStateBudget()
  const bulletin = catalog.status === 'ok' ? catalog.releases.filter((release) => release.status === 'selected').slice(-1)[0]?.periodEnd.slice(0, 7) : null
  const link = 'font-medium text-foreground underline-offset-4 hover:underline'
  return (
    <p className={cn('text-sm text-muted-foreground', className)}>
      {t`Surse:`}{' '}
      <a href="https://mfinante.gov.ro/ro/web/trezor/rapoarte-anuale" target="_blank" rel="noreferrer" className={link}>
        {t`Ministerul Finanțelor`}
        <span aria-hidden="true"> ↗</span>
      </a>
      {bulletin ? `, ${throughText(bulletin)}` : ''}
      {' · '}
      <a href="https://www.anaf.ro" target="_blank" rel="noreferrer" className={link}>
        ANAF
        <span aria-hidden="true"> ↗</span>
      </a>
      {anaf.status === 'ok' ? `, ${throughText(anaf.lastMonth)}` : ''}
      {' · '}
      <a href="https://data.gov.ro/dataset?q=bugetuldestat" target="_blank" rel="noreferrer" className={link}>
        {t`legile bugetului`}
        <span aria-hidden="true"> ↗</span>
      </a>
    </p>
  )
}

// ─────────────────────────────────────────────────────────── the body ──

function FiguresPending() {
  return (
    <section className="border-b bg-muted/20" aria-busy="true">
      <RuledFrame>
        <div className="grid grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className={cn('flex flex-col px-5 py-6 sm:py-7', index % 2 === 1 && 'border-l', index >= 2 && 'border-t lg:border-t-0', index >= 1 && 'lg:border-l')}>
              <span className="block text-2xl sm:text-4xl">
                <Bone className="w-24 sm:w-32" />
              </span>
              <MonoLabel className="mt-2.5 block">
                <Bone className="w-36" />
              </MonoLabel>
            </div>
          ))}
        </div>
      </RuledFrame>
    </section>
  )
}

function HubBody({ state, set, sections }: { readonly state: HubState; readonly set: (patch: Partial<HubState>) => void; readonly sections: readonly Section[] }) {
  const { data: catalog } = useBudgetCatalog()
  if (catalog.status !== 'ok') {
    return (
      <RuledFrame className="py-16">
        <p className="text-base text-muted-foreground">{missingText(catalog.reason)}</p>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">{t`Legile bugetului 2019–2025 și buletinele lunare ale MF sunt în baza de date, verificate; serverul nu le expune încă.`}</p>
      </RuledFrame>
    )
  }
  const year = hubYear(catalog)
  if (year === null) return null
  const month = `${year}-12`
  return (
    <>
      <BandRead framed fallback={<FiguresPending />}>
        <HubFigures year={year} month={month} />
      </BandRead>
      <LinesBand
        id="pe-ce"
        index={indexOf(sections, 'pe-ce')}
        title={
          <>
            {t`Pe ce cheltuie`}
            <br />
            {t`statul`}
          </>
        }
        section="expenditure"
        month={month}
        scope={state.cheltuieli}
        onScope={(cheltuieli) => set({ cheltuieli })}
      />
      <LinesBand
        id="de-unde"
        index={indexOf(sections, 'de-unde')}
        title={
          <>
            {t`De unde vin`}
            <br />
            {t`banii publici`}
          </>
        }
        section="revenue"
        month={month}
        scope={state.venituri}
        onScope={(venituri) => set({ venituri })}
      />
      <LawBand index={indexOf(sections, 'legea')} year={year} month={month} line={state.lege} onLine={(lege) => set({ lege })} />
      <YearsBand index={indexOf(sections, 'in-timp')} year={year} measure={state.ani} onMeasure={(ani) => set({ ani })} />
      <StartBand year={year} />
    </>
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

const billions = (lei: number) => Math.round(lei / 100_000_000) / 10

/** Four figures: the year's spending, revenue and balance of all public budgets (the bulletin), and what the state budget law approved. */
function HubFigures({ year, month }: { readonly year: number; readonly month: string }) {
  const { i18n } = useLingui()
  const { data: release } = useExecutionRelease(month)
  const { data: totals } = useApprovedTotals({ edition: String(year), targetYear: year, creditType: 'budget_credits' })
  const facts: HubFact[] = []
  if (release.status === 'ok') {
    const spent = headlineOf(release, 'consolidat', 'expenditure')
    const collected = headlineOf(release, 'consolidat', 'revenue')
    const balance = headlineOf(release, 'consolidat', 'balance')
    const gdp = (percent: number | null) => (percent === null ? '' : t`${percentText(Math.abs(percent) / 100, 2)} din PIB`)
    if (spent) facts.push({ key: 'spent', value: billions(spent.lei), digits: 1, unit: t`mld. lei`, label: t`Cheltuieli publice, ${year}`, note: gdp(spent.gdpPercent), link: toBand('pe-ce') })
    if (collected) facts.push({ key: 'collected', value: billions(collected.lei), digits: 1, unit: t`mld. lei`, label: t`Venituri publice, ${year}`, note: gdp(collected.gdpPercent), link: toBand('de-unde') })
    if (balance) {
      facts.push({
        key: 'balance',
        value: billions(Math.abs(balance.lei)),
        digits: 1,
        unit: t`mld. lei`,
        label: balance.lei < 0 ? t`Deficit, ${year}` : t`Excedent, ${year}`,
        note: gdp(balance.gdpPercent),
        link: (label, className) => (
          <a href={analyzeHref({ tip: 'cheltuieli', an: year })} className={className}>
            {label}
          </a>
        ),
      })
    }
  }
  const state = totals.status === 'ok' ? totals.funds.find((fund) => fund.fund === 'state_budget') : undefined
  const approved = cellLei(state?.credits)
  if (approved !== null) facts.push({ key: 'approved', value: billions(approved), digits: 1, unit: t`mld. lei`, label: t`Bugetul de stat aprobat, ${year}`, note: t`Credite bugetare, legea inițială`, link: toBand('legea') })
  return (
    <section className="border-b bg-muted/20" aria-label={t`Cifre-cheie`}>
      <RuledFrame>
        {facts.length === 0 ? (
          <p className="py-8 text-sm text-muted-foreground">{release.status === 'unavailable' ? missingText(release.reason) : t`Buletinul nu are cifre pentru ${year}.`}</p>
        ) : (
          <HubFiguresBand facts={facts} locale={i18n.locale === 'en' ? 'en' : 'ro'} />
        )}
      </RuledFrame>
    </section>
  )
}

// ────────────────────────────────────────────────── spending and revenue ──

const LINE_ROWS = 8
const LEDE_PENDING = <TextPending lines={3} narrow={4} />

function lineLede(rows: readonly LineRow[], section: 'expenditure' | 'revenue', scope: BudgetScope, year: number): string | null {
  const [first, second] = rows
  if (!first || first.share === null || first.lei === null) return null
  const of = section === 'expenditure' ? t`din cheltuielile ${scopeOf(scope)}` : t`din veniturile ${scopeOf(scope)}`
  const head = t`${lineLabel(first.lineItem)}: ${percentText(first.share)} ${of} în ${year}, ${moneyText(first.lei)}.`
  if (!second || second.share === null) return head
  return `${head} ${t`Apoi ${inSentence(lineLabel(second.lineItem))}, ${percentText(second.share)}.`}`
}

function LinesBand({
  id,
  index,
  title,
  section,
  month,
  scope,
  onScope,
}: {
  readonly id: string
  readonly index: string
  readonly title: ReactNode
  readonly section: 'expenditure' | 'revenue'
  readonly month: string
  readonly scope: BudgetScope
  readonly onScope: (scope: BudgetScope) => void
}) {
  const titleId = `budget-hub-${id}-title`
  return (
    <HomeBand id={id} labelledBy={titleId}>
      <BandRead fallback={<LinesPending titleId={titleId} index={index} title={title} />}>
        <LinesBody titleId={titleId} index={index} title={title} section={section} month={month} scope={scope} onScope={onScope} />
      </BandRead>
    </HomeBand>
  )
}

function LinesPending({ titleId, index, title }: { readonly titleId: string; readonly index: string; readonly title: ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
      <div className="lg:col-span-5">
        <HubSectionHead titleId={titleId} index={index} title={title} lede={LEDE_PENDING} />
      </div>
      <div className={cn('lg:col-span-6 lg:col-start-7', HUB_BESIDE_TITLE_CLASS)}>
        <PendingRows shape="category" rows={LINE_ROWS} />
      </div>
    </div>
  )
}

function LinesBody({
  titleId,
  index,
  title,
  section,
  month,
  scope,
  onScope,
}: {
  readonly titleId: string
  readonly index: string
  readonly title: ReactNode
  readonly section: 'expenditure' | 'revenue'
  readonly month: string
  readonly scope: BudgetScope
  readonly onScope: (scope: BudgetScope) => void
}) {
  const [open, setOpen] = useState(false)
  const { data: release } = useExecutionRelease(month)
  const year = Number(month.slice(0, 4))
  // Spending at the titles (depth 2), revenue at its sources (every leaf): each cut adds up to its total.
  const rows = release.status === 'ok' ? lineRows(release, { scope, section, depth: section === 'expenditure' ? 2 : 4 }) : []
  const top = Math.max(...rows.map((row) => row.lei ?? 0), 1)
  const shown = open ? rows : rows.slice(0, LINE_ROWS)
  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
      <div className="lg:col-span-5">
        <HubSectionHead titleId={titleId} index={index} title={title} lede={lineLede(rows, section, scope, year)} />
      </div>
      <div className={cn('lg:col-span-6 lg:col-start-7', HUB_BESIDE_TITLE_CLASS)} data-reveal>
        <div className="sm:w-fit">
          <IndicatorToggle
            label={t`Bugetul`}
            options={[
              { key: 'consolidat', label: t`Toate bugetele` },
              { key: 'stat', label: t`Bugetul de stat` },
            ]}
            value={scope}
            onChange={onScope}
          />
        </div>
        {release.status !== 'ok' ? (
          <p className="mt-5 text-sm text-muted-foreground">{release.status === 'gap' ? t`Buletin nepublicat.` : missingText(release.reason)}</p>
        ) : rows.length === 0 ? (
          <p className="mt-5 text-sm text-muted-foreground">{t`Buletinul nu are rânduri pentru acest buget.`}</p>
        ) : (
          <>
            <RankedRows
              key={`${section}-${scope}`}
              className="mt-5"
              rows={shown.map<RankedRow>((row) => ({
                key: row.lineItem,
                label: lineLabel(row.lineItem),
                title: row.lineItem,
                caption: [row.share !== null ? percentText(row.share) : null, row.gdpPercent !== null ? t`${percentText(row.gdpPercent / 100, 2)} din PIB` : null].filter(Boolean).join(' · '),
                value: row.lei === null ? t`gol în sursă` : moneyText(row.lei),
                fraction: row.lei !== null && row.lei >= 0 ? row.lei / top : null,
                href: analyzeHref({ tip: section === 'expenditure' ? 'cheltuieli' : 'venituri', buget: scope === 'consolidat' ? null : scope, an: year }),
              }))}
            />
            {rows.length > LINE_ROWS ? (
              <button type="button" onClick={() => setOpen(!open)} className={SHOW_MORE_CLASS} aria-expanded={open}>
                {open ? t`Arată mai puține` : allRowsText(rows.length)}
              </button>
            ) : null}
          </>
        )}
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          {section === 'expenditure' ? t`Plăți, ${coverageText(month)}, din buletinul MF.` : t`Încasări, ${coverageText(month)}, din buletinul MF.`}{' '}
          {scope === 'consolidat' ? t`Toate bugetele publice, fără transferurile dintre ele.` : t`Bugetul de stat, cu transferurile către alte bugete.`}
        </p>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────── the law ──

function LawBand({
  index,
  year,
  month,
  line,
  onLine,
}: {
  readonly index: string
  readonly year: number
  readonly month: string
  readonly line: HubState['lege']
  readonly onLine: (line: HubState['lege']) => void
}) {
  const titleId = 'budget-hub-law-title'
  const title = (
    <>
      {t`Ce aprobă`}
      <br />
      {t`legea bugetului`}
    </>
  )
  return (
    <HomeBand id="legea" labelledBy={titleId}>
      <BandRead fallback={<LinesPending titleId={titleId} index={index} title={title} />}>
        <LawBody titleId={titleId} index={index} title={title} year={year} month={month} line={line} onLine={onLine} />
      </BandRead>
    </HomeBand>
  )
}

function LawBody({
  titleId,
  index,
  title,
  year,
  month,
  line,
  onLine,
}: {
  readonly titleId: string
  readonly index: string
  readonly title: ReactNode
  readonly year: number
  readonly month: string
  readonly line: HubState['lege']
  readonly onLine: (line: HubState['lege']) => void
}) {
  const { data: totals } = useApprovedTotals({ edition: String(year), targetYear: year, creditType: 'budget_credits' })
  const { data: release } = useExecutionRelease(month)
  const funds = totals.status === 'ok' ? totals.funds : []
  const value = (fund: (typeof funds)[number]) => cellLei(line === 'cheltuieli' ? fund.credits : fund.revenue)
  const top = Math.max(...funds.map((fund) => value(fund) ?? 0), 1)
  const credits = funds.map((fund) => ({ fund: fund.fund, lei: cellLei(fund.credits) }))
  const lede =
    credits.length === 4 && credits.every((item) => item.lei !== null)
      ? t`Legea pe ${year} a aprobat ${moneyText(credits[0]!.lei!)} pentru bugetul de stat, ${moneyText(credits[1]!.lei!)} pentru asigurările sociale, ${moneyText(credits[2]!.lei!)} pentru sănătate și ${moneyText(credits[3]!.lei!)} pentru șomaj.`
      : null
  const paid = release.status === 'ok' ? headlineOf(release, 'stat', 'expenditure') : null
  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
      <div className="lg:col-span-5">
        <HubSectionHead titleId={titleId} index={index} title={title} lede={lede} />
        {paid ? (
          <p className={RULED_NOTE_CLASS} data-reveal>
            {t`Din bugetul de stat s-au plătit ${moneyText(paid.lei)} în ${year} (buletinul MF). Legea de aici e varianta inițială; rectificările de peste an nu sunt în date, deci cele două nu se compară.`}
          </p>
        ) : null}
      </div>
      <div className={cn('lg:col-span-6 lg:col-start-7', HUB_BESIDE_TITLE_CLASS)} data-reveal>
        <div className="sm:w-fit">
          <IndicatorToggle
            label={t`Ce arată`}
            options={[
              { key: 'cheltuieli', label: t`Cheltuieli` },
              { key: 'venituri', label: t`Venituri` },
            ]}
            value={line}
            onChange={onLine}
          />
        </div>
        {totals.status !== 'ok' ? (
          <p className="mt-5 text-sm text-muted-foreground">{missingText(totals.reason)}</p>
        ) : (
          <RankedRows
            className="mt-5"
            rows={funds.map<RankedRow>((fund) => {
              const lei = value(fund)
              const cell = line === 'cheltuieli' ? fund.credits : fund.revenue
              const caption =
                cell.status === 'ok' && cell.origin === 'real_sample'
                  ? cell.line.rowRole === 'credit'
                    ? t`credite bugetare · cap. ${cell.line.codes.capitol}`
                    : t`venituri · cap. ${cell.line.codes.capitol}.${cell.line.codes.subcapitol}`
                  : cell.status === 'unavailable'
                    ? missingText(cell.reason)
                    : ''
              return {
                key: fund.fund,
                label: fundName(fund.fund),
                caption,
                value: lei === null ? '—' : moneyText(lei),
                fraction: lei === null ? null : lei / top,
                href: analyzeHref({ tip: 'lege', an: year, linie: line === 'venituri' ? line : null }),
              }
            })}
          />
        )}
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          {t`Legile bugetului pe ${year}, așa cum au fost trimise la Monitorul Oficial. Patru bugete separate: nu se adună.`}{' '}
          <a href={analyzeHref({ tip: 'lege', dupa: 'legi', an: year })} className="font-medium text-foreground underline-offset-4 hover:underline">
            {t`Ce a prevăzut fiecare lege`}
          </a>
        </p>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────── the years ──

function YearsBand({
  index,
  year,
  measure,
  onMeasure,
}: {
  readonly index: string
  readonly year: number
  readonly measure: HubState['ani']
  readonly onMeasure: (measure: HubState['ani']) => void
}) {
  const titleId = 'budget-hub-years-title'
  return (
    <HomeBand id="in-timp" labelledBy={titleId}>
      <HubSectionHead
        titleId={titleId}
        index={index}
        title={t`Bugetul de stat, an de an`}
        aside={
          <IndicatorToggle
            label={t`Ce arată`}
            options={[
              { key: 'platit', label: t`Plătit` },
              { key: 'aprobat', label: t`Aprobat` },
            ]}
            value={measure}
            onChange={onMeasure}
          />
        }
      />
      <div className="mt-8" data-reveal>
        <BandRead fallback={<div className="h-56 animate-pulse bg-muted/40 sm:h-64" aria-hidden="true" />}>
          {measure === 'platit' ? <PaidYears year={year} titleId={titleId} /> : <ApprovedYears year={year} titleId={titleId} />}
        </BandRead>
      </div>
    </HomeBand>
  )
}

function PaidYears({ year, titleId }: { readonly year: number; readonly titleId: string }) {
  const { data } = useAnafStateBudget()
  if (data.status !== 'ok') return <p className="text-sm text-muted-foreground">{missingText(data.reason)}</p>
  const points = data.years.map<YearPoint>((point) => ({
    year: point.year,
    lei: Number(point.lei),
    partial: point.throughMonth.endsWith('-12') ? undefined : untilText(point.throughMonth),
  }))
  const first = points[0]
  const complete = points.filter((point) => point.partial === undefined)
  const last = complete[complete.length - 1]
  return (
    <>
      {first && last ? (
        <p className="-mt-4 mb-6 max-w-[56ch] text-base leading-relaxed text-muted-foreground">
          {t`Plățile din bugetul de stat au crescut de la ${moneyText(first.lei)} în ${first.year} la ${moneyText(last.lei)} în ${last.year}, în lei ai fiecărui an.`}
        </p>
      ) : null}
      <YearsChart
        points={points}
        caption={t`plăți din bugetul de stat, raportate la ANAF`}
        selected={year}
        labelledBy={titleId}
        onSelect={(picked) => window.location.assign(analyzeHref({ tip: 'ministere', an: picked }))}
      />
    </>
  )
}

function ApprovedYears({ year, titleId }: { readonly year: number; readonly titleId: string }) {
  const { data } = useApprovedSeries({ fund: 'state_budget', line: 'credits', creditType: 'budget_credits' })
  if (data.status !== 'ok') return <p className="text-sm text-muted-foreground">{missingText(data.reason)}</p>
  const points = data.points
    .filter((point) => point.kind !== 'forecast')
    .map<YearPoint>((point) => ({
      year: point.measureYear,
      lei: approvedAmountToLei(point.amountThousandLei),
      partial: point.kind === 'proposed' ? t`proiect` : undefined,
      notes: point.kind === 'proposed' ? [t`Proiectul din martie 2026, nevalidat`] : [t`Legea inițială, fără rectificări`],
    }))
  const first = points[0]
  const law = points.filter((point) => point.partial === undefined)
  const last = law[law.length - 1]
  return (
    <>
      {first && last ? (
        <p className="-mt-4 mb-6 max-w-[56ch] text-base leading-relaxed text-muted-foreground">
          {t`Legea pe ${first.year} a aprobat ${moneyText(first.lei)} pentru bugetul de stat; cea pe ${last.year}, ${moneyText(last.lei)}.`}
        </p>
      ) : null}
      <YearsChart
        points={points}
        caption={t`credite bugetare aprobate de legea fiecărui an`}
        selected={year}
        labelledBy={titleId}
        onSelect={(picked) => window.location.assign(analyzeHref({ tip: 'lege', an: picked }))}
      />
    </>
  )
}

// ──────────────────────────────────────────────────────── where to start ──

function StartBand({ year }: { readonly year: number }) {
  const cards: readonly { readonly href: string; readonly title: string; readonly body: string }[] = [
    {
      href: analyzeHref({ tip: 'cheltuieli', an: year }),
      title: t`Cheltuielile pe titluri, ${year}`,
      body: t`Salarii, asistență socială, dobânzi, investiții: fiecare rând al buletinului, cu celula din care vine.`,
    },
    {
      href: analyzeHref({ tip: 'lege', dupa: 'legi', an: year }),
      title: t`Ce a prevăzut fiecare lege`,
      body: t`Aprobările și estimările legilor din 2019 încoace, fiecare lege separat: cum s-a schimbat planul pentru un an.`,
    },
    {
      href: analyzeHref({ tip: 'ministere', an: year }),
      title: t`Plățile ministerelor, ${year}`,
      body: t`Cei 55 de ordonatori principali ai bugetului de stat, după plățile raportate la ANAF, din 2016.`,
    },
  ]
  return (
    <section aria-labelledby="budget-hub-start-title">
      <RuledFrame className="py-14 sm:py-20">
        <HubSectionHead titleId="budget-hub-start-title" index={t`Analize`} title={t`De aici poți începe`} />
        <div className="mt-8" data-reveal>
          <ul className="grid gap-px border bg-border/70 sm:grid-cols-3">
            {cards.map((card) => (
              <li key={card.href}>
                <a href={card.href} className="block h-full bg-background p-5 transition-colors hover:bg-muted/40">
                  <span className="block text-base font-semibold tracking-tight text-foreground">{card.title}</span>
                  <span className="mt-1.5 block text-sm leading-relaxed text-muted-foreground">{card.body}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </RuledFrame>
    </section>
  )
}

// ─────────────────────────────────────────────────────────── pending ──

function HubPending() {
  return (
    <div className="relative w-full overflow-x-clip bg-background" aria-busy="true">
      <section className="relative border-b">
        <RuledFrame className="py-12 sm:py-16 lg:py-20">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-8">
            <div className="lg:col-span-7">
              <MonoLabel className="text-muted-foreground">{t`Buget / Național`}</MonoLabel>
              <h1 className="mt-5 text-[clamp(2.2rem,8vw+0.6rem,2.75rem)] font-extrabold leading-[0.92] tracking-tighter text-foreground sm:text-6xl lg:text-7xl">
                {t`Ce încasează statul`}
                <br />
                {t`și pe ce cheltuie`}
              </h1>
              <TextPending className="mt-6" lines={2} />
            </div>
            <div className="border p-5 lg:col-span-5">
              <HeroPending />
            </div>
          </div>
        </RuledFrame>
      </section>
      <FiguresPending />
    </div>
  )
}
