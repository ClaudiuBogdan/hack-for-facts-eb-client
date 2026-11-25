import { Suspense, useRef } from 'react'
import { Link } from '@tanstack/react-router'

import { MonoLabel } from '@/components/landing-skin/mono-label'
import { RevealStyles } from '@/components/landing-skin/reveal'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { SmearFilters } from '@/features/landing/components/count-up'
import { CornerTicks, CruxMarks, TwoLayerLattice } from '@/features/landing/components/hero-chrome'
import { BandRead } from '@/features/national-budget/analytics/components/analytics-parts'
import { TOTAL_ITEMS, siteKeys } from '@/features/national-budget/home/lib/home-data'
import { useGdp } from '@/features/national-budget/home/hooks/use-home-data'
import { gdpSizeText, moneyText } from '@/features/national-budget/home/lib/home-format'
import { HUB_SHORTCUT_LINK_CLASS } from '@/features/statistics/components/hub/hub-chrome'
import { HubFiguresBand, type HubFact } from '@/features/statistics/components/hub/hub-figures'
import { cn } from '@/lib/utils'
import { populationText, useHundred, useOfficialTotals } from './persoana.data'
import { BORROWED_FILL } from './persoana.sections'
import { SourcesLine, YearPicker, YearProvider, useInView, usePersonYear } from './persoana.shell'

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
 */

// ────────────────────────────────────────────────────────────── the lede ──

function Lede() {
  const { view } = usePersonYear()
  return (
    <p className="mt-5 max-w-[50ch] text-lg leading-relaxed text-muted-foreground sm:text-xl">
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
      <MonoLabel className="text-primary">Bilanțul, {view.partial ? `${view.text}` : view.year}</MonoLabel>
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

function Hero() {
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
        <YearPicker label={false} className={cn('shrink-0', heroVisible && 'hidden')} />
      </RuledFrame>
    </nav>
  )
}

function FiguresBand() {
  const { view } = usePersonYear()
  const totals = useOfficialTotals(view)
  const spending = useHundred(view, 'spending')
  const gdp = useGdp(view)
  const interest = spending.lines.find((line) => line.key === 'mfin.bgc.expenditure.interest') ?? null
  const previous = view.partial ? `aceleași luni din ${view.year - 1}` : String(view.year - 1)
  const deficitShare = gdpSizeText(gdp.share(TOTAL_ITEMS.balance), 2)
  const fact = (key: string, exact: string | null, label: string, note: string): HubFact => ({
    key,
    value: exact ? Math.abs(Number(exact)) / 1e9 : 0,
    digits: 1,
    unit: 'mld. lei',
    label,
    note,
    link: (content, className) => (
      <a href={`#${key}`} className={className}>
        {content}
      </a>
    ),
  })
  const facts: HubFact[] = [
    fact('cheltuieli', totals.spending, 'Cheltuieli publice', `${totals.spendingChange ?? '—'} față de ${previous}`),
    fact('venituri', totals.revenue, 'Venituri publice', `${totals.revenueChange ?? '—'} față de ${previous}`),
    fact('imprumut', totals.deficit, 'Deficit bugetar (cash)', [`${totals.borrowed} lei din fiecare 100 cheltuiți`, deficitShare ? `${deficitShare} din PIB` : null].filter(Boolean).join(' · ')),
    fact('dobanzi', interest?.exact ?? null, 'Dobânzi la datorie', `${interest?.lei ?? '—'} lei din fiecare 100 cheltuiți · ${interest?.change ?? '—'}`),
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
