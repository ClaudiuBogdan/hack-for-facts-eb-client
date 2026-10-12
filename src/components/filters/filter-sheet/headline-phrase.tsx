import { useRef, type KeyboardEvent } from 'react'

const PHRASE = 'cursor-pointer text-left underline decoration-muted-foreground/35 decoration-dotted decoration-2 underline-offset-[0.18em] transition-colors hover:decoration-foreground'

/**
 * The ✕, as the headline's ✕ always looked — Lucide's X, muted, darker on hover — on a round patch of the
 * page's own background that keeps the letters behind it out. The patch and the X are empty inlines — no
 * glyph, no inline block — so the line breaks around them as around the text. The patch is round: as wide
 * (its padding) as its line is tall, 1.19 em in this face. From `sm` it is half the headline's size with
 * the X filling it, takes no room (its width back as a negative margin) and is shown on hover or focus —
 * a target only then, so on a wide screen without hover (a tablet) the phrase's last letter opens the panel —
 * just past the phrase's end and lifted above the line, so it covers little of the words around it; on a
 * phone it follows the phrase, 0.7 of the headline's size, the X 0.55 of it. In forced colours the X is the
 * system's text colour (drawn as a background, it would be painted as the canvas).
 */
const REMOVE =
  'relative z-10 ml-[0.15em] cursor-pointer rounded-full bg-background align-middle text-[0.59em] leading-none text-muted-foreground/70 transition-[opacity,color] hover:text-foreground focus-visible:opacity-100 sm:-left-[0.3em] sm:-top-[0.6em] sm:-mr-[1.19em] sm:ml-0 sm:align-top sm:text-[0.42em] sm:pointer-events-none sm:opacity-0 sm:group-hover/phrase:pointer-events-auto sm:group-hover/phrase:opacity-100 sm:focus-visible:pointer-events-auto'
const X_MARK =
  'bg-current px-[0.595em] [mask-image:url(data:image/svg+xml,%3Csvg%20xmlns=%27http://www.w3.org/2000/svg%27%20viewBox=%270%200%2024%2024%27%20fill=%27none%27%20stroke=%27black%27%20stroke-width=%272%27%20stroke-linecap=%27round%27%20stroke-linejoin=%27round%27%3E%3Cpath%20d=%27M18%206%206%2018M6%206l12%2012%27/%3E%3C/svg%3E)] [mask-position:center] [mask-repeat:no-repeat] [mask-size:79%] sm:[mask-size:100%] forced-colors:text-[color:CanvasText] forced-colors:[forced-color-adjust:none]'

/**
 * Key handlers that make a span act as a button: Enter on the press, Space on
 * its release — as a button's does, and only a release that follows a press on
 * this control (Space held on the phrase, Tab to its ✕, then let go: nothing).
 */
function usePress(act: () => void) {
  const armed = useRef(false)
  return {
    onKeyDown: (event: KeyboardEvent) => {
      if (event.key === 'Enter') {
        event.preventDefault()
        if (!event.repeat) act()
      }
      // Space acts on its release; here it would only scroll the page.
      if (event.key === ' ') {
        event.preventDefault()
        if (!event.repeat) armed.current = true
      }
    },
    onKeyUp: (event: KeyboardEvent) => {
      // On the press, the panel would take the focus and the release would land on its close button.
      if (event.key !== ' ') return
      event.preventDefault()
      if (!armed.current) return
      armed.current = false
      act()
    },
    onBlur: () => {
      armed.current = false
    },
  }
}

/**
 * A filter's phrase in an analysis page's headline — procurement's
 * analytics, the NGO registry: the words open the filters panel, the ✕ drops
 * the filter (after the phrase on a phone, over its end on hover from `sm`,
 * never taking the sentence's room).
 *
 * The words and the ✕ are inline text with a button's role, not `<button>`s:
 * a button is always laid out as an inline block, and a line may break on
 * either side of one — a phrase that wraps would take the line's whole width
 * and push the rest of the sentence („, în 2024") onto a line of its own,
 * and the ✕ could start a line beside the next phrase, or the comma after it
 * would. Inline, the ✕ breaks as the text does: never from its last word.
 */
export function HeadlinePhrase({ text, removeLabel, onOpen, onRemove }: { readonly text: string; readonly removeLabel: string; readonly onOpen: () => void; readonly onRemove: () => void }) {
  const open = usePress(onOpen)
  const remove = usePress(onRemove)
  return (
    <span className="group/phrase">
      <span role="button" tabIndex={0} onClick={onOpen} {...open} className={PHRASE}>
        {text}
      </span>
      <span role="button" tabIndex={0} aria-label={removeLabel} onClick={onRemove} {...remove} className={REMOVE}>
        <span aria-hidden="true" className={X_MARK} />
      </span>
    </span>
  )
}
