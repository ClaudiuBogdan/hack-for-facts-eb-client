/**
 * The lower bands: evolution, subordinates, reports, FAQ. Owned by the sections
 * subagent. Each export renders the *body* of its band; the layouts render the
 * numbered `SectionRail` heading above it.
 *
 * The one piece with an SSR hazard is the evolution chart: Recharts needs a
 * measured width, so it renders through `SafeResponsiveContainer`, which
 * ships an empty sized box on the server and mounts the SVG after hydration.
 * The chart is therefore never the only carrier of the numbers — the table
 * beside it is server-rendered and holds every value the bars do.
 */
import { Link } from '@tanstack/react-router'
import { ArrowRight, Download } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts'
import { SafeResponsiveContainer } from '@/components/charts/safe-responsive-container'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { cn, formatCurrency, formatNumber, getUserLocale } from '@/lib/utils'
import { MonoLabel } from './entity-page.parts'
import type { EntityPageData, EntityPagePieceProps, EntityPageReport, EntityPageState } from './entity-page.types'

// ---------------------------------------------------------------------------
// Money scale — shared by the chart, its table and the subordinates list.
// ---------------------------------------------------------------------------

const BILLION = 1_000_000_000

/**
 * How the band shows money. Totals are in billions of lei with two decimals so
 * a column of them aligns; per-capita values are whole lei per resident.
 * Returns `null` for the divisor when the entity has no population, in which
 * case the band falls back to totals rather than printing a unit it cannot
 * honour.
 */
function getMoneyScale({
  data,
  state,
}: {
  readonly data: EntityPageData
  readonly state: EntityPageState
}): {
  readonly perCapita: boolean
  readonly unit: string
  readonly scale: (amount: number) => number
  readonly formatCell: (amount: number) => string
  readonly formatTick: (amount: number) => string
  readonly formatFull: (amount: number) => string
} {
  const population = data.entity.uat?.population ?? null
  const perCapita = state.normalization === 'per_capita' && population !== null && population > 0
  const locale = getUserLocale() === 'ro' ? 'ro-RO' : 'en-GB'
  const twoDecimals = new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  if (perCapita && population) {
    return {
      perCapita,
      unit: 'lei / locuitor',
      scale: (amount) => amount / population,
      formatCell: (amount) => formatNumber(Math.round(amount / population)),
      formatTick: (amount) => formatNumber(Math.round(amount)),
      formatFull: (amount) => `${formatNumber(Math.round(amount / population))} lei / locuitor`,
    }
  }
  return {
    perCapita: false,
    unit: 'mld. lei',
    scale: (amount) => amount / BILLION,
    formatCell: (amount) => twoDecimals.format(amount / BILLION),
    formatTick: (amount) => formatNumber(amount),
    formatFull: (amount) => formatCurrency(amount, 'standard'),
  }
}

/**
 * Round tick values for the y axis: a step of 1, 2, 2.5 or 5 × 10^k chosen so
 * the axis carries four to six ticks, and a top tick at or above the maximum.
 */
function niceTicks(max: number): readonly number[] {
  if (!(max > 0)) return [0]
  const rough = max / 4
  const magnitude = 10 ** Math.floor(Math.log10(rough))
  const candidates = [1, 2, 2.5, 5, 10].map((factor) => factor * magnitude)
  const step = candidates.find((candidate) => candidate >= rough) ?? candidates[candidates.length - 1]
  const count = Math.ceil(max / step)
  return Array.from({ length: count + 1 }, (_, index) => Number((index * step).toFixed(6)))
}

/** A signed figure for the balance column: `+0,49` / `−1,70`. Sign in text, never colour. */
function withSign(formatted: string, value: number): string {
  if (value < 0) return `−${formatted.replace(/^-/, '')}`
  if (value > 0) return `+${formatted}`
  return formatted
}

// ---------------------------------------------------------------------------
// 04 · Evoluție
// ---------------------------------------------------------------------------

const SERIES = {
  income: { key: 'income', label: 'Venituri', fill: 'hsl(var(--chart-1))', swatch: 'bg-primary' },
  expenses: { key: 'expenses', label: 'Cheltuieli', fill: 'hsl(var(--chart-4))', swatch: 'bg-muted-foreground/55' },
} as const

type TrendRow = {
  readonly year: number
  readonly income: number
  readonly expenses: number
  readonly balance: number
}

type TrendTooltipPayload = {
  readonly dataKey?: string | number
  readonly value?: number | string
  readonly payload?: TrendRow
}

function TrendTooltip({
  active,
  payload,
  label,
  formatFull,
}: {
  readonly active?: boolean
  readonly payload?: ReadonlyArray<TrendTooltipPayload>
  readonly label?: string | number
  readonly formatFull: (amount: number) => string
}) {
  if (!active || !payload?.length) return null
  const row = payload[0]?.payload
  if (!row) return null
  return (
    <div className="border bg-background px-3 py-2 shadow-md">
      <MonoLabel className="block text-foreground">{label}</MonoLabel>
      <dl className="mt-2 space-y-1 text-xs">
        <div className="flex items-baseline justify-between gap-6">
          <dt className="flex items-center gap-1.5 text-muted-foreground">
            <span aria-hidden="true" className={cn('size-2', SERIES.income.swatch)} />
            {SERIES.income.label}
          </dt>
          <dd className="tabular-nums text-foreground">{formatFull(row.income)}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-6">
          <dt className="flex items-center gap-1.5 text-muted-foreground">
            <span aria-hidden="true" className={cn('size-2', SERIES.expenses.swatch)} />
            {SERIES.expenses.label}
          </dt>
          <dd className="tabular-nums text-foreground">{formatFull(row.expenses)}</dd>
        </div>
      </dl>
    </div>
  )
}

export function EntityPageEvolution({ data, state }: EntityPagePieceProps) {
  const money = getMoneyScale({ data, state })
  const rows: readonly TrendRow[] = data.trend.map((point) => ({
    year: point.year,
    income: point.income,
    expenses: point.expenses,
    balance: point.income - point.expenses,
  }))
  const chartRows = rows.map((row) => ({
    year: String(row.year),
    income: money.scale(row.income),
    expenses: money.scale(row.expenses),
    raw: row,
  }))
  const firstYear = rows[0]?.year
  const lastYear = rows[rows.length - 1]?.year
  const ticks = niceTicks(Math.max(...chartRows.flatMap((row) => [row.income, row.expenses])))
  const tickStyle = { fill: 'hsl(var(--muted-foreground))', fontSize: 11 }

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-10">
      {/* The chart. `figure` because the table is its caption in the literal
          sense: the same numbers, in the form a screen reader and the server
          can carry. */}
      <figure className="min-w-0 lg:col-span-7">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          <MonoLabel className="leading-relaxed text-muted-foreground">
            Venituri și cheltuieli · {firstYear}–{lastYear} ·{' '}
            <span className="whitespace-nowrap">{money.unit}</span>
          </MonoLabel>
          <ul className="flex items-center gap-4" aria-label="Legendă">
            {[SERIES.income, SERIES.expenses].map((series) => (
              <li key={series.key} className="flex items-center gap-1.5">
                <span aria-hidden="true" className={cn('size-2', series.swatch)} />
                <MonoLabel className="text-foreground">{series.label}</MonoLabel>
              </li>
            ))}
          </ul>
        </div>
        {/* Hidden from the tree on purpose: the table beside it is the
            accessible twin, and Recharts' keyboard layer is off so nothing
            focusable sits inside an aria-hidden region. */}
        <div className="mt-4 h-56 w-full sm:h-64" aria-hidden="true">
          <SafeResponsiveContainer width="100%" height="100%" minHeight={200}>
            <BarChart
              data={chartRows}
              accessibilityLayer={false}
              barGap={2}
              barCategoryGap="28%"
              margin={{ top: 8, right: 4, bottom: 0, left: 0 }}
            >
              <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="0" />
              <XAxis
                dataKey="year"
                tickLine={false}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                tick={tickStyle}
                className="font-mono tabular-nums"
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={money.perCapita ? 52 : 36}
                tick={tickStyle}
                ticks={[...ticks]}
                domain={[0, ticks[ticks.length - 1] ?? 0]}
                tickFormatter={money.formatTick}
                className="font-mono tabular-nums"
              />
              <Tooltip
                cursor={{ fill: 'hsl(var(--muted))' }}
                content={<TrendTooltip formatFull={money.formatFull} />}
                wrapperStyle={{ outline: 'none' }}
              />
              <Bar
                dataKey={SERIES.income.key}
                name={SERIES.income.label}
                fill={SERIES.income.fill}
                maxBarSize={24}
                radius={[4, 4, 0, 0]}
                isAnimationActive={false}
              />
              <Bar
                dataKey={SERIES.expenses.key}
                name={SERIES.expenses.label}
                fill={SERIES.expenses.fill}
                maxBarSize={24}
                radius={[4, 4, 0, 0]}
                isAnimationActive={false}
              />
            </BarChart>
          </SafeResponsiveContainer>
        </div>
        <figcaption className="mt-3">
          <MonoLabel className="block leading-relaxed text-muted-foreground">
            Valorile sunt cele raportate; nu sunt ajustate cu inflația
          </MonoLabel>
        </figcaption>
      </figure>

      {/* The numbers the bars stand for. Current year highlighted, because the
          rest of the page describes that year. */}
      <div className="min-w-0 lg:col-span-5">
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">
            Venituri, cheltuieli și sold pe ani, în {money.unit}
          </caption>
          <thead>
            <tr className="border-y">
              <th scope="col" className="py-2 pr-3 text-left">
                <MonoLabel className="text-muted-foreground">An</MonoLabel>
              </th>
              <th scope="col" className="py-2 px-3 text-right">
                <MonoLabel className="text-muted-foreground">Venituri</MonoLabel>
              </th>
              <th scope="col" className="py-2 px-3 text-right">
                <MonoLabel className="text-muted-foreground">Cheltuieli</MonoLabel>
              </th>
              <th scope="col" className="py-2 pl-3 text-right">
                <MonoLabel className="text-muted-foreground">Sold</MonoLabel>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const current = row.year === state.year
              return (
                <tr
                  key={row.year}
                  aria-current={current ? 'true' : undefined}
                  className={cn('border-b', current && 'bg-muted/40 font-medium text-foreground')}
                >
                  <th scope="row" className="py-2.5 pr-3 text-left font-mono text-xs font-normal tabular-nums">
                    {row.year}
                  </th>
                  <td className="py-2.5 px-3 text-right tabular-nums">{money.formatCell(row.income)}</td>
                  <td className="py-2.5 px-3 text-right tabular-nums">{money.formatCell(row.expenses)}</td>
                  <td className="py-2.5 pl-3 text-right tabular-nums">
                    {withSign(money.formatCell(row.balance), row.balance)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <MonoLabel className="mt-3 block leading-relaxed text-muted-foreground">
          {money.unit} · {data.period.provenance}
        </MonoLabel>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// 05 · Instituții subordonate
// ---------------------------------------------------------------------------

export function EntityPageSubordinates({ data, state }: EntityPagePieceProps) {
  const money = getMoneyScale({ data, state })
  const sorted = [...data.subordinates].sort((a, b) => b.totalExpenses - a.totalExpenses)
  const amountOf = (amount: number) =>
    money.perCapita ? money.formatFull(amount) : formatCurrency(amount, 'compact')

  return (
    <div>
      <ul className="divide-y border-y">
        {sorted.map((row) => (
          <li
            key={row.cui}
            className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-4 gap-y-1.5 py-3 sm:grid-cols-[minmax(0,1fr)_10rem_6rem_7rem] sm:gap-x-6 sm:gap-y-0"
          >
            <Link
              to="/entities/$cui"
              params={{ cui: row.cui }}
              className="min-w-0 text-sm font-medium text-foreground underline-offset-4 hover:text-primary hover:underline"
            >
              {row.name}
            </Link>
            <span className="whitespace-nowrap text-right text-sm tabular-nums text-foreground sm:order-last">
              {amountOf(row.totalExpenses)}
            </span>
            <MonoLabel className="col-span-2 min-w-0 leading-relaxed text-muted-foreground sm:col-span-1 sm:text-left">
              {row.kind}
              <span className="sm:hidden"> · </span>
              <span className="whitespace-nowrap text-muted-foreground/80 tabular-nums sm:hidden">CUI {row.cui}</span>
            </MonoLabel>
            <MonoLabel className="hidden leading-relaxed text-muted-foreground/80 tabular-nums sm:block sm:text-right">
              CUI {row.cui}
            </MonoLabel>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-baseline sm:justify-between">
        <Link
          to="/entities"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          Vezi toate {formatNumber(data.subordinatesTotal)}
          <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
        <MonoLabel className="leading-relaxed text-muted-foreground">
          {sorted.length} din {data.subordinatesTotal} · cheltuieli {data.period.label} · {data.period.provenance}
        </MonoLabel>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// 06 · Rapoarte sursă
// ---------------------------------------------------------------------------

function formatReportDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) return iso
  const locale = getUserLocale() === 'ro' ? 'ro-RO' : 'en-GB'
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(date)
}

function DownloadLink({ report, className }: { readonly report: EntityPageReport; readonly className?: string }) {
  return (
    <a
      href={report.downloadUrl}
      rel="noopener"
      target="_blank"
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap text-sm font-medium text-primary underline-offset-4 hover:underline',
        className,
      )}
      aria-label={`Descarcă raportul ${report.periodLabel}`}
    >
      <Download aria-hidden="true" className="size-4" />
      Descarcă
    </a>
  )
}

export function EntityPageReports({ data }: EntityPagePieceProps) {
  const reports = data.reports
  const headCell = 'py-2 text-left'

  return (
    <div>
      <MonoLabel className="block leading-relaxed text-muted-foreground">
        Rapoartele de execuție publicate de MFIN pentru acest ordonator
      </MonoLabel>

      {/* Desktop: a real table, so the column captions are `th scope="col"`. */}
      <table className="mt-4 hidden w-full border-collapse text-sm sm:table">
        <caption className="sr-only">Rapoartele de execuție sursă</caption>
        <thead>
          <tr className="border-y">
            <th scope="col" className={cn(headCell, 'pr-4')}>
              <MonoLabel className="text-muted-foreground">Perioadă</MonoLabel>
            </th>
            <th scope="col" className={cn(headCell, 'px-4')}>
              <MonoLabel className="text-muted-foreground">Tip</MonoLabel>
            </th>
            <th scope="col" className={cn(headCell, 'px-4')}>
              <MonoLabel className="text-muted-foreground">Publicat</MonoLabel>
            </th>
            <th scope="col" className={cn(headCell, 'px-4')}>
              <MonoLabel className="text-muted-foreground">Sector</MonoLabel>
            </th>
            <th scope="col" className="py-2 pl-4 text-right">
              <span className="sr-only">Descărcare</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {reports.map((report) => (
            <tr key={report.reportId} className="border-b">
              <th scope="row" className="py-3 pr-4 text-left font-medium text-foreground">
                {report.periodLabel}
              </th>
              <td className="py-3 px-4 text-muted-foreground">{report.reportType}</td>
              <td className="py-3 px-4 tabular-nums text-muted-foreground">{formatReportDate(report.reportDate)}</td>
              <td className="py-3 px-4 text-muted-foreground">{report.budgetSector}</td>
              <td className="py-3 pl-4 text-right">
                <DownloadLink report={report} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Phones: the same rows, two lines each, no horizontal scroll. Display
          is switched on the wrapper, not on table parts, so the table above
          keeps its semantics where it is shown. */}
      <ul className="mt-4 divide-y border-y sm:hidden">
        {reports.map((report) => (
          <li key={report.reportId} className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-4 gap-y-1.5 py-3">
            <span className="text-sm font-medium text-foreground">
              {report.periodLabel}
              <span className="text-muted-foreground"> · {report.reportType}</span>
            </span>
            <DownloadLink report={report} />
            <MonoLabel className="col-span-2 leading-relaxed text-muted-foreground">
              Publicat <span className="text-foreground tabular-nums">{formatReportDate(report.reportDate)}</span> ·{' '}
              {report.budgetSector}
            </MonoLabel>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ---------------------------------------------------------------------------
// 07 · Întrebări frecvente
// ---------------------------------------------------------------------------

function buildFaq(data: EntityPageData): ReadonlyArray<{ readonly id: string; readonly q: string; readonly a: string }> {
  return [
    {
      id: 'executie',
      q: 'Ce înseamnă „execuție bugetară”?',
      a: 'Execuția bugetară arată câți bani au intrat și au ieșit efectiv din bugetul instituției într-o perioadă, spre deosebire de bugetul aprobat, care este un plan. Cifrele de pe această pagină sunt încasările și plățile raportate pentru perioada afișată.',
    },
    {
      id: 'sold',
      q: 'De ce veniturile nu sunt egale cu cheltuielile?',
      a: 'Veniturile și cheltuielile se înregistrează pe măsură ce sunt încasate, respectiv plătite, iar ritmul lor diferă în cursul anului. Diferența este soldul perioadei: un excedent se reportează, iar un deficit se acoperă din excedentele anilor trecuți sau din împrumuturi.',
    },
    {
      id: 'locuitor',
      q: 'Ce arată opțiunea „pe locuitor”?',
      a: 'Împarte fiecare sumă la populația unității administrativ-teritoriale, ca să poți compara instituții de mărimi diferite. Populația folosită este cea din datele oficiale asociate entității, nu o estimare.',
    },
    {
      id: 'sursa',
      q: 'De unde vin cifrele și cât de recente sunt?',
      a: `Datele provin din rapoartele de execuție bugetară publicate de Ministerul Finanțelor prin platforma Transparența bugetară. Pagina afișează perioada și data raportării lângă fiecare cifră: ${data.period.provenance}. Datele operative pot fi revizuite la următoarea raportare.`,
    },
  ]
}

export function EntityPageFaq({ data }: EntityPagePieceProps) {
  const items = buildFaq(data)
  return (
    <Accordion type="single" collapsible defaultValue={items[0]?.id} className="max-w-3xl border-t">
      {items.map((item) => (
        <AccordionItem key={item.id} value={item.id}>
          <AccordionTrigger className="gap-4 py-4 text-left text-sm font-medium text-foreground hover:no-underline sm:text-base [&>svg]:size-4">
            {item.q}
          </AccordionTrigger>
          <AccordionContent className="pb-5">
            <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">{item.a}</p>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  )
}
