import { Suspense, useEffect, useState, type ReactNode } from 'react'
import { plural, t } from '@lingui/core/macro'
import { ErrorBoundary } from '@sentry/react'
import { QueryErrorResetBoundary } from '@tanstack/react-query'
import { Check, FileSearch, Info, Link2, TriangleAlert } from 'lucide-react'

import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { percentText } from '@/features/national-budget/analytics/lib/analytics-format'
import { exactPercent, plotOf } from '@/features/national-budget/analytics/lib/exact'
import { HubLoadError } from '@/features/statistics/components/hub/hub-chrome'
import { cn } from '@/lib/utils'

/**
 * A read's own boundary: its shape while pending, the hubs' error with a retry
 * when it fails; the page around it stands. `framed` puts the error in the
 * page's ruled column (a read that fills a whole band); `quiet` replaces it
 * with the given node (a part the page can say without), and `resetKey`, what
 * the read asks for, clears a quiet error when it changes: the next question
 * is read again rather than left unsaid.
 */
export function BandRead({
  fallback,
  children,
  framed = false,
  quiet,
  resetKey,
}: {
  readonly fallback: ReactNode
  readonly children: ReactNode
  readonly framed?: boolean
  readonly quiet?: ReactNode
  readonly resetKey?: string
}) {
  // The question a read failed for. The boundary renders its fallback as a component of a new type each time, so the
  // fallback can't remember it: the boundary's owner does.
  const [failedFor, setFailedFor] = useState<string | undefined>(undefined)
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary
          onError={() => setFailedFor(resetKey)}
          fallback={({ resetError }) => {
            const retry = () => {
              reset()
              resetError()
            }
            if (quiet !== undefined) {
              return (
                <QuietError resetKey={resetKey} failedFor={failedFor} onReset={retry}>
                  {quiet}
                </QuietError>
              )
            }
            const error = <HubLoadError onRetry={retry} />
            return framed ? <RuledFrame className="py-10">{error}</RuledFrame> : error
          }}
        >
          <Suspense fallback={fallback}>{children}</Suspense>
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  )
}

/** A quiet error's node, until what the read asks for changes: then the read is tried again. */
function QuietError({
  resetKey,
  failedFor,
  onReset,
  children,
}: {
  readonly resetKey: string | undefined
  readonly failedFor: string | undefined
  readonly onReset: () => void
  readonly children: ReactNode
}) {
  useEffect(() => {
    if (failedFor !== undefined && resetKey !== failedFor) onReset()
  }, [resetKey, failedFor, onReset])
  return <>{children}</>
}

/** The address of the question, copied: a view is a link. */
export function ShareIcon({ className }: { readonly className?: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      onClick={() =>
        void navigator.clipboard?.writeText(window.location.href).then(() => {
          setCopied(true)
          window.setTimeout(() => setCopied(false), 1500)
        })
      }
      className={className}
      aria-label={copied ? t`Copiat` : t`Copiază legătura`}
      title={copied ? t`Copiat` : t`Copiază legătura`}
    >
      {copied ? <Check className="size-4" aria-hidden="true" /> : <Link2 className="size-4" aria-hidden="true" />}
    </button>
  )
}

/** One marker for what a reader should know before the numbers: amber with a count when something is off, an „i" otherwise. */
export function NotesMarker({ alerts, facts }: { readonly alerts: readonly string[]; readonly facts: readonly string[] }) {
  return (
    <Popover>
      <PopoverTrigger
        className={cn(
          'inline-flex min-h-11 min-w-11 items-center justify-center gap-1 px-1 text-xs tabular-nums sm:h-7 sm:min-h-0 sm:min-w-7',
          alerts.length > 0 ? 'text-amber-700 hover:text-amber-800 dark:text-amber-400' : 'text-muted-foreground hover:text-foreground',
        )}
        aria-label={alerts.length > 0 ? plural(alerts.length, { one: '# atenționare', few: '# atenționări', other: '# de atenționări' }) : t`Despre aceste cifre`}
      >
        {alerts.length > 0 ? <TriangleAlert className="size-3.5" aria-hidden="true" /> : <Info className="size-3.5" aria-hidden="true" />}
        {alerts.length > 0 ? alerts.length : null}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[min(92vw,26rem)] space-y-2 text-sm">
        {alerts.map((alert) => (
          <p key={alert} className="border-l-2 border-amber-600/60 pl-3 text-foreground">
            {alert}
          </p>
        ))}
        {facts.map((fact) => (
          <p key={fact} className="text-muted-foreground">
            {fact}
          </p>
        ))}
      </PopoverContent>
    </Popover>
  )
}

/** The analysis tables' parts, as the procurement analytics page draws them: the share bar, the change, a row's years, a value's evidence. */

/**
 * A table's header row that sticks under the page's sticky bar while the table
 * scrolls past: CSS `sticky`, drawn by the browser in step with the scroll. Its
 * table must not scroll in a box of its own (`overflow-visible` on the table's
 * container); a rule under the cells goes with them.
 */
export const STICKY_HEAD = '[&_th]:sticky [&_th]:top-[var(--bar-h,0px)] [&_th]:z-20 [&_th]:bg-background [&_th]:shadow-[inset_0_-1px_0_hsl(var(--border))]'

/**
 * The same for a table that scrolls sideways below a wide screen: there its
 * header would stick to its own box, pushed down by the bar's height over its
 * first rows, so it sticks only from 1024px, where the table has the room.
 */
export const STICKY_HEAD_WIDE = 'lg:[&_th]:sticky lg:[&_th]:top-[var(--bar-h,0px)] lg:[&_th]:z-20 [&_th]:bg-background [&_th]:shadow-[inset_0_-1px_0_hsl(var(--border))]'

export function Unavailable({ children, className }: { readonly children: ReactNode; readonly className?: string }) {
  return <p className={cn('py-8 text-sm text-muted-foreground', className)}>{children}</p>
}

export function TablePending({ rows = 12 }: { readonly rows?: number }) {
  return (
    <div className="space-y-3 py-2" aria-hidden="true">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="h-5 animate-pulse bg-muted/40" style={{ width: `${95 - index * 5}%` }} />
      ))}
    </div>
  )
}

/**
 * A part's share of its whole: a bar (a float, only to draw) and the percentage, divided on the exact decimals and
 * rounded at the digits it shows (one under 10%, none above).
 */
export function ShareCell({ part, whole, widest }: { readonly part: string | null; readonly whole: string | null; readonly widest: number }) {
  const partLei = plotOf(part)
  const wholeLei = plotOf(whole)
  if (part === null || whole === null || partLei === null || !wholeLei) return null
  const share = partLei / wholeLei
  const digits = Math.abs(share) < 0.1 ? 1 : 0
  const exact = exactPercent(part, whole, digits)
  return (
    <span className="flex items-center justify-end gap-2">
      <span className="block h-1.5 w-16 bg-muted/70 lg:w-20">
        <span className={cn('block h-1.5', share < 0 ? 'bg-muted-foreground/40' : 'bg-primary/75')} style={{ width: `${Math.max(Math.min((Math.abs(share) / widest) * 100, 100), 1).toFixed(1)}%` }} />
      </span>
      <span className="w-12 text-right text-xs tabular-nums">{exact === null ? '—' : percentText(exact / 100, digits)}</span>
    </span>
  )
}

/** A change, signed, in the text colours (never a red/green verdict on a budget line). */
export function ChangeCell({ text }: { readonly text: string | null }) {
  return <span className={cn('tabular-nums', text === null ? 'text-muted-foreground' : 'text-foreground')}>{text ?? '—'}</span>
}

/** A row's years, small: one bar a year, a gap left empty, the page's year solid. */
export function Spark({
  values,
  selected,
  label,
}: {
  readonly values: readonly { readonly label: string; readonly value: number | null }[]
  readonly selected: string | null
  readonly label: string
}) {
  const max = Math.max(0, ...values.map((point) => Math.abs(point.value ?? 0)))
  if (max === 0) return null
  return (
    <span role="img" aria-label={label} className="flex h-5 w-28 items-end gap-px">
      {values.map((point) => (
        <span
          key={point.label}
          className={cn('block min-w-0 flex-1', point.value === null ? 'h-px bg-transparent' : point.label === selected ? 'bg-primary' : 'bg-primary/35')}
          style={point.value === null ? undefined : { height: `${Math.max((Math.abs(point.value) / max) * 100, 4).toFixed(1)}%` }}
        />
      ))}
    </span>
  )
}

/** A value's evidence behind one icon: the popover reads it when it opens. */
export function EvidenceIcon({ label, children }: { readonly label: string; readonly children: (open: boolean) => ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        onClick={(event) => event.stopPropagation()}
        className="inline-flex size-7 shrink-0 items-center justify-center text-muted-foreground transition-[color,opacity] hover:text-foreground focus-visible:opacity-100 data-[state=open]:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
        aria-label={t`De unde vine: ${label}`}
      >
        <FileSearch className="size-3.5" aria-hidden="true" />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(92vw,26rem)] text-xs" onClick={(event) => event.stopPropagation()}>
        {children(open)}
      </PopoverContent>
    </Popover>
  )
}

export function EvidenceList({ items }: { readonly items: readonly (readonly [string, ReactNode] | null)[] }) {
  return (
    <dl className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-x-3 gap-y-1.5">
      {items.flatMap((item) =>
        item === null
          ? []
          : [
              <div key={item[0]} className="contents">
                <dt className="text-muted-foreground">{item[0]}</dt>
                <dd className="break-words">{item[1]}</dd>
              </div>,
            ],
      )}
    </dl>
  )
}

/** A source document: its file name linked, or „legătura sursei: în așteptare" when the server has none (never a guessed URL). */
export function DocumentLink({ url, sha256 }: { readonly url: string | null; readonly sha256: string }) {
  if (!url) return <span className="text-muted-foreground">{t`legătura sursei: în așteptare · SHA-256 ${sha256.slice(0, 12)}…`}</span>
  return (
    <a href={url} target="_blank" rel="noreferrer" className="underline-offset-4 hover:underline">
      {`${url.split('/').pop() ?? url} ↗`}
    </a>
  )
}
