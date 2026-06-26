import { Badge } from '@/components/ui/badge'
import { stageLabel } from '../lib/display'
import type { StageBucket } from '../lib/types'

const STAGE_CLASS: Record<StageBucket, string> = {
  contractat: 'border-blue-200 bg-blue-50 text-blue-900',
  in_executie: 'border-amber-200 bg-amber-50 text-amber-900',
  finalizat: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  receptionat: 'border-teal-200 bg-teal-50 text-teal-900',
  necunoscut: 'border-zinc-200 bg-zinc-50 text-zinc-800',
}

type Props = {
  readonly stage: StageBucket
  readonly raw?: string | null
}

export function StageBadge({ stage, raw }: Props) {
  return (
    <Badge variant="outline" className={STAGE_CLASS[stage]} title={raw ?? undefined}>
      {stageLabel(stage)}
      {raw && <span className="sr-only">{raw}</span>}
    </Badge>
  )
}
