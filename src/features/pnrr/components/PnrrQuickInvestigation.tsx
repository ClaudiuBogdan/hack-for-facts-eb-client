import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import type { usePnrrFilterState } from '../hooks/usePnrrFilterState'
import { cn } from '@/lib/utils'
import {
  Search,
  Banknote,
  GitCompareArrows,
  Building2,
  Clock,
  TrendingUp,
} from 'lucide-react'

const PRESETS = [
  {
    id: 'big-black-holes',
    label: t`Large value, low progress`,
    icon: Search,
    apply: (fs: ReturnType<typeof usePnrrFilterState>) => {
      fs.clearFilters({
        anomalyTypes: ['large-low-progress'],
        sortBy: 'value',
        sortOrder: 'desc',
      })
    },
  },
  {
    id: 'advance-payment',
    label: t`Financial-technical gap`,
    icon: Banknote,
    apply: (fs: ReturnType<typeof usePnrrFilterState>) => {
      fs.clearFilters({
        anomalyTypes: ['payment-ahead-delivery'],
      })
    },
  },
  {
    id: 'financial-overrun',
    label: t`Over 100% financial`,
    icon: TrendingUp,
    apply: (fs: ReturnType<typeof usePnrrFilterState>) => {
      fs.clearFilters({
        anomalyTypes: ['financial-overrun'],
      })
    },
  },
  {
    id: 'stalled-completion',
    label: t`Technically completed, low financial progress`,
    icon: Clock,
    apply: (fs: ReturnType<typeof usePnrrFilterState>) => {
      fs.clearFilters({
        anomalyTypes: ['stalled-completion'],
      })
    },
  },
  {
    id: 'suspect-duplicates',
    label: t`Posibile duplicate`,
    icon: GitCompareArrows,
    apply: (fs: ReturnType<typeof usePnrrFilterState>) => {
      fs.clearFilters({
        dataQualitySignalTypes: ['duplicate-conflict'],
      })
    },
  },
  {
    id: 'private-loans',
    label: t`Explore loan-funded non-public beneficiaries`,
    icon: Building2,
    apply: (fs: ReturnType<typeof usePnrrFilterState>) => {
      fs.clearFilters({
        fundingSources: ['loan', 'grant/loan'],
        entityTypes: ['private'],
        sortBy: 'value',
        sortOrder: 'desc',
      })
    },
  },
]

export function PnrrQuickInvestigation({
  filterState,
}: {
  readonly filterState: ReturnType<typeof usePnrrFilterState>
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-bold leading-relaxed text-[var(--pnrr-muted)]">
        <Trans>
          Quick analytical views. A preset is not, by itself, evidence of a
          problem.
        </Trans>
      </p>
      <div className="flex flex-wrap gap-3">
        {PRESETS.map((preset) => {
          const Icon = preset.icon
          return (
            <button
              key={preset.id}
              type="button"
              className={cn(
                'inline-flex min-h-10 items-center gap-3 rounded-none border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] px-4 py-2 text-left text-sm font-black uppercase tracking-wide text-[var(--pnrr-fg)] transition-colors',
                'hover:bg-[var(--pnrr-fg)] hover:text-[var(--pnrr-bg)]',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
              )}
              onClick={() => preset.apply(filterState)}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span>{preset.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
