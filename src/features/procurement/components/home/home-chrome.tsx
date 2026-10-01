import { useLocation } from '@tanstack/react-router'
import { Landmark } from 'lucide-react'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { LandingSearch } from '@/features/landing/components/search/landing-search'
import { useIsMobile } from '@/hooks/use-mobile'
import { cn } from '@/lib/utils'
import { monthText } from '../../lib/home-format'
import { procurementHrefOf } from '../../lib/home-links'

// The bar and the band live apart from the search, so a page's loading state can draw them without it.
export { HomeBand, HomeSectionNav } from './home-section-nav'

/**
 * Where contract money leads a band: until the framework-role build is
 * served, the contract grain still counts some framework ceilings as awards.
 * Said beside the figure, once, and explained in a popover — a tap opens it on
 * a phone, where a tooltip never would. Its name starts with the word it
 * shows.
 */
export function ProvisionalMark({ className }: { readonly className?: string }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className={cn('inline-flex cursor-help align-middle', className)}>
          <MonoLabel className="rounded-[2px] border border-amber-700/40 px-1 py-px text-amber-800 dark:border-amber-300/40 dark:text-amber-300">
            <Trans>provizoriu</Trans>
          </MonoLabel>
          <span className="sr-only">{t`: de ce`}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 text-xs leading-relaxed">
        <Trans>
          Până la următoarea actualizare a datelor, valorile contractelor includ și plafoanele unor acorduri-cadru din e-licitatie, care nu
          sunt cumpărături.
        </Trans>
      </PopoverContent>
    </Popover>
  )
}

/**
 * The national read, as a band that stands on it sees it. Until it arrives
 * a band shows everything it knows without it — its head, its toggle, its
 * captions — and holds the place of the rest in its shape; if it fails, the
 * band says so where the figures would be.
 */
export interface NationalState {
  readonly isError: boolean
  readonly retry: () => void
}

/** A note beside a band's lede, set off by a rule at its left. */
export const RULED_NOTE_CLASS = 'mt-6 max-w-[56ch] border-l-2 border-primary/60 pl-4 text-sm leading-relaxed text-muted-foreground'

/** The control under a list that opens the rest of it. */
export const SHOW_MORE_CLASS = 'mt-3 inline-flex min-h-11 items-center text-sm font-medium text-foreground underline-offset-4 hover:underline'

/**
 * A word not read yet, in the line it will take: an inline block keeps the
 * line's own height, so a pending row or lede is as tall as the one that
 * replaces it.
 */
export function Bone({ className }: { readonly className?: string }) {
  return <span className={cn('inline-block h-[0.8em] w-full animate-pulse rounded-sm bg-muted align-middle', className)} aria-hidden="true" />
}

/**
 * Lines of text not read yet, in the parent's font and leading, the last
 * shorter, as prose ends: `lines` from a small screen up, `narrow` on a
 * phone, where the same words wrap more. As wide as prose runs (56ch), or
 * its column: a lede beside a short title would otherwise take the title's
 * width.
 */
export function TextPending({ lines = 2, narrow = lines, className }: { readonly lines?: number; readonly narrow?: number; readonly className?: string }) {
  return (
    <span className={cn('block w-[56ch] max-w-full', className)} aria-hidden="true">
      {Array.from({ length: Math.max(lines, narrow) }, (_, line) => (
        <span key={line} className={cn('block', line >= lines && 'sm:hidden', line >= narrow && 'max-sm:hidden')}>
          <Bone className={cn(line === lines - 1 && 'sm:w-2/3', line === narrow - 1 && 'max-sm:w-2/3')} />
        </span>
      ))}
    </span>
  )
}

/** Where a list's show-more control will be, before the read says how long the list is. `className` sizes its word. */
export function ShowMorePending({ className }: { readonly className?: string }) {
  return (
    <span className={cn(SHOW_MORE_CLASS, 'flex')} aria-hidden="true">
      <Bone className={className} />
    </span>
  )
}

/** The source, said once for the page, with the month its records are complete to; its place held (undefined) until the read says. */
export function HomeSourceLine({ month, className }: { readonly month: string | null | undefined; readonly className?: string }) {
  return (
    <p className={cn('text-sm text-muted-foreground', className)}>
      <Trans>Sursa:</Trans>{' '}
      <a href="https://www.e-licitatie.ro" target="_blank" rel="noreferrer" className="font-medium text-foreground underline-offset-4 hover:underline">
        {t`SEAP, e-licitatie.ro`}
        <span aria-hidden="true"> ↗</span>
        <span className="sr-only"> {t`(se deschide într-o filă nouă)`}</span>
      </a>
      {month ? <>, {t`date până în ${monthText(month)}`}</> : month === undefined ? <Bone className="ml-1.5 w-40" /> : null}
    </p>
  )
}

/**
 * The site's search, scoped to who buys and who sells: institutions, state
 * companies and firms. A result opens its procurement page — the reader came
 * here for contracts.
 *
 * It takes focus on arrival only when the reader arrived at the top, as the
 * hubs' searches do: a link to one of the page's bands would otherwise land
 * on the band and be thrown back to the hero.
 */
export function ProcurementHomeSearchField({ autoFocus, className }: { readonly autoFocus?: boolean; readonly className?: string }) {
  const isMobile = useIsMobile()
  const { hash } = useLocation()
  return (
    <LandingSearch
      className={className}
      docTypes={['organization', 'public_enterprise', 'company']}
      fixedScope={{ label: t`Achiziții`, Icon: Landmark }}
      placeholder={t`Instituție, firmă sau CUI…`}
      autoFocus={autoFocus && !isMobile && !hash}
      scrollToTopOnFocus={isMobile}
      hrefOf={procurementHrefOf}
    />
  )
}
