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

/** The source, said once for the page, with the month its records are complete to. */
export function HomeSourceLine({ month, className }: { readonly month: string | null; readonly className?: string }) {
  return (
    <p className={cn('text-sm text-muted-foreground', className)}>
      <Trans>Sursa:</Trans>{' '}
      <a href="https://www.e-licitatie.ro" target="_blank" rel="noreferrer" className="font-medium text-foreground underline-offset-4 hover:underline">
        {t`SEAP, e-licitatie.ro`}
        <span aria-hidden="true"> ↗</span>
        <span className="sr-only"> {t`(se deschide într-o filă nouă)`}</span>
      </a>
      {month ? <>, {t`date până în ${monthText(month)}`}</> : null}
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
