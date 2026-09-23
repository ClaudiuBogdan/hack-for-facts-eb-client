import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { useLingui } from '@lingui/react/macro'
import { cn } from '@/lib/utils'
import { CATEGORY_LABEL, STATUS_LABEL } from './ngo-hub-labels'
import { formatNgoNumber, formatNgoShare } from './ngo-format'
import { REGISTRY_STATUS_VALUE, categoryShares, registrySearch, statusShares } from './registry-figures'
import type { NgoRegistrySummary } from './registry-summary-types'

/** A row that opens the registry when it is on, and is plain text when it is not. */
function RegistryRowLink({
  registry,
  search,
  className,
  children,
}: {
  readonly registry: boolean
  readonly search: ReturnType<typeof registrySearch>
  readonly className: string
  readonly children: ReactNode
}) {
  return registry ? (
    <Link to="/ong-uri/registru" search={search} className={cn(className, 'transition-colors hover:bg-muted/50')}>
      {children}
    </Link>
  ) : (
    <div className={className}>{children}</div>
  )
}

/**
 * Registered NGOs by legal form: the name, the count and its share, over an
 * inline fill of that share. Associations are nine in ten; the fill says so
 * before the numbers do.
 */
export function NgoFormRows({ summary, registry }: { readonly summary: NgoRegistrySummary; readonly registry: boolean }) {
  const { i18n } = useLingui()
  return (
    <ul className="divide-y divide-border/70">
      {categoryShares(summary).map((row) => (
        <li key={row.key}>
          <RegistryRowLink
            registry={registry}
            search={registrySearch({ category: row.key, status: REGISTRY_STATUS_VALUE.registered })}
            className="grid grid-cols-[1fr_auto_3.25rem] items-baseline gap-x-3 py-2.5"
          >
            <span className="min-w-0 truncate text-sm text-foreground">{i18n._(CATEGORY_LABEL[row.key])}</span>
            <span className="text-sm font-semibold tabular-nums text-foreground">{formatNgoNumber(row.count)}</span>
            <span className="text-right text-xs tabular-nums text-muted-foreground">{formatNgoShare(row.share)}</span>
            <span className="col-span-3 mt-2 block h-1 bg-muted" aria-hidden="true">
              <span className="block h-full bg-primary/70" style={{ width: `${Math.max(row.share * 100, 0.5).toFixed(2)}%` }} />
            </span>
          </RegistryRowLink>
        </li>
      ))}
    </ul>
  )
}

const STATUS_FILL = {
  registered: 'bg-primary',
  dissolved: 'bg-foreground/55',
  inLiquidation: 'bg-foreground/35',
  deregistered: 'bg-foreground/20',
} as const

/**
 * Every entry by its status in the registry, one proportion bar over the
 * rows. The exits are listed in the order the law runs them — dissolution,
 * then liquidation, then removal from the registry.
 */
export function NgoStatusRows({ summary, registry }: { readonly summary: NgoRegistrySummary; readonly registry: boolean }) {
  const { i18n } = useLingui()
  const rows = statusShares(summary)
  return (
    <div>
      <div className="flex h-2.5 gap-px" aria-hidden="true">
        {rows.map((row) => (
          <span key={row.key} className={STATUS_FILL[row.key]} style={{ width: `${(row.share * 100).toFixed(2)}%` }} />
        ))}
      </div>
      <ul className="mt-4 divide-y divide-border/70 border-y border-border/70">
        {rows.map((row) => (
          <li key={row.key}>
            <RegistryRowLink
              registry={registry}
              search={registrySearch({ status: REGISTRY_STATUS_VALUE[row.key] })}
              className="grid min-h-11 grid-cols-[auto_1fr_auto_3.25rem] items-center gap-x-3"
            >
              <span className={cn('ml-1 size-2.5 rounded-[2px]', STATUS_FILL[row.key])} aria-hidden="true" />
              <span className="text-sm text-foreground">{i18n._(STATUS_LABEL[row.key])}</span>
              <span className="text-sm font-semibold tabular-nums text-foreground">{formatNgoNumber(row.count)}</span>
              <span className="pr-1 text-right text-xs tabular-nums text-muted-foreground">{formatNgoShare(row.share)}</span>
            </RegistryRowLink>
          </li>
        ))}
      </ul>
    </div>
  )
}
