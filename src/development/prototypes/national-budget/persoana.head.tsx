import type { ReactNode } from 'react'

import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { BandRead } from '@/features/national-budget/analytics/components/analytics-parts'
import { cn } from '@/lib/utils'
import { SourcesLine, YearSelect } from './persoana.shell'

/**
 * The head the versions share: the answer as the title (each version writes
 * its own), what it means in a line, the year, the sources. No caption above
 * the title, no shortcut row, no figures card: the sentence carries them.
 */
export function HeadFrame({ title, children, className }: { readonly title: ReactNode; readonly children?: ReactNode; readonly className?: string }) {
  return (
    <RuledFrame className={cn('py-12 sm:py-16', className)}>
      <div className="max-w-5xl">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-muted-foreground">Bugetul național în</span>
          <BandRead fallback={<span className="h-10 w-28 animate-pulse rounded-md bg-muted" />} quiet={null}>
            <YearSelect className="min-w-28" />
          </BandRead>
        </div>
        <BandRead fallback={<TitlePending />}>
          <h1 className="mt-6 text-4xl font-semibold leading-[1.05] tracking-[-0.03em] text-balance sm:text-5xl lg:text-6xl">{title}</h1>
          {children}
        </BandRead>
      </div>
      <BandRead fallback={null} quiet={null}>
        <SourcesLine className="mt-10" />
      </BandRead>
    </RuledFrame>
  )
}

function TitlePending() {
  return (
    <div className="mt-6 space-y-3" aria-hidden="true">
      <div className="h-14 w-full max-w-2xl animate-pulse rounded bg-muted" />
      <div className="h-14 w-4/5 max-w-xl animate-pulse rounded bg-muted" />
    </div>
  )
}

/** A figure inside a title or sentence, set apart without a second colour. */
export function Fig({ children }: { readonly children: ReactNode }) {
  return <span className="whitespace-nowrap tabular-nums">{children}</span>
}
