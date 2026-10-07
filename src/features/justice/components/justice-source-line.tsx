import type { ReactNode } from 'react'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { Info } from 'lucide-react'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { dayText } from '../lib/judicial-format'

/** Where a page's cases come from: portal.just.ro, the ÎCCJ's own archive (scj.ro), or both (the front door). */
export type JusticeSource = 'portal' | 'iccj' | 'both'

const LINK = 'font-medium text-foreground underline-offset-4 hover:underline'

function SourceLink({ href, children }: { readonly href: string; readonly children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className={LINK}>
      {children}
      <span aria-hidden="true"> ↗</span>
      <span className="sr-only"> {t`(se deschide într-o filă nouă)`}</span>
    </a>
  )
}

/**
 * A justice page's one source line — the portal, the ÎCCJ's archive or both,
 * and the date its data runs to — with the page's caveats behind one marker
 * beside it (amber, with their count: something about the data needs saying).
 */
export function JusticeSourceLine({
  asOf,
  source,
  notes,
  className,
}: {
  /** The newest date the data carries; null when the source stores none. */
  readonly asOf: string | null
  readonly source: JusticeSource
  readonly notes: readonly ReactNode[]
  readonly className?: string
}) {
  return (
    <p className={cn('flex flex-wrap items-center gap-x-1 text-sm text-muted-foreground', className)}>
      <span>
        <Trans>Sursa:</Trans>{' '}
        {source === 'iccj' ? (
          <>
            <Trans>arhiva Înaltei Curți de Casație și Justiție</Trans> (<SourceLink href="https://www.scj.ro">scj.ro</SourceLink>)
          </>
        ) : (
          <SourceLink href="https://portal.just.ro">portal.just.ro</SourceLink>
        )}
        {source === 'both' ? (
          <>
            {' '}
            <Trans>și arhiva ÎCCJ</Trans>
          </>
        ) : null}
        {asOf ? <>, {t`date până la ${dayText(asOf)}`}</> : null}
      </span>
      {notes.length > 0 ? <CaveatsMarker notes={notes} /> : null}
    </p>
  )
}

function CaveatsMarker({ notes }: { readonly notes: readonly ReactNode[] }) {
  return (
    <Popover>
      <PopoverTrigger
        className="inline-flex min-h-8 min-w-8 items-center justify-center gap-0.5 rounded-sm px-1 text-xs font-semibold tabular-nums text-status-partial-fg transition-colors hover:bg-status-partial-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={t`Ce trebuie știut despre aceste date (${notes.length} note)`}
      >
        <Info className="size-4" aria-hidden="true" />
        {notes.length}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[min(26rem,calc(100vw-2rem))] text-sm leading-relaxed">
        <MonoLabel className="block text-muted-foreground">
          <Trans>Ce trebuie știut despre aceste date</Trans>
        </MonoLabel>
        <ul className="mt-3 list-disc space-y-2 pl-4 text-foreground">
          {notes.map((note, index) => (
            <li key={index}>{note}</li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  )
}
