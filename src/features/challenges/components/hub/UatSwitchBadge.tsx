import { useMemo, type ReactNode } from 'react'
import { Link, useLocation, useSearch } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { ArrowLeftRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useEntityLabel } from '@/hooks/filters/useFilterLabels'
import { buildEntitySwitchRedirectUri, buildSelectorSearchState } from '@/features/campaigns/buget/utils/entity-selector-navigation'
import { CHALLENGE_SELECTED_ENTITY_PICKER_PATH } from '../../constants'

type UatSwitchBadgeProps = {
  readonly entityCui: string
  readonly className?: string
  readonly labelSlot?: ReactNode
}

function toTitleCase(text: string): string {
  return text
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

export function UatSwitchBadge({ entityCui, className, labelSlot }: UatSwitchBadgeProps) {
  const location = useLocation()
  const search = useSearch({ strict: false }) as Readonly<{ lang?: unknown }>
  const entityIds = useMemo(() => [entityCui], [entityCui])
  const entityLabelStore = useEntityLabel(entityIds)
  const rawLabel = entityLabelStore.map(entityCui)
  const label = rawLabel.startsWith('id::') ? entityCui : toTitleCase(rawLabel)

  const redirectUri = buildEntitySwitchRedirectUri({
    pathname: location.pathname,
    searchStr: location.searchStr,
  })

  const selectorSearch = buildSelectorSearchState({
    languageQuery: search.lang === 'en' ? 'en' : undefined,
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
      {labelSlot ? (
        <div className="flex flex-col items-start gap-0.5 min-w-0 flex-1">
          {labelSlot}
          <span className="truncate w-full">{label}</span>
        </div>
      ) : (
        <span className="truncate max-w-[200px]">{label}</span>
      )}
      <ArrowLeftRight className="h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden="true" />
    </Link>
  )
}
