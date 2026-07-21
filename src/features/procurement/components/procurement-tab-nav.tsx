import { t } from '@lingui/core/macro'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { LayoutDashboard, MapPinned, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  cleanProcurementHubSearch,
  type ProcurementHubView,
} from '@/schemas/procurement-hub'

export type ProcurementTab = ProcurementHubView | 'search'

type Props = {
  readonly activeTab: ProcurementTab
  /** View switcher that preserves all hub URL params (F2). */
  readonly onTabChange?: (view: ProcurementHubView) => void
  readonly compact?: boolean
  readonly className?: string
}

function normalizeTab(tab: ProcurementTab): ProcurementHubView {
  if (tab === 'map') return 'map'
  if (tab === 'overview') return 'overview'
  return 'list'
}

/**
 * Hub section tabs — Overview / Map / List on the same `/procurement` URL.
 * Switching views must never strip schema keys (A2 / F2).
 */
export function ProcurementTabNav({
  activeTab,
  onTabChange,
  compact = false,
  className,
}: Props) {
  const navigate = useNavigate()
  const currentSearch = useSearch({ strict: false })
  const activeView = normalizeTab(activeTab)
  const tabs = [
    {
      id: 'overview' as const,
      label: t`Overview`,
      icon: LayoutDashboard,
    },
    {
      id: 'map' as const,
      label: t`Map`,
      icon: MapPinned,
    },
    {
      id: 'list' as const,
      label: t`List`,
      icon: Search,
    },
  ]

  const switchView = (view: ProcurementHubView) => {
    if (onTabChange) {
      onTabChange(view)
      return
    }
    void navigate({
      to: '/procurement',
      search: cleanProcurementHubSearch({
        ...(currentSearch as Record<string, unknown>),
        view,
      }),
    })
  }

  return (
    <nav
      className={cn(
        'flex min-w-0 items-end gap-1 overflow-x-auto overflow-y-hidden hide-scrollbar',
        !compact && 'border-b-2 border-[var(--pnrr-border)]',
        className,
      )}
      aria-label={t`Public procurement sections`}
      role="tablist"
    >
      {tabs.map((tab) => {
        const Icon = tab.icon
        const isActive = activeView === tab.id
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-current={isActive ? 'page' : undefined}
            aria-label={tab.label}
            onClick={() => switchView(tab.id)}
            className={cn(
              'group relative flex items-center gap-2 whitespace-nowrap transition-colors',
              'select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-green)]/60',
              compact
                ? 'px-2.5 py-2 text-[13px]'
                : 'px-4 py-3.5 text-base sm:px-5',
            )}
          >
            <Icon
              className={cn(
                'shrink-0 transition-colors',
                compact ? 'h-4 w-4' : 'h-5 w-5',
                isActive
                  ? 'text-[var(--pnrr-fg)]'
                  : 'text-[var(--pnrr-muted)] group-hover:text-[var(--pnrr-fg)]',
              )}
              strokeWidth={isActive ? 2.5 : 2}
              aria-hidden
            />
            <span
              className={cn(
                'transition-colors',
                isActive
                  ? 'font-extrabold text-[var(--pnrr-fg)]'
                  : 'font-semibold text-[var(--pnrr-muted)] group-hover:text-[var(--pnrr-fg)]',
                'hidden sm:inline',
              )}
            >
              {tab.label}
            </span>
            <span
              className={cn(
                'absolute bottom-[-2px] left-0 right-0 bg-[var(--pnrr-green)] transition-all duration-200',
                compact ? 'h-[3px]' : 'h-[5px]',
                isActive ? 'scale-x-100 opacity-100' : 'scale-x-0 opacity-0',
              )}
              aria-hidden
            />
          </button>
        )
      })}
    </nav>
  )
}
