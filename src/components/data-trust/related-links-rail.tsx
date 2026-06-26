import { Link } from '@tanstack/react-router'
import { Trans } from '@lingui/react/macro'
import { ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export type RelatedLinkItem = {
  readonly label: string
  readonly description: string
  readonly to: string
  readonly disabled?: boolean
}

type Props = {
  readonly title?: string
  readonly links: readonly RelatedLinkItem[]
  readonly className?: string
}

export function RelatedLinksRail({ title, links, className }: Props) {
  return (
    <aside className={cn('space-y-2', className)} aria-label={title ?? 'Legaturi conexe'}>
      <h2 className="text-sm font-semibold">
        {title ?? <Trans>Legaturi conexe</Trans>}
      </h2>
      <div className="space-y-2">
        {links.map((link) =>
          link.disabled === true ? (
            <div
              key={link.label}
              className="rounded-md border border-dashed p-3 text-sm text-muted-foreground"
            >
              <p className="font-medium text-foreground">{link.label}</p>
              <p className="mt-1 text-xs">{link.description}</p>
            </div>
          ) : (
            <Link
              key={link.label}
              to={link.to as '/'}
              className="group block rounded-md border p-3 text-sm transition-colors hover:bg-muted/40"
            >
              <span className="flex items-center justify-between gap-3 font-medium">
                {link.label}
                <ArrowRight
                  className="h-3.5 w-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                  aria-hidden
                />
              </span>
              <span className="mt-1 block text-xs text-muted-foreground">
                {link.description}
              </span>
            </Link>
          ),
        )}
      </div>
    </aside>
  )
}
