import { cn } from '@/lib/utils'

/**
 * A mono segmented control between a few named views — which indicator a
 * county map is coloured by, what a chart shows. One tab stop, the checked
 * option; the arrows move the selection and the focus together. `className`
 * sets the layout where the options outgrow one row (six series on a phone:
 * `grid-flow-row grid-cols-3`).
 */
export function IndicatorToggle<K extends string>({
  options,
  value,
  onChange,
  label,
  className,
}: {
  readonly options: readonly { readonly key: K; readonly label: string }[]
  readonly value: K
  readonly onChange: (key: K) => void
  readonly label: string
  readonly className?: string
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
      className={cn('grid auto-cols-fr grid-flow-col gap-px border bg-border/70 sm:flex', className)}
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
            'min-h-9 bg-background px-2 py-1.5 text-sm leading-tight transition-colors hover:bg-muted/60 sm:px-3',
            option.key === value ? 'font-semibold text-foreground' : 'text-muted-foreground',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
