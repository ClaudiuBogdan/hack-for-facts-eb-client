import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { plural, t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { cn } from '@/lib/utils'
import type { StatisticsHubCountyLayer } from '@/schemas/statistics'
import { formatHubValue } from '../../lib/hub-format'

/** The counties of one layer, highest first, with an inline fill bar. Shares the map's highlight. */
export function HubCountyRank({
  layer,
  limit = 10,
  highlightedCode,
  onHover,
  className,
}: {
  readonly layer: StatisticsHubCountyLayer
  readonly limit?: number
  readonly highlightedCode?: string
  readonly onHover?: (code: string | undefined) => void
  readonly className?: string
}) {
  const [expanded, setExpanded] = useState(false)
  const ranked = [...layer.values].sort((a, b) => b.value - a.value)
  const shown = expanded ? ranked : ranked.slice(0, limit)
  const max = ranked[0]?.value ?? 1
  if (ranked.length === 0) {
    return (
      <p className={cn('text-sm text-muted-foreground', className)}>
        <Trans>Niciun județ cu valoare pentru {layer.period}.</Trans>
      </p>
    )
  }
  return (
    <div className={className}>
      <ol className="divide-y divide-border/70">
        {shown.map((county, index) => {
          const formatted = formatHubValue(county.value, layer.unit, layer.unitLabel)
          return (
            <li key={county.code}>
              <Link
                to="/ins/seturi/$cod"
                params={{ cod: layer.code }}
                search={{ teritoriu: `cod:${county.code}`, frecventa: 'ANNUAL' }}
                onPointerEnter={() => onHover?.(county.code)}
                onPointerLeave={() => onHover?.(undefined)}
                onFocus={() => onHover?.(county.code)}
                onBlur={() => onHover?.(undefined)}
                className={cn(
                  'group flex items-baseline gap-3 py-2.5 transition-colors hover:bg-muted/40',
                  highlightedCode === county.code && 'bg-muted/40',
                )}
              >
                <MonoLabel className="w-6 shrink-0 text-muted-foreground">{String(index + 1).padStart(2, '0')}</MonoLabel>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-4">
                    <span className="truncate text-sm text-foreground">{county.name}</span>
                    <span className="shrink-0 text-sm tabular-nums text-foreground">
                      {formatted.value}
                      {formatted.unit ? <span className="ml-1 text-muted-foreground">{formatted.unit}</span> : null}
                    </span>
                  </span>
                  <span className="mt-1.5 block h-1 w-full bg-muted/70">
                    <span
                      className={cn('block h-full bg-primary/70 group-hover:bg-primary', highlightedCode === county.code && 'bg-primary')}
                      style={{ width: `${Math.max(1, (county.value / max) * 100).toFixed(1)}%` }}
                    />
                  </span>
                </span>
              </Link>
            </li>
          )
        })}
      </ol>
      {ranked.length > limit ? (
        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          className="mt-3 inline-flex min-h-9 items-center text-sm font-medium text-foreground underline-offset-4 hover:underline"
          aria-expanded={expanded}
        >
          {expanded
            ? t`Doar primele ${limit}`
            : plural(ranked.length, { one: 'Tot județul', few: 'Toate cele # județe', other: 'Toate cele # de județe' })}
        </button>
      ) : null}
    </div>
  )
}

/** A mono segmented control: which indicator the map is coloured by. */
export function HubIndicatorToggle<K extends string>({
  options,
  value,
  onChange,
  label,
}: {
  readonly options: readonly { readonly key: K; readonly label: string }[]
  readonly value: K
  readonly onChange: (key: K) => void
  readonly label: string
}) {
  // One tab stop: the checked option; arrows move the selection and focus with it.
  const move = (group: HTMLElement, offset: number) => {
    const index = options.findIndex((option) => option.key === value)
    const nextIndex = (index + offset + options.length) % options.length
    const next = options[nextIndex]
    if (!next) return
    onChange(next.key)
    const radios = group.querySelectorAll<HTMLButtonElement>('[role="radio"]')
    radios[nextIndex]?.focus()
  }
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="flex flex-wrap gap-px border bg-border/70"
      onKeyDown={(event) => {
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
          event.preventDefault()
          move(event.currentTarget, 1)
        } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
          event.preventDefault()
          move(event.currentTarget, -1)
        }
      }}
    >
      {options.map((option) => (
        <button
          key={option.key}
          type="button"
          role="radio"
          aria-checked={option.key === value}
          tabIndex={option.key === value ? 0 : -1}
          onClick={() => onChange(option.key)}
          className={cn(
            'min-h-9 bg-background px-3 text-sm transition-colors hover:bg-muted/60',
            option.key === value ? 'font-semibold text-foreground' : 'text-muted-foreground',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
