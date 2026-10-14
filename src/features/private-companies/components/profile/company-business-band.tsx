import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { IndicatorToggle } from '@/components/landing-skin/indicator-toggle'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { HUB_BESIDE_TITLE_CLASS, HubSectionHead } from '@/features/statistics/components/hub/hub-chrome'
import { cn } from '@/lib/utils'
import {
  COMPANY_FINANCIAL_MEASURES,
  type CompanyFinancialMeasure,
  type FinancialMetric,
  type PrivateCompanyFinancialSummary,
} from '@/schemas/private-company'
import { count, moneyCell, moneyText, moneyTick, percent, yearRanges } from '../../lib/company-profile-format'
import type { CompanyProfileModel } from '../../lib/company-profile-model'
import { capitalised, debtSentence, financialLede, measureLabel, netChartLabel, netPointLabel, netResultStatusLabel, notAssessedNotice } from '../../lib/company-profile-text'
import { metricStatus, reportedNumber, reportedSummary } from '../../lib/financial-qualification'
import { BAND_GRID_CLASS, ProfileBand } from './company-profile-band'
import { CombinedYears, YearBars, type BarSeries } from './company-year-charts'
import { LongFormStatements } from './company-years-band'

const TITLE_ID = 'company-business-title'

/**
 * „Cum merge afacerea": every year with a statement on one chart — the three
 * figures together by default, each alone in detail — and beside it the
 * newest balance sheet against the year before, with the one ratio a reader
 * asks for, debts against equity.
 */
export function CompanyBusinessBand({
  model,
  index,
  measure,
  onMeasure,
}: {
  readonly model: CompanyProfileModel
  readonly index: string
  readonly measure: CompanyFinancialMeasure
  readonly onMeasure: (measure: CompanyFinancialMeasure) => void
}) {
  const title = <Trans>Cum merge afacerea</Trans>
  if (!model.latest) {
    // No typed statement, so no years band: statements held only in long format are listed here instead.
    return (
      <ProfileBand id="afacerea" titleId={TITLE_ID}>
        <HubSectionHead titleId={TITLE_ID} index={index} title={title} />
        <NoStatements className="mt-5" />
        <LongFormStatements model={model} className="mt-6" />
      </ProfileBand>
    )
  }
  const debt = debtSentence(model)
  // The newest statement could not be assessed: said where its figures would be. Every value it published is in the years' band.
  const notAssessed = notAssessedNotice(model)
  return (
    <ProfileBand id="afacerea" titleId={TITLE_ID}>
      <div className={BAND_GRID_CLASS}>
        <div className="min-w-0 lg:col-span-7">
          <HubSectionHead titleId={TITLE_ID} index={index} title={title} lede={financialLede(model)} />
          <div className="mt-8" data-reveal>
            <FinancialChart model={model} measure={measure} onMeasure={onMeasure} />
          </div>
          {notAssessed ? <p className="mt-8 max-w-[60ch] border-l-2 border-amber-500 py-0.5 pl-3 text-sm leading-relaxed text-foreground">{notAssessed}</p> : null}
        </div>
        <div className={cn('min-w-0 lg:col-span-5', HUB_BESIDE_TITLE_CLASS)} data-reveal>
          <BalanceSheet model={model} />
          {debt ? <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{debt}</p> : null}
        </div>
      </div>
    </ProfileBand>
  )
}

/**
 * No statement served at all: said once, where the figures would be. What
 * the data holds, not what the company filed — a filing the sources were not
 * read for, or kept apart, is not proof of no statement.
 */
function NoStatements({ className }: { readonly className?: string }) {
  return (
    <p className={cn('max-w-[60ch] text-sm leading-relaxed text-muted-foreground', className)}>
      <Trans>Nicio valoare din bilanțuri în datele de aici: cifra de afaceri, rezultatul și numărul de salariați nu sunt disponibile.</Trans>
    </p>
  )
}

function FinancialChart({
  model,
  measure,
  onMeasure,
}: {
  readonly model: CompanyProfileModel
  readonly measure: CompanyFinancialMeasure
  readonly onMeasure: (measure: CompanyFinancialMeasure) => void
}) {
  const statements = new Map(model.profile.financials.map((year) => [year.fiscalYear, year]))
  const charted: Record<CompanyFinancialMeasure, readonly FinancialMetric[]> = {
    toate: ['turnover', 'net_result', 'employees'],
    'cifra-de-afaceri': ['turnover'],
    profit: ['net_result'],
    salariati: ['employees'],
  }
  // A gap says why, and never claims what the data cannot know: no comparable
  // values for the year (a filing kept apart or not read is no proof of none),
  // a statement not qualified or qualified on another basis, the net result's
  // own hold, a value held out of the chart, or no typed value.
  // The years with no comparable values, said once under the chart.
  const gapYears = model.missingYears.length > 0 ? yearRanges(model.missingYears) : null
  const emptyLabel = (index: number) => {
    const statement = statements.get(model.span[index] ?? 0)
    if (!statement) return t`Fără valori comparabile pentru acest an`
    if (statement.qualification.assessment !== 'assessed') return t`Bilanț necalificat: valorile lui nu intră în grafic`
    if (model.qualification.otherBasisYears.includes(statement.fiscalYear)) return t`Calificat după altă politică sau ediție: nu se compară cu ceilalți ani`
    if (charted[measure].includes('net_result')) {
      const netStatus = metricStatus(statement, 'net_result')
      // A zero profit and NO typed loss: the result is unknown, never a break-even. Only then.
      if (netStatus !== 'reported' && reportedNumber(statement, 'net_profit') === 0 && metricStatus(statement, 'net_loss') === 'missing') {
        return t`Profit net zero și nicio pierdere disponibilă aici: rezultatul net nu se știe`
      }
      // Otherwise a held result says its own reason (a held loss beside a profit included).
      if (netStatus !== null && netStatus !== 'reported' && netStatus !== 'missing') return capitalised(netResultStatusLabel(netStatus))
    }
    const held = charted[measure].some((metric) => {
      const status = metricStatus(statement, metric)
      return status !== 'reported' && status !== 'missing'
    })
    return held ? t`Valoare reținută: nu intră în grafic` : t`Nicio valoare disponibilă aici pentru acest an`
  }
  return (
    <div>
      <div className="sm:w-fit">
        <IndicatorToggle
          label={t`Graficul arată`}
          options={COMPANY_FINANCIAL_MEASURES.map((key) => ({ key, label: measureLabel(key, model.series.net) }))}
          value={measure}
          onChange={onMeasure}
        />
      </div>
      <div className="mt-6">
        {measure === 'toate' ? (
          <CombinedYears
            years={model.span}
            turnover={model.series.turnover.map((point) => point.value)}
            net={model.series.net.map((point) => point.value)}
            employees={model.series.employees.map((point) => point.value)}
            netLabel={(index) => netPointLabel(model.series.net[index])}
            profitOnly={(index) => model.series.net[index]?.kind === 'profit'}
            labels={{
              turnover: t`Cifra de afaceri`,
              net: t`Rezultat net`,
              loss: t`Pierdere netă`,
              profit: t`Profit net (rezultatul net reținut)`,
              employees: t`Salariați`,
            }}
            formatTick={moneyTick}
            formatMoney={moneyText}
            formatCount={(value) => count(value)}
            emptyLabel={emptyLabel}
            label={netChartLabel(model.series.net)}
          />
        ) : (
          <YearBars
            key={measure}
            years={model.span}
            series={measureSeries(model, measure)}
            format={measure === 'salariati' ? (value) => count(value) : moneyTick}
            label={measureLabel(measure, model.series.net)}
            emptyLabel={emptyLabel}
            legend={measure === 'profit'}
            integer={measure === 'salariati'}
          />
        )}
      </div>
      {gapYears ? (
        <p className="mt-4 text-xs text-muted-foreground">
          <Trans>Fără valori comparabile pentru {gapYears}</Trans>
        </p>
      ) : null}
    </div>
  )
}

/**
 * One figure's bars. The bottom line keeps each year's metric: a net result
 * (a loss in its own colour) and an admitted profit whose result is held,
 * outlined — three series, so a reading never calls one the other.
 */
function measureSeries(model: CompanyProfileModel, measure: Exclude<CompanyFinancialMeasure, 'toate'>): readonly BarSeries[] {
  if (measure !== 'profit') {
    const points = measure === 'cifra-de-afaceri' ? model.series.turnover : model.series.employees
    return [{ key: measure, label: measureLabel(measure), values: points.map((point) => point.value), fill: 'fill-primary', swatch: 'bg-primary' }]
  }
  const net = model.series.net
  return [
    {
      key: 'result',
      label: t`Rezultat net`,
      values: net.map((point) => (point.kind === 'result' && point.value !== null && point.value >= 0 ? point.value : null)),
      fill: 'fill-primary',
      swatch: 'bg-primary',
    },
    {
      key: 'loss',
      label: t`Pierdere netă`,
      values: net.map((point) => (point.kind === 'result' && point.value !== null && point.value < 0 ? point.value : null)),
      fill: 'fill-destructive/70',
      swatch: 'bg-destructive/70',
    },
    {
      key: 'profit',
      label: t`Profit net (rezultatul net reținut)`,
      values: net.map((point) => (point.kind === 'profit' ? point.value : null)),
      fill: 'fill-primary/10',
      swatch: 'border border-primary',
      outline: true,
    },
  ]
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

/**
 * The newest balance sheet, and against the year before when there is one:
 * reported values only (a held one is listed apart, in the qualification
 * note), a change only against a reported value of a statement qualified
 * under the same policy, and a percent only between two positive figures.
 */
function BalanceSheet({ model }: { readonly model: CompanyProfileModel }) {
  const { latest, previous } = model
  if (!latest) return null
  const before = previous && model.comparable ? previous : null
  const currentAssets = reportedSummary(latest, 'currentAssets')
  // The „din care" rows are parts of current assets: under any other row they would read as its parts.
  const rows = balanceRows().flatMap((row) => {
    const value = reportedSummary(latest, row.key)
    return value === null || (row.indent && currentAssets === null) ? [] : [{ ...row, value }]
  })
  if (rows.length === 0) return null
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-border/70">
          <th scope="col" className="pb-2 text-left font-normal">
            <MonoLabel className="text-muted-foreground">
              <Trans>Bilanț, {latest.fiscalYear}</Trans>
            </MonoLabel>
          </th>
          <th scope="col" className="pb-2 pl-3 text-right font-normal">
            <MonoLabel className="text-muted-foreground">
              <Trans>lei</Trans>
            </MonoLabel>
          </th>
          {before ? (
            <th scope="col" className="pb-2 pl-3 text-right font-normal">
              <MonoLabel className="text-muted-foreground">
                <Trans>față de {before.fiscalYear}</Trans>
              </MonoLabel>
            </th>
          ) : null}
        </tr>
      </thead>
      <tbody className="divide-y divide-border/70">
        {rows.map((row) => {
          const earlier = before ? reportedSummary(before, row.key) : null
          const change = earlier !== null && earlier > 0 && row.value >= 0 ? (row.value - earlier) / earlier : null
          return (
            <tr key={row.key}>
              <th scope="row" className={cn('py-2.5 text-left font-normal', row.indent ? 'pl-4 text-muted-foreground' : 'text-foreground')}>
                {row.label}
              </th>
              <td className={cn('py-2.5 pl-3 text-right font-semibold tabular-nums', row.value < 0 ? 'text-destructive' : 'text-foreground')}>
                {moneyCell(row.value)}
              </td>
              {before ? <td className="py-2.5 pl-3 text-right tabular-nums text-muted-foreground">{change === null ? '—' : percent(change, true)}</td> : null}
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
