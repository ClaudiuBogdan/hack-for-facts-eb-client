import { Fragment, useState } from 'react'
import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { plural, t } from '@lingui/core/macro'
import { Trans, useLingui } from '@lingui/react/macro'
import { Check, Copy } from 'lucide-react'
import { IndicatorToggle } from '@/components/landing-skin/indicator-toggle'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { CountUpValue } from '@/features/landing/components/count-up'
import { STATUS_ACTIVE } from '@/features/private-companies/lib/company-status-codes'
import { countyDirectorySearch } from '@/features/private-companies/lib/hub-counties'
import { formatHubNumber } from '@/features/private-companies/lib/hub-format'
import { cn } from '@/lib/utils'
import type { PrivateCompanyFinancialSummary, PrivateCompanyFinancialYear } from '@/schemas/private-company'
import { CombinedYears, YearBars, type BarSeries } from './company-page.charts'
import { netResultOf, type CompanyPageModel, type SizeClass, type StatusKind } from './company-page.data'
import type { ProcurementGrainStats, ProcurementRecordRow } from './company-page.fixtures'
import { count, dateText, moneyCell, moneyFigure, moneyText, moneyTick, monthText, percent, yearRanges } from './company-page.format'
import { FINANCIAL_MEASURES, type FinancialMeasure, type PaymentGrain } from './company-page.state'

/**
 * The pieces the three layouts share. Each answers one question from the
 * model — or says in a line that the record cannot — and nothing about the
 * database; the layouts differ in how they arrange them, not in what they say.
 * Every sentence is computed, so the same page reads true for a national
 * champion, a two-person firm with a decade of losses, and a company that
 * never filed a statement.
 */

export const ROW_LINK_CLASS = 'transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

// ─────────────────────────────────────────────── identity ──

/** A heading's scale by the name's length: registry names run from „66 Jack SRL" to seventy characters. */
export function nameLength(name: string): 'short' | 'medium' | 'long' {
  return name.length <= 20 ? 'short' : name.length <= 36 ? 'medium' : 'long'
}

export function CompanyKicker({ model, className }: { readonly model: CompanyPageModel; readonly className?: string }) {
  const { place, mainActivity } = model
  return (
    <MonoLabel className={cn('flex flex-wrap items-center gap-x-2 gap-y-1 text-muted-foreground', className)}>
      <Link to="/companies" className="hover:text-foreground">
        <Trans>Firme</Trans>
      </Link>
      {place.countyCode && place.county ? (
        <>
          <span aria-hidden="true">/</span>
          <Link to="/companies/search" search={countyDirectorySearch(place.countyCode)} className="hover:text-foreground">
            {place.county}
          </Link>
        </>
      ) : null}
      {mainActivity?.division && mainActivity.divisionLabel ? (
        <>
          <span aria-hidden="true">/</span>
          <Link to="/companies/search" search={{ caen: mainActivity.division, status: [STATUS_ACTIVE] }} className="hover:text-foreground">
            {mainActivity.divisionLabel}
          </Link>
        </>
      ) : null}
    </MonoLabel>
  )
}

/** The company in one sentence: what it is, where, since when, what it does. */
export function companySentence(model: CompanyPageModel): string {
  const form = model.legalFormName ?? t`Firmă`
  const where = model.place.label
  const founded = model.foundedYear
  const first =
    where && founded ? t`${form} din ${where}, înregistrată în ${founded}.`
    : where ? t`${form} din ${where}.`
    : founded ? t`${form} înregistrată în ${founded}.`
    : `${form}.`
  const activity = model.mainActivity?.label
  return activity ? `${first} ${t`Activitatea principală: ${activity.toLocaleLowerCase('ro-RO')}.`}` : first
}

const STATUS_TONE: Record<StatusKind, string> = {
  active: 'bg-emerald-500',
  insolvency: 'bg-amber-500',
  dissolution: 'bg-amber-500',
  'struck-off': 'bg-destructive',
  other: 'bg-muted-foreground',
}

function statusWord(model: CompanyPageModel): string {
  const label = model.status.label
  if (!label) return t`Stare necunoscută`
  return label.charAt(0).toLocaleUpperCase('ro-RO') + label.slice(1)
}

export function StatusChips({ model, className }: { readonly model: CompanyPageModel; readonly className?: string }) {
  const { fiscal } = model.profile
  return (
    <ul className={cn('flex flex-wrap gap-2', className)}>
      <li className="inline-flex items-center gap-1.5 border px-2.5 py-1 text-xs font-medium text-foreground">
        <span className={cn('size-1.5 rounded-full', STATUS_TONE[model.status.kind])} aria-hidden="true" />
        {model.status.kind === 'active' ? <Trans>În funcțiune</Trans> : statusWord(model)}
      </li>
      {fiscal.vatPayer ? (
        <li className="inline-flex items-center border px-2.5 py-1 text-xs text-muted-foreground">
          <Trans>Plătitoare de TVA</Trans>
        </li>
      ) : null}
      {fiscal.inactive ? (
        <li className="inline-flex items-center border border-destructive/40 px-2.5 py-1 text-xs font-medium text-destructive">
          <Trans>Inactivă fiscal la ANAF</Trans>
        </li>
      ) : null}
    </ul>
  )
}

/**
 * What the registry status means for the figures below it, for a company not
 * in business. Said once, in the header, so no figure has to repeat it.
 */
export function StatusNotice({ model, className }: { readonly model: CompanyPageModel; readonly className?: string }) {
  const { kind, label } = model.status
  if (kind === 'active' || kind === 'other') return null
  // The registry's own word only when it says more than the notice („faliment", „reorganizare judiciară").
  const detail = label && !/^insolven|^dizolv/iu.test(label) ? label : null
  const message =
    kind === 'struck-off' ? t`Radiată din registrul comerțului: cifrele de mai jos sunt istoria ei.`
    : kind === 'insolvency' ? (detail ? t`În procedura insolvenței: ${detail}.` : t`În procedura insolvenței.`)
    : detail ? t`În dizolvare sau lichidare: ${detail}.`
    : t`În dizolvare sau lichidare.`
  return (
    <p className={cn('border-l-2 py-0.5 pl-3 text-sm leading-relaxed text-foreground', kind === 'struck-off' ? 'border-destructive' : 'border-amber-500', className)}>
      {message}
    </p>
  )
}

export function CopyCui({ cui, className, bare = false }: { readonly cui: string; readonly className?: string; readonly bare?: boolean }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard?.writeText(cui).then(() => {
          setCopied(true)
          window.setTimeout(() => setCopied(false), 1500)
        })
      }}
      className={cn('inline-flex items-center gap-1.5 font-mono text-xs tabular-nums text-foreground transition-colors hover:text-primary', className)}
      aria-label={t`Copiază CUI ${cui}`}
    >
      {bare ? null : <span className="text-muted-foreground">CUI</span>} {cui}
      {copied ? <Check className="size-3.5 text-emerald-600" aria-hidden="true" /> : <Copy className="size-3.5 text-muted-foreground" aria-hidden="true" />}
    </button>
  )
}

export function IdentifierLine({ model, className }: { readonly model: CompanyPageModel; readonly className?: string }) {
  const { cui, codInmatriculare } = model.profile
  return (
    <div className={cn('flex flex-wrap items-center gap-x-5 gap-y-2', className)}>
      {cui ? <CopyCui cui={cui} /> : null}
      {codInmatriculare ? (
        <span className="font-mono text-xs tabular-nums text-foreground">
          <span className="text-muted-foreground">
            <Trans>Nr. registru</Trans>
          </span>{' '}
          {codInmatriculare}
        </span>
      ) : null}
    </div>
  )
}

// ────────────────────────────────────────── in the economy ──

export interface ContextRow {
  readonly key: string
  readonly share: number
  readonly label: ReactNode
}

/**
 * The company's share of its sector, county and country in the snapshot's
 * year. A share under 1% is left out by the model: for most companies it
 * would print „0,0%" four times, which says nothing a reader can use.
 */
export function contextRows(model: CompanyPageModel): readonly ContextRow[] {
  const { context, mainActivity, place } = model
  const rows: ContextRow[] = []
  if (context.sectorTurnoverShare !== null && mainActivity?.divisionLabel) {
    rows.push({
      key: 'sector-turnover',
      share: context.sectorTurnoverShare,
      label: <Trans>din cifra de afaceri a domeniului „{mainActivity.divisionLabel}"</Trans>,
    })
  }
  if (context.sectorEmployeesShare !== null && mainActivity?.divisionLabel) {
    rows.push({ key: 'sector-employees', share: context.sectorEmployeesShare, label: <Trans>din salariații domeniului</Trans> })
  }
  if (context.countyTurnoverShare !== null && place.county) {
    rows.push({ key: 'county', share: context.countyTurnoverShare, label: <Trans>din cifra de afaceri a firmelor cu sediul în {place.county}</Trans> })
  }
  if (context.nationalTurnoverShare !== null) {
    rows.push({ key: 'national', share: context.nationalTurnoverShare, label: <Trans>din cifra de afaceri raportată în România</Trans> })
  }
  return rows
}

export function ContextList({ model, className, compact = false }: { readonly model: CompanyPageModel; readonly className?: string; readonly compact?: boolean }) {
  const rows = contextRows(model)
  if (rows.length === 0) return null
  return (
    <ul className={cn(compact ? 'space-y-3' : 'space-y-4', className)}>
      {rows.map((row) => (
        <li key={row.key}>
          <div className="flex items-baseline gap-3">
            <span className={cn('w-16 shrink-0 font-semibold tabular-nums tracking-tight text-foreground', compact ? 'text-base' : 'text-xl')}>{percent(row.share)}</span>
            <span className="text-sm leading-snug text-muted-foreground">{row.label}</span>
          </div>
          <span className="mt-1.5 block h-1 bg-muted" aria-hidden="true">
            <span className="block h-full bg-primary" style={{ width: `${Math.max(row.share * 100, 0.8).toFixed(1)}%` }} />
          </span>
        </li>
      ))}
    </ul>
  )
}

// ──────────────────────────────────────────── key figures ──

/**
 * The change of a net result, in words where a percent would lie: a profit
 * turning into a loss is not „-12.840%".
 */
export function netChangeNote(previous: PrivateCompanyFinancialYear | null, latest: PrivateCompanyFinancialYear): string | null {
  const before = previous ? netResultOf(previous) : null
  const now = netResultOf(latest)
  if (!previous || before === null || now === null) return null
  const year = previous.fiscalYear
  if (before === 0) return now === 0 ? t`la fel ca în ${year}` : t`în ${year}: rezultat zero`
  if (before > 0 && now <= 0) return t`în ${year}: profit de ${moneyText(before)}`
  if (before < 0 && now >= 0) return t`în ${year}: pierdere de ${moneyText(-before)}`
  return changeNote(Math.abs(before), Math.abs(now), year)
}

/**
 * A change between two positive figures: a percent, „de N ori" past ten
 * times — a jump from 1.350 lei to a million is not „+73.974,1%" — and
 * „la fel" when nothing moved, never „+0,0%".
 */
export function changeNote(from: number | null | undefined, to: number | null | undefined, year: number): string | null {
  if (from === null || from === undefined || to === null || to === undefined || from <= 0 || to < 0) return null
  if (to === from) return t`la fel ca în ${year}`
  const ratio = to / from
  if (ratio >= 10) return t`de ${formatHubNumber(ratio, { digits: ratio < 100 ? 1 : 0 })} ori față de ${year}`
  return t`${percent(ratio - 1, true)} față de ${year}`
}

function countChangeNote(from: number | null, to: number, year: number): string | null {
  if (from === null) return null
  return to === from ? t`la fel ca în ${year}` : t`${count(to - from, true)} față de ${year}`
}

/** The receipts' period, with the undated ones said: „2009–2025 și fără an". */
function moneyPeriod(model: CompanyPageModel): string | null {
  const { firstYear, lastYear, undated } = model.money
  if (firstYear === null || lastYear === null) return undated.count > 0 ? t`fără an în sursă` : null
  const range = firstYear === lastYear ? String(firstYear) : `${firstYear}–${lastYear}`
  return undated.count > 0 ? t`${range} și fără an` : range
}

export interface Figure {
  readonly key: string
  readonly value: number
  readonly digits: number
  readonly unit?: string
  readonly label: ReactNode
  readonly note: ReactNode
  readonly href: string
}

/** Size, result, people and public money — each only when the record has it. */
export function companyFigures(model: CompanyPageModel, anchors: { readonly business: string; readonly money: string }): readonly Figure[] {
  const { latest, previous, money } = model
  const figures: Figure[] = []
  if (latest) {
    const year = latest.fiscalYear
    const previousYear = previous?.fiscalYear ?? year - 1
    if (latest.turnover !== null) {
      figures.push({
        key: 'turnover',
        ...moneyFigure(latest.turnover),
        label: <Trans>Cifra de afaceri, {year}</Trans>,
        note: changeNote(previous?.turnover, latest.turnover, previousYear),
        href: anchors.business,
      })
    }
    const net = netResultOf(latest)
    if (net !== null) {
      figures.push({
        key: 'net',
        ...moneyFigure(Math.abs(net)),
        label: net > 0 ? <Trans>Profit net, {year}</Trans> : net < 0 ? <Trans>Pierdere netă, {year}</Trans> : <Trans>Rezultat net, {year}</Trans>,
        note: netChangeNote(previous, latest),
        href: anchors.business,
      })
    }
    if (latest.employees !== null) {
      figures.push({
        key: 'employees',
        value: latest.employees,
        digits: 0,
        label: <Trans>Salariați, {year}</Trans>,
        note: countChangeNote(previous?.employees ?? null, latest.employees, previousYear),
        href: anchors.business,
      })
    }
  }
  // A sum only when some receipt has a published amount: a count of unvalued records is not a figure.
  if (money.received > 0) {
    figures.push({
      key: 'public',
      ...moneyFigure(money.received),
      label: <Trans>Încasări din bani publici</Trans>,
      note: moneyPeriod(model),
      href: anchors.money,
    })
  }
  return figures
}

const FIGURE_COLUMNS: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-2 lg:grid-cols-4',
}

/**
 * The hubs' figures band for as many figures as the company has: the value
 * on top, counting up on arrival, the term as the cell's link.
 */
export function FiguresBand({ figures, className }: { readonly figures: readonly Figure[]; readonly className?: string }) {
  const { i18n } = useLingui()
  if (figures.length === 0) return null
  return (
    <dl className={cn('grid', FIGURE_COLUMNS[figures.length] ?? FIGURE_COLUMNS[4], className)}>
      {figures.map((figure, index) => (
        <div
          key={figure.key}
          data-reveal
          className={cn(
            'group relative flex flex-col px-5 py-6 transition-colors hover:bg-muted/40 sm:py-7',
            index % 2 === 1 && 'border-l',
            index >= 2 && 'border-t lg:border-t-0',
            index >= 1 && 'lg:border-l',
          )}
        >
          <dt className="order-2 mt-2.5 flex flex-1 flex-col">
            <a href={figure.href} className='after:absolute after:inset-0 after:content-[""] focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-ring'>
              <MonoLabel className="block leading-relaxed text-foreground">{figure.label}</MonoLabel>
            </a>
            {figure.note ? <MonoLabel className="mt-auto block pt-3 leading-relaxed text-muted-foreground">{figure.note}</MonoLabel> : null}
          </dt>
          <dd className="order-1 text-2xl font-semibold tabular-nums tracking-tight text-foreground sm:text-4xl">
            <CountUpValue value={figure.value} digits={figure.digits} locale={i18n.locale === 'en' ? 'en' : 'ro'} />
            {figure.unit ? <span className="ml-1.5 text-base font-medium tracking-normal text-muted-foreground sm:text-xl">{figure.unit}</span> : null}
          </dd>
        </div>
      ))}
    </dl>
  )
}

// ──────────────────────────────────────────── recent years ──

/** The legend column beside the chart's bands. */
const TREND_LABEL_COLUMN = '7.5rem'

/**
 * The head's chart: turnover, net result and people over the last five years
 * with a statement, all at once, no toggle, no table — the shape at a glance,
 * the figures on a pointer.
 *
 * Two units share no axis, so they share only the years: people are a line
 * in a band of their own above, lei are bars below — turnover wide and pale,
 * the net result narrow and solid in front of it from the same zero, so the
 * margin is the share of the pale bar the solid one covers and a loss hangs
 * under the line in red. Each band is named beside it in its series' colour,
 * which is the whole legend. Pointing at a year (or tapping it) marks its
 * column and gives its three figures in full; a table only assistive
 * technology reads carries the same values.
 */
export function BalanceTrend({ model, className }: { readonly model: CompanyPageModel; readonly className?: string }) {
  const [active, setActive] = useState<number | null>(null)
  const { recent, latest } = model
  if (!latest || recent.years.length === 0) return null
  const years = recent.years
  const n = years.length
  const last = n - 1
  const repeat = `repeat(${n}, minmax(0, 1fr))`
  const columns = { gridTemplateColumns: `${TREND_LABEL_COLUMN} ${repeat}` }
  const centre = (index: number) => ((index + 0.5) / n) * 100

  const lei = [...recent.turnover, ...recent.netResult].filter((value): value is number => value !== null)
  const top = Math.max(0, ...lei)
  const bottom = Math.min(0, ...lei)
  const range = top - bottom || 1
  const zero = (top / range) * 100
  const barStyle = (value: number) => {
    const height = `${Math.max((Math.abs(value) / range) * 100, 1).toFixed(1)}%`
    return value >= 0 ? { bottom: `${(100 - zero).toFixed(1)}%`, height } : { top: `${zero.toFixed(1)}%`, height }
  }

  const staff = recent.employees.filter((value): value is number => value !== null)
  const staffLow = Math.min(...staff)
  const staffHigh = Math.max(...staff)
  // A line of people starts where the counts do, padded, not at zero: it shows the change, the tooltip the numbers.
  const staffPad = (staffHigh - staffLow) * 0.15 || Math.max(staffHigh * 0.1, 1)
  const staffY = (value: number) => (1 - (value - (staffLow - staffPad)) / (staffHigh - staffLow + staffPad * 2)) * 100
  let staffPath = ''
  recent.employees.forEach((value, index) => {
    if (value === null) return
    const move = staffPath === '' || recent.employees[index - 1] === null
    staffPath += `${move ? 'M' : 'L'}${centre(index).toFixed(2)},${staffY(value).toFixed(2)} `
  })
  const hasStaff = staff.length > 0
  const leiRow = hasStaff ? 2 : 1

  const rows = [
    { key: 'turnover', label: t`Cifra de afaceri`, swatch: 'size-2.5 rounded-[2px] bg-primary/30', values: recent.turnover, format: moneyText },
    { key: 'net', label: t`Rezultat net`, swatch: 'size-2.5 rounded-[2px] bg-primary', values: recent.netResult, format: moneyText },
    { key: 'employees', label: t`Salariați`, swatch: 'h-0.5 w-3 rounded-full bg-amber-500 dark:bg-amber-400', values: recent.employees, format: (value: number) => count(value) },
  ]

  return (
    <figure className={className} aria-labelledby="company-balance-trend">
      <MonoLabel id="company-balance-trend" className="block text-primary">
        {n >= 5 ? t`Ultimii 5 ani cu bilanț` : t`Anii cu bilanț`}
      </MonoLabel>

      {/* The drawing; the hidden table below says every value to assistive technology. */}
      <div className="relative mt-4 grid" style={columns} aria-hidden="true">
        {hasStaff ? (
          <>
            <MonoLabel className="self-center pr-3 leading-relaxed text-amber-600 dark:text-amber-400" style={{ gridRow: 1, gridColumn: 1 }}>
              <Trans>Salariați</Trans>
            </MonoLabel>
            <div className="relative h-11" style={{ gridRow: 1, gridColumn: `2 / span ${n}` }}>
              <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible">
                <path d={staffPath} fill="none" className="stroke-amber-500 dark:stroke-amber-400" strokeWidth={2} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
              </svg>
              {recent.employees.map((value, index) =>
                value === null ? null : (
                  <span
                    key={years[index]}
                    className={cn(
                      'absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-background',
                      index === last || index === active ? 'bg-amber-600 dark:bg-amber-400' : 'bg-amber-500/70',
                    )}
                    style={{ left: `${centre(index).toFixed(2)}%`, top: `${staffY(value).toFixed(1)}%` }}
                  />
                ),
              )}
            </div>
          </>
        ) : null}

        <span className="flex flex-col justify-center gap-2 pr-3" style={{ gridRow: leiRow, gridColumn: 1 }}>
          <MonoLabel className="block leading-relaxed text-primary/60">
            <Trans>Cifra de afaceri</Trans>
          </MonoLabel>
          <MonoLabel className="block leading-relaxed text-primary">
            <Trans>Rezultat net</Trans>
          </MonoLabel>
        </span>
        <div className={cn('relative h-28', hasStaff && 'mt-3')} style={{ gridRow: leiRow, gridColumn: `2 / span ${n}` }}>
          <span className="absolute inset-x-0 h-px bg-border" style={{ top: `${zero.toFixed(1)}%` }} />
          <div className="grid h-full" style={{ gridTemplateColumns: repeat }}>
            {years.map((year, index) => {
              const turnover = recent.turnover[index] ?? null
              const net = recent.netResult[index] ?? null
              const strong = index === last || index === active
              return (
                <div key={year} className="relative">
                  {turnover !== null ? (
                    <span className={cn('absolute inset-x-1.5 rounded-[2px] transition-colors sm:inset-x-2.5', strong ? 'bg-primary/30' : 'bg-primary/15')} style={barStyle(turnover)} />
                  ) : null}
                  {net !== null ? (
                    <span
                      className={cn(
                        'absolute left-1/2 w-2/5 -translate-x-1/2 rounded-[2px] transition-colors',
                        net < 0 ? (strong ? 'bg-destructive' : 'bg-destructive/60') : strong ? 'bg-primary' : 'bg-primary/60',
                      )}
                      style={barStyle(net)}
                    />
                  ) : null}
                </div>
              )
            })}
          </div>
        </div>

        <div className="grid border-t pt-1.5" style={{ gridRow: leiRow + 1, gridColumn: `2 / span ${n}`, gridTemplateColumns: repeat }}>
          {years.map((year, index) => (
            <span key={year} className={cn('text-center font-mono text-[10px] tabular-nums', index === last || index === active ? 'text-foreground' : 'text-muted-foreground')}>
              {year}
            </span>
          ))}
        </div>

        {/* The pointer's targets: one column per year over both bands, marked while read. */}
        <div
          className="relative z-10 grid"
          style={{ gridRow: hasStaff ? '1 / span 2' : '1', gridColumn: `2 / span ${n}`, gridTemplateColumns: repeat }}
          onPointerLeave={(event) => {
            if (event.pointerType === 'mouse') setActive(null)
          }}
        >
          {years.map((year, index) => (
            <div
              key={year}
              onPointerEnter={() => setActive(index)}
              onPointerDown={() => setActive((current) => (current === index ? null : index))}
              className={cn('rounded-sm transition-colors', active === index && 'bg-foreground/5')}
            />
          ))}
          {active !== null ? (
            <div
              className="pointer-events-none absolute top-0 z-20 w-max min-w-40 rounded-sm border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md"
              style={{
                left: `${centre(active).toFixed(2)}%`,
                // Beside the column, on the side with room: right of the first half, left of the second.
                transform: active < n / 2 ? 'translateX(1rem)' : 'translateX(calc(-100% - 1rem))',
              }}
            >
              <MonoLabel className="block text-muted-foreground">{years[active]}</MonoLabel>
              <dl className="mt-2 grid grid-cols-[1fr_auto] items-baseline gap-x-4 gap-y-1">
                {rows.map((row) => {
                  const value = row.values[active] ?? null
                  return (
                    <Fragment key={row.key}>
                      <dt className="flex items-center gap-1.5">
                        <span className="flex w-3 justify-center">
                          <span className={row.swatch} />
                        </span>
                        {row.label}
                      </dt>
                      <dd className={cn('text-right font-medium tabular-nums', value !== null && value < 0 && 'text-destructive')}>{value === null ? '—' : row.format(value)}</dd>
                    </Fragment>
                  )
                })}
              </dl>
            </div>
          ) : null}
        </div>
      </div>

      <table className="sr-only">
        <caption>{t`Cifra de afaceri, rezultatul net și salariații, ${years[0]}–${years[last]}`}</caption>
        <thead>
          <tr>
            <th scope="col">{t`An`}</th>
            {rows.map((row) => (
              <th key={row.key} scope="col">
                {row.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {years.map((year, index) => (
            <tr key={year}>
              <th scope="row">{year}</th>
              {rows.map((row) => {
                const value = row.values[index] ?? null
                return <td key={row.key}>{value === null ? '—' : row.format(value)}</td>
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  )
}

// ──────────────────────────────────────── in the economy ──

/**
 * Where the company stands in its sector, county and country, for the band
 * near the end of the page: context, not the company itself. Rendered only
 * when a share reaches 1% — for most companies it would say nothing.
 */
export function EconomyContext({ model, className }: { readonly model: CompanyPageModel; readonly className?: string }) {
  if (contextRows(model).length === 0) return null
  return (
    <div className={className}>
      <ContextList model={model} />
      <div className="mt-6 flex flex-wrap gap-x-6 gap-y-1">
        <Link to="/companies" hash="domenii" className="inline-flex min-h-9 items-center text-sm font-medium text-foreground underline-offset-4 hover:text-primary hover:underline">
          <Trans>Toate domeniile →</Trans>
        </Link>
        <Link
          to="/companies"
          search={{ indicator: 'cifra-de-afaceri' }}
          hash="judete"
          className="inline-flex min-h-9 items-center text-sm font-medium text-foreground underline-offset-4 hover:text-primary hover:underline"
        >
          <Trans>Județele pe hartă →</Trans>
        </Link>
      </div>
    </div>
  )
}

export function hasEconomyContext(model: CompanyPageModel): boolean {
  return contextRows(model).length > 0
}

/** What the shares are shares of, for the band's lede. */
export function economyLede(model: CompanyPageModel): string {
  const year = model.context.year
  return t`Cifrele firmei pe ${year}, față de totalurile bilanțurilor depuse pe ${year} de firmele din același domeniu, din același județ și din toată țara.`
}

// ────────────────────────────────────────────── financials ──

export function measureLabel(measure: FinancialMeasure): string {
  switch (measure) {
    case 'toate':
      return t`Toate`
    case 'cifra-de-afaceri':
      return t`Cifra de afaceri`
    case 'profit':
      return t`Rezultat net`
    case 'salariati':
      return t`Salariați`
  }
}

export function sizeClassLabel(size: SizeClass): string {
  switch (size) {
    case 'none':
      return t`fără salariați`
    case 'micro':
      return t`microîntreprindere, sub 10 salariați`
    case 'small':
      return t`firmă mică, 10–49 de salariați`
    case 'medium':
      return t`firmă mijlocie, 50–249 de salariați`
    case 'large':
      return t`firmă mare, 250 de salariați sau mai mulți`
  }
}

/** No statement at all: said once, where the figures would be. */
export function NoStatements({ className }: { readonly className?: string }) {
  return (
    <p className={cn('max-w-[60ch] text-sm leading-relaxed text-muted-foreground', className)}>
      <Trans>Niciun bilanț publicat la ANAF: nu se știu cifra de afaceri, rezultatul sau numărul de salariați.</Trans>
    </p>
  )
}

export function FinancialChart({
  model,
  measure,
  onMeasure,
  className,
  chartClassName,
}: {
  readonly model: CompanyPageModel
  readonly measure: FinancialMeasure
  readonly onMeasure: (measure: FinancialMeasure) => void
  readonly className?: string
  readonly chartClassName?: string
}) {
  if (model.span.length === 0) return <NoStatements className={className} />
  const values = (measure === 'cifra-de-afaceri' ? model.series.turnover : measure === 'profit' ? model.series.netResult : model.series.employees).map(
    (point) => point.value,
  )
  const series: BarSeries[] =
    measure === 'profit'
      ? [
          { key: 'profit', label: t`Profit net`, values: values.map((value) => (value !== null && value >= 0 ? value : null)), fill: 'fill-primary', swatch: 'bg-primary' },
          { key: 'loss', label: t`Pierdere netă`, values: values.map((value) => (value !== null && value < 0 ? value : null)), fill: 'fill-destructive/70', swatch: 'bg-destructive/70' },
        ]
      : [{ key: measure, label: measureLabel(measure), values, fill: 'fill-primary', swatch: 'bg-primary' }]
  const missing = new Set(model.missingYears)
  return (
    <div className={className}>
      <div className="sm:w-fit">
        <IndicatorToggle label={t`Graficul arată`} options={FINANCIAL_MEASURES.map((key) => ({ key, label: measureLabel(key) }))} value={measure} onChange={onMeasure} />
      </div>
      <div className="mt-6">
        {measure === 'toate' ? (
          <CombinedYears
            years={model.span}
            turnover={model.series.turnover.map((point) => point.value)}
            net={model.series.netResult.map((point) => point.value)}
            employees={model.series.employees.map((point) => point.value)}
            labels={{ turnover: t`Cifra de afaceri`, net: t`Profit net`, loss: t`Pierdere netă`, employees: t`Salariați` }}
            formatTick={moneyTick}
            formatMoney={moneyText}
            formatCount={(value) => count(value)}
            emptyLabel={(index) => (missing.has(model.span[index] ?? 0) ? t`Niciun bilanț publicat pentru acest an` : t`Nu apare în bilanț`)}
            label={t`Cifra de afaceri, rezultatul net și salariații`}
          />
        ) : (
          <YearBars
            key={measure}
            years={model.span}
            series={series}
            format={measure === 'salariati' ? (value) => count(value) : moneyTick}
            label={measureLabel(measure)}
            emptyLabel={(index) => (missing.has(model.span[index] ?? 0) ? t`Niciun bilanț publicat pentru acest an` : t`Nu apare în bilanț`)}
            legend={measure === 'profit' && model.lossYears > 0}
            integer={measure === 'salariati'}
            className={chartClassName}
          />
        )}
      </div>
      {model.missingYears.length > 0 ? (
        <MonoLabel className="mt-4 block leading-relaxed text-muted-foreground">
          <Trans>Fără bilanțuri publicate pentru {yearRanges(model.missingYears)}</Trans>
        </MonoLabel>
      ) : null}
    </div>
  )
}

type BalanceKey = keyof Pick<
  PrivateCompanyFinancialSummary,
  'fixedAssets' | 'currentAssets' | 'cashAndBank' | 'inventories' | 'receivables' | 'debts' | 'totalEquity' | 'subscribedCapital'
>

function balanceRows(): readonly { readonly key: BalanceKey; readonly label: string; readonly indent?: boolean }[] {
  return [
    { key: 'fixedAssets', label: t`Active imobilizate` },
    { key: 'currentAssets', label: t`Active circulante` },
    { key: 'cashAndBank', label: t`din care numerar și conturi`, indent: true },
    { key: 'inventories', label: t`din care stocuri`, indent: true },
    { key: 'receivables', label: t`din care creanțe`, indent: true },
    { key: 'debts', label: t`Datorii` },
    { key: 'totalEquity', label: t`Capitaluri proprii` },
    { key: 'subscribedCapital', label: t`Capital social` },
  ]
}

/** Debts against equity, or against nothing when equity is gone: the one balance ratio a reader asks for. */
export function debtSentence(model: CompanyPageModel): string | null {
  const summary = model.latest?.summary
  if (!model.latest || !summary?.debts || summary.debts <= 0) return null
  const equity = summary.totalEquity
  if (equity === null) return t`Datorii de ${moneyText(summary.debts)} la sfârșitul lui ${model.latest.fiscalYear}.`
  if (equity === 0) return t`Datorii de ${moneyText(summary.debts)}, cu capitaluri proprii zero.`
  if (equity < 0) return t`Datorii de ${moneyText(summary.debts)}, cu capitalurile proprii negative (${moneyText(equity)}).`
  const ratio = summary.debts / equity
  return ratio < 1
    ? t`Datoriile, de ${moneyText(summary.debts)}, sunt ${percent(ratio)} din capitalurile proprii.`
    : t`Datoriile, de ${moneyText(summary.debts)}, sunt de ${formatHubNumber(ratio, { digits: 1 })} ori capitalurile proprii.`
}

export function BalanceSheet({ model, className }: { readonly model: CompanyPageModel; readonly className?: string }) {
  const { latest, previous } = model
  const current = latest?.summary
  if (!latest || !current) return null
  const before = previous?.summary ?? null
  const rows = balanceRows().filter((row) => current[row.key] !== null)
  if (rows.length === 0) return null
  return (
    <table className={cn('w-full text-sm', className)}>
      <thead>
        <tr className="border-b border-border/70">
          <th scope="col" className="pb-2 text-left font-normal">
            <MonoLabel className="text-muted-foreground">
              <Trans>Bilanț, {latest.fiscalYear}</Trans>
            </MonoLabel>
          </th>
          <th scope="col" className="pb-2 pl-3 text-right font-normal">
            <MonoLabel className="text-muted-foreground">lei</MonoLabel>
          </th>
          {before && previous ? (
            <th scope="col" className="pb-2 pl-3 text-right font-normal">
              <MonoLabel className="text-muted-foreground">
                <Trans>față de {previous.fiscalYear}</Trans>
              </MonoLabel>
            </th>
          ) : null}
        </tr>
      </thead>
      <tbody className="divide-y divide-border/70">
        {rows.map((row) => {
          const value = current[row.key] as number
          const earlier = before?.[row.key] ?? null
          const change = earlier !== null && earlier > 0 && value >= 0 ? (value - earlier) / earlier : null
          return (
            <tr key={row.key}>
              <th scope="row" className={cn('py-2.5 text-left font-normal', row.indent ? 'pl-4 text-muted-foreground' : 'text-foreground')}>
                {row.label}
              </th>
              <td className={cn('py-2.5 pl-3 text-right font-semibold tabular-nums', value < 0 ? 'text-destructive' : 'text-foreground')}>{moneyCell(value)}</td>
              {before ? <td className="py-2.5 pl-3 text-right tabular-nums text-muted-foreground">{change === null ? '—' : percent(change, true)}</td> : null}
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

/** How a positive figure moved, as the predicate of a sentence: „a crescut cu 3,8%", „a crescut de 12 ori". */
function movement(from: number, to: number): string {
  if (to === from) return t`a rămas la fel`
  const ratio = to / from
  if (ratio >= 10) return t`a crescut de ${formatHubNumber(ratio, { digits: ratio < 100 ? 1 : 0 })} ori`
  return ratio > 1 ? t`a crescut cu ${percent(ratio - 1)}` : t`a scăzut cu ${percent(1 - ratio)}`
}

/** The newest year against the one before, then the long run when it says more. */
export function financialLede(model: CompanyPageModel): string | null {
  const { latest, previous, stale, lossYears, span } = model
  if (!latest) return null
  const sentences: string[] = []
  if (stale) sentences.push(t`Ultimul bilanț publicat este pe ${latest.fiscalYear}.`)
  if (previous?.turnover && previous.turnover > 0 && latest.turnover !== null) {
    const year = latest.fiscalYear
    const turnover = t`În ${year}, cifra de afaceri ${movement(previous.turnover, latest.turnover)}`
    const before = netResultOf(previous)
    const now = netResultOf(latest)
    let net = ''
    if (before !== null && now !== null) {
      if (before > 0 && now < 0) net = t`, iar firma a trecut pe pierdere`
      else if (before < 0 && now > 0) net = t`, iar firma a trecut pe profit`
      else if (before !== 0 && now === 0) net = t`, iar rezultatul net a ajuns la zero`
      else if (before === 0 && now !== 0) net = now > 0 ? t`, iar firma a trecut pe profit` : t`, iar firma a trecut pe pierdere`
      else if (before > 0) net = t`, iar profitul net ${movement(before, now)}`
      else if (before < 0) net = now < before ? t`, iar pierderea a crescut` : now > before ? t`, iar pierderea a scăzut` : t`, iar pierderea a rămas aceeași`
    }
    sentences.push(`${turnover}${net}.`)
  }
  const filed = span.length - model.missingYears.length
  if (lossYears >= 3 && filed > 0) {
    sentences.push(
      plural(lossYears, {
        one: `A încheiat cu pierdere un an din ${filed}.`,
        few: `A încheiat cu pierdere # ani din ${filed}.`,
        other: `A încheiat cu pierdere # de ani din ${filed}.`,
      }),
    )
  }
  return sentences.length > 0 ? sentences.join(' ') : null
}

// ─────────────────────────────────────────── public money ──

/** An institution as SEAP names it; some records carry only the CUI. */
export function institutionName(name: string | null, cui: string): string {
  return name?.trim() ? name : t`Instituție fără nume publicat (CUI ${cui})`
}

/** Any record of public money: a receipt with or without an amount, a commitment, or a SEAP record. */
export function hasPublicMoney(model: CompanyPageModel): boolean {
  return model.money.receivedCount > 0 || model.money.commitments.count > 0 || model.grains.length > 0
}

type MoneyBucket = 'contracts' | 'direct' | 'other' | 'commitment'

function flowBucket(flowType: string): MoneyBucket {
  if (flowType === 'procurement_contract') return 'contracts'
  if (flowType === 'direct_acquisition') return 'direct'
  if (flowType === 'pnrr_commitment') return 'commitment'
  return 'other'
}

const BUCKET_SWATCH: Record<MoneyBucket, string> = {
  contracts: 'bg-primary',
  direct: 'bg-sky-400 dark:bg-sky-300',
  other: 'bg-violet-400 dark:bg-violet-300',
  commitment: 'border border-dashed border-primary bg-primary/10',
}

/** A flow by what carried the money, in the page's words. */
export function flowLabel(flowType: string): string {
  switch (flowType) {
    case 'procurement_contract':
      return t`Contracte de achiziție publică`
    case 'direct_acquisition':
      return t`Achiziții directe`
    case 'pnrr_payment':
      return t`Plăți PNRR`
    case 'pnrr_subcontract':
      return t`Subcontracte PNRR`
    case 'budget_execution':
      return t`Plăți din execuția bugetară`
    case 'pnrr_commitment':
      return t`Angajamente PNRR`
    default:
      return t`Alte plăți publice`
  }
}

/** A flow's records, counted by what one of them is: a contract is an award, not a payment. */
export function flowCount(flowType: string, value: number): string {
  switch (flowType) {
    case 'procurement_contract':
      return plural(value, { one: '# contract', few: '# contracte', other: '# de contracte' })
    case 'direct_acquisition':
      return plural(value, { one: '# achiziție directă', few: '# achiziții directe', other: '# de achiziții directe' })
    case 'pnrr_subcontract':
      return plural(value, { one: '# subcontract PNRR', few: '# subcontracte PNRR', other: '# de subcontracte PNRR' })
    case 'pnrr_commitment':
      return plural(value, { one: '# angajament PNRR', few: '# angajamente PNRR', other: '# de angajamente PNRR' })
    default:
      return plural(value, { one: '# plată', few: '# plăți', other: '# de plăți' })
  }
}

/** „a, b și c". */
function listing(parts: readonly string[]): string {
  if (parts.length <= 1) return parts[0] ?? ''
  return `${parts.slice(0, -1).join(', ')} ${t`și`} ${parts[parts.length - 1]}`
}

/** No public money: the absence is a finding, said in a line with the sources it covers. */
export function NoPublicMoney({ className }: { readonly className?: string }) {
  return (
    <p className={cn('max-w-[60ch] text-sm leading-relaxed text-muted-foreground', className)}>
      <Trans>Nicio plată din bani publici: firma nu apare ca furnizor în achizițiile publice (SEAP) și nici ca beneficiar PNRR.</Trans>
    </p>
  )
}

export function MoneyChart({ model, className, chartClassName }: { readonly model: CompanyPageModel; readonly className?: string; readonly chartClassName?: string }) {
  const { byYear, commitments, undated, partial } = model.money
  if (byYear.length === 0) return null
  // A year with no payment of a kind has no bar of that kind, not a zero one.
  const series: BarSeries[] = [
    { key: 'contracts', label: flowLabel('procurement_contract'), values: byYear.map((year) => year.contracts || null), fill: 'fill-primary', swatch: BUCKET_SWATCH.contracts },
    { key: 'direct', label: flowLabel('direct_acquisition'), values: byYear.map((year) => year.direct || null), fill: 'fill-sky-400 dark:fill-sky-300', swatch: BUCKET_SWATCH.direct },
    { key: 'other', label: t`Alte plăți publice (PNRR, buget)`, values: byYear.map((year) => year.other || null), fill: 'fill-violet-400 dark:fill-violet-300', swatch: BUCKET_SWATCH.other },
  ]
  const unvaluedNote = (records: number) =>
    plural(records, {
      one: 'o înregistrare fără valoare publicată',
      few: '# înregistrări fără valoare publicată',
      other: '# de înregistrări fără valoare publicată',
    })
  return (
    <div className={className}>
      <YearBars
        years={byYear.map((year) => year.year)}
        series={series}
        format={moneyTick}
        label={t`Bani publici încasați pe an`}
        emptyLabel={(index) => {
          const year = byYear[index]
          return year && year.unvalued > 0 ? capitalised(unvaluedNote(year.unvalued)) : t`Nicio plată înregistrată`
        }}
        note={(index) => {
          const year = byYear[index]
          if (!year) return null
          const parts = [
            partial && year.year === partial.year ? t`până în ${monthText(partial.until)}` : null,
            year.unvalued > 0 && year.contracts + year.direct + year.other > 0 ? t`și ${unvaluedNote(year.unvalued)}` : null,
          ].filter((part): part is string => part !== null)
          return parts.length > 0 ? { text: parts.join('; '), quiet: partial?.year === year.year } : null
        }}
        shadeEmpty={false}
        className={chartClassName}
      />
      <div className="mt-4 space-y-1.5">
        {partial ? (
          <MonoLabel className="block leading-relaxed text-muted-foreground">
            <Trans>
              {partial.year} e un an incomplet: datele merg până în {monthText(partial.until)}.
            </Trans>
          </MonoLabel>
        ) : null}
        {undated.count > 0 ? (
          <MonoLabel className="block leading-relaxed text-muted-foreground">
            {undated.total > 0
              ? plural(undated.count, {
                  one: `Nu apare pe grafic o înregistrare fără an în sursă (${moneyText(undated.total)}).`,
                  few: `Nu apar pe grafic # înregistrări fără an în sursă (${moneyText(undated.total)}).`,
                  other: `Nu apar pe grafic # de înregistrări fără an în sursă (${moneyText(undated.total)}).`,
                })
              : plural(undated.count, {
                  one: 'Nu apare pe grafic o înregistrare fără an și fără valoare publicată.',
                  few: 'Nu apar pe grafic # înregistrări fără an și fără valoare publicată.',
                  other: 'Nu apar pe grafic # de înregistrări fără an și fără valoare publicată.',
                })}
          </MonoLabel>
        ) : null}
        {/* Commitments stay out of the bars: an obligation drawn on the payments' scale would flatten them. */}
        {commitments.total > 0 ? (
          <MonoLabel className="block leading-relaxed text-muted-foreground">
            {plural(commitments.count, {
              one: `Fără angajamentul PNRR de ${moneyText(commitments.total)}: o obligație asumată, nu o plată.`,
              few: `Fără cele # angajamente PNRR, de ${moneyText(commitments.total)}: obligații asumate, nu plăți.`,
              other: `Fără cele # de angajamente PNRR, de ${moneyText(commitments.total)}: obligații asumate, nu plăți.`,
            })}
          </MonoLabel>
        ) : null}
      </div>
    </div>
  )
}

function capitalised(text: string): string {
  return text.charAt(0).toLocaleUpperCase('ro-RO') + text.slice(1)
}

/**
 * What the public money adds up to, in a sentence: the sum of the published
 * amounts, through which instruments, the period only when every receipt is
 * dated, and a lower-bound warning when some receipts carry no amount.
 */
export function moneyLede(model: CompanyPageModel): string | null {
  const { money } = model
  if (money.receivedCount === 0) return null
  const through = listing(money.flows.filter((flow) => flow.receipt && flow.count > 0).map((flow) => flowCount(flow.flowType, flow.count)))
  if (money.received <= 0) return t`Instituțiile publice apar ca plătitoare în ${through}, dar fără nicio valoare publicată.`
  const sum = moneyText(money.received)
  const base =
    money.undated.count > 0 || money.firstYear === null
      ? t`Instituțiile publice i-au plătit ${sum}, prin ${through}; o parte nu are an în sursă.`
      : money.firstYear === money.lastYear
        ? t`În ${money.firstYear}, instituțiile publice i-au plătit ${sum}, prin ${through}.`
        : t`Din ${money.firstYear}, instituțiile publice i-au plătit ${sum}, prin ${through}.`
  if (money.unvaluedCount === 0) return base
  return `${base} ${plural(money.unvaluedCount, {
    one: 'O înregistrare nu are valoare publicată, deci suma e o limită de jos.',
    few: '# înregistrări nu au valoare publicată, deci suma e o limită de jos.',
    other: '# de înregistrări nu au valoare publicată, deci suma e o limită de jos.',
  })}`
}

/** Every instrument side by side, never added up across kinds; a commitment says it is not a payment. */
export function MoneyFlows({ model, className }: { readonly model: CompanyPageModel; readonly className?: string }) {
  const rows = model.money.flows.filter((flow) => flow.count > 0)
  if (rows.length === 0) return null
  return (
    <dl className={cn('divide-y divide-border/70 border-y border-border/70', className)}>
      {rows.map((flow) => (
        <div key={flow.flowType} className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-4 py-3">
          <dt className="flex min-w-0 items-center gap-2 text-sm text-foreground">
            <span className={cn('size-2.5 shrink-0 rounded-[2px]', BUCKET_SWATCH[flowBucket(flow.flowType)])} aria-hidden="true" />
            <span className="min-w-0">
              {flowLabel(flow.flowType)}
              <MonoLabel className="mt-1 block text-muted-foreground">
                {flowCount(flow.flowType, flow.count)}
                {flow.receipt ? null : <>, {t`nu plăți`}</>}
              </MonoLabel>
            </span>
          </dt>
          <dd className={cn('text-right tabular-nums', flow.total === null ? 'text-sm text-muted-foreground' : 'text-base font-semibold text-foreground')}>
            {flow.total === null ? t`valoare nepublicată` : moneyText(flow.total)}
          </dd>
        </div>
      ))}
    </dl>
  )
}

function grainStats(model: CompanyPageModel, grain: PaymentGrain): ProcurementGrainStats {
  return grain === 'contracte' ? model.procurement.contracts : model.procurement.directAcquisitions
}

/** The grain in the URL when the company has records in it, else the one it has. */
export function effectiveGrain(model: CompanyPageModel, requested: PaymentGrain | null): PaymentGrain | null {
  return requested && model.grains.includes(requested) ? requested : model.defaultGrain
}

function grainLabel(grain: PaymentGrain): string {
  return grain === 'contracte' ? t`Contracte` : t`Achiziții directe`
}

/** A toggle when the company has both kinds of record, a caption when it has one. */
export function GrainToggle({ model, grain, onGrain }: { readonly model: CompanyPageModel; readonly grain: PaymentGrain; readonly onGrain: (grain: PaymentGrain) => void }) {
  if (model.grains.length < 2) return <MonoLabel className="text-muted-foreground">{grainLabel(grain)}</MonoLabel>
  return <IndicatorToggle label={t`Plățile din`} options={model.grains.map((key) => ({ key, label: grainLabel(key) }))} value={grain} onChange={onGrain} />
}

/** A line under a ranking: the window, and how much of it carries a published value. */
export function CoverageNote({ model, grain, className }: { readonly model: CompanyPageModel; readonly grain: PaymentGrain; readonly className?: string }) {
  const stats = grainStats(model, grain)
  const window = stats.firstMonth && stats.lastMonth ? `${monthText(stats.firstMonth)} – ${monthText(stats.lastMonth)}` : null
  return (
    <MonoLabel className={cn('block leading-relaxed text-muted-foreground', className)}>
      {window ? <>SEAP, {window}. </> : null}
      {stats.withValue < stats.count
        ? t`Valoarea e publicată pentru ${count(stats.withValue)} din ${flowCount(grain === 'contracte' ? 'procurement_contract' : 'direct_acquisition', stats.count)}, deci sumele sunt o limită de jos.`
        : null}
    </MonoLabel>
  )
}

export function PayerList({
  model,
  grain,
  limit = 8,
  className,
}: {
  readonly model: CompanyPageModel
  readonly grain: PaymentGrain
  readonly limit?: number
  readonly className?: string
}) {
  const rows = (grain === 'contracte' ? model.procurement.topAuthorities.contract : model.procurement.topAuthorities.directAcquisition).slice(0, limit)
  if (rows.length === 0) return null
  const max = Math.max(...rows.map((row) => row.amountRon ?? 0), 1)
  return (
    <ol className={cn('divide-y divide-border/70 border-y border-border/70', className)}>
      {rows.map((row, index) => (
        <li key={row.cui}>
          <Link to="/procurement/institutions/$cui" params={{ cui: row.cui }} className={cn('group grid grid-cols-[1.5rem_minmax(0,1fr)_auto] items-center gap-x-3 py-2.5', ROW_LINK_CLASS)}>
            <MonoLabel className="pl-1 tabular-nums text-muted-foreground">{String(index + 1).padStart(2, '0')}</MonoLabel>
            <span className="min-w-0">
              <span className="line-clamp-2 text-sm leading-snug text-foreground">{institutionName(row.name, row.cui)}</span>
              <span className="mt-1.5 block h-1.5 bg-muted/70" aria-hidden="true">
                <span
                  className="block h-full bg-primary/70 transition-colors group-hover:bg-primary"
                  style={{ width: `${Math.max(0.8, ((row.amountRon ?? 0) / max) * 100).toFixed(1)}%` }}
                />
              </span>
            </span>
            <span className="w-24 text-right sm:w-28">
              <span className="block text-sm font-semibold tabular-nums text-foreground">{row.amountRon === null ? '—' : moneyCell(row.amountRon)}</span>
              <MonoLabel className="mt-1 block tabular-nums text-muted-foreground">
                {flowCount(grain === 'contracte' ? 'procurement_contract' : 'direct_acquisition', row.count)}
              </MonoLabel>
            </span>
          </Link>
        </li>
      ))}
    </ol>
  )
}

export function CategoryList({ model, grain, className }: { readonly model: CompanyPageModel; readonly grain: PaymentGrain; readonly className?: string }) {
  const rows = grain === 'contracte' ? model.procurement.topCategories.contract : model.procurement.topCategories.directAcquisition
  if (rows.length === 0) return null
  return (
    <ul className={cn('space-y-3', className)}>
      {rows.slice(0, 5).map((row) => (
        <li key={row.code ?? 'unknown'}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 text-foreground">{row.labelRo ?? t`Fără categorie CPV`}</span>
            <span className="shrink-0 font-semibold tabular-nums text-foreground">{row.share === null ? '—' : percent(row.share)}</span>
          </div>
          <span className="mt-1.5 block h-1 bg-muted" aria-hidden="true">
            <span className="block h-full bg-primary/70" style={{ width: `${Math.max((row.share ?? 0) * 100, 0.8).toFixed(1)}%` }} />
          </span>
        </li>
      ))}
    </ul>
  )
}

function recordLink(record: ProcurementRecordRow) {
  return record.grain === 'contract'
    ? ({ to: '/procurement/contracts/$id', params: { id: record.id } } as const)
    : ({ to: '/procurement/direct-acquisitions/$id', params: { id: record.id } } as const)
}

export function RecentRecords({ model, limit = 6, className }: { readonly model: CompanyPageModel; readonly limit?: number; readonly className?: string }) {
  const records = model.procurement.recent.slice(0, limit)
  if (records.length === 0) return null
  return (
    <ol className={cn('divide-y divide-border/70 border-y border-border/70', className)}>
      {records.map((record) => (
        <li key={`${record.grain}-${record.id}`}>
          <Link {...recordLink(record)} className={cn('grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 py-3', ROW_LINK_CLASS)}>
            <span className="min-w-0">
              <MonoLabel className="block text-muted-foreground">
                {dateText(record.date)} · {record.grain === 'contract' ? t`contract` : t`achiziție directă`}
              </MonoLabel>
              <span className="mt-1.5 block text-sm text-foreground sm:truncate">{record.title || t`Fără titlu publicat`}</span>
              <span className="mt-0.5 block text-xs text-muted-foreground sm:truncate">{institutionName(record.authority.name, record.authority.cui)}</span>
            </span>
            <span className="self-center text-right text-sm font-semibold tabular-nums text-foreground">{record.valueRon === null ? '—' : moneyCell(record.valueRon)}</span>
          </Link>
        </li>
      ))}
    </ol>
  )
}

export function SupplierLink({ model, className }: { readonly model: CompanyPageModel; readonly className?: string }) {
  if (!model.profile.cui || model.grains.length === 0) return null
  return (
    <Link
      to="/procurement/suppliers/$cui"
      params={{ cui: model.profile.cui }}
      className={cn('inline-flex min-h-9 items-center text-sm font-medium text-foreground underline-offset-4 hover:text-primary hover:underline', className)}
    >
      <Trans>Toate contractele și achizițiile →</Trans>
    </Link>
  )
}

// ───────────────────────────────────────────── activities ──

export function MainActivity({ model, className }: { readonly model: CompanyPageModel; readonly className?: string }) {
  const { mainActivity } = model
  if (!mainActivity) {
    return (
      <p className={cn('text-sm text-muted-foreground', className)}>
        <Trans>Activitatea principală nu e declarată la ANAF.</Trans>
      </p>
    )
  }
  return (
    <div className={cn('border-l-2 border-primary pl-4', className)}>
      <MonoLabel className="block text-primary">
        <Trans>Activitatea principală · CAEN {mainActivity.code}</Trans>
      </MonoLabel>
      <p className="mt-2 text-lg font-semibold leading-snug text-foreground">{mainActivity.label}</p>
      <p className="mt-1 text-sm text-muted-foreground">
        {mainActivity.divisionLabel ? <Trans>Declarată la ANAF, în domeniul „{mainActivity.divisionLabel}"</Trans> : <Trans>Declarată la ANAF</Trans>}
      </p>
    </div>
  )
}

export function ActivityGroups({ model, limit = 8, className }: { readonly model: CompanyPageModel; readonly limit?: number; readonly className?: string }) {
  const [open, setOpen] = useState<string | null>(null)
  const [all, setAll] = useState(false)
  const { groups, total, revision } = model.activities
  if (total === 0) return null
  const shown = all ? groups : groups.slice(0, limit)
  const nomenclature = revision ? ` (CAEN ${revision.replace('rev', 'Rev.')})` : ''
  return (
    <div className={className}>
      <ul className="divide-y divide-border/70 border-y border-border/70">
        {shown.map((group) => {
          const expanded = open === group.division
          return (
            <li key={group.division}>
              <button
                type="button"
                aria-expanded={expanded}
                onClick={() => setOpen(expanded ? null : group.division)}
                className={cn('grid w-full grid-cols-[2rem_minmax(0,1fr)_auto] items-baseline gap-x-3 py-2.5 text-left', ROW_LINK_CLASS)}
              >
                <MonoLabel className="pl-1 tabular-nums text-muted-foreground">{group.division}</MonoLabel>
                <span className="text-sm text-foreground">{group.label}</span>
                <span className="pr-1 text-sm tabular-nums text-muted-foreground">{group.activities.length}</span>
              </button>
              {expanded ? (
                <ul className="mb-3 ml-11 space-y-1.5 border-l pl-3">
                  {group.activities.map((activity) => (
                    <li key={activity.code} className="grid grid-cols-[3rem_minmax(0,1fr)] gap-x-2 text-sm">
                      <span className="font-mono text-xs tabular-nums text-muted-foreground">{activity.code}</span>
                      <span className="text-muted-foreground">{activity.label}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          )
        })}
      </ul>
      {groups.length > limit ? (
        <button type="button" onClick={() => setAll((current) => !current)} className="mt-3 inline-flex min-h-9 items-center text-sm font-medium text-foreground underline-offset-4 hover:underline">
          {all ? <Trans>Doar primele {limit} domenii</Trans> : plural(groups.length, { one: 'Un domeniu', few: 'Toate cele # domenii', other: 'Toate cele # de domenii' })}
        </button>
      ) : null}
      <MonoLabel className="mt-4 block leading-relaxed text-muted-foreground">
        {plural(total, {
          one: `O activitate autorizată în registrul comerțului${nomenclature}.`,
          few: `# activități autorizate în registrul comerțului${nomenclature}.`,
          other: `# de activități autorizate în registrul comerțului${nomenclature}.`,
        })}
      </MonoLabel>
    </div>
  )
}

// ─────────────────────────────────────────────── registry ──

export function RegistryFacts({ model, className, columns = 2 }: { readonly model: CompanyPageModel; readonly className?: string; readonly columns?: 1 | 2 }) {
  const { profile, place, mainActivity } = model
  const rows: { readonly term: string; readonly detail: ReactNode }[] = [
    { term: t`Denumire în registru`, detail: profile.legalName },
    ...(profile.cui ? [{ term: t`Cod fiscal (CUI)`, detail: <CopyCui cui={profile.cui} bare /> }] : []),
    ...(profile.codInmatriculare ? [{ term: t`Nr. de ordine în registru`, detail: <span className="font-mono text-xs">{profile.codInmatriculare}</span> }] : []),
    ...(model.legalFormName ? [{ term: t`Formă juridică`, detail: model.legalFormName }] : []),
    ...(profile.registrationDate ? [{ term: t`Înregistrată`, detail: dateText(profile.registrationDate) }] : []),
    { term: t`Stare în registru`, detail: model.status.label ?? '—' },
    { term: t`Sediu`, detail: place.label ?? '—' },
    ...(mainActivity ? [{ term: t`Activitate principală (ANAF)`, detail: `${mainActivity.code} · ${mainActivity.label}` }] : []),
    { term: t`TVA`, detail: profile.fiscal.vatPayer ? t`Plătitoare` : profile.fiscal.vatPayer === false ? t`Neplătitoare` : '—' },
    {
      term: t`Stare fiscală`,
      detail: !profile.fiscal.anafFound ? t`Nu apare în datele ANAF` : profile.fiscal.inactive === null ? '—' : profile.fiscal.inactive ? t`Inactivă la ANAF` : t`Activă la ANAF`,
    },
    ...(model.sizeClass ? [{ term: t`Mărime`, detail: sizeClassLabel(model.sizeClass) }] : []),
    ...(profile.representatives.length > 0 ? [{ term: t`Reprezentanți`, detail: profile.representatives.map((person) => `${person.name} (${person.role})`).join('; ') }] : []),
    ...(profile.euBranches.length > 0 ? [{ term: t`Sucursale în UE`, detail: profile.euBranches.map((branch) => `${branch.name} (${branch.country})`).join('; ') }] : []),
  ]
  return (
    <dl className={cn('grid gap-x-8', columns === 2 && 'sm:grid-cols-2', className)}>
      {rows.map((row) => (
        <div key={row.term} className="grid grid-cols-[minmax(0,11rem)_minmax(0,1fr)] items-baseline gap-x-4 border-b border-border/70 py-2.5">
          <dt className="text-sm text-muted-foreground">{row.term}</dt>
          <dd className="min-w-0 break-words text-sm text-foreground">{row.detail}</dd>
        </div>
      ))}
    </dl>
  )
}

export function SourcesLine({ model, className }: { readonly model: CompanyPageModel; readonly className?: string }) {
  const onrc = model.profile.sources.find((source) => source.id === 'onrc')
  const anaf = model.profile.sources.find((source) => source.id === 'anaf')
  const years = model.profile.financials.map((year) => year.fiscalYear)
  const parts = [
    onrc ? t`Registrul comerțului (ONRC), ${dateText(onrc.snapshotDate)}` : null,
    anaf ? t`ANAF, ${dateText(anaf.snapshotDate)}` : null,
    years.length > 0
      ? Math.min(...years) === Math.max(...years)
        ? t`bilanțul pe ${years[0] ?? ''}`
        : t`bilanțuri ${Math.min(...years)}–${Math.max(...years)}`
      : null,
    model.procurement.window.from ? t`achiziții publice (SEAP) din ${model.procurement.window.from.slice(0, 4)}` : null,
  ].filter(Boolean)
  return (
    <MonoLabel className={cn('block leading-relaxed text-muted-foreground', className)}>
      <Trans>Surse:</Trans> {parts.join(' · ')}
    </MonoLabel>
  )
}
