import type { ReactNode } from 'react'
import { Trans } from '@lingui/react/macro'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { cn } from '@/lib/utils'

/** The numbered caption, the title and the sentence that qualifies a band's numbers. */
export function HubSectionHead({
  index,
  title,
  lede,
  aside,
  titleId,
}: {
  readonly index: string
  readonly title: ReactNode
  readonly lede?: ReactNode
  readonly aside?: ReactNode
  readonly titleId?: string
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
      <div className="min-w-0">
        <MonoLabel className="block text-primary" data-reveal>
          {index}
        </MonoLabel>
        <h2 id={titleId} data-reveal className="mt-3 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          {title}
        </h2>
        {lede ? (
          <p data-reveal className="mt-3 max-w-[56ch] text-base leading-relaxed text-muted-foreground">
            {lede}
          </p>
        ) : null}
      </div>
      {aside ? <div className="w-full min-w-0 sm:w-auto sm:max-w-full">{aside}</div> : null}
    </div>
  )
}

export function HubPending({ rows = 6, className }: { readonly rows?: number; readonly className?: string }) {
  return (
    <div className={cn('space-y-2', className)} aria-hidden="true">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="h-7 w-full animate-pulse rounded-sm bg-muted/60" />
      ))}
    </div>
  )
}

/** A section whose read failed: says so, offers the retry, never renders a blank. */
export function HubLoadError({ onRetry }: { readonly onRetry: () => void }) {
  return (
    <div role="alert" className="space-y-3 text-sm text-muted-foreground">
      <p>
        <Trans>Cifrele nu s-au încărcat.</Trans>
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex min-h-9 items-center rounded-sm border px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
      >
        <Trans>Încearcă din nou</Trans>
      </button>
    </div>
  )
}

export const HUB_SHORTCUT_LINK_CLASS =
  'inline-flex min-h-11 items-center text-sm font-medium text-foreground underline-offset-4 transition-colors hover:text-primary hover:underline sm:min-h-0'

export const HUB_TEXT_LINK_CLASS = 'font-medium text-foreground underline-offset-4 hover:text-primary hover:underline'
