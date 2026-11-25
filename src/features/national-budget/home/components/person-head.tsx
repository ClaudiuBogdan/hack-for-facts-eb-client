import { useEffect, useState, type ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { useLingui } from '@lingui/react/macro'
import { ArrowDown, ArrowLeftRight, CalendarDays, HandCoins, Landmark, Layers, type LucideIcon } from 'lucide-react'

import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { CountUpValue } from '@/features/landing/components/count-up'
import { CornerTicks, CruxMarks, TwoLayerLattice } from '@/features/landing/components/hero-chrome'
import { exactFigure, plotOf } from '@/features/national-budget/analytics/lib/exact'
import { cn } from '@/lib/utils'
import { useGdpShares } from '../hooks/use-home-data'
import { useHundred, useOfficialTotals } from '../hooks/use-person-data'
import { TOTAL_ITEMS, siteKeys } from '../lib/home-data'
import { gdpSizeText, moneyText } from '../lib/home-format'
import { perResident } from '../lib/per-resident'
import { BORROWED_FILL, leiText, leiWord, perResidentWords, previousText } from '../lib/person-format'
import { StartLinks } from './home-start'
import { Faint, Mark, Section, YearPicker, YearScope } from './person-shell'
import { usePageYear } from '../hooks/use-page-year'
import { populationText } from '../lib/person-format'

/**
 * The page's head (promoted from the prototype `national-budget/persoana`,
 * variant `lucru`): the title per resident with the year's balance beside
 * it, the year, a link to the analysis page; the pinned bar with the page's
 * name, its year and its sections; the figures band; and the questions to
 * go further. In the landing's type (Inter's round commas, the headline's
 * spacing, words in sentence case).
 */

function Lede() {
  const { view } = usePageYear()
  const people = populationText(view.year)
  return (
    <p className="mt-5 max-w-[50ch] text-balance text-lg leading-relaxed tracking-normal text-muted-foreground sm:text-xl">
      {people ? t`Cât cheltuie statul pentru fiecare dintre cei ${people} de locuitori, pe ce, de unde vin banii și cât se împrumută.` : t`Cât cheltuie statul pentru fiecare locuitor, pe ce, de unde vin banii și cât se împrumută.`}
    </p>
  )
}

/** The year's balance as printed: what the state collected, what it borrowed on top, against what it spent; the borrowed part as lei of 100. */
function BalancePanel() {
  const { view } = usePageYear()
  const totals = useOfficialTotals(view)
  if (!totals.spending || !totals.revenue) return <p className="text-sm text-muted-foreground">{t`Buletinul acestui an nu are totalurile.`}</p>
  const spent = plotOf(totals.spending) ?? 0
  const collected = plotOf(totals.revenue) ?? 0
  const borrowed = totals.deficit ? (plotOf(totals.deficit) ?? 0) : 0
  const max = Math.max(spent, collected + borrowed, 1)
  const period = view.partial ? view.text : String(view.year)
  const previous = previousText(view)
  const perPerson = perResident(totals.spending, view.year)
  return (
    <div className="border bg-background p-5 shadow-sm sm:p-6">
      <h2 className="text-sm font-semibold tracking-tight">{t`Bilanțul, ${period}`}</h2>
      <dl className="mt-5 space-y-5">
        <div>
          <dt className="flex items-baseline justify-between text-sm">
            <span>{t`A încasat`}</span>
            <span className="font-semibold tabular-nums">{moneyText(totals.revenue)}</span>
          </dt>
          <dd className="mt-2 flex h-8 bg-muted">
            <span className="block h-full bg-chart-sky" style={{ width: `${(collected / max) * 100}%` }} />
            {borrowed ? <span className={cn('block h-full', BORROWED_FILL)} style={{ width: `${(borrowed / max) * 100}%` }} /> : null}
          </dd>
          {totals.deficit ? (
            <p className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
              <span className={cn('size-2.5 rounded-[2px]', BORROWED_FILL)} />
              {t`plus ${moneyText(totals.deficit)} împrumutați`}
            </p>
          ) : null}
        </div>
        <div>
          <dt className="flex items-baseline justify-between text-sm">
            <span>{t`A cheltuit`}</span>
            <span className="font-semibold tabular-nums">{moneyText(totals.spending)}</span>
          </dt>
          <dd className="mt-2 h-8 bg-muted">
            <span className="block h-full bg-primary" style={{ width: `${(spent / max) * 100}%` }} />
          </dd>
          {/* The share card's figure (`national-budget-share-image.ts`), rounded the same way. */}
          {perPerson !== null ? (
            <p className="mt-1.5 text-xs text-muted-foreground">
              <Mark>{leiText(perPerson)}</Mark> {perResidentWords()}
            </p>
          ) : null}
        </div>
      </dl>
      {totals.deficit ? (
        <div className="mt-6 border-t pt-4">
          <p className="text-base">{t`Din fiecare 100 de lei cheltuiți, ${totals.fromRevenue} au venit din încasări și ${totals.borrowed} din împrumut.`}</p>
          <div className="mt-3 flex h-2.5 overflow-hidden rounded-full" aria-hidden="true">
            <span className="block h-full bg-chart-sky" style={{ width: `${totals.fromRevenue}%` }} />
            <span className={cn('block h-full', BORROWED_FILL)} style={{ width: `${totals.borrowed}%` }} />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            {totals.spendingChange
              ? t`Bugetul general consolidat: toate bugetele publice, fără transferurile dintre ele. Cheltuielile: ${totals.spendingChange} față de ${previous}.`
              : t`Bugetul general consolidat: toate bugetele publice, fără transferurile dintre ele.`}
          </p>
        </div>
      ) : null}
    </div>
  )
}

const SOURCE_LINK = 'font-medium text-foreground underline-offset-4 hover:underline'
const SHORTCUT_LINK = 'inline-flex min-h-11 items-center text-sm font-medium text-foreground transition-colors hover:text-primary sm:min-h-0'

function SourcesLine({ className }: { readonly className?: string }) {
  return (
    <p className={cn('text-sm text-muted-foreground', className)}>
      {t`Surse:`}{' '}
      <a href="https://mfinante.gov.ro/domenii/bugetul-de-stat/informatii-executie-bugetara" target="_blank" rel="noreferrer" className={SOURCE_LINK}>
        {t`Ministerul Finanțelor`}
      </a>
      ,{' '}
      <a href="https://mfinante.gov.ro/transparenta-bugetara" target="_blank" rel="noreferrer" className={SOURCE_LINK}>
        ANAF
      </a>
      ,{' '}
      <a href="http://statistici.insse.ro:8077/tempo-online/#/pages/tables/insse-table" target="_blank" rel="noreferrer" className={SOURCE_LINK}>
        INS
      </a>
    </p>
  )
}

function TitlePending() {
  return <div className="mt-5 h-14 w-full max-w-md animate-pulse rounded bg-muted/70" aria-hidden="true" />
}

export function Hero() {
  return (
    <section className="relative border-b">
      <TwoLayerLattice idPrefix="national-budget-home" />
      <RuledFrame marker="hero" className="py-12 sm:py-16 lg:py-20">
        <CornerTicks />
        <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-12 lg:gap-8 lg:pb-10">
          <div className="min-w-0 lg:col-span-7">
            <nav aria-label={t`Ești aici`} className="text-sm text-muted-foreground">
              <Link to="/" search={((previous: Record<string, unknown>) => siteKeys(previous)) as never} className="-my-3 inline-block py-3 transition-colors hover:text-foreground">
                {t`Acasă`}
              </Link>
              <span aria-hidden="true" className="mx-2 text-muted-foreground/50">
                /
              </span>
              {t`Buget`}
              <span aria-hidden="true" className="mx-2 text-muted-foreground/50">
                /
              </span>
              <span className="text-foreground">{t`Național`}</span>
            </nav>
            <h1 className="mt-5 text-[clamp(2.2rem,8vw+0.6rem,2.75rem)] font-extrabold leading-[0.96] tracking-[-0.04em] text-foreground [word-spacing:0.06em] sm:text-6xl lg:text-7xl">
              {t`Bugetul țării,`}
              <br />
              {t`pe cap de locuitor`}
            </h1>
            <YearScope fallback={<TitlePending />}>
              <Lede />
            </YearScope>
            <YearScope fallback={<div className="mt-6 h-10 w-40 animate-pulse rounded-md bg-muted" aria-hidden="true" />}>
              <YearPicker className="mt-6" />
            </YearScope>
            <nav aria-label={t`Scurtături`} className="mt-4 sm:flex sm:items-baseline sm:gap-x-4">
              <span className="block text-sm text-muted-foreground">{t`Sau mergi direct la`}</span>
              <Link to="/national-budget/analytics" search={((previous: Record<string, unknown>) => siteKeys(previous)) as never} className={SHORTCUT_LINK}>
                {t`Analize avansate`}
              </Link>
            </nav>
          </div>
          <div className="min-w-0 lg:col-span-5">
            <YearScope fallback={<div className="h-80 animate-pulse border bg-muted/40" />}>
              <BalancePanel />
            </YearScope>
          </div>
          <SourcesLine className="min-w-0 lg:absolute lg:inset-x-8 lg:bottom-6" />
        </div>
        <span className="absolute inset-x-0 top-full z-30 mt-px">
          <CruxMarks />
        </span>
      </RuledFrame>
    </section>
  )
}

// ──────────────────────────────────────────────────── bar and figures ──

type SectionLink = { readonly id: string; readonly label: string; readonly icon: LucideIcon }

/** The page's sections, each with an icon in the bar; their words resolved at render. */
function pageSections(): readonly SectionLink[] {
  return [
    { id: 'bani', label: t`De unde și pe ce`, icon: ArrowLeftRight },
    { id: 'bugete', label: t`Bugetele`, icon: Layers },
    { id: 'stat', label: t`Bugetul de stat`, icon: Landmark },
    { id: 'imprumut', label: t`Împrumutul`, icon: HandCoins },
    { id: 'anul', label: t`Anul în curs`, icon: CalendarDays },
  ]
}

/** The section whose top has passed a line a quarter of the way down the window: the one a reader is in. */
function useActiveSection(ids: readonly string[]): string | null {
  const [active, setActive] = useState<string | null>(null)
  const key = ids.join(' ')
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) setActive((was) => (entry.isIntersecting ? entry.target.id : was === entry.target.id ? null : was))
      },
      { rootMargin: '-25% 0px -74% 0px' },
    )
    for (const id of key.split(' ')) {
      const element = document.getElementById(id)
      if (element) observer.observe(element)
    }
    return () => observer.disconnect()
  }, [key])
  return active
}

/** The pinned bar: the page's name and its year (once the hero's menu has scrolled away), then the sections, the current one underlined. */
export function SectionBar({ heroVisible }: { readonly heroVisible: boolean }) {
  const sections = pageSections()
  const active = useActiveSection(sections.map((section) => section.id))
  return (
    <nav aria-label={t`Secțiunile paginii`} className="sticky top-0 z-20 border-b bg-background/90 backdrop-blur">
      <RuledFrame className="flex items-center gap-6 py-0">
        <div className="flex shrink-0 items-center gap-4">
          <span className="hidden text-sm font-semibold tracking-tight md:block">{t`Bugetul național`}</span>
          <YearScope fallback={null}>
            <YearPicker label={false} className={cn('shrink-0', heroVisible && 'hidden')} />
          </YearScope>
        </div>
        <ol className="-mx-2.5 flex min-w-0 overflow-x-auto md:ml-auto md:mr-0">
          {sections.map((section) => {
            const current = active === section.id
            return (
              <li key={section.id} className="shrink-0">
                <a
                  href={`#${section.id}`}
                  aria-current={current ? 'location' : undefined}
                  className={cn(
                    'relative inline-flex h-12 items-center gap-2 px-2.5 text-sm transition-colors hover:text-foreground',
                    'after:absolute after:inset-x-2.5 after:bottom-0 after:h-0.5 after:bg-primary after:opacity-0 after:transition-opacity',
                    current ? 'text-foreground after:opacity-100' : 'text-muted-foreground',
                  )}
                >
                  <section.icon aria-hidden="true" className="size-4 shrink-0 text-primary" />
                  {section.label}
                </a>
              </li>
            )
          })}
        </ol>
      </RuledFrame>
    </nav>
  )
}

type Figure = { readonly key: string; readonly hash: string; readonly exact: string | null; readonly label: string; readonly notes: readonly ReactNode[] }

/** The figures band: the official amount, its name, and short notes that lead with their figure; each tile jumps to its section. */
function FiguresBand() {
  const { view } = usePageYear()
  const { i18n } = useLingui()
  const totals = useOfficialTotals(view)
  const spending = useHundred(view, 'spending')
  const gdp = useGdpShares(view)
  const interest = spending.lines.find((line) => line.key === 'mfin.bgc.expenditure.interest') ?? null
  const previous = previousText(view)
  const deficitShare = gdpSizeText(gdp.share(TOTAL_ITEMS.balance), 2)
  const change = (text: string | null) =>
    text ? (
      <>
        <Mark>{text}</Mark> {t`față de ${previous}`}
      </>
    ) : null
  const ofHundred = (lei: number) => (
    <>
      <Mark>
        {lei} {leiWord(lei)}
      </Mark>{' '}
      {t`din fiecare 100 cheltuiți`}
    </>
  )
  const figures: Figure[] = [
    { key: 'cheltuieli', hash: 'bani', exact: totals.spending, label: t`Cheltuieli publice`, notes: [change(totals.spendingChange)] },
    { key: 'venituri', hash: 'bani', exact: totals.revenue, label: t`Venituri publice`, notes: [change(totals.revenueChange)] },
    {
      key: 'deficit',
      hash: 'imprumut',
      exact: totals.deficit,
      label: t`Deficit bugetar (cash)`,
      notes: [
        ofHundred(totals.borrowed),
        deficitShare ? (
          <>
            <Mark>{deficitShare}</Mark> {t`din PIB`}
          </>
        ) : null,
      ],
    },
    { key: 'dobanzi', hash: 'imprumut', exact: interest?.exact ?? null, label: t`Dobânzi la datorie`, notes: [interest ? ofHundred(interest.lei) : null, change(interest?.change ?? null)] },
  ]
  return (
    <dl className="grid grid-cols-2 lg:grid-cols-4">
      {figures.map((figure, index) => {
        const amount = figure.exact ? exactFigure(figure.exact) : null
        return (
          <div key={figure.key} className={cn('group relative flex flex-col px-5 py-6 transition-colors hover:bg-muted/50 sm:py-7', index % 2 === 1 && 'border-l', index >= 2 && 'border-t lg:border-t-0', index >= 1 && 'lg:border-l')}>
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
              {figure.exact && amount ? <CountUpValue value={Math.abs(plotOf(figure.exact) ?? 0) / 1e9} digits={1} locale={i18n.locale === 'en' ? 'en' : 'ro'} /> : '—'}
              <span className="shrink-0 whitespace-nowrap text-sm font-medium tracking-normal text-muted-foreground">{t`mld. lei`}</span>
            </dd>
          </div>
        )
      })}
    </dl>
  )
}

/** The figures band's region: drawn at once, its figures when the year's are read. */
export function FiguresRegion() {
  return (
    <section className="border-b bg-muted/20" aria-label={t`Cifre-cheie`}>
      <RuledFrame>
        <YearScope fallback={<FiguresPending />}>
          <Faint>
            <FiguresBand />
          </Faint>
        </YearScope>
      </RuledFrame>
    </section>
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

function FurtherLinks() {
  const { view } = usePageYear()
  return <StartLinks view={view} />
}

/** The page's end: the analysis page's questions for the page's year. */
export function FurtherSection() {
  return (
    <Section id="departe" title={t`Mai departe`} lede={t`Fiecare întrebare deschide pagina de analize avansate, cu toate cifrele.`}>
      <FurtherLinks />
    </Section>
  )
}
