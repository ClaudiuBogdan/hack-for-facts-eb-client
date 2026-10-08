import type { ReactNode } from 'react'
import { t } from '@lingui/core/macro'
import type { HubFact } from '@/features/statistics/components/hub/hub-figures'
import { figuresOf } from '../../lib/echr-model'
import type { EchrSnapshot } from '../../lib/echr-snapshot-types'
import { decisionsCount, joinedText, lastMonthText } from '../../lib/echr-text'
import { signedPercentText } from '../../lib/judicial-format'

/** The ECHR page's view helpers, pure: the figures band's facts. */

const plain = (label: ReactNode, className: string) => <span className={className}>{label}</span>

/**
 * The year's figures: the judgments and their change on the year before
 * (only between two whole years), the applications they decide, the median
 * wait from an application's year, and the cases communicated with the
 * decisions.
 */
export function echrFacts(snapshot: EchrSnapshot, year: number): readonly HubFact[] {
  const figures = figuresOf(snapshot, year)
  const facts: HubFact[] = [
    {
      key: 'hotarari',
      value: figures.judgments,
      digits: 0,
      label: t`Hotărâri`,
      note:
        figures.change !== null
          ? t`${signedPercentText(figures.change)} față de ${year - 1}`
          : figures.state === 'running'
            ? t`până în ${lastMonthText(snapshot)}`
            : figures.state === 'partial'
              ? t`preluare parțială`
              : null,
      link: plain,
    },
    { key: 'cereri', value: figures.applications, digits: 0, label: t`Cereri soluționate`, note: figures.joined > 0 ? joinedText(figures.joined) : null, link: plain },
  ]
  if (figures.medianWait !== null) {
    facts.push({
      key: 'asteptare',
      value: figures.medianWait,
      digits: Number.isInteger(figures.medianWait) ? 0 : 1,
      unit: figures.medianWait === 1 ? t`an` : t`ani`,
      label: t`De la cerere la hotărâre`,
      note: t`mediană, din anul depunerii cererii`,
      link: plain,
    })
  }
  facts.push({ key: 'comunicate', value: figures.communicated, digits: 0, label: t`Cauze comunicate Guvernului`, note: t`și ${decisionsCount(figures.decisions)}`, link: plain })
  return facts
}
