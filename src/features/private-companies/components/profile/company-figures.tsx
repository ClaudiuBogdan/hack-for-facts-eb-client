import type { ReactNode } from 'react'
import { Trans } from '@lingui/react/macro'
import type { HubFact } from '@/features/statistics/components/hub/hub-figures'
import { moneyFigure } from '../../lib/company-profile-format'
import type { CompanyProfileModel } from '../../lib/company-profile-model'
import { changeNote, countChangeNote, moneyPeriod, netChangeNote } from '../../lib/company-profile-text'
import { qualifiedNet, reportedNumber } from '../../lib/financial-qualification'

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
 * public money alone, and one with neither shows no band. A statement figure
 * is a REPORTED value only (the net result the evaluator's own), and its
 * change only against a reported value under the same policy; held or
 * unassessed values are shown apart, in the business band.
 */
export function companyFigures(model: CompanyProfileModel, anchors: { readonly business: string; readonly money: string }): readonly HubFact[] {
  const { latest, previous, money } = model
  const figures: HubFact[] = []
  if (latest) {
    const year = latest.fiscalYear
    const previousYear = previous?.fiscalYear ?? year - 1
    const before = previous && model.comparable ? previous : null
    const turnover = reportedNumber(latest, 'turnover')
    if (turnover !== null) {
      figures.push({
        key: 'turnover',
        ...moneyFigure(turnover),
        label: <Trans>Cifra de afaceri, {year}</Trans>,
        note: changeNote(before ? reportedNumber(before, 'turnover') : null, turnover, previousYear),
        link: toBand(anchors.business),
      })
    }
    const net = qualifiedNet(latest)
    if (net !== null) {
      figures.push({
        key: 'net',
        ...moneyFigure(Math.abs(net)),
        label: net > 0 ? <Trans>Profit net, {year}</Trans> : net < 0 ? <Trans>Pierdere netă, {year}</Trans> : <Trans>Rezultat net, {year}</Trans>,
        note: netChangeNote(previous, latest),
        link: toBand(anchors.business),
      })
    }
    const employees = reportedNumber(latest, 'employees')
    if (employees !== null) {
      figures.push({
        key: 'employees',
        value: employees,
        digits: 0,
        label: <Trans>Salariați, {year}</Trans>,
        note: countChangeNote(before ? reportedNumber(before, 'employees') : null, employees, previousYear),
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
