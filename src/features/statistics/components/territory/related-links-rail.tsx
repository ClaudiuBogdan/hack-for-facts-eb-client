import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { Trans } from '@lingui/react/macro'
import { ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { defaultMapFilters } from '@/schemas/map-filters'
import type { StatisticsTerritoryIdentity } from '@/schemas/statistics'
import { territoryRelatedLinks, type TerritoryRelatedLink } from '../../lib/territory-links'

/** The analytics filter that scopes a destination to the territory. */
function territorialFilter(link: TerritoryRelatedLink) {
  return link.joinBasis === 'county'
    ? { ...defaultMapFilters, county_codes: [link.joinValue] }
    : { ...defaultMapFilters, uat_ids: [link.joinValue], is_uat: true, is_territorial_executive: undefined }
}

const LINK_CLASS = cn(
  'flex items-center justify-between gap-3 px-4 py-3 text-sm hover:bg-muted/50',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
)

/** The link as the router builds it: in-app, preloaded, with its search typed by the destination. */
function RailLink({ link, children }: { readonly link: TerritoryRelatedLink; readonly children: ReactNode }) {
  const filters = territorialFilter(link)
  return link.to === '/map' ? (
    <Link
      to="/map"
      search={{ activeView: 'map', mapViewType: link.joinBasis === 'county' ? 'County' : 'UAT', filters }}
      className={LINK_CLASS}
    >
      {children}
    </Link>
  ) : (
    <Link to="/budget-explorer" search={{ filter: filters }} className={LINK_CLASS}>
      {children}
    </Link>
  )
}

export function RelatedLinksRail({ identity }: { readonly identity: StatisticsTerritoryIdentity }) {
  const links = territoryRelatedLinks(identity)

  return (
    <aside className="rounded-lg border border-border/70">
      <div className="border-b px-4 py-3">
        <h2 className="text-sm font-semibold">
          <Trans>Vezi și în alte domenii</Trans>
        </h2>
      </div>
      <div className="divide-y">
        {links.map((link) => {
          const content = (
            <span>
              <span className="font-medium text-foreground">{link.label}</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                {link.disabledReason ?? (
                  <>
                    {link.joinBasis === 'siruta' ? <Trans>după SIRUTA</Trans> : <Trans>după județ</Trans>} {link.joinValue}
                  </>
                )}
              </span>
            </span>
          )

          if (!link.enabled) {
            return (
              <div
                key={link.to}
                aria-disabled="true"
                className="flex items-center justify-between gap-3 px-4 py-3 text-sm opacity-60"
              >
                {content}
              </div>
            )
          }

          return (
            <RailLink key={link.to} link={link}>
              {content}
              {/* An arrow, not an external-link icon: these are pages of this site. */}
              <ArrowRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            </RailLink>
          )
        })}
      </div>
    </aside>
  )
}
