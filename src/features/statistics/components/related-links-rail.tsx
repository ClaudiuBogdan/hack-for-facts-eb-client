import { Trans } from '@lingui/react/macro'
import { ExternalLink } from 'lucide-react'
import type { StatisticsRelatedLink } from '@/schemas/statistics'
import { defaultMapFilters } from '@/schemas/map-filters'
import { cn } from '@/lib/utils'

type RelatedLinksRailProps = {
  readonly links: readonly StatisticsRelatedLink[]
  readonly originSiruta: string
}

function appendJsonSearch(
  path: string,
  search: Readonly<Record<string, unknown>>,
): string {
  const query = new URLSearchParams()
  Object.entries(search).forEach(([key, value]) => {
    query.set(key, JSON.stringify(value))
  })
  return `${path}?${query.toString()}`
}

function buildScopedSearch(
  link: StatisticsRelatedLink,
  originSiruta: string,
): Readonly<Record<string, unknown>> {
  const evidence = {
    from: 'statistici-teritoriu',
    siruta: originSiruta,
    [link.joinBasis]: link.joinValue,
  }

  if (link.to === '/map') {
    const territorialFilter =
      link.joinBasis === 'county'
        ? {
            ...defaultMapFilters,
            county_codes: [link.joinValue],
            is_uat: false,
          }
        : {
            ...defaultMapFilters,
            uat_ids: [link.joinValue],
            is_uat: true,
          }

    return {
      ...evidence,
      activeView: 'map',
      mapViewType: link.joinBasis === 'county' ? 'County' : 'UAT',
      filters: territorialFilter,
    }
  }

  if (link.to === '/budget-explorer') {
    const territorialFilter =
      link.joinBasis === 'county'
        ? { ...defaultMapFilters, county_codes: [link.joinValue], is_uat: false }
        : { ...defaultMapFilters, uat_ids: [link.joinValue], is_uat: true }

    return {
      ...evidence,
      filter: territorialFilter,
    }
  }

  return evidence
}

function buildHref(link: StatisticsRelatedLink, originSiruta: string): string {
  const search = buildScopedSearch(link, originSiruta)

  if (link.to.includes('$cui')) {
    return appendJsonSearch(link.to.replace('$cui', link.params.cui ?? ''), search)
  }
  return appendJsonSearch(link.to, search)
}

export function RelatedLinksRail({ links, originSiruta }: RelatedLinksRailProps) {
  if (links.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
        <Trans>Legături indisponibile pentru acest nivel.</Trans>
      </div>
    )
  }

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
                {link.disabledReason ? (
                  link.disabledReason
                ) : (
                  <>
                {link.joinBasis === 'siruta' ? (
                  <Trans>după SIRUTA</Trans>
                ) : link.joinBasis === 'cui' ? (
                  <Trans>după CUI</Trans>
                ) : (
                  <Trans>după județ</Trans>
                )}{' '}
                {link.joinValue}
                  </>
                )}
              </span>
            </span>
          )

          if (!link.enabled) {
            return (
              <div
                key={`${link.to}-${link.joinBasis}-${link.joinValue}`}
                aria-disabled="true"
                className="flex items-center justify-between gap-3 px-4 py-3 text-sm opacity-60"
              >
                {content}
              </div>
            )
          }

          return (
            <a
              key={`${link.to}-${link.joinBasis}-${link.joinValue}`}
              href={buildHref(link, originSiruta)}
              className={cn(
                'flex items-center justify-between gap-3 px-4 py-3 text-sm hover:bg-muted/50',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              )}
            >
              {content}
              <ExternalLink className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            </a>
          )
        })}
      </div>
    </aside>
  )
}
