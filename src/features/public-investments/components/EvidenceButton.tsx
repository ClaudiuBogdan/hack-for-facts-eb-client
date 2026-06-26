import { FileText } from 'lucide-react'
import { t } from '@lingui/core/macro'
import { Button } from '@/components/ui/button'
import type { EvidenceRef } from '../lib/types'

type Props = {
  readonly evidenceRef: EvidenceRef
  readonly onOpen: (evidenceRef: EvidenceRef) => void
  readonly compact?: boolean
}

export function EvidenceButton({ evidenceRef, onOpen, compact = false }: Props) {
  return (
    <Button
      type="button"
      variant="ghost"
      size={compact ? 'icon' : 'sm'}
      className={compact ? 'h-8 w-8' : 'h-8 gap-1.5 px-2 text-xs'}
      onClick={() => onOpen(evidenceRef)}
      aria-label={t`Deschide dovada sursei`}
      title={t`Deschide dovada sursei`}
    >
      <FileText className="h-4 w-4" aria-hidden="true" />
      {!compact && <span>{t`Dovadă`}</span>}
    </Button>
  )
}
