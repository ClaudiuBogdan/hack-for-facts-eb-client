import { useLocation } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { Building2 } from 'lucide-react'

import { LandingSearch } from '@/features/landing/components/search/landing-search'
import { useIsMobile } from '@/hooks/use-mobile'
import { enterpriseHitHref } from '../../lib/hub-links'

/**
 * The site search, held to public enterprises; a hit opens the enterprise's
 * company page. It takes the focus on a desktop's first view, as the other
 * hubs' searches do, but not when the address names a band (`#stare`): the
 * focus would throw the reader back to the head.
 */
export function EnterpriseSearch() {
  const isMobile = useIsMobile()
  const { hash } = useLocation()
  return (
    <LandingSearch
      docTypes={['public_enterprise']}
      fixedScope={{ label: t`Întreprinderi`, Icon: Building2 }}
      placeholder={t`Întreprindere publică sau CUI…`}
      autoFocus={!isMobile && !hash}
      scrollToTopOnFocus={isMobile}
      hrefOf={enterpriseHitHref}
    />
  )
}
