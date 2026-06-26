import { Trans } from '@lingui/react/macro'
import { Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

type Props = {
  /** ISO date string or null when the as-of date is unknown. */
  readonly asOf: string | null
  /** Optional label kind: "retrieved" (actualizat la) or "published" (publicat la). */
  readonly kind?: 'retrieved' | 'published'
  readonly className?: string
}

function formatIsoDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) {
    return iso
  }
  return new Intl.DateTimeFormat('ro-RO', {
    dateStyle: 'medium',
  }).format(date)
}

/**
 * Shows a freshness "as of" date with an icon + text. When the date is null it
 * renders an honest "necunoscut" line, never a fabricated timestamp.
 */
export function FreshnessBadge({ asOf, kind = 'retrieved', className }: Props) {
  const formatted = asOf === null ? null : formatIsoDate(asOf)

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-xs text-muted-foreground',
        className,
      )}
    >
      <Clock className="h-3 w-3" aria-hidden />
      {asOf === null ? (
        <Trans>Actualizat: necunoscut</Trans>
      ) : kind === 'published' ? (
        <Trans>Publicat la {formatted}</Trans>
      ) : (
        <Trans>Actualizat la {formatted}</Trans>
      )}
    </span>
  )
}
