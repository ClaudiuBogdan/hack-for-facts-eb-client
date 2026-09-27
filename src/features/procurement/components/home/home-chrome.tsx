import type { ReactNode } from 'react'
import { useLocation } from '@tanstack/react-router'
import { Landmark } from 'lucide-react'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { LandingSearch } from '@/features/landing/components/search/landing-search'
import { useIsMobile } from '@/hooks/use-mobile'
import { cn } from '@/lib/utils'
import { monthText } from '../../lib/home-format'
import { procurementHrefOf, type HomeSection } from '../../lib/home-links'

/** The company profile's pinned bar: the page's name, then its numbered bands. */
export function HomeSectionNav({ title, sections }: { readonly title: string; readonly sections: readonly HomeSection[] }) {
  return (
    <nav aria-label={t`Secțiunile paginii`} className="sticky top-0 z-20 border-b bg-background/90 backdrop-blur">
      <RuledFrame className="flex items-center gap-6 overflow-x-auto py-0">
        <span className="hidden min-w-0 truncate py-3 text-sm font-semibold text-foreground md:block md:max-w-72">{title}</span>
        <ol className="flex shrink-0 gap-4 sm:gap-5 md:ml-auto">
          {sections.map((section, position) => (
            <li key={section.id}>
              <a
                href={`#${section.id}`}
                className="inline-flex min-h-11 items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <MonoLabel className="text-primary" aria-hidden="true">
                  {String(position + 1).padStart(2, '0')}
                </MonoLabel>
                {section.label}
              </a>
            </li>
          ))}
        </ol>
      </RuledFrame>
    </nav>
  )
}

/** One band of the page: the ruled column, its anchor under the pinned bar, the hubs' rhythm. */
export function HomeBand({ id, labelledBy, className, children }: { readonly id: string; readonly labelledBy: string; readonly className?: string; readonly children: ReactNode }) {
  return (
    <section id={id} className={cn('scroll-mt-14 border-b', className)} aria-labelledby={labelledBy}>
      <RuledFrame className="py-14 sm:py-20">{children}</RuledFrame>
    </section>
  )
}

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
