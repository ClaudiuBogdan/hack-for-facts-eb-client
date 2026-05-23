import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { parliamentCardChevronClassName } from '../lib/hub-theme'

type Props = {
  readonly className?: string
}

/** Shared card chevron — larger, bolder stroke */
export function ParliamentCardChevron({ className }: Props) {
  return (
    <ChevronRight
      className={cn(parliamentCardChevronClassName, className)}
      strokeWidth={3.5}
      aria-hidden
    />
  )
}
