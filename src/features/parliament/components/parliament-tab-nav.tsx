import { Link } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import type { ParliamentTabId } from '@/schemas/parliament'

export type ParliamentTab = 'hub' | 'membri' | 'voturi' | 'grupuri' | 'proiecte'

const TABS: ReadonlyArray<{
  readonly id: ParliamentTab
  readonly tab: ParliamentTabId
  readonly label: string
}> = [
  { id: 'hub', tab: 'prezentare', label: 'Prezentare' },
  { id: 'membri', tab: 'membri', label: 'Membri' },
  { id: 'voturi', tab: 'voturi', label: 'Voturi' },
  { id: 'proiecte', tab: 'proiecte', label: 'Proiecte' },
  { id: 'grupuri', tab: 'grupuri', label: 'Grupuri' },
]

type Props = {
  readonly activeTab: ParliamentTab
}

/** Section navigation — tab state synced to /parlament?tab= */
export function ParliamentTabNav({ activeTab }: Props) {
  return (
    <nav
      className="flex min-w-0 items-end gap-1 overflow-x-auto hide-scrollbar"
      aria-label="Secțiuni Parlament"
    >
      {TABS.map((tab) => {
        const isActive = tab.id === activeTab
        return (
          <Link
            key={tab.id}
            to="/parlament"
            search={{ tab: tab.tab }}
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
