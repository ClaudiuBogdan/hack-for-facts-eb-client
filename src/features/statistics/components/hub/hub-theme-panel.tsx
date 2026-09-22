import { Link } from '@tanstack/react-router'
import { ChevronRight } from 'lucide-react'
import { useLingui } from '@lingui/react/macro'
import { cn } from '@/lib/utils'
import { LANDING_THEMES } from '../../lib/landing-constants'

/**
 * The hero's panel: the eight official INS domains, each with what a reader
 * finds inside and a link into the catalog on that domain. No counts — how
 * many matrices a domain holds tells a reader nothing about whether their
 * question is in it; the subjects do.
 */
export function HubThemePanel({ className }: { readonly className?: string }) {
  const { i18n } = useLingui()
  return (
    <ol className={cn('divide-y divide-border/70 border-y border-border/70', className)}>
      {LANDING_THEMES.map((theme) => (
        <li key={theme.code}>
          <Link
            to="/ins/seturi"
            search={{ context: theme.code }}
            className="group flex items-center gap-3 py-2 transition-colors hover:bg-muted/40"
          >
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-foreground group-hover:text-primary">{i18n._(theme.label)}</span>
              {/* On a phone the panel sits between the search and the headline
                  figures; the names alone keep it short enough to scroll past. */}
              <span className="hidden text-xs leading-relaxed text-muted-foreground sm:block">{i18n._(theme.summary)}</span>
            </span>
            <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
          </Link>
        </li>
      ))}
    </ol>
  )
}
