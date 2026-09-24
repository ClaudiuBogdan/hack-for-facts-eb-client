import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { IndicatorToggle } from '@/components/landing-skin/indicator-toggle'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { HUB_BESIDE_TITLE_CLASS, HubSectionHead } from '@/features/statistics/components/hub/hub-chrome'
import { cn } from '@/lib/utils'
import { COMPANY_FINANCIAL_MEASURES, type CompanyFinancialMeasure, type PrivateCompanyFinancialSummary } from '@/schemas/private-company'
import { count, moneyCell, moneyText, moneyTick, percent, yearRanges } from '../../lib/company-profile-format'
import type { CompanyProfileModel } from '../../lib/company-profile-model'
import { debtSentence, financialLede, measureLabel } from '../../lib/company-profile-text'
import { BAND_GRID_CLASS, ProfileBand } from './company-profile-band'
import { CombinedYears, YearBars, type BarSeries } from './company-year-charts'

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
    return (
      <ProfileBand id="afacerea" titleId={TITLE_ID}>
        <HubSectionHead titleId={TITLE_ID} index={index} title={title} />
        <NoStatements className="mt-5" />
      </ProfileBand>
    )
  }
  const debt = debtSentence(model)
  return (
    <ProfileBand id="afacerea" titleId={TITLE_ID}>
      <div className={BAND_GRID_CLASS}>
        <div className="min-w-0 lg:col-span-7">
          <HubSectionHead titleId={TITLE_ID} index={index} title={title} lede={financialLede(model)} />
          <div className="mt-8" data-reveal>
            <FinancialChart model={model} measure={measure} onMeasure={onMeasure} />
          </div>
        </div>
        <div className={cn('min-w-0 lg:col-span-5', HUB_BESIDE_TITLE_CLASS)} data-reveal>
          <BalanceSheet model={model} />
          {debt ? <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{debt}</p> : null}
        </div>
      </div>
    </ProfileBand>
  )
}

/** No statement at all: said once, where the figures would be. */
function NoStatements({ className }: { readonly className?: string }) {
  return (
    <p className={cn('max-w-[60ch] text-sm leading-relaxed text-muted-foreground', className)}>
      <Trans>Niciun bilanț publicat la ANAF: nu se știu cifra de afaceri, rezultatul sau numărul de salariați.</Trans>
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
  const missing = new Set(model.missingYears)
  const emptyLabel = (index: number) =>
    missing.has(model.span[index] ?? 0) ? t`Niciun bilanț publicat pentru acest an` : t`Nu apare în bilanț`
  return (
    <div>
      <div className="sm:w-fit">
        <IndicatorToggle
          label={t`Graficul arată`}
          options={COMPANY_FINANCIAL_MEASURES.map((key) => ({ key, label: measureLabel(key) }))}
          value={measure}
          onChange={onMeasure}
        />
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
            emptyLabel={emptyLabel}
            label={t`Cifra de afaceri, rezultatul net și salariații`}
          />
        ) : (
          <YearBars
            key={measure}
            years={model.span}
            series={measureSeries(model, measure)}
            format={measure === 'salariati' ? (value) => count(value) : moneyTick}
            label={measureLabel(measure)}
            emptyLabel={emptyLabel}
            legend={measure === 'profit' && model.lossYears > 0}
            integer={measure === 'salariati'}
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

/** One figure's bars; the net result as profit and loss apart, so a loss reads in its own colour. */
function measureSeries(model: CompanyProfileModel, measure: Exclude<CompanyFinancialMeasure, 'toate'>): readonly BarSeries[] {
  const points = measure === 'cifra-de-afaceri' ? model.series.turnover : measure === 'profit' ? model.series.netResult : model.series.employees
  const values = points.map((point) => point.value)
  if (measure !== 'profit') return [{ key: measure, label: measureLabel(measure), values, fill: 'fill-primary', swatch: 'bg-primary' }]
  return [
    {
      key: 'profit',
      label: t`Profit net`,
      values: values.map((value) => (value !== null && value >= 0 ? value : null)),
      fill: 'fill-primary',
      swatch: 'bg-primary',
    },
    {
      key: 'loss',
      label: t`Pierdere netă`,
      values: values.map((value) => (value !== null && value < 0 ? value : null)),
      fill: 'fill-destructive/70',
      swatch: 'bg-destructive/70',
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

/** The newest balance sheet, and against the year before when there is one: a percent only between two positive figures. */
function BalanceSheet({ model }: { readonly model: CompanyProfileModel }) {
  const { latest, previous } = model
  const current = latest?.summary
  if (!latest || !current) return null
  const before = previous?.summary ?? null
  // The „din care" rows are parts of current assets: under any other row they would read as its parts.
  const rows = balanceRows().flatMap((row) => {
    const value = current[row.key]
    return value === null || (row.indent && current.currentAssets === null) ? [] : [{ ...row, value }]
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
          const earlier = before?.[row.key] ?? null
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
