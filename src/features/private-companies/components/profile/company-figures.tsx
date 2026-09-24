import type { ReactNode } from 'react'
import { Trans } from '@lingui/react/macro'
import type { HubFact } from '@/features/statistics/components/hub/hub-figures'
import { moneyFigure } from '../../lib/company-profile-format'
import { netResultOf, type CompanyProfileModel } from '../../lib/company-profile-model'
import { changeNote, countChangeNote, moneyPeriod, netChangeNote } from '../../lib/company-profile-text'

/** A figure's link to the band that breaks it down. */
function toBand(anchor: string) {
  return function BandLink(label: ReactNode, className: string) {
    return (
      <a href={`#${anchor}`} className={className}>
        {label}
      </a>
    )
  }
}

/**
 * The figures band under the head: size, result, people and public money —
 * each only when the record has it, so a company that never filed shows its
 * public money alone, and one with neither shows no band.
 */
export function companyFigures(model: CompanyProfileModel, anchors: { readonly business: string; readonly money: string }): readonly HubFact[] {
  const { latest, previous, money } = model
  const figures: HubFact[] = []
  if (latest) {
    const year = latest.fiscalYear
    const previousYear = previous?.fiscalYear ?? year - 1
    if (latest.turnover !== null) {
      figures.push({
        key: 'turnover',
        ...moneyFigure(latest.turnover),
        label: <Trans>Cifra de afaceri, {year}</Trans>,
        note: changeNote(previous?.turnover, latest.turnover, previousYear),
        link: toBand(anchors.business),
      })
    }
    const net = netResultOf(latest)
    if (net !== null) {
      figures.push({
        key: 'net',
        ...moneyFigure(Math.abs(net)),
        label: net > 0 ? <Trans>Profit net, {year}</Trans> : net < 0 ? <Trans>Pierdere netă, {year}</Trans> : <Trans>Rezultat net, {year}</Trans>,
        note: netChangeNote(previous, latest),
        link: toBand(anchors.business),
      })
    }
    if (latest.employees !== null) {
      figures.push({
        key: 'employees',
        value: latest.employees,
        digits: 0,
        label: <Trans>Salariați, {year}</Trans>,
        note: countChangeNote(previous?.employees ?? null, latest.employees, previousYear),
        link: toBand(anchors.business),
      })
    }
  }
  // A sum only when some receipt has a published amount, whatever its sign: a count of unvalued records is not a figure.
  if (money.flows.some((flow) => flow.receipt && flow.total !== null)) {
    figures.push({
      key: 'public',
      ...moneyFigure(money.received),
      label: <Trans>Contracte și plăți publice</Trans>,
      note: moneyPeriod(model),
      link: toBand(anchors.money),
    })
  }
  return figures
}
