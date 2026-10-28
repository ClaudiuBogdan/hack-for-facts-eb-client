import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react'
import type { ComponentProps, RefObject } from 'react'
import { Search, X } from 'lucide-react'
import { t } from '@lingui/core/macro'
import { quietImport, reloadForFreshCode } from '@/lib/chunk-recovery'
import { cn } from '@/lib/utils'
import type { LandingSearch } from './landing-search'
import {
  isApplePlatform,
  NARROW_VIEWPORT,
  ScopePill,
  SEARCH_ACTIONS_CLASS,
  SEARCH_CLEAR_CLASS,
  SEARCH_FIELD_CLASS,
  SEARCH_FIELD_KEYBOARD_CLASS,
  SEARCH_ICON_CLASS,
  SEARCH_INPUT_CLASS,
  ShortcutHint,
  usePrefersReducedMotion,
  type SearchFocus,
} from './search-field'

/**
 * The site search as a page first gets it: a plain field, server-rendered in
 * the combobox's own box, that fetches the combobox (`LandingSearch`, ≈45 KB
 * of Base UI and floating-ui) when the reader comes to it — focus, a pointer
 * over it, ⌘K — or when the page is idle, and then hands over to it. Nobody
 * can use the combobox before the page has hydrated, so its code is no part of
 * what the page waits for.
 *
 * The hand-over loses nothing. What was typed becomes the combobox's query;
 * a focused field stays focused — the input with its caret and selection, or
 * the clear button — with the keyboard ring only if the keyboard brought the
 * focus. A composition in progress (an IME, a dead key) is finished in the
 * plain field first. The plain field is the combobox at rest to a screen
 * reader too: the same role, name and states.
 *
 * A combobox that cannot load (an old tab asking for code a deploy removed)
 * is never a reload of the page being read: the field says so once the reader
 * uses it, and its „try again" asks for a fresh page, as the app's other
 * deferred parts do.
 *
 * Once fetched, the combobox is drawn at once wherever the field mounts again
 * (a later page of the visit); only hydration draws the plain field first,
 * since the server cannot draw anything else.
 */

type Combobox = typeof LandingSearch
export type DeferredLandingSearchProps = Omit<ComponentProps<Combobox>, 'handover'>

/** How long the field waits for an idle moment before it fetches the combobox anyway. */
const IDLE_TIMEOUT_MS = 3000
/** Where the browser has no idle callback (Safari): the wait before fetching. */
const NO_IDLE_DELAY_MS = 1000

let loadedCombobox: Combobox | null = null
let pendingLoad: Promise<void> | null = null
let loadFailed = false
const listeners = new Set<() => void>()
const notify = () => {
  for (const listener of listeners) listener()
}

/**
 * Fetches the combobox once per document. Loaded for the reader, not by them:
 * a failed chunk leaves the plain field and never reloads the page, and is not
 * asked for again by itself — the browser keeps the failure (`retryCombobox`).
 */
function loadCombobox() {
  if (loadedCombobox || pendingLoad || loadFailed) return
  pendingLoad = quietImport(() => import('./landing-search'))
    .then((module) => {
      loadedCombobox = module.LandingSearch
    })
    .catch(() => {
      loadFailed = true
    })
    .finally(() => {
      pendingLoad = null
      notify()
    })
}

/** The reader's „try again": a fresh page, which can load the code; offline, the fetch once more in place. */
function retryCombobox() {
  if (reloadForFreshCode()) return
  loadFailed = false
  notify()
  loadCombobox()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
const currentCombobox = () => loadedCombobox
const noCombobox = () => null
const currentFailure = () => loadFailed
const noFailure = () => false

/** Where ⌘K is the page's to take: not while typing in another field (`useHotkeys`' rule too). */
function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
}

export function DeferredLandingSearch(props: DeferredLandingSearchProps) {
  // The server's answer, and so hydration's, is always the plain field.
  const Combobox = useSyncExternalStore(subscribe, currentCombobox, noCombobox)
  const [term, setTerm] = useState('')
  const [composing, setComposing] = useState(false)
  const focusRef = useRef<SearchFocus | null>(null)
  if (Combobox && !composing) return <Combobox {...props} handover={{ term, focus: focusRef }} />
  return <PlainSearchField {...props} term={term} onTermChange={setTerm} onComposingChange={setComposing} focusRef={focusRef} />
}

function PlainSearchField({
  className,
  inputRef: externalInputRef,
  placeholder: placeholderProp,
  autoFocus,
  scrollToTopOnFocus,
  fixedScope,
  term,
  onTermChange,
  onComposingChange,
  focusRef,
}: DeferredLandingSearchProps & {
  readonly term: string
  readonly onTermChange: (term: string) => void
  readonly onComposingChange: (composing: boolean) => void
  /** Written as the field unmounts: where its focus was, for the combobox to take back. */
  readonly focusRef: RefObject<SearchFocus | null>
}) {
  const placeholder = placeholderProp ?? t`Caută entități, statistici sau identificatori...`
  // As the combobox draws it: the ring for keyboard focus only, the pointer remembered from `pointerdown`.
  const [keyboardFocus, setKeyboardFocus] = useState(false)
  const keyboardFocusRef = useRef(false)
  const pointerFocusRef = useRef(false)
  const autoFocusOnMountRef = useRef(autoFocus)
  const prefersReducedMotion = usePrefersReducedMotion()
  const failed = useSyncExternalStore(subscribe, currentFailure, noFailure)
  const containerRef = useRef<HTMLDivElement>(null)
  const localInputRef = useRef<HTMLInputElement>(null)
  const inputRef = externalInputRef ?? localInputRef

  const markFocus = (keyboard: boolean) => {
    keyboardFocusRef.current = keyboard
    setKeyboardFocus(keyboard)
  }

  // Idle: the combobox comes in behind the page, ready before most readers reach the field.
  useEffect(() => {
    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(loadCombobox, { timeout: IDLE_TIMEOUT_MS })
      return () => window.cancelIdleCallback(id)
    }
    const id = window.setTimeout(loadCombobox, NO_IDLE_DELAY_MS)
    return () => window.clearTimeout(id)
  }, [])

  // Focus after mount on a wide viewport, as the combobox does (see there); not-keyboard focus.
  useEffect(() => {
    if (!autoFocusOnMountRef.current || window.matchMedia(NARROW_VIEWPORT).matches) return
    pointerFocusRef.current = true
    inputRef.current?.focus()
    pointerFocusRef.current = false
  }, [inputRef])

  // ⌘K / Ctrl+K, as the combobox binds `mod+k`: Cmd on Apple platforms, Ctrl elsewhere, nothing else held.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== 'KeyK' || event.altKey || event.shiftKey || isTypingTarget(event.target)) return
      if (!(isApplePlatform() ? event.metaKey : event.ctrlKey)) return
      event.preventDefault()
      inputRef.current?.focus()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [inputRef])

  // As the combobox replaces this field: where the focus was, in the same commit, before the node goes.
  useLayoutEffect(() => {
    const input = inputRef.current
    // The field's group: besides the input, its one focusable control is the clear button.
    const group = input?.closest('[role="group"]')
    return () => {
      if (!input) return
      const active = input.ownerDocument.activeElement
      focusRef.current = {
        focused: active === input ? 'input' : active instanceof HTMLButtonElement && group?.contains(active) ? 'clear' : null,
        keyboard: keyboardFocusRef.current,
        selectionStart: input.selectionStart,
        selectionEnd: input.selectionEnd,
        selectionDirection: input.selectionDirection,
      }
    }
  }, [inputRef, focusRef])

  return (
    <div ref={containerRef} className={cn('relative w-full', className)}>
      <div
        role="group"
        aria-label={t`Căutare`}
        onPointerEnter={loadCombobox}
        onPointerDown={() => {
          pointerFocusRef.current = true
        }}
        onPointerUp={() => {
          pointerFocusRef.current = false
        }}
        onFocus={(event) => {
          if (event.target === inputRef.current) markFocus(!pointerFocusRef.current)
          pointerFocusRef.current = false
        }}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) markFocus(false)
        }}
        className={cn(SEARCH_FIELD_CLASS, keyboardFocus && SEARCH_FIELD_KEYBOARD_CLASS)}
      >
        <Search aria-hidden="true" className={SEARCH_ICON_CLASS} />
        {fixedScope ? <ScopePill label={fixedScope.label} Icon={fixedScope.Icon} /> : null}
        <input
          ref={inputRef}
          value={term}
          onChange={(event) => onTermChange(event.target.value)}
          onFocus={() => {
            loadCombobox()
            if (scrollToTopOnFocus) containerRef.current?.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' })
          }}
          onCompositionStart={() => onComposingChange(true)}
          // A task later: some browsers send the composition's last `input` after `compositionend`,
          // and it must reach this field, not one that has just replaced it.
          onCompositionEnd={() => window.setTimeout(() => onComposingChange(false), 0)}
          onKeyDown={(event) => {
            if (event.nativeEvent.isComposing || event.keyCode === 229) return
            // There is no list to close yet, so Escape is its second stage at once: the field is emptied.
            if (event.key === 'Escape' && term) onTermChange('')
          }}
          // The combobox's input at rest, attribute for attribute: a screen reader meets the same field before and after.
          autoComplete="off"
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="none"
          role="combobox"
          aria-expanded={false}
          aria-haspopup="listbox"
          aria-autocomplete="list"
          placeholder={fixedScope && !placeholderProp ? t`Nume sau identificator...` : placeholder}
          aria-label={fixedScope ? `${fixedScope.label} · ${placeholder}` : placeholder}
          enterKeyHint="search"
          className={SEARCH_INPUT_CLASS}
        />
        <div className={SEARCH_ACTIONS_CLASS}>
          {term ? (
            <button
              type="button"
              aria-label={t`Șterge căutarea`}
              onClick={(event) => {
                onTermChange('')
                pointerFocusRef.current = event.detail > 0
                inputRef.current?.focus()
                pointerFocusRef.current = false
              }}
              className={SEARCH_CLEAR_CLASS}
            >
              <X className="size-4" />
            </button>
          ) : (
            <ShortcutHint />
          )}
        </div>
      </div>
      <p aria-live="polite" className="sr-only" />
      {failed && term ? (
        // Where the combobox's list would be: said once the reader is using the field, never for a background fetch alone.
        <div role="alert" className="absolute inset-x-0 top-full z-30 mt-1 rounded-lg border bg-card px-4 py-3 text-sm shadow-lg">
          <span className="text-destructive">{t`Căutarea nu a răspuns.`}</span>{' '}
          <button type="button" onClick={retryCombobox} className="font-medium text-foreground underline underline-offset-4">
            {t`Încearcă din nou`}
          </button>
        </div>
      ) : null}
    </div>
  )
}
