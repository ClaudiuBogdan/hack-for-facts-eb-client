import type { ReactNode } from 'react'
import { t } from '@lingui/core/macro'
import { Info } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

/**
 * A band's note behind an info button, as the analysis head keeps its notes:
 * what a figure is and where it comes from, in the page's body type, a tap
 * away. The button is a tap target on a phone and a quiet glyph beside the
 * text from `sm`; the note it opens carries the button's name.
 */
export function HubInfoNote({ children, label }: { readonly children: ReactNode; readonly label?: string }) {
  const name = label ?? t`Despre aceste cifre`
  return (
    <Popover>
      <PopoverTrigger
        className="-my-2 inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center align-middle text-muted-foreground hover:text-foreground sm:my-0 sm:size-6 sm:min-h-0 sm:min-w-0"
        aria-label={name}
      >
        <Info className="size-4" aria-hidden="true" />
      </PopoverTrigger>
      <PopoverContent align="start" aria-label={name} className="w-[min(92vw,24rem)] space-y-2 text-sm leading-relaxed text-muted-foreground">
        {children}
      </PopoverContent>
    </Popover>
  )
}
