import { useEffect, useId, useRef, type ReactNode } from 'react'
import { t } from '@lingui/core/macro'
import { Loader2, X } from 'lucide-react'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { cn } from '@/lib/utils'

/**
 * The filters panel's parts: a group under its head, a row with its label,
 * a value set shown as a chip, the list under a search and what the list
 * says instead of options. Every control is 40 px tall, 44 on a phone (the
 * owner, 30 September 2026: no small buttons).
 */

/** A control's height: 44 px on a phone, 40 px from `sm`. */
export const TALL = 'min-h-11 sm:min-h-10'
export const FIELD = `${TALL} w-full min-w-0 border bg-background px-2.5 text-sm placeholder:text-muted-foreground/70`
export const OPTION = `flex ${TALL} w-full items-center justify-between gap-3 px-2.5 py-1 text-left text-sm hover:bg-muted aria-selected:bg-muted`
export const CELL = `${TALL} border bg-background px-2 text-sm hover:bg-muted`

/** One of the panel's questions — what, when, who buys, who sells — under its head. */
export function Group({ title, children }: { readonly title: string; readonly children: ReactNode }) {
  return (
    <section className="py-4 first:pt-0 last:pb-0">
      <MonoLabel className="block text-muted-foreground">{title}</MonoLabel>
      <div className="mt-2.5 space-y-2">{children}</div>
    </section>
  )
}

/**
 * A label and its control: the label column is what tells two rows of one
 * group apart.
 *
 * A pick or a ✕ swaps the control that had the focus — a field for its
 * chip, a chip for its field, a path's step for plain text — and the focus
 * would fall to the sheet: it goes to the row's new control instead, its
 * field or else its last button (the chip's ✕).
 */
export function Row({ label, children }: { readonly label: string; readonly children: ReactNode }) {
  const box = useRef<HTMLDivElement>(null)
  // Whether the focus is in the row; a control removed with the focus fires no blur, so this stays set.
  const held = useRef(false)
  useEffect(() => {
    const row = box.current
    if (!held.current || !row) return
    const active = document.activeElement
    // Only focus that fell: to the page, or to the sheet itself (Radix's focus scope takes it there).
    if (active && active !== document.body && active.getAttribute('role') !== 'dialog') return
    const next = row.querySelector<HTMLElement>('input') ?? [...row.querySelectorAll<HTMLElement>('button')].pop()
    next?.focus()
  })
  return (
    <div className="grid grid-cols-[4.25rem_minmax(0,1fr)] items-start gap-2">
      <span className="pt-3.5 text-xs leading-tight text-muted-foreground sm:pt-3">{label}</span>
      <div
        ref={box}
        className="min-w-0 space-y-1.5"
        onFocus={() => {
          held.current = true
        }}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) held.current = false
        }}
      >
        {children}
      </div>
    </div>
  )
}

/** A value set, with its own ✕; `children` draws the value when its name is more than one word. */
export function Chip({ label, onClear, children }: { readonly label: string; readonly onClear: () => void; readonly children?: ReactNode }) {
  return (
    <div className={cn('flex items-center justify-between gap-1 border border-primary/50 bg-primary/5 pl-2.5', TALL)}>
      {children ?? (
        <span className="min-w-0 truncate text-sm font-medium" title={label}>
          {label}
        </span>
      )}
      <button type="button" onClick={onClear} aria-label={t`Scoate ${label}`} className="flex size-11 shrink-0 items-center justify-center text-muted-foreground hover:text-foreground sm:size-10">
        <X className="size-3.5" aria-hidden="true" />
      </button>
    </div>
  )
}

/**
 * The list under a search — its options, or its groups of options — and
 * what it says instead. It keeps the field's focus, so a tap on an option is
 * a pick and not a blur.
 */
export function Options({ id, label, notices, children }: { readonly id: string; readonly label: string; readonly notices?: ReactNode; readonly children?: ReactNode }) {
  return (
    // Out of the Tab order: Chrome makes a scroller a stop of its own, unnamed, where Escape would close the sheet.
    <div tabIndex={-1} className="max-h-80 overflow-y-auto border" onMouseDown={(event) => event.preventDefault()}>
      <div id={id} role="listbox" aria-label={label}>
        {children}
      </div>
      {notices}
    </div>
  )
}

/** A level's options under its head: „Județe", „Localități". */
export function OptionGroup({ title, children }: { readonly title: string; readonly children: ReactNode }) {
  const id = useId()
  return (
    <div role="group" aria-labelledby={id}>
      <MonoLabel id={id} className="block px-2.5 pb-1 pt-2.5 text-muted-foreground">
        {title}
      </MonoLabel>
      {children}
    </div>
  )
}

/**
 * What a list says while it has no options: that it is reading, that the
 * read failed (with the read to run again), or that nothing matched — each
 * in words, so none passes for another. A failure is announced as an alert;
 * the rest through the field's `Announce`, which is there before the words
 * change and so is heard when they do.
 */
export function Notice({ kind, onRetry, children }: { readonly kind: 'loading' | 'failed' | 'empty'; readonly onRetry?: () => void; readonly children: ReactNode }) {
  return (
    <div role={kind === 'failed' ? 'alert' : undefined} className={cn(OPTION, 'flex-wrap justify-start gap-x-3 gap-y-0 py-2 text-muted-foreground hover:bg-transparent')}>
      {kind === 'loading' ? <Loader2 className="size-3.5 shrink-0 animate-spin" aria-hidden="true" /> : null}
      <span className="min-w-0">{children}</span>
      {kind === 'failed' && onRetry ? (
        // Its own line when the words leave it no room; never a truncated message.
        <button type="button" onClick={onRetry} className={cn(TALL, 'ml-auto shrink-0 font-medium text-foreground underline-offset-4 hover:underline')}>
          {t`Încearcă din nou`}
        </button>
      ) : null}
    </div>
  )
}

/** A field's live region: always there, so a screen reader hears its words change — „Se caută…", „Nimic pentru …". */
export function Announce({ text }: { readonly text: string }) {
  return (
    <p className="sr-only" role="status">
      {text}
    </p>
  )
}
