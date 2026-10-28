import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { useLingui } from '@lingui/react/macro'

import { MonoLabel } from '@/components/landing-skin/mono-label'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { CornerTicks, CruxMarks, TwoLayerLattice } from '@/features/landing/components/hero-chrome'
import { BandRead } from '@/features/national-budget/analytics/components/analytics-parts'
import { useNationalCatalog } from '@/features/national-budget/analytics/hooks/use-national-budget-analytics'
import { monthText } from '@/features/national-budget/analytics/lib/analytics-format'
import { changeOf } from '@/features/national-budget/analytics/lib/analytics-view'
import { exactFigure } from '@/features/national-budget/analytics/lib/exact'
import { formatHubNumber } from '@/features/private-companies/lib/hub-format'
import { HUB_SHORTCUT_LINK_CLASS } from '@/features/statistics/components/hub/hub-chrome'
import { HubFiguresBand, type HubFact } from '@/features/statistics/components/hub/hub-figures'
import { cn } from '@/lib/utils'
import { useGdp, useYearLines } from '../hooks/use-home-data'
import { TOTAL_ITEMS, readKey, type GdpStatus, type YearView } from '../lib/home-data'
import { deficitOf, gdpNumber, gdpSizeText, moneyText, sizeText } from '../lib/home-format'
import { useShownYear } from '../hooks/use-home-year'
import { YearMenu } from './home-shell'
import { siteKeys } from '../lib/home-data'

/**
 * The page's head, in the hubs' language (the lattice, the corner ticks, the
 * mono breadcrumb): the question as the headline, the year, the shortcuts
 * into the analysis page, the year's balance beside them, the sources at its
 * foot. Then the figures band. The head's words are the page's first paint:
 * only the year, the balance and the sources' date wait for a read, each in
 * its own boundary.
 */

function HeadFrame({ children, aside }: { readonly children: ReactNode; readonly aside: ReactNode }) {
  return (
    <section className="relative border-b">
      <TwoLayerLattice idPrefix="national-budget-home" />
      <RuledFrame marker="hero" className="py-12 sm:py-16 lg:py-20">
        <CornerTicks />
        {/* The sources close the head, as on /procurement: under the panel on a phone; from a wide screen, at the head's foot, just above the pinned bar, however tall the panel is. */}
        <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-12 lg:gap-8">
          <div className="min-w-0 lg:col-span-7">{children}</div>
          <div className="min-w-0 lg:col-span-5">{aside}</div>
          <SourcesLine className="min-w-0 lg:absolute lg:inset-x-8 lg:bottom-6" />
        </div>
      </RuledFrame>
    </section>
  )
}

function Crumb() {
  return <MonoLabel className="text-muted-foreground">{t`Buget / Național`}</MonoLabel>
}

/** The page's year, one dropdown (the pinned bar carries the same). */
function YearDropdown() {
  return (
    <label className="mt-6 inline-flex items-center gap-3">
      <MonoLabel className="text-muted-foreground/70">{t`Anul`}</MonoLabel>
      <YearMenu className="min-h-11 py-1 pl-4 pr-10 text-base" pendingClassName="h-11 w-56" />
    </label>
  )
}

function Shortcuts() {
  return (
    <nav aria-label={t`Scurtături`} className="mt-5">
      <MonoLabel className="block text-muted-foreground/70 sm:inline sm:align-middle">{t`Sau mergi direct la`}</MonoLabel>
      <span className="flex flex-wrap gap-x-4 sm:ml-4 sm:inline-flex sm:gap-y-1.5 sm:align-middle">
        <Link to="/national-budget/analytics" search={((previous: Record<string, unknown>) => siteKeys(previous)) as never} className={HUB_SHORTCUT_LINK_CLASS}>
          {t`Analize avansate`}
        </Link>
        <Link to="/national-budget/analytics" search={((previous: Record<string, unknown>) => ({ ...siteKeys(previous), tip: 'lege' })) as never} className={HUB_SHORTCUT_LINK_CLASS}>
          {t`Legea bugetului`}
        </Link>
        <Link to="/national-budget/analytics" search={((previous: Record<string, unknown>) => ({ ...siteKeys(previous), tip: 'sold', dupa: 'timp' })) as never} className={HUB_SHORTCUT_LINK_CLASS}>
          {t`Deficitul, an de an`}
        </Link>
      </span>
    </nav>
  )
}

const SOURCE_LINK_CLASS = 'font-medium text-foreground underline-offset-4 hover:underline'

/** The sources in a few words, each a link, and how recent the data is: the procurement hub's source line. */
function SourcesLine({ className }: { readonly className?: string }) {
  const newTab = <span className="sr-only"> {t`(se deschide într-o filă nouă)`}</span>
  return (
    <p className={cn('text-sm text-muted-foreground', className)}>
      {t`Surse:`}{' '}
      <a href="https://mfinante.gov.ro/domenii/bugetul-de-stat/informatii-executie-bugetara" target="_blank" rel="noreferrer" className={SOURCE_LINK_CLASS}>
        {t`Ministerul Finanțelor`}
        <span aria-hidden="true"> ↗</span>
        {newTab}
      </a>
      {', '}
      <a href="https://mfinante.gov.ro/transparenta-bugetara" target="_blank" rel="noreferrer" className={SOURCE_LINK_CLASS}>
        {t`ANAF`}
        <span aria-hidden="true"> ↗</span>
        {newTab}
      </a>
      <BandRead fallback={<span aria-hidden="true" className="ml-1 inline-block h-3.5 w-40 animate-pulse rounded-sm bg-muted/60 align-middle" />} quiet={null}>
        <DataUntil />
      </BandRead>
    </p>
  )
}

/** How recent the bulletins are: the catalog's last month. */
function DataUntil() {
  const catalog = useNationalCatalog()
  return <>{t`, date până în ${monthText(catalog.execution.coverage.lastMonth)}`}</>
}

// ─────────────────────────────────────────────────── the year's balance ──

/** Why a printed GDP figure is not shown; null when it is shown or simply not printed. */
function refusedText(status: GdpStatus): string | null {
  if (status === 'conflicting') return t`valorile tipărite diferă`
  if (status === 'unqualified') return t`unitatea tipărită nu e cea așteptată`
  return null
}

/** Revenue and spending as two bars on one scale; the gap between them is the deficit, hatched. */
export function BalanceBars({ view }: { readonly view: YearView }) {
  const lines = useYearLines(view, [TOTAL_ITEMS.revenue, TOTAL_ITEMS.spending, TOTAL_ITEMS.balance])
  const gdp = useGdp(view)
  const revenue = lines.now(TOTAL_ITEMS.revenue)
  const spending = lines.now(TOTAL_ITEMS.spending)
  const balance = lines.now(TOTAL_ITEMS.balance)
  if (!revenue?.exact || !spending?.exact || !balance?.exact || revenue.value === null || spending.value === null) return <p className="text-sm text-muted-foreground">{t`Buletinul acestui an nu are totalurile.`}</p>
  const max = Math.max(revenue.value, spending.value)
  const deficit = deficitOf(balance.exact)
  const deficitShare = gdpSizeText(gdp.share(TOTAL_ITEMS.balance))
  const deficitRefused = refusedText(gdp.shareStatus(TOTAL_ITEMS.balance))
  return (
    <div>
      <MonoLabel className="text-primary">{t`Bilanțul, ${view.text}`}</MonoLabel>
      <dl className="mt-5 space-y-5">
        <div>
          <dt className="flex items-baseline justify-between text-sm">
            <span>{t`A încasat`}</span>
            <span className="font-semibold tabular-nums">{moneyText(revenue.exact)}</span>
          </dt>
          <dd className="mt-2 h-7 bg-muted">
            <span className="block h-full rounded-r-[3px] bg-chart-sky" style={{ width: `${(revenue.value / max) * 100}%` }} />
          </dd>
        </div>
        <div>
          <dt className="flex items-baseline justify-between text-sm">
            <span>{t`A cheltuit`}</span>
            <span className="font-semibold tabular-nums">{moneyText(spending.exact)}</span>
          </dt>
          <dd className="relative mt-2 h-7 bg-muted">
            <span className="block h-full rounded-r-[3px] bg-primary" style={{ width: `${(spending.value / max) * 100}%` }} />
            {deficit ? (
              <span
                aria-hidden="true"
                className="absolute inset-y-0 bg-[repeating-linear-gradient(135deg,hsl(var(--background)/0.55)_0_2px,transparent_2px_6px)]"
                style={{ left: `${(revenue.value / max) * 100}%`, width: `${((spending.value - revenue.value) / max) * 100}%` }}
              />
            ) : null}
          </dd>
        </div>
      </dl>
      <div className="mt-6 border-t pt-4">
        <p className="text-sm text-foreground">
          {deficit ? t`Deficit: ${sizeText(balance.exact)}` : t`Excedent: ${moneyText(balance.exact)}`}
          {deficitShare ? <span className="text-muted-foreground">{view.partial ? t`, ${deficitShare} din PIB-ul estimat pe tot anul` : t`, ${deficitShare} din PIB`}</span> : null}
          {!deficitShare && deficitRefused ? <span className="text-muted-foreground">{t`; ponderea în PIB nu e afișată: ${deficitRefused}`}</span> : null}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{t`Partea hașurată: ce s-a cheltuit peste ce s-a încasat, acoperit din împrumuturi.`}</p>
      </div>
    </div>
  )
}

/**
 * The balance while it reads, in its shape (the label, two bars with their
 * lines, the deficit and its two-line note), so the sources under it on a
 * phone don't move when it arrives.
 */
function BalancePending() {
  const bar = 'animate-pulse rounded-sm bg-muted/60'
  return (
    <div aria-hidden="true">
      <div className={cn(bar, 'h-2.5 w-28')} />
      <div className="mt-5 space-y-5">
        {[0, 1].map((index) => (
          <div key={index}>
            <div className={cn(bar, 'h-5')} />
            <div className={cn(bar, 'mt-2 h-7')} />
          </div>
        ))}
      </div>
      <div className="mt-6 border-t pt-4">
        <div className={cn(bar, 'h-5 w-2/3')} />
        <div className={cn(bar, 'mt-1 h-10')} />
      </div>
    </div>
  )
}

/** The year's balance for the year shown; a new year is a new read, as in the bands. */
function HeadBalance() {
  const catalog = useNationalCatalog()
  const { view } = useShownYear()
  return (
    <BandRead key={readKey(view, catalog)} resetKey={readKey(view, catalog)} fallback={<BalancePending />}>
      <BalanceBars view={view} />
    </BandRead>
  )
}

/** The head: the question as the headline, the year and the shortcuts; the year's balance beside it; the sources at its foot. */
export function PageHead() {
  return (
    <HeadFrame
      aside={
        <div className="border bg-card/80 p-5 backdrop-blur-[2px] sm:p-6">
          <BandRead fallback={<BalancePending />}>
            <HeadBalance />
          </BandRead>
        </div>
      }
    >
      <Crumb />
      <h1 className="mt-5 text-[clamp(2rem,10vw_-_0.2rem,2.75rem)] font-extrabold leading-[0.95] tracking-tighter text-foreground sm:text-6xl xl:text-7xl">
        {t`De unde vin banii publici`}
        <br />
        {t`și pe ce se duc`}
      </h1>
      <p className="mt-5 max-w-[46ch] text-lg leading-relaxed text-muted-foreground sm:text-xl">
        {t`Bugetul României pe înțelesul tuturor: cât încasează statul, cât cheltuie, cine cheltuie și cât se împrumută.`}
      </p>
      <YearDropdown />
      <Shortcuts />
    </HeadFrame>
  )
}

// ──────────────────────────────────────────────────────── the figures ──

function Figures({ view }: { readonly view: YearView }) {
  const { i18n } = useLingui()
  const lines = useYearLines(view, [TOTAL_ITEMS.revenue, TOTAL_ITEMS.spending, TOTAL_ITEMS.balance])
  const gdp = useGdp(view)
  const facts: HubFact[] = []
  const since = view.partial ? t`față de ${view.previous.slice(0, 4)}, aceleași luni` : t`față de ${view.year - 1}`
  const money = (key: string, exact: string | null, label: string, note: string) => {
    const figure = exact ? exactFigure(exact) : null
    if (!figure) return
    facts.push({
      key,
      value: Math.abs(figure.value),
      digits: figure.digits,
      unit: figure.scale === 'billion' ? t`mld. lei` : figure.scale === 'million' ? t`mil. lei` : t`lei`,
      label,
      note,
      link: (content, className) => (
        <a href={`#${key === 'deficit' ? 'deficit' : key === 'venituri' ? 'venituri' : 'cheltuieli'}`} className={className}>
          {content}
        </a>
      ),
    })
  }
  const changeNote = (itemId: string) => {
    const change = changeOf(lines.now(itemId)?.exact ?? null, lines.before(itemId)?.exact ?? null)
    return change === null ? '' : `${formatHubNumber(change * 100, { digits: 1, signed: true }).replace(/^-/u, '−')}% ${since}`
  }
  money('cheltuieli', lines.now(TOTAL_ITEMS.spending)?.exact ?? null, t`Cheltuieli publice, ${view.text}`, changeNote(TOTAL_ITEMS.spending))
  money('venituri', lines.now(TOTAL_ITEMS.revenue)?.exact ?? null, t`Venituri publice, ${view.text}`, changeNote(TOTAL_ITEMS.revenue))
  const balance = lines.now(TOTAL_ITEMS.balance)?.exact ?? null
  const deficitShare = gdpSizeText(gdp.share(TOTAL_ITEMS.balance))
  const deficitRefused = refusedText(gdp.shareStatus(TOTAL_ITEMS.balance))
  const deficitNote = deficitShare
    ? view.partial
      ? t`${deficitShare} din PIB-ul estimat pe tot anul`
      : t`${deficitShare} din PIB`
    : deficitRefused
      ? t`Ponderea în PIB nu e afișată: ${deficitRefused}`
      : ''
  money('deficit', balance, balance && deficitOf(balance) ? t`Deficit, ${view.text}` : t`Excedent, ${view.text}`, deficitNote)
  const percent = gdpNumber(gdp.share(TOTAL_ITEMS.spending), 1)
  const spendingRefused = refusedText(gdp.shareStatus(TOTAL_ITEMS.spending))
  const gdpRefused = refusedText(gdp.gdpStatus)
  if (percent !== null) {
    facts.push({
      key: 'pib',
      value: percent,
      digits: 1,
      unit: '%',
      label: t`Cheltuielile, din PIB`,
      note: view.partial
        ? t`din PIB-ul estimat pe tot anul`
        : gdp.gdp
          ? t`PIB ${view.year}: ${moneyText(gdp.gdp)}`
          : gdpRefused
            ? t`PIB ${view.year} nu e afișat: ${gdpRefused}`
            : '',
      link: (content, className) => (
        <a href="#deficit" className={className}>
          {content}
        </a>
      ),
    })
  }
  return (
    <>
      <HubFiguresBand facts={facts} locale={i18n.locale === 'en' ? 'en' : 'ro'} />
      {/* A year whose served data has no GDP shares, or prints them in a way we refuse: the band says which, rather than losing a figure silently. */}
      {percent === null ? (
        <p className="border-t px-5 py-3 text-xs text-muted-foreground">
          {spendingRefused ? t`Ponderile în PIB pentru ${view.text} nu sunt afișate: ${spendingRefused}.` : t`Ponderile în PIB pentru ${view.text} nu sunt disponibile în datele noastre.`}
        </p>
      ) : null}
    </>
  )
}

function FiguresFrame({ children }: { readonly children: ReactNode }) {
  return (
    <section className="border-b bg-muted/20" aria-label={t`Cifre-cheie`}>
      <RuledFrame>
        <CruxMarks />
        {children}
      </RuledFrame>
    </section>
  )
}

/**
 * The four figures' cells while they read, in `HubFiguresBand`'s shape (its
 * padding, the value's line, a label of two lines on a phone and one wider,
 * a note), so the bands below don't move when the numbers arrive.
 */
function FiguresPending() {
  const bar = 'animate-pulse rounded-sm bg-muted/60'
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4" aria-hidden="true">
      {[0, 1, 2, 3].map((index) => (
        <div
          key={index}
          className={cn('flex flex-col px-5 py-6 sm:py-7', index % 2 === 1 && 'border-l', index >= 2 && 'border-t lg:border-t-0', index >= 1 && 'lg:border-l')}
        >
          <div className={cn(bar, 'h-8 w-3/4 sm:h-10')} />
          <div className={cn(bar, 'mt-2.5 h-8 sm:h-4')} />
          <div className={cn(bar, 'mt-3 h-4 w-2/3')} />
        </div>
      ))}
    </div>
  )
}

export function FiguresBand({ view }: { readonly view: YearView }) {
  const catalog = useNationalCatalog()
  return (
    <FiguresFrame>
      <BandRead key={readKey(view, catalog)} resetKey={readKey(view, catalog)} fallback={<FiguresPending />}>
        <Figures view={view} />
      </BandRead>
    </FiguresFrame>
  )
}

/** The figures band before the page knows its year: as `FiguresBand` waits for its read. */
export function PendingFiguresBand() {
  return (
    <FiguresFrame>
      <FiguresPending />
    </FiguresFrame>
  )
}

