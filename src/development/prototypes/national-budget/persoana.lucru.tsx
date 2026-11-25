import { Suspense, useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowDown } from 'lucide-react'

import { RevealStyles } from '@/components/landing-skin/reveal'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { CountUpValue, SmearFilters } from '@/features/landing/components/count-up'
import { CornerTicks, CruxMarks, TwoLayerLattice } from '@/features/landing/components/hero-chrome'
import { BandRead } from '@/features/national-budget/analytics/components/analytics-parts'
import { TOTAL_ITEMS, siteKeys } from '@/features/national-budget/home/lib/home-data'
import { useGdp } from '@/features/national-budget/home/hooks/use-home-data'
import { gdpSizeText, moneyText } from '@/features/national-budget/home/lib/home-format'
import { cn } from '@/lib/utils'
import { leiWord, populationText, useHundred, useOfficialTotals } from './persoana.data'
import { FlowSection } from './persoana.flow'
import { BORROWED_FILL } from './persoana.sections'
import { DataNote, SourcesLine, YearPicker, YearProvider, useInView, usePersonYear } from './persoana.shell'

/**
 * The working version (owner, 25 November 2026): the page we build on, one
 * part at a time, from the three per-person versions and the owner's notes.
 * First the hero, in the hubs' language — the lattice, the corner ticks, the
 * mono breadcrumb, a two-line title, the year, the shortcuts, a panel beside
 * them, the sources at the foot, then the pinned bar and the figures band.
 *
 * Owner, on the hero's three designs: design B (the title „pe cap de
 * locuitor", the balance beside it); and a figure per resident („42.468
 * lei") is not intuitive. The head shows the official
 * amounts and explains them out of 100 lei („18 din fiecare 100 cheltuiți");
 * per-resident amounts stay for the sections' descriptions, where they help.
 *
 * The type is the landing page's (owner, 25 November 2026): Inter's round
 * commas on the whole page, the headline's spacing, and words set in Inter in
 * sentence case, never as spaced mono capitals (DESIGN.md: mono only where it
 * is necessary). The pinned bar and the figures band are drawn here in that
 * voice, with the hubs' structure and elements kept.
 */

// ────────────────────────────────────────────────────────────── the lede ──

function Lede() {
  const { view } = usePersonYear()
  return (
    <p className="mt-5 max-w-[50ch] text-balance text-lg leading-relaxed tracking-normal text-muted-foreground sm:text-xl">
      Cât cheltuie statul pentru fiecare dintre cei {populationText(view.year)} de locuitori, pe ce, de unde vin banii și cât se împrumută.
    </p>
  )
}

// ───────────────────────────────────────────────────────────── the panel ──

/**
 * The year's balance as printed (design B, the owner's pick): what the state
 * collected, with what it borrowed on top, against what it spent; the
 * borrowed part said as lei out of every 100 spent.
 */
function BalancePanel() {
  const { view } = usePersonYear()
  const totals = useOfficialTotals(view)
  if (!totals.spending || !totals.revenue) return <p className="text-sm text-muted-foreground">Buletinul acestui an nu are totalurile.</p>
  const spent = Number(totals.spending)
  const collected = Number(totals.revenue)
  const borrowed = totals.deficit ? Number(totals.deficit) : 0
  const max = Math.max(spent, collected + borrowed)
  return (
    <div className="border bg-background p-5 shadow-sm sm:p-6">
      <h2 className="text-sm font-semibold tracking-tight">Bilanțul, {view.partial ? view.text : view.year}</h2>
      <dl className="mt-5 space-y-5">
        <div>
          <dt className="flex items-baseline justify-between text-sm">
            <span>A încasat</span>
            <span className="font-semibold tabular-nums">{moneyText(totals.revenue)}</span>
          </dt>
          <dd className="mt-2 flex h-8 bg-muted">
            <span className="block h-full bg-chart-sky" style={{ width: `${(collected / max) * 100}%` }} />
            {borrowed ? <span className={cn('block h-full', BORROWED_FILL)} style={{ width: `${(borrowed / max) * 100}%` }} /> : null}
          </dd>
          {totals.deficit ? (
            <p className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
              <span className={cn('size-2.5 rounded-[2px]', BORROWED_FILL)} />
              plus {moneyText(totals.deficit)} împrumutați
            </p>
          ) : null}
        </div>
        <div>
          <dt className="flex items-baseline justify-between text-sm">
            <span>A cheltuit</span>
            <span className="font-semibold tabular-nums">{moneyText(totals.spending)}</span>
          </dt>
          <dd className="mt-2 h-8 bg-muted">
            <span className="block h-full bg-primary" style={{ width: `${(spent / max) * 100}%` }} />
          </dd>
        </div>
      </dl>
      {totals.deficit ? (
        <div className="mt-6 border-t pt-4">
          <p className="text-base">
            Din fiecare <strong className="font-semibold">100 de lei</strong> cheltuiți, <strong className="font-semibold tabular-nums">{totals.fromRevenue}</strong> au venit din încasări și{' '}
            <strong className="font-semibold tabular-nums">{totals.borrowed}</strong> din împrumut.
          </p>
          <div className="mt-3 flex h-2.5 overflow-hidden rounded-full" aria-hidden="true">
            <span className="block h-full bg-chart-sky" style={{ width: `${totals.fromRevenue}%` }} />
            <span className={cn('block h-full', BORROWED_FILL)} style={{ width: `${totals.borrowed}%` }} />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Bugetul general consolidat: toate bugetele publice, fără transferurile dintre ele. Cheltuielile: {totals.spendingChange ?? '—'} față de {view.partial ? `aceleași luni din ${view.year - 1}` : view.year - 1}.</p>
        </div>
      ) : null}
    </div>
  )
}

// ────────────────────────────────────────────────────────────── the hero ──

/** The landing's shortcut row: a plain-text label on the links' baseline, links without underlines. */
const SHORTCUT_LINK = 'inline-flex min-h-11 items-center text-sm font-medium text-foreground transition-colors hover:text-primary sm:min-h-0'

function Shortcuts() {
  const links = [
    { label: 'De unde vin și pe ce se duc', hash: 'bani' },
    { label: 'Împrumutul', hash: 'imprumut' },
  ]
  return (
    <nav aria-label="Scurtături" className="mt-4 sm:flex sm:items-baseline sm:gap-x-4">
      <span className="block text-sm text-muted-foreground">Sau mergi direct la</span>
      <span className="flex flex-wrap gap-x-4 sm:gap-x-5 sm:gap-y-1.5">
        {links.map((link) => (
          <a key={link.hash} href={`#${link.hash}`} className={SHORTCUT_LINK}>
            {link.label}
          </a>
        ))}
        <Link to="/national-budget/analytics" search={((previous: Record<string, unknown>) => siteKeys(previous)) as never} className={SHORTCUT_LINK}>
          Analize avansate
        </Link>
      </span>
    </nav>
  )
}

function Hero() {
  return (
    <section className="relative border-b">
      <TwoLayerLattice idPrefix="national-budget-person" />
      <RuledFrame marker="hero" className="py-12 sm:py-16 lg:py-20">
        <CornerTicks />
        <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-12 lg:gap-8 lg:pb-10">
          <div className="min-w-0 lg:col-span-7">
            <nav aria-label="Ești aici" className="text-sm text-muted-foreground">
              <Link to="/" search={((previous: Record<string, unknown>) => siteKeys(previous)) as never} className="-my-3 inline-block py-3 transition-colors hover:text-foreground">
                Acasă
              </Link>
              <span aria-hidden="true" className="mx-2 text-muted-foreground/50">
                /
              </span>
              Buget
              <span aria-hidden="true" className="mx-2 text-muted-foreground/50">
                /
              </span>
              <span className="text-foreground">Național</span>
            </nav>
            <BandRead fallback={<TitlePending />}>
              <h1 className="mt-5 text-[clamp(2.2rem,8vw+0.6rem,2.75rem)] font-extrabold leading-[0.96] tracking-[-0.04em] text-foreground [word-spacing:0.06em] sm:text-6xl lg:text-7xl">
                Bugetul țării,
                <br />
                pe cap de locuitor
              </h1>
              <Lede />
            </BandRead>
            <YearPicker className="mt-6" />
            <Shortcuts />
          </div>
          <div className="min-w-0 lg:col-span-5">
            <BandRead fallback={<div className="h-80 animate-pulse border bg-muted/40" />}>
              <BalancePanel />
            </BandRead>
          </div>
          <BandRead fallback={null} quiet={null}>
            <SourcesLine details={false} className="min-w-0 lg:absolute lg:inset-x-8 lg:bottom-6" />
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
  { id: 'bani', label: 'De unde și pe ce' },
  { id: 'domenii', label: 'Pe domenii' },
  { id: 'ministere', label: 'Cine' },
  { id: 'imprumut', label: 'Împrumutul' },
  { id: 'anul', label: 'Anul în curs' },
]

/** The section whose top has passed under the pinned bar: the one a reader is in. */
function useActiveSection(): string | null {
  const [active, setActive] = useState<string | null>(null)
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) setActive((was) => (entry.isIntersecting ? entry.target.id : was === entry.target.id ? null : was))
      },
      // A thin line a quarter of the way down the window: the section crossing it is the current one.
      { rootMargin: '-25% 0px -74% 0px' },
    )
    for (const section of SECTIONS) {
      const element = document.getElementById(section.id)
      if (element) observer.observe(element)
    }
    return () => observer.disconnect()
  }, [])
  return active
}

/**
 * The hubs' pinned bar, in the landing's type: the page's name, its numbered
 * sections (the numbers in Inter's tabular figures, the current section in
 * the foreground colour over a short rule), and the year once the hero's menu
 * has scrolled away.
 */
function SectionBar({ heroVisible }: { readonly heroVisible: boolean }) {
  const active = useActiveSection()
  return (
    <nav aria-label="Secțiunile paginii" className="sticky top-0 z-20 border-b bg-background/90 backdrop-blur">
      <RuledFrame className="flex items-center gap-6 py-0">
        <span className="hidden min-w-0 truncate text-sm font-semibold tracking-tight md:block">Bugetul național</span>
        <ol className="-mx-2.5 flex min-w-0 overflow-x-auto md:ml-auto md:mr-0">
          {SECTIONS.map((section, position) => {
            const current = active === section.id
            return (
              <li key={section.id} className="shrink-0">
                <a
                  href={`#${section.id}`}
                  aria-current={current ? 'location' : undefined}
                  className={cn(
                    'relative inline-flex h-12 items-baseline gap-1.5 px-2.5 text-sm leading-[3rem] transition-colors hover:text-foreground',
                    'after:absolute after:inset-x-2.5 after:bottom-0 after:h-0.5 after:bg-primary after:opacity-0 after:transition-opacity',
                    current ? 'text-foreground after:opacity-100' : 'text-muted-foreground',
                  )}
                >
                  <span aria-hidden="true" className="text-xs font-medium tabular-nums text-primary">
                    {String(position + 1).padStart(2, '0')}
                  </span>
                  {section.label}
                </a>
              </li>
            )
          })}
        </ol>
        <YearPicker label={false} className={cn('shrink-0', heroVisible && 'hidden')} />
      </RuledFrame>
    </nav>
  )
}

type Figure = { readonly key: string; readonly hash: string; readonly exact: string | null; readonly label: string; readonly notes: readonly ReactNode[] }

/** A figure inside a tile's note: the number in the foreground, its words after it. */
function Mark({ children }: { readonly children: ReactNode }) {
  return <span className="font-medium tabular-nums text-foreground">{children}</span>
}

/**
 * The hubs' figures band, in the landing's type: the official amount, its
 * name in sentence case, and one or two short notes that lead with their
 * figure. Each tile jumps to its section; the arrow says so.
 */
function FiguresBand() {
  const { view } = usePersonYear()
  const totals = useOfficialTotals(view)
  const spending = useHundred(view, 'spending')
  const gdp = useGdp(view)
  const interest = spending.lines.find((line) => line.key === 'mfin.bgc.expenditure.interest') ?? null
  const previous = view.partial ? `aceleași luni din ${view.year - 1}` : String(view.year - 1)
  const deficitShare = gdpSizeText(gdp.share(TOTAL_ITEMS.balance), 2)
  const change = (text: string | null) =>
    text ? (
      <>
        <Mark>{text}</Mark> față de {previous}
      </>
    ) : null
  const ofHundred = (lei: number) => (
    <>
      <Mark>
        {lei} {leiWord(lei)}
      </Mark>{' '}
      din fiecare 100 cheltuiți
    </>
  )
  const figures: Figure[] = [
    { key: 'cheltuieli', hash: 'bani', exact: totals.spending, label: 'Cheltuieli publice', notes: [change(totals.spendingChange)] },
    { key: 'venituri', hash: 'bani', exact: totals.revenue, label: 'Venituri publice', notes: [change(totals.revenueChange)] },
    {
      key: 'deficit',
      hash: 'imprumut',
      exact: totals.deficit,
      label: 'Deficit bugetar (cash)',
      notes: [
        ofHundred(totals.borrowed),
        deficitShare ? (
          <>
            <Mark>{deficitShare}</Mark> din PIB
          </>
        ) : null,
      ],
    },
    { key: 'dobanzi', hash: 'imprumut', exact: interest?.exact ?? null, label: 'Dobânzi la datorie', notes: [interest ? ofHundred(interest.lei) : null, change(interest?.change ?? null)] },
  ]
  return (
    <dl className="grid grid-cols-2 lg:grid-cols-4">
      {figures.map((figure, index) => (
        <div
          key={figure.key}
          className={cn('group relative flex flex-col px-5 py-6 transition-colors hover:bg-muted/50 sm:py-7', index % 2 === 1 && 'border-l', index >= 2 && 'border-t lg:border-t-0', index >= 1 && 'lg:border-l')}
        >
          {/* The term first, as a description list asks; the tile shows the amount above it. */}
          <dt className="order-2 mt-2 flex flex-1 flex-col">
            <a href={`#${figure.hash}`} className="text-sm font-medium text-foreground after:absolute after:inset-0 focus-visible:outline-hidden focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-ring">
              {figure.label}
            </a>
            <span className="mt-auto block pt-4 text-xs leading-relaxed text-muted-foreground">
              {figure.notes.filter(Boolean).map((note, line) => (
                <span key={line} className="block">
                  {note}
                </span>
              ))}
            </span>
            <ArrowDown
              aria-hidden="true"
              className="pointer-events-none absolute right-2 top-2 size-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 motion-reduce:transition-none [@media(hover:none)]:opacity-100"
            />
          </dt>
          <dd className="order-1 flex items-baseline gap-1.5 text-3xl font-semibold tabular-nums tracking-tight text-foreground sm:text-4xl">
            {figure.exact ? <CountUpValue value={Math.abs(Number(figure.exact)) / 1e9} digits={1} locale="ro" /> : '—'}
            <span className="shrink-0 whitespace-nowrap text-sm font-medium tracking-normal text-muted-foreground">mld. lei</span>
          </dd>
        </div>
      ))}
    </dl>
  )
}

function FiguresPending() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4" aria-hidden="true">
      {[0, 1, 2, 3].map((cell) => (
        <div key={cell} className={cn('px-5 py-6 sm:py-7', cell % 2 === 1 && 'border-l', cell >= 2 && 'border-t lg:border-t-0', cell >= 1 && 'lg:border-l')}>
          <div className="h-10 w-36 animate-pulse rounded bg-muted" />
          <div className="mt-3 h-4 w-40 animate-pulse rounded bg-muted/70" />
          <div className="mt-6 h-3 w-48 animate-pulse rounded bg-muted/60" />
        </div>
      ))}
    </div>
  )
}

// ────────────────────────────────────────────────────────────── the page ──

function Page() {
  const heroRef = useRef<HTMLDivElement>(null)
  const heroVisible = useInView(heroRef)
  return (
    <>
      <div ref={heroRef}>
        <Hero />
      </div>
      <SectionBar heroVisible={heroVisible} />
      <section className="border-b bg-muted/20" aria-label="Cifre-cheie">
        <RuledFrame>
          <BandRead fallback={<FiguresPending />}>
            <FiguresBand />
          </BandRead>
        </RuledFrame>
      </section>
      <FlowSection />
      <section className="border-b">
        <RuledFrame className="py-16 text-sm text-muted-foreground">Secțiunile următoare, din cele trei versiuni și din notele tale: pe domenii și cine cheltuie, împrumutul, anul în curs, mai departe.</RuledFrame>
      </section>
      {/* The population and the data's date close the page, above the site footer. */}
      <section className="border-b" aria-label="Despre date">
        <RuledFrame className="py-6">
          <BandRead fallback={null} quiet={null}>
            <DataNote />
          </BandRead>
        </RuledFrame>
      </section>
    </>
  )
}

export function PersonWorkVariant() {
  return (
    <div className="relative w-full overflow-x-clip bg-background [font-feature-settings:'ss03']">
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
