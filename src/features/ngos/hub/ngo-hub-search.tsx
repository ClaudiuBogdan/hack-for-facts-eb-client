import { useLocation } from '@tanstack/react-router'
import { HeartHandshake } from 'lucide-react'
import { t } from '@lingui/core/macro'
import { LandingSearch } from '@/features/landing/components/search/landing-search'
import { useIsMobile } from '@/hooks/use-mobile'

/**
 * The site's search, scoped to NGOs, as the companies, INS and procurement
 * hubs scope theirs: the same field, ranking and keyboard, the scope sent to
 * the server as `docTypes`, so the rows are NGOs drawn from the whole index
 * — by name, with or without diacritics, or by CUI — and a row opens the
 * organisation's profile (`/ngos/$cui`). The registry's own search, by name
 * or registry number, is `/ngos/registry`.
 *
 * It takes focus on arrival only when the reader arrived at the top: a link
 * to one of the page's bands would otherwise land on the band and be thrown
 * back to the hero.
 */
export function NgoHubSearch({ autoFocus, className }: { readonly autoFocus?: boolean; readonly className?: string }) {
  const isMobile = useIsMobile()
  const { hash } = useLocation()
  return (
    <LandingSearch
      className={className}
      docTypes={['ngo']}
      fixedScope={{ label: t`ONG-uri`, Icon: HeartHandshake }}
      placeholder={t`Numele organizației sau CUI…`}
      autoFocus={autoFocus && !isMobile && !hash}
      scrollToTopOnFocus={isMobile}
    />
  )
}
