import { useEffect, useId, useState, type KeyboardEvent } from 'react'

/**
 * The arrow keys over the list under a search field, as a combobox: the
 * field keeps the focus (and the caret: Home, End and Space stay the
 * text's), the active option is its `aria-activedescendant`, Enter picks it
 * — with none active, Enter is left to the field's form.
 *
 * `options` are the list's options as drawn, each by what it stands for
 * (a place's `level:value`, a CUI): the highlight belongs to an option, not
 * to a position, so a list that shifts under it (a late read adding a
 * group above) keeps it on the same option, and a list without it has none
 * active. A list closed (no options) forgets it.
 *
 * The site's `useListKeyboardNavigation` is not this: it takes Space as a
 * pick, which would eat the space in „sector 3".
 */
export function useActiveOption(options: readonly string[]) {
  const id = useId()
  const listId = `${id}-list`
  const [active, setActive] = useState<string | null>(null)
  if (options.length === 0 && active !== null) setActive(null)
  const current = active === null ? -1 : options.indexOf(active)
  useEffect(() => {
    if (current >= 0) document.getElementById(`${id}-option-${current}`)?.scrollIntoView({ block: 'nearest' })
  }, [current, id])
  return {
    listId,
    /** The field's part: a combobox that owns the list, open or not. */
    input: (open: boolean) =>
      ({
        role: 'combobox',
        'aria-expanded': open,
        'aria-controls': listId,
        'aria-autocomplete': 'list',
        'aria-activedescendant': open && current >= 0 ? `${id}-option-${current}` : undefined,
      }) as const,
    /** An option's part, by its place in `options`: out of the Tab order, the field is the way in. */
    option: (index: number) => ({ id: `${id}-option-${index}`, role: 'option', 'aria-selected': index === current, tabIndex: -1 }) as const,
    onKeyDown: (event: KeyboardEvent<HTMLInputElement>, pick: (index: number) => void) => {
      if (options.length === 0) return
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        setActive(options[current + 1 >= options.length ? 0 : current + 1]!)
      } else if (event.key === 'ArrowUp') {
        event.preventDefault()
        setActive(options[current <= 0 ? options.length - 1 : current - 1]!)
      } else if (event.key === 'Enter' && current >= 0) {
        event.preventDefault()
        pick(current)
      }
    },
  }
}

export type ActiveOption = ReturnType<typeof useActiveOption>
