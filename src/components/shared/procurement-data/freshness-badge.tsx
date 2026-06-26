import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import { Clock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

type Props = {
  readonly kind: 'actualizat' | 'publicat' | 'pana_la'
  readonly date: string | null
  readonly cadence?: string | null
  readonly stale?: boolean
  readonly className?: string
}

function formatDate(iso: string | null): string | null {
  if (!iso) return null
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleDateString('ro-RO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

const KIND_LABEL: Record<Props['kind'], string> = {
  actualizat: t`Actualizat la`,
  publicat: t`Publicat la`,
  pana_la: t`Date până la`,
}

/**
 * Human-readable freshness ("actualizat la / publicat la / date până la").
 * `stale` adds a subtle warning icon + text (suspended sync, UX §6.3).
 */
export function FreshnessBadge({ kind, date, cadence, stale, className }: Props) {
  const formatted = formatDate(date)
  const label = KIND_LABEL[kind]

  return (
    <Badge
      variant="outline"
      className={cn(
        'gap-1 font-medium',
        stale
          ? 'border-amber-300 bg-amber-50 text-amber-900'
          : 'border-slate-300 bg-slate-100 text-slate-900',
        className,
      )}
      aria-label={`${label}: ${formatted ?? t`indisponibil`}`}
    >
      <Clock className="h-3 w-3" aria-hidden />
      <span>
        {label}: {formatted ?? t`indisponibil`}
      </span>
      {cadence ? (
        <span className="text-muted-foreground">· {t`cadență`}: {cadence}</span>
      ) : null}
      {stale ? (
        <span className="text-amber-800">
          · <Trans>sincronizare suspendată</Trans>
        </span>
      ) : null}
    </Badge>
  )
}
