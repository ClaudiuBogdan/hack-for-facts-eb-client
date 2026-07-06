import { t } from '@lingui/core/macro'
import { Link } from '@tanstack/react-router'
import { cn } from '@/lib/utils'

export type ProcurementTab = 'overview' | 'search'

type Props = {
  readonly activeTab: ProcurementTab
}

/**
 * Section navigation — tabs are real routes (Overview → /procurement,
 * Search → /procurement/search), parliament-tab-nav styling.
 */
export function ProcurementTabNav({ activeTab }: Props) {
  const tabs = [
    { id: 'overview' as const, to: '/procurement' as const, label: t`Overview` },
    {
      id: 'search' as const,
      to: '/procurement/search' as const,
      label: t`Search`,
    },
  ]

  return (
    <nav
      className="flex min-w-0 items-end gap-1 overflow-x-auto hide-scrollbar"
      aria-label={t`Public procurement sections`}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab
        return (
          <Link
            key={tab.id}
            to={tab.to}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'relative whitespace-nowrap px-4 py-3 text-base transition-colors sm:px-5',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)]',
              isActive
                ? 'font-bold text-[#0b0c0c] dark:text-[var(--pnrr-fg)]'
                : 'font-normal text-[var(--pnrr-muted)] hover:text-[#0b0c0c] dark:hover:text-[var(--pnrr-fg)]',
            )}
          >
            {tab.label}
            <span
              className={cn(
                'absolute bottom-0 left-0 right-0 h-[3px] bg-[#0b0c0c] transition-opacity dark:bg-[var(--pnrr-fg)]',
                isActive ? 'opacity-100' : 'opacity-0',
              )}
              aria-hidden
            />
          </Link>
        )
      })}
    </nav>
  )
}
