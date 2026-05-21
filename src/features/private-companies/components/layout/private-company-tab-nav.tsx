import { cn } from '@/lib/utils'
import type { PrivateCompanyViewTab } from '@/schemas/private-company'
import { getPrivateCompanyTabs } from '../../lib/tab-config'

type Props = {
  readonly activeTab: PrivateCompanyViewTab
  readonly onTabChange: (tab: PrivateCompanyViewTab) => void
}

export function PrivateCompanyTabNav({ activeTab, onTabChange }: Props) {
  const tabs = getPrivateCompanyTabs()

  return (
    <nav
      className={cn(
        'company-tab-nav flex min-w-0 items-end gap-1 overflow-x-auto overflow-y-hidden hide-scrollbar',
        'border-b-2 border-[var(--pnrr-border)] bg-background px-4 sm:px-6 lg:px-8',
      )}
      role="tablist"
      aria-label="Company sections"
    >
      {tabs.map((tab) => {
        const Icon = tab.icon
        const isActive = tab.id === activeTab
        return (
          <button
            key={tab.id}
            id={`company-tab-${tab.id}`}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-controls={`company-tabpanel-${tab.id}`}
            aria-label={tab.label}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              'group relative flex shrink-0 items-center gap-2 whitespace-nowrap transition-colors',
              'px-4 py-3.5 text-base sm:px-5',
              'select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-green)]/60',
            )}
          >
            <Icon
              className={cn(
                'h-5 w-5 shrink-0 transition-colors',
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
                'absolute bottom-[-2px] left-0 right-0 h-[5px] bg-[var(--pnrr-green)] transition-all duration-200',
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
