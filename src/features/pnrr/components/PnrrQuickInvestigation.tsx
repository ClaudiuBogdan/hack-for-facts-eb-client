import { t } from '@lingui/core/macro'
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
    label: t`Large projects with low progress`,
    icon: Search,
    apply: (fs: ReturnType<typeof usePnrrFilterState>) => {
      fs.clearFilters()
      fs.setAnomalyTypes(['large-low-progress'])
      fs.setSorting('value', 'desc')
    },
  },
  {
    id: 'advance-payment',
    label: t`Payments ahead of delivery`,
    icon: Banknote,
    apply: (fs: ReturnType<typeof usePnrrFilterState>) => {
      fs.clearFilters()
      fs.setAnomalyTypes(['payment-ahead-delivery'])
    },
  },
  {
    id: 'financial-overrun',
    label: t`Financial overruns`,
    icon: TrendingUp,
    apply: (fs: ReturnType<typeof usePnrrFilterState>) => {
      fs.clearFilters()
      fs.setAnomalyTypes(['financial-overrun'])
    },
  },
  {
    id: 'stalled-completion',
    label: t`Blocked works`,
    icon: Clock,
    apply: (fs: ReturnType<typeof usePnrrFilterState>) => {
      fs.clearFilters()
      fs.setAnomalyTypes(['stalled-completion'])
    },
  },
  {
    id: 'suspect-duplicates',
    label: t`Suspected duplicates`,
    icon: GitCompareArrows,
    apply: (fs: ReturnType<typeof usePnrrFilterState>) => {
      fs.clearFilters()
      fs.setDataQualitySignalTypes(['duplicate-conflict'])
    },
  },
  {
    id: 'private-loans',
    label: t`Loans for private sector`,
    icon: Building2,
    apply: (fs: ReturnType<typeof usePnrrFilterState>) => {
      fs.clearFilters()
      fs.setFundingSources(['loan', 'grant/loan'])
      fs.setEntityTypes(['private'])
      fs.setSorting('value', 'desc')
    },
  },
]

export function PnrrQuickInvestigation({
  filterState,
}: {
  readonly filterState: ReturnType<typeof usePnrrFilterState>
}) {
  return (
    <div className="flex flex-wrap gap-3">
      {PRESETS.map((preset) => {
        const Icon = preset.icon
        return (
          <button
            key={preset.id}
            type="button"
            className={cn(
              'inline-flex h-10 items-center gap-3 rounded-none border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] px-4 text-sm font-black uppercase tracking-wide text-[var(--pnrr-fg)] transition-colors',
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
  )
}
