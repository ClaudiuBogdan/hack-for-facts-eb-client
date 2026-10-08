import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { ArrowLeft, ArrowUpRight } from 'lucide-react'

import { MonoLabel } from '@/components/landing-skin/mono-label'
import { cn } from '@/lib/utils'

/**
 * The public-enterprise pages' way back and the links that leave them: light
 * enough for a route's eager file (its pending and not-found pages).
 */

export const TEXT_LINK = 'underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

/** A link to another page, its arrow saying it leaves this one. */
export function OutLink({ children, className, ...to }: { readonly children: ReactNode; readonly className?: string } & OutTarget) {
  const body = (
    <>
      {children}
      <ArrowUpRight className="size-3.5 shrink-0" aria-hidden="true" />
    </>
  )
  const style = cn(TEXT_LINK, 'inline-flex min-h-11 items-center gap-1 text-sm font-medium text-foreground sm:min-h-0', className)
  switch (to.page) {
    case 'company':
      return (
        <Link to="/companies/$cui" params={{ cui: to.cui }} hash={to.hash} preload="intent" className={style}>
          {body}
        </Link>
      )
    case 'buyer':
      return (
        <Link to="/procurement/institutions/$cui" params={{ cui: to.cui }} preload="intent" className={style}>
          {body}
        </Link>
      )
    case 'entity':
      return (
        <Link to="/entities/$cui" params={{ cui: to.cui }} preload="intent" className={style}>
          {body}
        </Link>
      )
  }
}

type OutTarget = { readonly page: 'company'; readonly cui: string; readonly hash?: string } | { readonly page: 'buyer' | 'entity'; readonly cui: string }

/** The way back: the front door, then where the page's subject is (an enterprise's county, an authority's county or level). */
export function Kicker({ place }: { readonly place: string | null }) {
  return (
    <MonoLabel className="flex flex-wrap items-center gap-2 text-muted-foreground **:[text-box:trim-both_cap_alphabetic]">
      <Link to="/public-enterprises" preload="intent" className="group inline-flex min-h-11 items-center gap-1.5 hover:text-foreground sm:min-h-0">
        <ArrowLeft className="size-3 transition-transform group-hover:-translate-x-0.5 motion-reduce:transition-none" aria-hidden="true" />
        <span>{t`Întreprinderi publice`}</span>
      </Link>
      {place ? (
        <>
          <span aria-hidden="true">/</span>
          <span>{place}</span>
        </>
      ) : null}
    </MonoLabel>
  )
}
