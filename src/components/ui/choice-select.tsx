import { useSyncExternalStore, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, selectTriggerClassName } from '@/components/ui/select'
import { cn } from '@/lib/utils'

/**
 * A dropdown of choices, in groups or as one plain list: shadcn's Select under
 * a mouse, and on a touch screen the phone's own picker — a native select over
 * the same box. Radix's list closes on any window resize (a keyboard going
 * away resizes it) and places itself against the layout viewport, under a
 * keyboard still open; the phone's picker does neither.
 */

export interface ChoiceOption {
  readonly value: string
  readonly label: string
  readonly disabled?: boolean
}

export interface ChoiceGroup {
  /** A heading over its options; none for a plain list. */
  readonly label?: string
  readonly options: readonly ChoiceOption[]
}

const COARSE = '(pointer: coarse)'

function subscribe(onChange: () => void) {
  const query = window.matchMedia(COARSE)
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}

/** A touch screen; false on the server, so the page renders the list and a phone swaps in its picker once hydrated. */
function useCoarsePointer(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(COARSE).matches,
    () => false,
  )
}

export function ChoiceSelect({
  value,
  groups,
  onChange,
  label,
  triggerClassName,
  children,
}: {
  readonly value: string
  readonly groups: readonly ChoiceGroup[]
  readonly onChange: (value: string) => void
  /** The control's name, for assistive tech. */
  readonly label: string
  readonly triggerClassName?: string
  /** The trigger's words; the chosen option's label without them. */
  readonly children?: ReactNode
}) {
  const coarse = useCoarsePointer()
  const chosen = groups.flatMap((group) => group.options).find((option) => option.value === value)
  const shown = children ?? <span className="truncate">{chosen?.label ?? value}</span>
  if (coarse) {
    return (
      <span className={cn(selectTriggerClassName, triggerClassName, 'relative has-[select:focus-visible]:ring-1 has-[select:focus-visible]:ring-ring')}>
        {shown}
        <ChevronDown className="h-4 w-4 shrink-0 opacity-50" aria-hidden="true" />
        {/* 16 px, unseen: a smaller field makes iOS zoom the page when it takes the focus. */}
        <select aria-label={label} value={value} onChange={(event) => onChange(event.target.value)} className="absolute inset-0 size-full cursor-pointer appearance-none text-base opacity-0">
          {groups.map((group, index) =>
            group.label ? (
              <optgroup key={group.label} label={group.label}>
                {group.options.map((option) => (
                  <option key={option.value} value={option.value} disabled={option.disabled}>
                    {option.label}
                  </option>
                ))}
              </optgroup>
            ) : (
              group.options.map((option) => (
                <option key={`${index}-${option.value}`} value={option.value} disabled={option.disabled}>
                  {option.label}
                </option>
              ))
            ),
          )}
        </select>
      </span>
    )
  }
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={triggerClassName} aria-label={label}>
        {shown}
      </SelectTrigger>
      <SelectContent className="max-h-[min(32rem,var(--radix-select-content-available-height))]">
        {groups.map((group, index) => (
          <SelectGroup key={group.label ?? index}>
            {index > 0 ? <SelectSeparator /> : null}
            {group.label ? (
              <SelectLabel className="px-2 pb-1 pt-2">
                <MonoLabel className="text-muted-foreground">{group.label}</MonoLabel>
              </SelectLabel>
            ) : null}
            {group.options.map((option) => (
              <SelectItem key={option.value} value={option.value} disabled={option.disabled}>
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  )
}
