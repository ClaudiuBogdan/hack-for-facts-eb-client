import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import { Tag } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { resolveCpvLabel } from '../lib/cpv-labels'

type Props = {
  readonly code: string | null
  readonly className?: string
  readonly variant?: 'compact' | 'full'
  readonly fallback?: { readonly labelRo: string | null; readonly labelEn: string } | null
}

/**
 * CPV code + RO label (EN fallback) + division, with a tooltip that expands
 * the "CPV" acronym ("Vocabularul comun privind achizițiile"). When the RO
 * label is missing, shows EN + "(etichetă oficială RO indisponibilă)" note.
 */
export function CpvLabel({ code, className, variant = 'full', fallback }: Props) {
  if (!code) {
    return (
      <span className={cn('text-muted-foreground', className)}>
        <Trans>CPV indisponibil</Trans>
      </span>
    )
  }

  const resolved = resolveCpvLabel(code, fallback)
  const label = resolved?.labelRo ?? resolved?.labelEn ?? t`Categorie CPV`
  const hasRoLabel = resolved?.labelRo !== null && resolved?.labelRo !== undefined
  const division = code.length >= 2 ? code.slice(0, 2) : code

  const content = (
    <span className={cn('inline-flex items-center gap-1', className)}>
      <Tag className="h-3 w-3 text-muted-foreground" aria-hidden />
      <span className="font-medium">{label}</span>
      {variant === 'full' ? (
        <span className="text-xs text-muted-foreground">
          (<span aria-label={t`Cod CPV`}>{code}</span> · {t`diviziune`} {division})
        </span>
      ) : (
        <span className="text-xs text-muted-foreground">{code}</span>
      )}
      {!hasRoLabel ? (
        <span className="text-xs text-amber-800">
          · <Trans>etichetă oficială RO indisponibilă</Trans>
        </span>
      ) : null}
    </span>
  )

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant="outline"
          className="border-slate-300 bg-slate-100 text-slate-900 font-normal"
        >
          {content}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        <Trans>
          CPV — Vocabularul comun privind achizițiile. Cod: {code}, diviziune: {division}.
        </Trans>
      </TooltipContent>
    </Tooltip>
  )
}
