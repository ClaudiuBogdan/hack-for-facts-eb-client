import { Suspense, useRef, useState, type ReactNode } from 'react'
import { Link } from '@tanstack/react-router'

import { MonoLabel } from '@/components/landing-skin/mono-label'
import { RevealStyles } from '@/components/landing-skin/reveal'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { SmearFilters } from '@/features/landing/components/count-up'
import { CornerTicks, CruxMarks, TwoLayerLattice } from '@/features/landing/components/hero-chrome'
import { BandRead } from '@/features/national-budget/analytics/components/analytics-parts'
import { siteKeys } from '@/features/national-budget/home/lib/home-data'
import { moneyText } from '@/features/national-budget/home/lib/home-format'
import { HUB_SHORTCUT_LINK_CLASS } from '@/features/statistics/components/hub/hub-chrome'
import { HubFiguresBand, type HubFact } from '@/features/statistics/components/hub/hub-figures'
import { cn } from '@/lib/utils'
import { usePageSearch } from './principal.data'
import { changeOf, leiNumber, leiText, populationOf, populationText, type Unit, usePersonSpending, usePersonTotals } from './persoana.data'
import { BORROWED_FILL, REST_FILL, toneOf } from './persoana.sections'
import { SourcesLine, YearProvider, YearSelect, useInView, usePersonYear } from './persoana.shell'

/**
 * The working version (owner, 25 November 2026): the page we build on, one
 * part at a time, from the three per-person versions and the owner's notes.
 * First the hero, in the hubs' language — the lattice, the corner ticks, the
 * mono breadcrumb, a two-line title, the year, the shortcuts, a panel beside
 * them, the sources at the foot, then the pinned bar and the figures band —
 * with the title and the panel in three designs (`?erou=`).
 */

// ─────────────────────────────────────────────────────────── the designs ──

type HeroDesign = {
  readonly key: string
  readonly title: string
  readonly note: string
  readonly Heading: () => ReactNode
  readonly Lede: () => ReactNode
  readonly Panel: (props: { readonly unit: Unit }) => ReactNode
}

const DESIGNS: readonly HeroDesign[] = [
  {
    key: 'intrebare',
    title: 'Întrebarea, partea unui locuitor alături',
    note: 'The page’s question as the title (as today); the lede answers it per resident; the panel is the receipt: where one resident’s share went, per year or per month.',
    Heading: () => (
      <>
        De unde vin banii publici
        <br />
        și pe ce se duc
      </>
    ),
    Lede: QuestionLede,
    Panel: ReceiptPanel,
  },
  {
    key: 'locuitor',
    title: 'Pe cap de locuitor, bilanțul alături',
    note: 'The per-person idea as the title; the lede says what the page answers; the panel is one resident’s balance: collected plus borrowed against spent.',
    Heading: () => (
      <>
        Bugetul țării,
        <br />
        pe cap de locuitor
      </>
    ),
    Lede: PersonLede,
    Panel: BalancePanel,
  },
  {
    key: 'cifra',
    title: 'Cifra ca titlu, pe ce s-au dus alături',
    note: 'The year’s figure per resident as the title (it changes with the year); the lede is the month and the borrowed part; the panel ranks where the money went.',
    Heading: FigureHeading,
    Lede: FigureLede,
    Panel: WherePanel,
  },
]

function useDesign(): HeroDesign {
  const { search } = usePageSearch()
  return DESIGNS.find((design) => design.key === search.erou) ?? DESIGNS[0]!
}

function DesignRibbon() {
  const current = useDesign()
  const { set } = usePageSearch()
  return (
    <div className="border-b border-dashed border-amber-500/60 bg-amber-50/70 dark:bg-amber-950/20">
      <RuledFrame className="flex flex-wrap items-center gap-x-3 gap-y-1.5 py-2">
        <MonoLabel className="text-amber-800 dark:text-amber-300">Hero · variante</MonoLabel>
        {DESIGNS.map((design, position) => (
          <button
            key={design.key}
            type="button"
            aria-pressed={design.key === current.key}
            onClick={() => set({ erou: position === 0 ? null : design.key })}
            className={cn(
              'rounded-sm border px-2 py-0.5 text-xs transition-colors',
              design.key === current.key ? 'border-amber-700 bg-amber-700 text-white' : 'border-amber-600/40 text-amber-900 hover:bg-amber-100 dark:text-amber-200 dark:hover:bg-amber-900/40',
            )}
          >
            {String.fromCharCode(65 + position)} · {design.title}
          </button>
        ))}
        <span className="basis-full text-xs text-amber-900/80 dark:text-amber-200/80">{current.note}</span>
      </RuledFrame>
    </div>
  )
}

// ───────────────────────────────────────────────────────────── the ledes ──

const LEDE = 'mt-5 max-w-[50ch] text-lg leading-relaxed text-muted-foreground sm:text-xl'
const STRONG = 'font-semibold text-foreground tabular-nums'

function QuestionLede() {
  const { view } = usePersonYear()
  const totals = usePersonTotals(view)
  return (
    <p className={LEDE}>
      {view.partial ? `Din ianuarie ${view.year}` : `În ${view.year}`}, statul a cheltuit <span className={STRONG}>{leiText(totals.spending)}</span> pentru fiecare locuitor. {leiText(totals.revenue)} au venit din taxe și contribuții, restul s-a
      împrumutat.
    </p>
  )
}

function PersonLede() {
  const { view } = usePersonYear()
  return <p className={LEDE}>Cât cheltuie statul pentru fiecare dintre cei {populationText(view.year)} de locuitori, pe ce, de unde vin banii și cât se împrumută.</p>
}

function FigureHeading() {
  const { view } = usePersonYear()
  const totals = usePersonTotals(view)
  return (
    <>
      <span className="tabular-nums">{leiText(totals.spending)}</span>
      <br />
      pe locuitor
    </>
  )
}

function FigureLede() {
  const { view } = usePersonYear()
  const monthly = usePersonTotals(view, 'month')
  return (
    <p className={LEDE}>
      Atât a cheltuit statul {view.partial ? `din ianuarie ${view.year}` : `în ${view.year}`}: <span className={STRONG}>{leiText(monthly.spending)} pe lună</span>, din care {leiText(monthly.balance === null ? null : -monthly.balance)} împrumutați.
    </p>
  )
}

// ──────────────────────────────────────────────────────────── the panels ──

/** The panel's frame: its caption, a year/month switch, what it shows. */
function PanelFrame({ caption, unit, onUnit, children }: { readonly caption: string; readonly unit: Unit; readonly onUnit: (unit: Unit) => void; readonly children: ReactNode }) {
  return (
    <div className="border bg-background p-5 shadow-sm sm:p-6">
      <div className="flex items-center justify-between gap-4">
        <MonoLabel className="text-primary">{caption}</MonoLabel>
        <div className="inline-flex shrink-0 rounded-md border p-0.5 text-sm" role="group" aria-label="Unitatea">
          {(['year', 'month'] as const).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={unit === value}
              onClick={() => onUnit(value)}
              className={cn('rounded-[5px] px-3 py-1 transition-colors', unit === value ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground')}
            >
              {value === 'year' ? 'Pe an' : 'Pe lună'}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </div>
  )
}

function ReceiptPanel({ unit }: { readonly unit: Unit }) {
  const { view } = usePersonYear()
  const { whole, lines } = usePersonSpending(view, unit)
  const totals = usePersonTotals(view, unit)
  const borrowed = totals.balance !== null && totals.balance < 0 ? -totals.balance : null
  const shown = lines.filter((line) => !line.rest).slice(0, 6)
  const others = (whole ?? 0) - shown.reduce((sum, line) => sum + line.lei, 0)
  const named = lines.filter((line) => !line.rest).length
  return (
    <div className="font-mono text-[13px]">
      <ul className="space-y-2">
        {shown.map((line, rank) => (
          <li key={line.key} className="flex items-baseline gap-2">
            <span aria-hidden="true" className="size-2 shrink-0 translate-y-[-1px] rounded-[2px]" style={toneOf(rank, named).style} />
            <span className="min-w-0 truncate">{line.label}</span>
            <span aria-hidden="true" className="min-w-4 flex-1 translate-y-[-3px] border-b border-dotted border-foreground/30" />
            <span className="shrink-0 tabular-nums">{leiNumber(line.lei)}</span>
          </li>
        ))}
        <li className="flex items-baseline gap-2 text-muted-foreground">
          <span aria-hidden="true" className={cn('size-2 shrink-0 translate-y-[-1px] rounded-[2px]', REST_FILL)} />
          <span>Restul</span>
          <span aria-hidden="true" className="min-w-4 flex-1 translate-y-[-3px] border-b border-dotted border-foreground/20" />
          <span className="tabular-nums">{leiNumber(others)}</span>
        </li>
      </ul>
      <div className="my-4 border-t border-dashed border-foreground/30" />
      <p className="flex items-baseline justify-between text-base font-semibold">
        <span>Total</span>
        <span className="tabular-nums">{leiText(whole)}</span>
      </p>
      <div className="mt-3 space-y-1 text-muted-foreground">
        <p className="flex justify-between">
          <span>din taxe și contribuții</span>
          <span className="tabular-nums">{leiNumber(totals.revenue)}</span>
        </p>
        {borrowed ? (
          <p className="flex justify-between">
            <span className="inline-flex items-center gap-2">
              <span className={cn('size-2 rounded-[2px]', BORROWED_FILL)} />
              din împrumut
            </span>
            <span className="tabular-nums">{leiNumber(borrowed)}</span>
          </p>
        ) : null}
      </div>
    </div>
  )
}

function BalancePanel({ unit }: { readonly unit: Unit }) {
  const { view } = usePersonYear()
  const totals = usePersonTotals(view, unit)
  const borrowed = totals.balance !== null && totals.balance < 0 ? -totals.balance : 0
  const max = Math.max(totals.spending ?? 0, (totals.revenue ?? 0) + borrowed, 1)
  return (
    <dl className="space-y-5">
      <div>
        <dt className="flex items-baseline justify-between text-sm">
          <span>A încasat</span>
          <span className="font-semibold tabular-nums">{leiText(totals.revenue)}</span>
        </dt>
        <dd className="mt-2 flex h-8 bg-muted">
          <span className="block h-full bg-chart-sky" style={{ width: `${((totals.revenue ?? 0) / max) * 100}%` }} />
          {borrowed ? <span className={cn('block h-full', BORROWED_FILL)} style={{ width: `${(borrowed / max) * 100}%` }} /> : null}
        </dd>
        {borrowed ? (
          <p className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
            <span className={cn('size-2.5 rounded-[2px]', BORROWED_FILL)} />
            plus {leiText(borrowed)} împrumutați
          </p>
        ) : null}
      </div>
      <div>
        <dt className="flex items-baseline justify-between text-sm">
          <span>A cheltuit</span>
          <span className="font-semibold tabular-nums">{leiText(totals.spending)}</span>
        </dt>
        <dd className="mt-2 h-8 bg-muted">
          <span className="block h-full bg-primary" style={{ width: `${((totals.spending ?? 0) / max) * 100}%` }} />
        </dd>
      </div>
      <p className="border-t pt-4 text-sm text-muted-foreground">
        Pentru fiecare locuitor, {unit === 'month' ? 'pe lună' : view.partial ? 'de la 1 ianuarie' : `în ${view.year}`}. Cheltuielile: {changeOf(totals.spending, totals.spendingBefore) ?? '—'} față de {view.year - 1}.
      </p>
    </dl>
  )
}

function WherePanel({ unit }: { readonly unit: Unit }) {
  const { view } = usePersonYear()
  const { lines } = usePersonSpending(view, unit)
  const shown = lines.filter((line) => !line.rest).slice(0, 6)
  const max = Math.max(...shown.map((line) => line.lei), 1)
  const named = lines.filter((line) => !line.rest).length
  return (
    <ol className="divide-y">
      {shown.map((line, rank) => (
        <li key={line.key} className="py-2.5 first:pt-0">
          <p className="flex items-baseline justify-between gap-4 text-sm">
            <span className="min-w-0 truncate">{line.label}</span>
            <span className="shrink-0 font-semibold tabular-nums">{leiText(line.lei)}</span>
          </p>
          <span className="mt-1.5 block h-1.5 rounded-full bg-muted">
            <span className="block h-full rounded-full" style={{ width: `${(line.lei / max) * 100}%`, ...toneOf(rank, named).style }} />
          </span>
        </li>
      ))}
    </ol>
  )
}

const PANEL_CAPTION: Readonly<Record<string, (year: string) => string>> = {
  intrebare: (year) => `Partea unui locuitor, ${year}`,
  locuitor: (year) => `Bilanțul unui locuitor, ${year}`,
  cifra: (year) => `Pe ce s-au dus, ${year}`,
}

function Panel({ design }: { readonly design: HeroDesign }) {
  const { view } = usePersonYear()
  const [unit, setUnit] = useState<Unit>('year')
  const { Panel: Body } = design
  return (
    <PanelFrame caption={PANEL_CAPTION[design.key]?.(view.partial ? `${view.year}, până acum` : String(view.year)) ?? ''} unit={unit} onUnit={setUnit}>
      <Body unit={unit} />
    </PanelFrame>
  )
}

// ────────────────────────────────────────────────────────────── the hero ──

function Shortcuts() {
  const links = [
    { label: 'Pe ce se duc', hash: 'cheltuieli' },
    { label: 'De unde vin', hash: 'venituri' },
    { label: 'Împrumutul', hash: 'imprumut' },
  ]
  return (
    <nav aria-label="Scurtături" className="mt-5">
      <MonoLabel className="block text-muted-foreground/70 sm:inline sm:align-middle">Sau mergi direct la</MonoLabel>
      <span className="flex flex-wrap gap-x-4 sm:ml-4 sm:inline-flex sm:gap-y-1.5 sm:align-middle">
        {links.map((link) => (
          <a key={link.hash} href={`#${link.hash}`} className={HUB_SHORTCUT_LINK_CLASS}>
            {link.label}
          </a>
        ))}
        <Link to="/national-budget/analytics" search={((previous: Record<string, unknown>) => siteKeys(previous)) as never} className={HUB_SHORTCUT_LINK_CLASS}>
          Analize avansate
        </Link>
      </span>
    </nav>
  )
}

function Hero({ design }: { readonly design: HeroDesign }) {
  const { Heading, Lede } = design
  return (
    <section className="relative border-b">
      <TwoLayerLattice idPrefix="national-budget-person" />
      <RuledFrame marker="hero" className="py-12 sm:py-16 lg:py-20">
        <CornerTicks />
        <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-12 lg:gap-8 lg:pb-10">
          <div className="min-w-0 lg:col-span-7">
            <MonoLabel className="text-muted-foreground">Buget / Național</MonoLabel>
            <BandRead fallback={<TitlePending />}>
              <h1 className="mt-5 text-[clamp(2.2rem,8vw+0.6rem,2.75rem)] font-extrabold leading-[0.92] tracking-tighter text-foreground sm:text-6xl lg:text-7xl">
                <Heading />
              </h1>
              <Lede />
            </BandRead>
            <label className="mt-6 inline-flex items-center gap-3">
              <MonoLabel className="text-muted-foreground/70">Anul</MonoLabel>
              <YearSelect className="min-w-56" />
            </label>
            <Shortcuts />
          </div>
          <div className="min-w-0 lg:col-span-5">
            <BandRead fallback={<div className="h-80 animate-pulse border bg-muted/40" />}>
              <Panel design={design} />
            </BandRead>
          </div>
          <BandRead fallback={null} quiet={null}>
            <SourcesLine className="min-w-0 lg:absolute lg:inset-x-8 lg:bottom-6" />
          </BandRead>
        </div>
        <span className="absolute inset-x-0 top-full z-30 mt-px">
          <CruxMarks />
        </span>
      </RuledFrame>
    </section>
  )
}

function TitlePending() {
  return (
    <div className="mt-5 space-y-3" aria-hidden="true">
      <div className="h-16 w-full max-w-xl animate-pulse rounded bg-muted" />
      <div className="h-16 w-4/5 max-w-lg animate-pulse rounded bg-muted" />
      <div className="mt-5 h-6 w-full max-w-md animate-pulse rounded bg-muted/70" />
    </div>
  )
}

// ──────────────────────────────────────────────────── bar and figures band ──

const SECTIONS = [
  { id: 'cheltuieli', label: 'Pe ce' },
  { id: 'venituri', label: 'De unde' },
  { id: 'domenii', label: 'Pe domenii' },
  { id: 'ministere', label: 'Cine' },
  { id: 'imprumut', label: 'Împrumutul' },
  { id: 'anul', label: 'Anul în curs' },
]

/** The hubs' pinned bar: the page's name, its numbered sections, and the year once the hero's menu has scrolled away. */
function SectionBar({ heroVisible }: { readonly heroVisible: boolean }) {
  return (
    <nav aria-label="Secțiunile paginii" className="sticky top-0 z-20 border-b bg-background/90 backdrop-blur">
      <RuledFrame className="flex items-center gap-6 py-0">
        <span className="hidden min-w-0 truncate py-3 text-sm font-semibold md:block">Bugetul național</span>
        <ol className="flex min-w-0 gap-4 overflow-x-auto sm:gap-5 md:ml-auto">
          {SECTIONS.map((section, position) => (
            <li key={section.id} className="shrink-0">
              <a href={`#${section.id}`} className="inline-flex min-h-11 items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
                <MonoLabel className="text-primary" aria-hidden="true">
                  {String(position + 1).padStart(2, '0')}
                </MonoLabel>
                {section.label}
              </a>
            </li>
          ))}
        </ol>
        <YearSelect className={cn('w-auto shrink-0 transition-opacity', heroVisible && 'pointer-events-none hidden opacity-0')} />
      </RuledFrame>
    </nav>
  )
}

function FiguresBand() {
  const { view } = usePersonYear()
  const totals = usePersonTotals(view)
  const spending = usePersonSpending(view)
  const interest = spending.lines.find((line) => line.key === 'mfin.bgc.expenditure.interest') ?? null
  const borrowed = totals.balance === null ? null : -totals.balance
  const borrowedBefore = totals.balanceBefore === null ? null : -totals.balanceBefore
  const people = populationOf(view.year)
  // Back to the whole purse, for the reader who wants the national figure beside the personal one.
  const total = (lei: number | null) => (lei === null || people === null ? null : moneyText((lei * people).toFixed(2)))
  const previous = view.partial ? `aceleași luni din ${view.year - 1}` : String(view.year - 1)
  const fact = (key: string, value: number | null, label: string, note: string): HubFact => ({
    key,
    value: Math.round(value ?? 0),
    digits: 0,
    unit: 'lei',
    label,
    note,
    link: (content, className) => (
      <a href={`#${key}`} className={className}>
        {content}
      </a>
    ),
  })
  const facts: HubFact[] = [
    fact('cheltuieli', totals.spending, 'Cheltuit, pe locuitor', `${changeOf(totals.spending, totals.spendingBefore) ?? '—'} față de ${previous} · în total ${total(totals.spending) ?? '—'}`),
    fact('venituri', totals.revenue, 'Încasat, pe locuitor', `${changeOf(totals.revenue, totals.revenueBefore) ?? '—'} față de ${previous} · în total ${total(totals.revenue) ?? '—'}`),
    fact('imprumut', borrowed, 'Împrumutat, pe locuitor', `${changeOf(borrowed, borrowedBefore) ?? '—'} față de ${previous} · deficitul bugetar (cash)`),
    fact('dobanzi', interest?.lei ?? null, 'Dobânzi la datorie, pe locuitor', `${interest?.change ?? '—'} față de ${previous}`),
  ]
  return <HubFiguresBand facts={facts} locale="ro" />
}

function FiguresPending() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4" aria-hidden="true">
      {[0, 1, 2, 3].map((cell) => (
        <div key={cell} className={cn('px-5 py-7', cell > 0 && 'lg:border-l')}>
          <div className="h-9 w-32 animate-pulse rounded bg-muted" />
          <div className="mt-4 h-3 w-40 animate-pulse rounded bg-muted/70" />
          <div className="mt-6 h-3 w-48 animate-pulse rounded bg-muted/60" />
        </div>
      ))}
    </div>
  )
}

// ────────────────────────────────────────────────────────────── the page ──

function Page() {
  const design = useDesign()
  const heroRef = useRef<HTMLDivElement>(null)
  const heroVisible = useInView(heroRef)
  return (
    <>
      <DesignRibbon />
      <div ref={heroRef}>
        <Hero design={design} />
      </div>
      <SectionBar heroVisible={heroVisible} />
      <section className="border-b bg-muted/20" aria-label="Cifre-cheie">
        <RuledFrame>
          <BandRead fallback={<FiguresPending />}>
            <FiguresBand />
          </BandRead>
        </RuledFrame>
      </section>
      <section className="border-b">
        <RuledFrame className="py-16 text-sm text-muted-foreground">
          Secțiunile urmează, din cele trei versiuni și din notele tale: pe ce se duc banii, de unde vin, pe domenii, cine îi cheltuie, împrumutul, anul în curs, mai departe.
        </RuledFrame>
      </section>
    </>
  )
}

export function PersonWorkVariant() {
  return (
    <div className="relative w-full overflow-x-clip bg-background">
      <RevealStyles />
      <SmearFilters />
      <Suspense fallback={<div className="h-[36rem] animate-pulse bg-muted/30" />}>
        <YearProvider>
          <Page />
        </YearProvider>
      </Suspense>
    </div>
  )
}
