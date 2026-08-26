import { Link } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { cn } from '@/lib/utils'

export type LegislationTab =
  | 'prezentare'
  | 'analiza'
  | 'cauta'
  | 'acte'
  | 'modificari'
  | 'monitorul'
  | 'ghid'

type TabSpec = {
  readonly id: LegislationTab
  readonly label: string
  readonly to:
    | '/legislation'
    | '/legislation/analytics'
    | '/legislation/search'
    | '/legislation/acts'
    | '/legislation/changes'
    | '/legislation/gazette'
    | '/legislation/guide'
}

type Props = {
  readonly activeTab: LegislationTab
}

/**
 * Section navigation for `/legislation`.
 *
 * Every tab of the module's information architecture
 * (`docs/design/legal/main-page.md` §3) now has a route. While routes were
 * still landing, a missing `to` rendered a tab honestly inert rather than
 * hiding it — that mechanism retired with its last user when Ghid gained
 * `/legislation/guide` (2026-08-26); a future tab would reintroduce it as a
 * deliberate choice, not inherit it as dead code.
 *
 * Analiză sits second rather than last, where an analytics tab normally goes:
 * it holds the corpus figures that used to be on the landing page, and burying
 * it behind other tabs would make them harder to find than before they moved.
 */
export function LegislationTabNav({ activeTab }: Props) {
  const tabs: ReadonlyArray<TabSpec> = [
    { id: 'prezentare', label: t`Prezentare`, to: '/legislation' },
    { id: 'analiza', label: t`Analiză`, to: '/legislation/analytics' },
    { id: 'cauta', label: t`Caută`, to: '/legislation/search' },
    { id: 'acte', label: t`Acte`, to: '/legislation/acts' },
    { id: 'modificari', label: t`Modificări`, to: '/legislation/changes' },
    { id: 'monitorul', label: t`Monitorul Oficial`, to: '/legislation/gazette' },
    { id: 'ghid', label: t`Ghid`, to: '/legislation/guide' },
  ]

  const baseClassName =
    'relative whitespace-nowrap px-4 py-3 text-base transition-colors sm:px-5'

  return (
    <nav
      className="flex min-w-0 items-end gap-1 overflow-x-auto hide-scrollbar"
      aria-label={t`Secțiuni Legislație`}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab

        return (
          <Link
            key={tab.id}
            to={tab.to}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              baseClassName,
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
