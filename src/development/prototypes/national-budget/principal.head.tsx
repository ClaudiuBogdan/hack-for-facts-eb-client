import { useState, type ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { useLingui } from '@lingui/react/macro'
import { ChevronDown } from 'lucide-react'

import { MonoLabel } from '@/components/landing-skin/mono-label'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { CornerTicks, CruxMarks, TwoLayerLattice } from '@/features/landing/components/hero-chrome'
import { BandRead } from '@/features/national-budget/analytics/components/analytics-parts'
import { useNationalCatalog } from '@/features/national-budget/analytics/hooks/use-national-budget-analytics'
import { monthText } from '@/features/national-budget/analytics/lib/analytics-format'
import { changeOf } from '@/features/national-budget/analytics/lib/analytics-view'
import { exactFigure, exactRounded } from '@/features/national-budget/analytics/lib/exact'
import { HUB_SHORTCUT_LINK_CLASS, HubPending } from '@/features/statistics/components/hub/hub-chrome'
import { HubFiguresBand, type HubFact } from '@/features/statistics/components/hub/hub-figures'
import { cn } from '@/lib/utils'
import { RankedRows, YearColumns, type YearBar } from './principal.charts'
import { TOTAL_ITEMS, anafTotal, useAnafAuthorities, useGdp, useTotalsHistory, useYearLines, type YearView } from './principal.data'
import { authorityName, deficitOf, gdpNumber, gdpSizeText, gdpText, moneyText, shareText, sizeText } from './principal.format'
import { AnalyticsLink, type BandDefinition } from './principal.shell'
import { formatHubNumber } from '@/features/private-companies/lib/hub-format'

/**
 * The page's head, in the hubs' language (the lattice, the corner ticks, the
 * mono breadcrumb), and its figures band. Three designs of the head; the
 * figures are one band under every head.
 */

export type HeadProps = {
  readonly view: YearView
  readonly views: readonly YearView[]
  readonly onYear: (year: number) => void
}

function HeadFrame({ children, aside }: { readonly children: ReactNode; readonly aside: ReactNode }) {
  return (
    <section className="relative border-b">
      <TwoLayerLattice idPrefix="national-budget-citizens" />
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

/** The page's year, one dropdown: every year the bulletins cover, the newest first; a year without a full-year bulletin is disabled. */
function YearDropdown({ view, views, onYear }: HeadProps) {
  return (
    <label className="mt-6 inline-flex items-center gap-3">
      <MonoLabel className="text-muted-foreground/70">{t`Anul`}</MonoLabel>
      <span className="relative inline-flex">
        <select
          value={view.year}
          onChange={(event) => onYear(Number(event.target.value))}
          className="min-h-11 cursor-pointer appearance-none rounded-sm border bg-background py-1 pl-4 pr-10 text-base font-semibold tabular-nums text-foreground transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {[...views].reverse().map((entry) => (
            <option key={entry.year} value={entry.year} disabled={entry.gap !== null}>
              {entry.partial ? t`${entry.year}, până în ${monthText(entry.month).replace(/\s*\d{4}$/u, '')}` : entry.year}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
      </span>
    </label>
  )
}

function Shortcuts() {
  return (
    <nav aria-label={t`Scurtături`} className="mt-5">
      <MonoLabel className="block text-muted-foreground/70 sm:inline sm:align-middle">{t`Sau mergi direct la`}</MonoLabel>
      <span className="flex flex-wrap gap-x-4 sm:ml-4 sm:inline-flex sm:gap-y-1.5 sm:align-middle">
        <Link to="/national-budget/analytics" className={HUB_SHORTCUT_LINK_CLASS}>
          {t`Analize avansate`}
        </Link>
        <Link to="/national-budget/analytics" search={{ tip: 'lege' }} className={HUB_SHORTCUT_LINK_CLASS}>
          {t`Legea bugetului`}
        </Link>
        <Link to="/national-budget/analytics" search={{ tip: 'sold', dupa: 'timp' }} className={HUB_SHORTCUT_LINK_CLASS}>
          {t`Deficitul, an de an`}
        </Link>
      </span>
    </nav>
  )
}

const SOURCE_LINK_CLASS = 'font-medium text-foreground underline-offset-4 hover:underline'

/** The sources in a few words, each a link, and how recent the data is: the procurement hub's source line. */
function SourcesLine({ className }: { readonly className?: string }) {
  const catalog = useNationalCatalog()
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
      {t`, date până în ${monthText(catalog.execution.coverage.lastMonth)}`}
    </p>
  )
}

// ─────────────────────────────────────────────────── the year's balance ──

/** Revenue and spending as two bars on one scale; the gap between them is the deficit, hatched. */
function BalanceBars({ view }: { readonly view: YearView }) {
  const lines = useYearLines(view, [TOTAL_ITEMS.revenue, TOTAL_ITEMS.spending, TOTAL_ITEMS.balance])
  const gdp = useGdp(view)
  const revenue = lines.now(TOTAL_ITEMS.revenue)
  const spending = lines.now(TOTAL_ITEMS.spending)
  const balance = lines.now(TOTAL_ITEMS.balance)
  if (!revenue?.exact || !spending?.exact || !balance?.exact || revenue.value === null || spending.value === null) return <p className="text-sm text-muted-foreground">{t`Buletinul acestui an nu are totalurile.`}</p>
  const max = Math.max(revenue.value, spending.value)
  const deficit = deficitOf(balance.exact)
  const deficitShare = gdpSizeText(gdp.share(TOTAL_ITEMS.balance))
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
          {deficitShare ? <span className="text-muted-foreground">{t`, ${deficitShare} din PIB`}</span> : null}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{t`Partea hașurată: ce s-a cheltuit peste ce s-a încasat, acoperit din împrumuturi.`}</p>
      </div>
    </div>
  )
}

/** A: the question as the headline; the year's balance beside it. */
function HeadQuestion(props: HeadProps) {
  return (
    <HeadFrame
      aside={
        <div className="border bg-card/80 p-5 backdrop-blur-[2px] sm:p-6">
          <BandRead resetKey={props.view.label} fallback={<HubPending rows={5} />}>
            <BalanceBars view={props.view} />
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
      <YearDropdown {...props} />
      <Shortcuts />
    </HeadFrame>
  )
}

// ─────────────────────────────────────────────────────── the number ──

function SpendingHeadline({ view }: { readonly view: YearView }) {
  const lines = useYearLines(view, [TOTAL_ITEMS.spending])
  const gdp = useGdp(view)
  const spending = lines.now(TOTAL_ITEMS.spending)?.exact ?? null
  const share = gdpText(gdp.share(TOTAL_ITEMS.spending))
  if (!spending) return null
  return (
    <>
      <h1 className="mt-5 text-5xl font-extrabold leading-[0.95] tracking-tighter text-foreground tabular-nums sm:text-7xl xl:text-8xl">{moneyText(spending)}</h1>
      <p className="mt-5 max-w-[44ch] text-lg leading-relaxed text-muted-foreground sm:text-xl">
        {view.partial ? t`a cheltuit statul român în ${view.text}` : t`a cheltuit statul român în ${view.year}`}
        {share ? t`, cât ${share} din tot ce a produs economia într-un an.` : '.'}
      </p>
    </>
  )
}

function SpendingYears({ view, onYear }: HeadProps) {
  const history = useTotalsHistory()
  const bars: YearBar[] = []
  for (let year = 2006; year <= history.complete; year += 1) {
    const cell = history.yearCells.get(TOTAL_ITEMS.spending)?.get(String(year))
    const exact = cell?.exact ?? null
    bars.push({ year, value: exact ? exactRounded(exact, 9, 1) : null, text: exact ? moneyText(exact) : null, gap: exact ? null : t`fără buletin de decembrie` })
  }
  const partial = history.monthCells.get(TOTAL_ITEMS.spending)?.get(history.lastMonth)
  if (!history.lastMonth.endsWith('-12') && partial?.exact) {
    bars.push({ year: Number(history.lastMonth.slice(0, 4)), value: exactRounded(partial.exact, 9, 1), text: moneyText(partial.exact), partial: true, note: t`ian.–${history.lastMonth.slice(5)} ${history.lastMonth.slice(0, 4)}` })
  }
  return <YearColumns bars={bars} selected={view.year} onSelect={onYear} label={t`Cheltuieli publice pe an · alege un an`} height="h-44 sm:h-56" />
}

/** B: the year's spending is the headline; the years beside it pick the year. */
function HeadNumber(props: HeadProps) {
  return (
    <HeadFrame
      aside={
        <div className="border bg-card/80 p-5 backdrop-blur-[2px] sm:p-6">
          <BandRead resetKey="years" fallback={<HubPending rows={6} />}>
            <SpendingYears {...props} />
          </BandRead>
          <p className="mt-6 text-xs leading-relaxed text-muted-foreground">{t`Bugetul general consolidat: toate bugetele publice, fără transferurile dintre ele. Lei ai fiecărui an.`}</p>
        </div>
      }
    >
      <Crumb />
      <BandRead resetKey={props.view.label} fallback={<HubPending rows={3} className="mt-6 max-w-md" />}>
        <SpendingHeadline view={props.view} />
      </BandRead>
      <Shortcuts />
    </HeadFrame>
  )
}

// ─────────────────────────────────────────────────── who spends most ──

function TopAuthorities({ view }: { readonly view: YearView }) {
  const { now } = useAnafAuthorities(view)
  const [more, setMore] = useState(false)
  const total = anafTotal(now)
  const widest = Number(now[0]?.lei ?? 1)
  const rows = now.slice(0, more ? 10 : 5).map((row) => ({
    key: row.cui,
    label: authorityName(row.cui, row.name),
    sub: shareText(row.lei, total),
    amount: moneyText(row.lei),
    bar: (Number(row.lei) / widest) * 100,
    href: `/entities/${row.cui}`,
  }))
  return (
    <div>
      <MonoLabel className="text-primary">{t`Cine cheltuie cel mai mult, ${view.text}`}</MonoLabel>
      <RankedRows className="mt-4" rows={rows} />
      <button type="button" onClick={() => setMore(!more)} className="mt-3 inline-flex min-h-11 items-center text-sm font-medium text-foreground underline-offset-4 hover:underline">
        {more ? t`Arată mai puține` : t`Arată mai multe`}
      </button>
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{t`Plățile din bugetul de stat ale ordonatorilor principali, raportate la ANAF; ponderea, din bugetul de stat.`}</p>
    </div>
  )
}

/** C: the procurement hub's head: the headline and the year, the ministries that spend most beside it. */
function HeadWho(props: HeadProps) {
  return (
    <HeadFrame
      aside={
        <div className="border bg-card/80 p-5 backdrop-blur-[2px] sm:p-6">
          <BandRead resetKey={props.view.label} fallback={<HubPending rows={7} />}>
            <TopAuthorities view={props.view} />
          </BandRead>
        </div>
      }
    >
      <Crumb />
      <h1 className="mt-5 text-[clamp(2rem,10vw_-_0.2rem,2.75rem)] font-extrabold leading-[0.95] tracking-tighter text-foreground sm:text-6xl xl:text-7xl">
        {t`Bugetul țării,`}
        <br />
        {t`pe înțelesul tuturor`}
      </h1>
      <p className="mt-5 max-w-[46ch] text-lg leading-relaxed text-muted-foreground sm:text-xl">{t`Cât încasează și cât cheltuie statul, pe ce și prin cine, an de an, din 2006.`}</p>
      <YearDropdown {...props} />
      <Shortcuts />
    </HeadFrame>
  )
}

export const HEAD_VARIANTS: BandDefinition = {
  id: 'cap',
  nav: t`Capul paginii`,
  variants: [
    { key: 'intrebare', title: t`Întrebarea + bilanțul`, note: t`Titlul e întrebarea; alături, încasările și cheltuielile anului ca două bare, deficitul hașurat.`, component: () => null },
    { key: 'cifra', title: t`Cifra + anii`, note: t`Titlul e suma cheltuită; alături, anii ca o diagramă pe care alegi anul.`, component: () => null },
    { key: 'cine', title: t`Titlu + cine cheltuie`, note: t`Ca pagina de achiziții: titlul și anul; alături, ministerele care cheltuie cel mai mult (ANAF).`, component: () => null },
  ],
}

export function PageHead({ variant, ...props }: HeadProps & { readonly variant: string }) {
  if (variant === 'cifra') return <HeadNumber {...props} />
  if (variant === 'cine') return <HeadWho {...props} />
  return <HeadQuestion {...props} />
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
  money('deficit', balance, balance && deficitOf(balance) ? t`Deficit, ${view.text}` : t`Excedent, ${view.text}`, deficitShare ? t`${deficitShare} din PIB` : '')
  const percent = gdpNumber(gdp.share(TOTAL_ITEMS.spending), 1)
  if (percent !== null) {
    facts.push({
      key: 'pib',
      value: percent,
      digits: 1,
      unit: '%',
      label: t`Cheltuielile, din PIB`,
      note: view.partial ? t`din PIB-ul estimat pe tot anul` : gdp.gdp ? t`PIB ${view.year}: ${moneyText(gdp.gdp)}` : '',
      link: (content, className) => (
        <a href="#deficit" className={className}>
          {content}
        </a>
      ),
    })
  }
  return <HubFiguresBand facts={facts} locale={i18n.locale === 'en' ? 'en' : 'ro'} />
}

export function FiguresBand({ view }: { readonly view: YearView }) {
  return (
    <section className="border-b bg-muted/20" aria-label={t`Cifre-cheie`}>
      <RuledFrame>
        <CruxMarks />
        <BandRead resetKey={view.label} fallback={<div className="px-5 py-7"><HubPending rows={2} /></div>}>
          <Figures view={view} />
        </BandRead>
      </RuledFrame>
    </section>
  )
}

export { AnalyticsLink }
