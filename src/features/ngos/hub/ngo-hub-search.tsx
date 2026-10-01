import { useLocation } from '@tanstack/react-router'
import { HeartHandshake } from 'lucide-react'
import { t } from '@lingui/core/macro'
import { LandingSearch } from '@/features/landing/components/search/landing-search'
import { useIsMobile } from '@/hooks/use-mobile'

/** The registry's organisations: the hub's population, whatever kind the index files each under. */
const REGISTRY_TAGS = ['source::rnong'] as const

/**
 * The site's search, scoped to the NGO registry's organisations, as the
 * companies, INS and procurement hubs scope theirs: the same field, ranking
 * and keyboard, the scope sent to the server as the registry's source tag
 * (`source::rnong`) — one row per registry organisation, by name (with or
 * without diacritics), CUI or registry number. A row opens the
 * organisation's one address: `/ngos/$cui` where a CUI is admitted, else
 * `/ngos/registry/$number`. NGOs outside the registry stay in the site-wide
 * search only.
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
      entityTags={REGISTRY_TAGS}
      fixedScope={{ label: t`ONG-uri`, Icon: HeartHandshake }}
      placeholder={t`Numele organizației, CUI sau nr. registru…`}
      autoFocus={autoFocus && !isMobile && !hash}
      scrollToTopOnFocus={isMobile}
    />
  )
}
