import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { ArrowRight, X } from 'lucide-react'
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { formatAmount, formatPercent } from '../../lib/budget-map-format'
import type { NumberLocale } from '../../lib/national-facts'

/**
 * What the map says about one primărie: on a desktop a tooltip that follows
 * the pointer (a click opens the primărie's page), on a phone a popover at the
 * tapped point, with the link as a 44 px row. One summary for both.
 */

export type UatKind = 'comuna' | 'oras' | 'municipiu'

export interface UatInfo {
  readonly siruta: string
  readonly name: string
  readonly kind: UatKind | null
  /** The county's name; null in București, whose sectors sit in the municipality, not a county. */
  readonly county: string | null
  /** The picked map's name and its figure for this primărie, with the unit. */
  readonly measureTitle: string
  readonly measureValue: string
  readonly income: number | null
  readonly expenses: number | null
  readonly cui: string
}

function UatSummary({ info, locale }: { readonly info: UatInfo; readonly locale: NumberLocale }) {
    const { name } = info
  const title = info.kind === 'comuna' ? t`Comuna ${name}` : info.kind === 'oras' ? t`Orașul ${name}` : info.kind === 'municipiu' ? t`Municipiul ${name}` : name
  const county = info.county
  const balance = info.income !== null && info.expenses !== null ? info.income - info.expenses : null
  const share = balance !== null && info.income ? (balance / info.income) * 100 : null
  return (
    <div className="text-sm">
      <p className="font-semibold leading-tight text-foreground">{title}</p>
      <p className="text-xs text-muted-foreground">{county === null ? t`Municipiul București` : t`Județul ${county}`}</p>
      <p className="mt-2 text-xs text-muted-foreground">{info.measureTitle}</p>
      <p className="text-lg font-semibold tabular-nums text-foreground">{info.measureValue}</p>
      <dl className="mt-1.5 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs tabular-nums">
        <dt className="text-muted-foreground">{t`Venituri`}</dt>
        <dd className="text-right">{formatAmount(info.income, locale)}</dd>
        <dt className="text-muted-foreground">{t`Cheltuieli`}</dt>
        <dd className="text-right">{formatAmount(info.expenses, locale)}</dd>
        <dt className="text-muted-foreground">{t`Sold`}</dt>
        <dd className={cn('text-right', balance !== null && balance < 0 && 'text-destructive')}>
          {formatAmount(balance, locale)} · {formatPercent(share, locale)}
        </dd>
      </dl>
    </div>
  )
}

const TOOLTIP_OFFSET = 14

/** Follows the pointer inside the map's frame, flipping to whichever side has room. */
export function UatTooltip({
  info,
  locale,
  x,
  y,
  frame,
}: {
  readonly info: UatInfo
  readonly locale: NumberLocale
  readonly x: number
  readonly y: number
  readonly frame: { readonly width: number; readonly height: number }
}) {
    const ref = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 240, height: 160 })
  // Measured when what it says changes, so it can flip before it is seen; only a new size re-renders.
  useLayoutEffect(() => {
    const node = ref.current
    if (!node) return
    const next = { width: node.offsetWidth, height: node.offsetHeight }
    setSize((previous) => (previous.width === next.width && previous.height === next.height ? previous : next))
  }, [info])
  const left = x + TOOLTIP_OFFSET + size.width > frame.width ? x - TOOLTIP_OFFSET - size.width : x + TOOLTIP_OFFSET
  const top = Math.min(Math.max(0, y - size.height / 2), frame.height - size.height)
  return (
    <div
      ref={ref}
      role="tooltip"
      className="pointer-events-none absolute z-10 w-60 rounded-md border bg-popover p-3 text-popover-foreground shadow-md"
      style={{ left: Math.max(0, left), top: Math.max(0, top) }}
    >
      <UatSummary info={info} locale={locale} />
      {info.cui ? <p className="mt-2 text-xs text-muted-foreground">{t`Click pentru pagina primăriei`}</p> : null}
    </div>
  )
}

/** A popover at the tapped point (client coordinates), kept on screen by the popover itself. */
export function UatPopover({
  info,
  locale,
  at,
  onClose,
}: {
  readonly info: UatInfo
  readonly locale: NumberLocale
  readonly at: { readonly x: number; readonly y: number }
  readonly onClose: () => void
}) {
    // A virtual anchor per point, never mutated: a render that does not commit cannot move a committed popover.
  const anchor = useMemo(() => ({ current: { getBoundingClientRect: () => DOMRect.fromRect({ x: at.x, y: at.y, width: 0, height: 0 }) } }), [at.x, at.y])
  return (
    <Popover open onOpenChange={(open) => !open && onClose()}>
      <PopoverAnchor virtualRef={anchor} />
      <PopoverContent side="top" sideOffset={10} collisionPadding={12} className="w-72 p-3" onOpenAutoFocus={(event) => event.preventDefault()}>
        <button
          type="button"
          aria-label={t`Închide`}
          onClick={onClose}
          className="absolute top-1 right-1 grid size-11 place-items-center rounded-md text-muted-foreground hover:text-foreground"
        >
          <X className="size-4" />
        </button>
        <UatSummary info={info} locale={locale} />
        {info.cui ? (
          <Link
            to="/entities/$cui"
            params={{ cui: info.cui }}
            className="mt-2 flex min-h-11 items-center justify-between rounded-md border px-3 text-sm font-medium text-primary hover:bg-muted"
          >
            {t`Deschide pagina primăriei`} <ArrowRight className="size-4" />
          </Link>
        ) : null}
      </PopoverContent>
    </Popover>
  )
}
