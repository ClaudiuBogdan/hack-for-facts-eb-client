import { useLocation } from '@tanstack/react-router'
import { Landmark } from 'lucide-react'
import { t } from '@lingui/core/macro'
import { DeferredLandingSearch } from '@/features/landing/components/search/deferred-landing-search'
import { useIsMobile } from '@/hooks/use-mobile'
import { procurementHrefOf } from '../../lib/home-links'

/**
 * The site's search, scoped to who buys and who sells: institutions, state
 * companies and firms. A result opens its procurement page — the reader came
 * here for contracts.
 *
 * It takes focus on arrival only when the reader arrived at the top, as the
 * hubs' searches do: a link to one of the page's bands would otherwise land
 * on the band and be thrown back to the hero.
 *
 * A module of its own, apart from `home-chrome`: the pages that borrow the
 * home's bands and placeholders (justice, public enterprises, the budget
 * analytics) would otherwise load the search with them.
 */
export function ProcurementHomeSearchField({ autoFocus, className }: { readonly autoFocus?: boolean; readonly className?: string }) {
  const isMobile = useIsMobile()
  const { hash } = useLocation()
  return (
    <DeferredLandingSearch
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
