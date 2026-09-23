import { useLocation } from '@tanstack/react-router'
import { Building2 } from 'lucide-react'
import { t } from '@lingui/core/macro'
import { LandingSearch } from '@/features/landing/components/search/landing-search'
import { useIsMobile } from '@/hooks/use-mobile'

/**
 * The site's search, scoped to companies. The scope travels to the server as
 * `docTypes`, so the rows are companies drawn from the whole index; picking
 * one opens its profile.
 *
 * It takes focus on arrival only when the reader arrived at the top: focusing
 * scrolls, and a link to one of the page's bands (`#domenii`) would otherwise
 * land on the band and be thrown back to the hero.
 */
export function HubSearch({ autoFocus, className }: { readonly autoFocus?: boolean; readonly className?: string }) {
  const isMobile = useIsMobile()
  const { hash } = useLocation()
  return (
    <LandingSearch
      className={className}
      docTypes={['company']}
      fixedScope={{ label: t`Firme`, Icon: Building2 }}
      placeholder={t`Nume sau CUI...`}
      autoFocus={autoFocus && !isMobile && !hash}
      scrollToTopOnFocus={isMobile}
    />
  )
}
