import * as SliderPrimitive from '@radix-ui/react-slider'
import { useId, useState } from 'react'
import { plural, t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { statisticsTheme } from '../lib/statistics-theme'

/** A closed range of years, first to last inclusive. */
export type YearSpan = {
  readonly from: number
  readonly to: number
}

type Props = {
  /** The years the series actually covers: the bounds of every control here. */
  readonly span: YearSpan
  /** The window on screen — the span itself when nothing is pinned. */
  readonly window: YearSpan
  /** Writes the pins. `undefined` on both means the whole span. */
  readonly onChange: (patch: {
    readonly din: number | undefined
    readonly pana: number | undefined
  }) => void
  /**
   * `panel` paints a popover edge to edge, with its own header; `field` is
   * the labelled form the phone sheet stacks.
   */
  readonly variant: 'panel' | 'field'
}

/** „Ultimii N ani" shortcuts, offered only where the span is longer than N. */
const PRESET_YEARS = [5, 10, 20] as const

const THUMB_CLASS =
  'block h-4 w-4 rounded-full border-2 border-primary bg-card shadow transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'

/**
 * The years the chart shows, chosen inside the years the series has.
 *
 * Two bare number fields used to do this, bounded by nothing and telling
 * the reader nothing: „din" and „până în" with no hint that the series ran
 * 2010–2026, spinners that stepped a year at a time, and a value outside the
 * span that quietly drew an empty chart. The control is bounded now — a
 * two-thumb slider across the observed span, the two years as fields beside
 * it, and the shortcuts a reader actually reaches for.
 *
 * Nothing navigates while a thumb is being dragged: the fields and the count
 * follow the drag, and the URL is written on release. The fields commit on
 * blur or Enter, clamped to the span and put in order. A window equal to the
 * whole span is written as no pin at all, which is what it means.
 */
export function DetailYearWindowControl({ span, window, onChange, variant }: Props) {
  const id = useId()
  const [draft, setDraft] = useState<readonly [number, number]>([window.from, window.to])
  // The draft follows the URL, never the other way round: a chip removed or
  // the back button moves the window under this control.
  const [anchor, setAnchor] = useState(window)
  if (anchor.from !== window.from || anchor.to !== window.to) {
    setAnchor(window)
    setDraft([window.from, window.to])
  }

  const commit = (from: number, to: number) => {
    const low = clamp(Math.min(from, to), span)
    const high = clamp(Math.max(from, to), span)
    setDraft([low, high])
    onChange({
      din: low === span.from ? undefined : low,
      pana: high === span.to ? undefined : high,
    })
  }

  const spanYears = span.to - span.from + 1
  const presets = PRESET_YEARS.filter((years) => years < spanYears)
  const pinned = window.from !== span.from || window.to !== span.to
  const count = draft[1] - draft[0] + 1

  return (
    <div className="flex flex-col">
      {variant === 'panel' ? (
        <div className={statisticsTheme.optionPanelHeader}>
          <p className={statisticsTheme.sectionLabel}>
            <Trans>Interval de ani</Trans>
          </p>
        </div>
      ) : (
        <Label className="mb-1.5">
          <Trans>Interval de ani</Trans>
        </Label>
      )}

      <div className={cn('space-y-3', variant === 'panel' ? 'px-3 pb-3 pt-3' : 'rounded-md border border-border/70 p-3')}>
        <div className="flex items-center gap-2">
          <YearField
            id={`${id}-from`}
            label={t`An de început`}
            value={draft[0]}
            span={span}
            onCommit={(year) => commit(year, draft[1])}
          />
          <span aria-hidden className="text-muted-foreground">
            –
          </span>
          <YearField
            id={`${id}-to`}
            label={t`An de sfârșit`}
            value={draft[1]}
            span={span}
            onCommit={(year) => commit(draft[0], year)}
          />
          <span className="ml-auto text-xs tabular-nums text-muted-foreground" aria-live="polite">
            {plural(count, { one: 'un an', few: '# ani', other: '# de ani' })}
          </span>
        </div>

        <div>
          <SliderPrimitive.Root
            min={span.from}
            max={span.to}
            step={1}
            minStepsBetweenThumbs={0}
            value={[draft[0], draft[1]]}
            onValueChange={([from, to]) => {
              if (from !== undefined && to !== undefined) setDraft([from, to])
            }}
            onValueCommit={([from, to]) => {
              if (from !== undefined && to !== undefined) commit(from, to)
            }}
            className="relative flex w-full touch-none select-none items-center py-1.5"
          >
            <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-primary/20">
              <SliderPrimitive.Range className="absolute h-full bg-primary" />
            </SliderPrimitive.Track>
            <SliderPrimitive.Thumb aria-label={t`An de început`} className={THUMB_CLASS} />
            <SliderPrimitive.Thumb aria-label={t`An de sfârșit`} className={THUMB_CLASS} />
          </SliderPrimitive.Root>
          {/* What the slider runs between: the series' own first and last year. */}
          <div aria-hidden className="flex justify-between text-[11px] tabular-nums text-muted-foreground">
            <span>{span.from}</span>
            <span>{span.to}</span>
          </div>
        </div>

        {presets.length > 0 || pinned ? (
          <div className="flex flex-wrap gap-1.5">
            {presets.map((years) => {
              const from = span.to - years + 1
              const isCurrent = draft[0] === from && draft[1] === span.to
              return (
                <button
                  key={years}
                  type="button"
                  aria-pressed={isCurrent}
                  onClick={() => commit(from, span.to)}
                  className={cn(
                    'rounded-md border border-border/70 px-2 py-1 text-xs transition-colors hover:border-primary/40 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    isCurrent && 'border-primary/40 bg-primary/10 font-medium',
                  )}
                >
                  {t`ultimii ${years} ani`}
                </button>
              )
            })}
            {pinned ? (
              <button
                type="button"
                onClick={() => commit(span.from, span.to)}
                className="rounded-md px-2 py-1 text-xs font-medium text-muted-foreground underline decoration-border underline-offset-4 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Trans>tot intervalul</Trans>
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}

/**
 * One year, typed. Commits on blur or Enter — typing the „2" of „2019" must
 * not navigate — and hands back whatever was typed for the parent to clamp
 * and order. On commit the text returns to the year the field holds: if the
 * parent changes it, the prop sync below rewrites it; if the parent clamps
 * or reorders it back to what it was, no prop changes and nothing else would
 * have corrected the text — the field would have shown „2003" over a window
 * that reads 2003–2005 and, on blur, committed 2003–2003. A field emptied
 * or left unparseable returns to the year it showed the same way.
 */
function YearField({
  id,
  label,
  value,
  span,
  onCommit,
}: {
  readonly id: string
  readonly label: string
  readonly value: number
  readonly span: YearSpan
  readonly onCommit: (year: number) => void
}) {
  const [text, setText] = useState(String(value))
  const [shown, setShown] = useState(value)
  if (shown !== value) {
    setShown(value)
    setText(String(value))
  }

  const commit = () => {
    const year = Number.parseInt(text, 10)
    setText(String(value))
    if (Number.isFinite(year)) onCommit(year)
  }

  return (
    <input
      id={id}
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      maxLength={4}
      aria-label={label}
      // The bounds are what the field is FOR; a reader on a screen reader
      // hears them without having to find the slider.
      aria-description={t`între ${span.from} și ${span.to}`}
      value={text}
      onChange={(event) => setText(event.target.value.replace(/\D/g, ''))}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault()
          commit()
        }
      }}
      className="h-9 w-16 rounded-md border border-input bg-background px-2 text-center text-sm tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    />
  )
}

function clamp(year: number, span: YearSpan): number {
  return Math.max(span.from, Math.min(span.to, year))
}
