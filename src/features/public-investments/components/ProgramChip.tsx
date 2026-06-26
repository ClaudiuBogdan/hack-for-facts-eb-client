import { Badge } from '@/components/ui/badge'
import { programLabel } from '../lib/display'
import type { ProgramCode } from '../lib/types'

const PROGRAM_CLASS: Record<ProgramCode, string> = {
  ANGHEL_SALIGNY: 'border-sky-200 bg-sky-50 text-sky-900',
  PNDL: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  PNCCRS: 'border-amber-200 bg-amber-50 text-amber-900',
  PNMC: 'border-zinc-200 bg-zinc-50 text-zinc-800',
}

type Props = {
  readonly program: ProgramCode
}

export function ProgramChip({ program }: Props) {
  return (
    <Badge variant="outline" className={PROGRAM_CLASS[program]}>
      {programLabel(program)}
    </Badge>
  )
}
