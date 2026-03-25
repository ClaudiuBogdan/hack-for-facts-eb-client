import { useEffect, useState } from 'react'
import { Link, useLocation } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { ArrowLeftRight } from 'lucide-react'
import { getEntityLabels } from '@/lib/api/labels'
import { cn } from '@/lib/utils'
import { buildEntitySwitchRedirectUri, buildSelectorSearchState } from '@/features/campaigns/buget/utils/entity-selector-navigation'
import { CHALLENGE_SELECTED_ENTITY_PICKER_PATH } from '../../constants'

type UatSwitchBadgeProps = {
  readonly entityCui: string
  readonly className?: string
}

function toTitleCase(text: string): string {
  return text
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

export function UatSwitchBadge({ entityCui, className }: UatSwitchBadgeProps) {
  const location = useLocation()
  const [label, setLabel] = useState<string>(entityCui)

  useEffect(() => {
    let cancelled = false
    getEntityLabels([entityCui]).then((results) => {
      if (cancelled) return
      const match = results.find((r) => r.id === entityCui)
      if (match) setLabel(toTitleCase(match.label))
    })
    return () => {
      cancelled = true
    }
  }, [entityCui])

  const redirectUri = buildEntitySwitchRedirectUri({
    pathname: location.pathname,
    searchStr: location.searchStr,
  })

  const selectorSearch = buildSelectorSearchState({
    languageQuery: location.search?.lang === 'en' ? 'en' : undefined,
    redirectUri,
  })

  return (
    <Link
      to={CHALLENGE_SELECTED_ENTITY_PICKER_PATH as '/'}
      search={selectorSearch}
      className={cn(
        'inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/40 px-4 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted/70 hover:text-foreground transition-colors',
        className,
      )}
      title={t`Switch city hall`}
    >
      <span className="truncate max-w-[200px]">{label}</span>
      <ArrowLeftRight className="h-3.5 w-3.5 shrink-0 opacity-60" />
    </Link>
  )
}
