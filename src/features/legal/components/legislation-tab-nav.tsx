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
  /** Omitted while the route does not exist — the tab renders inert. */
  readonly to?:
    | '/legislation'
    | '/legislation/analytics'
    | '/legislation/acts'
    | '/legislation/gazette'
}

type Props = {
  readonly activeTab: LegislationTab
}

/**
 * Section navigation for `/legislation`.
 *
 * **Prezentare**, **Analiză**, **Acte** and **Monitorul Oficial** have routes;
 * the other three are rendered but inert — deliberately: the tab set is the
 * module's information architecture (`docs/design/legal/main-page.md` §3), and
 * hiding it until every route exists would misrepresent the shape of the
 * domain. They become links by gaining a `to`, with no other change.
 *
 * Analiză sits second rather than last, where an analytics tab normally goes:
 * it holds the corpus figures that used to be on the landing page, and burying
 * it behind four disabled tabs would make them harder to find than before they
 * moved.
 *
 * Note on Modificări: it is inert for a second reason. There is no global
 * "recently changed" query on the server (§6.1), so it has nothing to serve even
 * once routed. Cut it rather than ship it empty if that query does not land.
 */
export function LegislationTabNav({ activeTab }: Props) {
  const tabs: ReadonlyArray<TabSpec> = [
    { id: 'prezentare', label: t`Prezentare`, to: '/legislation' },
    { id: 'analiza', label: t`Analiză`, to: '/legislation/analytics' },
    { id: 'cauta', label: t`Caută` },
    { id: 'acte', label: t`Acte`, to: '/legislation/acts' },
    { id: 'modificari', label: t`Modificări` },
    { id: 'monitorul', label: t`Monitorul Oficial`, to: '/legislation/gazette' },
    { id: 'ghid', label: t`Ghid` },
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

        if (tab.to === undefined) {
          return (
            <span
              key={tab.id}
              aria-disabled="true"
              className={cn(
                baseClassName,
                'cursor-not-allowed font-normal text-[var(--pnrr-muted)] opacity-55',
              )}
            >
              {tab.label}
              <span className="sr-only"> ({t`în curând`})</span>
            </span>
          )
        }

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
