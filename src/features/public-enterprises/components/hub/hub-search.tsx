import { useLocation } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { Building2 } from 'lucide-react'

import { DeferredLandingSearch } from '@/features/landing/components/search/deferred-landing-search'
import { useIsMobile } from '@/hooks/use-mobile'
import { ENTERPRISE_ROLE, enterpriseHitHref } from '../../lib/hub-links'

/**
 * Search indexes an enterprise that is also a public institution as that
 * institution (`organization`), and every other one as `public_enterprise`;
 * both play the enterprise role, which holds the institutions to enterprises.
 */
const ENTERPRISE_DOC_TYPES = ['public_enterprise', 'organization'] as const
const ENTERPRISE_ROLES = [ENTERPRISE_ROLE] as const

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
    <DeferredLandingSearch
      docTypes={ENTERPRISE_DOC_TYPES}
      roles={ENTERPRISE_ROLES}
      fixedScope={{ label: t`Întreprinderi`, Icon: Building2 }}
      placeholder={t`Întreprindere publică sau CUI…`}
      autoFocus={!isMobile && !hash}
      scrollToTopOnFocus={isMobile}
      hrefOf={enterpriseHitHref}
    />
  )
}
