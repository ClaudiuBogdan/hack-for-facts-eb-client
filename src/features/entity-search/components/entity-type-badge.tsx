import { memo } from 'react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { getDocTypeMeta } from '../lib/doc-type-meta'

type Props = {
  readonly docType: string
  readonly className?: string
}

function EntityTypeBadgeComponent({ docType, className }: Props) {
  const meta = getDocTypeMeta(docType)
  const Icon = meta.Icon

  return (
    <Badge
      variant="outline"
      className={cn(
        'gap-1 rounded-none border-2 px-2 py-0 text-[10px] font-bold uppercase tracking-wider',
        meta.color,
        className,
      )}
    >
      <Icon aria-hidden="true" className="h-3 w-3" />
      <span>{meta.label}</span>
    </Badge>
  )
}

export const EntityTypeBadge = memo(EntityTypeBadgeComponent)
