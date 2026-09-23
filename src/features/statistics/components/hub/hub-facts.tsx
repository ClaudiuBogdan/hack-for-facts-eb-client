import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { Trans } from '@lingui/react/macro'
import type { StatisticsHubData, StatisticsHubIndicator } from '@/schemas/statistics'
import { sourceDecimals } from '../../lib/numbers'
import { hubUnitWord } from '../../lib/units'
import { formatHubPeriod, sameMonthLastYear } from '../../lib/period'
import { annualInflationRate, indicatorDetailSearch } from '../../lib/hub-indicators'
import { HUB_HEADLINE_CODES } from '../../lib/landing-constants'
import { describeValueStatus } from '../../lib/value-status'
import type { HubFact } from './hub-figures'

export function indicatorByCode(hub: StatisticsHubData | undefined, code: string): StatisticsHubIndicator | undefined {
  return hub?.indicators?.find((indicator) => indicator.code === code)
}

/** An indicator with a number and a period to show, or nothing — a blocked or absent cell has no figure to put in the band. */
function withFigure(indicator: StatisticsHubIndicator | undefined) {
  return indicator && indicator.value !== null && indicator.period ? { ...indicator, value: indicator.value, period: indicator.period } : null
}

/** The cell's INS flag, spelled out after its period: a provisional or estimated figure says so here as it does in the rows. */
function withValueStatus(note: ReactNode, indicator: StatisticsHubIndicator): ReactNode {
  return indicator.valueStatus ? (
    <>
      {note}, {describeValueStatus(indicator.valueStatus)}
    </>
  ) : (
    note
  )
}

/** The fact's link into its exact national cell on the dataset page. */
function linkToCell(indicator: StatisticsHubIndicator): HubFact['link'] {
  return (label, className) => (
    <Link to="/ins/seturi/$cod" params={{ cod: indicator.code }} search={indicatorDetailSearch(indicator)} className={className}>
      {label}
    </Link>
  )
}

/**
 * The four figures under the hero, from the hub's national cells: inflation
 * as the index less 100 at the source's own decimals, then net earnings,
 * the unemployment rate and the resident population. A cell with no number
 * — blocked by INS, or not in the answer — leaves its figure out.
 */
export function buildHubFacts(hub: StatisticsHubData | undefined): readonly HubFact[] {
  const inflation = withFigure(indicatorByCode(hub, HUB_HEADLINE_CODES.inflation))
  const earnings = withFigure(indicatorByCode(hub, HUB_HEADLINE_CODES.earnings))
  const unemployment = withFigure(indicatorByCode(hub, HUB_HEADLINE_CODES.unemployment))
  const population = withFigure(indicatorByCode(hub, HUB_HEADLINE_CODES.population))
  const inflationBase = inflation ? sameMonthLastYear(inflation.period) : null
  return [
    ...(inflation
      ? [
          {
            key: 'inflation',
            value: annualInflationRate(inflation.value, sourceDecimals(inflation.rawValue)),
            digits: sourceDecimals(inflation.rawValue),
            unit: '%',
            label: <Trans>Inflația anuală</Trans>,
            note: withValueStatus(
              inflationBase ? (
                <Trans>
                  {formatHubPeriod(inflation.period)} față de {formatHubPeriod(inflationBase)}
                </Trans>
              ) : (
                formatHubPeriod(inflation.period)
              ),
              inflation,
            ),
            link: linkToCell(inflation),
          } satisfies HubFact,
        ]
      : []),
    ...(earnings
      ? [
          {
            key: 'earnings',
            value: earnings.value,
            digits: sourceDecimals(earnings.rawValue),
            unit: hubUnitWord(earnings.unit, earnings.unitLabel),
            label: <Trans>Salariul mediu net</Trans>,
            note: withValueStatus(formatHubPeriod(earnings.period), earnings),
            link: linkToCell(earnings),
          } satisfies HubFact,
        ]
      : []),
    ...(unemployment
      ? [
          {
            key: 'unemployment',
            value: unemployment.value,
            digits: sourceDecimals(unemployment.rawValue),
            unit: '%',
            label: <Trans>Rata șomajului</Trans>,
            note: withValueStatus(<Trans>Șomeri înregistrați, {formatHubPeriod(unemployment.period)}</Trans>, unemployment),
            link: linkToCell(unemployment),
          } satisfies HubFact,
        ]
      : []),
    ...(population
      ? [
          {
            key: 'population',
            value: population.value,
            digits: 0,
            label: <Trans>Locuitori</Trans>,
            note: withValueStatus(<Trans>Populația rezidentă la 1 ianuarie {population.period}</Trans>, population),
            link: linkToCell(population),
          } satisfies HubFact,
        ]
      : []),
  ]
}
