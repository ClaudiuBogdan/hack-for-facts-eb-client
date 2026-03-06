import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { ArrowLeftRight } from 'lucide-react'
import { getEntityLabels } from '@/lib/api/labels'
import { CAMPAIGN_BASE_PATH } from '@/features/campaigns/buget/constants'

type UatSwitchBadgeProps = {
  readonly entityCui: string
}

export function UatSwitchBadge({ entityCui }: UatSwitchBadgeProps) {
  const [label, setLabel] = useState<string>(entityCui)

  useEffect(() => {
    let cancelled = false
    getEntityLabels([entityCui]).then((results) => {
      if (cancelled) return
      const match = results.find((r) => r.id === entityCui)
      if (match) setLabel(match.label)
    })
    return () => {
      cancelled = true
    }
  }, [entityCui])

  return (
    <Link
      to={`${CAMPAIGN_BASE_PATH}/cauta` as '/'}
      className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/40 px-4 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted/70 hover:text-foreground transition-colors"
      title={t`Switch city hall`}
    >
      <span className="truncate max-w-[200px]">{label}</span>
      <ArrowLeftRight className="h-3.5 w-3.5 shrink-0 opacity-60" />
    </Link>
  )
}
