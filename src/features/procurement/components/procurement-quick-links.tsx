import { Link } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { Building2, ChevronRight, Factory, Search, Tag } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  procurementCardChevronClassName,
  procurementSectionClassName,
} from '../lib/procurement-theme'

/** Entry cards into the investigation spine (lookup-first, no unwired facets). */
export function ProcurementQuickLinks() {
  const cards = [
    {
      key: 'search',
      icon: Search,
      title: t`Search records`,
      description: t`Find procedures, contracts, and direct acquisitions.`,
      to: '/procurement' as const,
      search: { view: 'list' as const },
    },
    {
      key: 'institutions',
      icon: Building2,
      title: t`Institutions`,
      description: t`Look up a public buyer, then open its procurement profile.`,
      to: '/entities' as const,
      search: undefined,
    },
    {
      key: 'companies',
      icon: Factory,
      title: t`Companies`,
      description: t`Look up a supplier and its public-sector revenue.`,
      to: '/companies' as const,
      search: undefined,
    },
    {
      key: 'categories',
      icon: Tag,
      title: t`Categories`,
      description: t`Browse spending by CPV from the overview rankings above.`,
      to: '/procurement' as const,
      search: { view: 'list' as const, grain: 'direct_acquisitions' as const },
    },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <Link
            key={card.key}
            to={card.to}
            search={card.search}
            className={cn(
              procurementSectionClassName,
              'group flex items-start justify-between gap-3 p-5 transition-colors hover:bg-[var(--pnrr-hover)]',
            )}
          >
            <div className="flex min-w-0 items-start gap-3">
              <Icon
                className="mt-0.5 h-5 w-5 shrink-0 text-[var(--pnrr-muted)]"
                aria-hidden
              />
              <div className="min-w-0">
                <p className="text-lg font-bold leading-[1.25] text-[#0b0c0c] dark:text-[var(--pnrr-fg)]">
                  {card.title}
                </p>
                <p className="mt-1 text-sm text-[var(--pnrr-muted)]">
                  {card.description}
                </p>
              </div>
            </div>
            <ChevronRight
              className={cn(procurementCardChevronClassName, 'mt-1')}
              aria-hidden
            />
          </Link>
        )
      })}
    </div>
  )
}
