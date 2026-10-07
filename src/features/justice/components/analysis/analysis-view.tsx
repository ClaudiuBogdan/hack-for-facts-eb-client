import type { ReactNode } from 'react'
import { t } from '@lingui/core/macro'
import type { HubFact } from '@/features/statistics/components/hub/hub-figures'
import { changeOf, sourceOf, topShare, type Question } from '../../lib/analysis-model'
import { lastMonthText } from '../../lib/analysis-notes'
import type { Figures } from '../../lib/analysis-plans'
import { rowLabel } from '../../lib/analysis-text'
import { JUSTICE_LAST_CAPTURE_YEAR } from '../../lib/hub-years'
import { signedPercentText } from '../../lib/judicial-format'

/** The analysis page's view helpers, pure: the figures band's facts. */

const plain = (label: ReactNode, className: string) => <span className={className}>{label}</span>

/**
 * The year's figures: the cases and their change on the year before (the
 * plan reads the year before only when the two compare), the courts, the
 * five busiest courts' share, the largest matter's.
 */
export function analysisFacts(question: Question, figures: Figures): readonly HubFact[] {
  const facts: HubFact[] = []
  const change = changeOf(figures.total, figures.totalBefore)
  facts.push({
    key: 'dosare',
    value: figures.total,
    digits: 0,
    label: t`Dosare`,
    note: change !== null ? t`${signedPercentText(change)} față de ${question.year - 1}` : question.year === JUSTICE_LAST_CAPTURE_YEAR ? t`până în ${lastMonthText(sourceOf(question))}` : null,
    link: plain,
  })
  facts.push({ key: 'instante', value: figures.courts.size, digits: 0, label: t`Instanțe`, note: null, link: plain })
  const top5 = topShare(figures.courts, figures.total)
  if (top5 !== null) facts.push({ key: 'top5', value: top5 * 100, digits: top5 < 0.1 ? 1 : 0, unit: '%', label: t`Top 5 instanțe, din dosare`, note: null, link: plain })
  const [first] = [...figures.matters.entries()].sort((a, b) => b[1] - a[1])
  if (first && figures.matters.size > 1 && figures.total > 0) {
    const share = first[1] / figures.total
    facts.push({ key: 'materie', value: share * 100, digits: share < 0.1 ? 1 : 0, unit: '%', label: t`${rowLabel('materii', first[0]).label}, din dosare`, note: null, link: plain })
  }
  return facts
}
