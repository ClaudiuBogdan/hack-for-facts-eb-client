import { useNavigate } from '@tanstack/react-router'
import { LineChart } from 'lucide-react'
import type { CompanyAnalysisRelease } from '@/schemas/company-analytics'
import type { ResolvedQuestion } from '../../api/company-analytics-plan'
import { companiesChartLinkOf } from '../../lib/company-analytics-chart'
import type { CompanyAnalyticsState } from '../../lib/company-analytics-url'

/**
 * Opens the chart builder on the question: the chart is made on the click,
 * not written into the page (its address carries the whole chart, and its
 * time of making). The chart's own address is the shareable one.
 */
export function ChartButton({
  state,
  question,
  release,
  uatNames,
  label,
  className,
}: {
  readonly state: CompanyAnalyticsState
  readonly question: ResolvedQuestion
  readonly release: CompanyAnalysisRelease
  readonly uatNames?: ReadonlyMap<string, string>
  readonly label: string
  readonly className?: string
}) {
  const navigate = useNavigate()
  return (
    <button type="button" onClick={() => void navigate(companiesChartLinkOf(state, question, release, uatNames))} className={className}>
      <LineChart className="size-3.5" aria-hidden="true" />
      {label}
    </button>
  )
}
