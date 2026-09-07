import type { ReactNode } from 'react'

/**
 * Group headings that decrypt themselves the first time you reach them.
 *
 * Modelled on mega.dev's CTA, measured off the live site rather than copied by
 * eye. Their `Become MEGA Dev` passes through `M03LSS SMUW Z#J` and
 * `BecomI 6@WT Z94` before settling, which gives three rules worth keeping:
 * length and space positions are preserved exactly, the text resolves
 * left-to-right rather than at random, and the substitute characters are plain
 * uppercase ASCII with a few symbols. Under `prefers-reduced-motion: reduce`
 * their page performs no substitutions at all — one state, straight to the
 * final string — which is the behaviour copied here.
 *
 * Three things this does differently, all for the same reason as the reveal in
 * `home-refs.reveal.tsx`: the words are the product.
 *
 * 1. **The scrambled state never reaches the server.** The markup ships the real
 *    heading twice, and only the copy already hidden from assistive technology
 *    is ever rewritten, client-side, after the group comes into view. No
 *    JavaScript means the real heading, not a cipher.
 * 2. **Screen readers never hear the cipher.** An `sr-only` copy carries the
 *    real text and the animated copy is `aria-hidden`, so the accessible name of
 *    the heading — which the section's `aria-labelledby` points at — stays the
 *    heading throughout. This is mega.dev's own structure; it is the one part of
 *    their implementation worth copying verbatim.
 * 3. **Every substitute is the width of the character it stands in for.** This
 *    is the whole reason the effect can run on proportional text at all.
 *    Substituting freely from an uppercase alphabet makes the string up to 74%
 *    wider than `Investiții publice` — measured — which in a ruled grid is
 *    obvious, and on a narrow column wraps the title and shoves the blurb below
 *    it down the page.
 *
 *    The first fix here pinned the box to its real width and clipped the
 *    overspill. That held the width — 0 of 20 elements changed — but it was the
 *    wrong fix: pinning means `display: inline-block` and `white-space: nowrap`,
 *    and a title that legitimately wrapped onto two lines was forced onto one.
 *    Seven of twenty elements changed height, and a 390px viewport scored 1.78
 *    cumulative layout shift. Holding one dimension by force broke the other.
 *
 *    So the alphabet is chosen per character instead. Candidates are measured
 *    once per font on a canvas and bucketed by advance width; a character is
 *    only ever replaced by one that occupies the same space. Nothing is pinned,
 *    nothing is clipped, wrapping behaves exactly as it does for the real text,
 *    and there is no box to restore afterwards.
 */

/** Marks the copy that may be rewritten. Only ever on an `aria-hidden` span. */
export const SCRAMBLE_ATTR = 'data-scramble'

/**
 * The pool substitutes are drawn from.
 *
 * Uppercase leads, as on mega.dev, but lowercase is here too — not for looks,
 * but because a narrow character like `i` has no uppercase match anywhere near
 * its width, and a pool that cannot match a width has to widen the text to say
 * anything at all. No letter carrying a Romanian diacritic appears: a cipher
 * that invents `ș` or `ț` reads as a rendering fault rather than as noise. Real
 * diacritics still arrive the moment their own character resolves, because
 * resolving copies the source string rather than transliterating it.
 */
const POOL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789$+#@/=%&*'

/** How far apart two characters may be, in pixels, and still stand in. */
const WIDTH_TOLERANCE_PX = 0.5

type WidthIndex = ReadonlyMap<string, readonly string[]>

type FontIndex = {
  /** Every candidate substitute, measured once in this font. */
  readonly pool: readonly { readonly character: string; readonly width: number }[]
  /** Substitutes per character, filled in as characters are encountered. */
  readonly byCharacter: Map<string, readonly string[]>
}

/**
 * One index per font, extended as new characters turn up.
 *
 * Extended, and not merely cached: keying on the font alone and returning
 * whatever the first caller happened to need is a bug that hides well. Every
 * entry title shares one font, so `Buget național` built the index, and `PNRR`
 * then asked it for `P`, `N` and `R` — none of which that title contains. Each
 * missing character took the "nothing close enough, stand in for itself" path,
 * so `PNRR` substituted itself at every position and sat there, the one title
 * on the page that never decrypted, with no error to show for it.
 */
const indexByFont = new Map<string, FontIndex>()
let measuringContext: CanvasRenderingContext2D | null = null

/** The CSS `font` shorthand a canvas needs, assembled from computed style. */
function fontOf(element: HTMLElement) {
  const style = getComputedStyle(element)
  // The `font` shorthand is empty in some engines when a longhand is unset, so
  // it is rebuilt rather than read.
  return `${style.fontStyle} ${style.fontWeight} ${style.fontSize} / ${style.lineHeight} ${style.fontFamily}`
}

/**
 * For each character that might need replacing, the substitutes that take up
 * the same room.
 *
 * Measured on a canvas rather than by inserting probe nodes, so building the
 * index costs no layout. It is built once per font and shared by every element
 * using it — the twenty titles on this page resolve to two fonts.
 */
function widthIndexFor(font: string, needed: string): WidthIndex {
  measuringContext ??= document.createElement('canvas').getContext('2d')
  const context = measuringContext
  if (!context) return new Map()

  // The context is shared between fonts, so it is re-pointed on every call
  // rather than only when the index is created.
  context.font = font

  let index = indexByFont.get(font)
  if (!index) {
    index = {
      pool: [...POOL].map((character) => ({
        character,
        width: context.measureText(character).width,
      })),
      byCharacter: new Map(),
    }
    indexByFont.set(font, index)
  }

  for (const character of new Set(needed)) {
    if (character === ' ' || index.byCharacter.has(character)) continue
    const width = context.measureText(character).width
    let matches = index.pool
      .filter((candidate) => Math.abs(candidate.width - width) <= WIDTH_TOLERANCE_PX)
      .map((candidate) => candidate.character)
    // Nothing close enough — an unusually wide or narrow glyph. Standing it in
    // for itself keeps the width exact; that one position simply does not
    // scramble, which is invisible among the ones that do.
    if (matches.length === 0) matches = [character]
    index.byCharacter.set(character, matches)
  }
  return index.byCharacter
}

/**
 * Long enough to read as decryption, short enough to be over before it bores.
 *
 * Was 900ms, which turned out to be tuned for the wrong thing: at 25 rewrites a
 * second it is the *number of substitutions the eye gets to see* that makes the
 * effect read as working rather than as a flicker, and 900ms only buys 22 of
 * them across a whole heading. At 1200 it is 30, and the resolve front moves
 * slowly enough that you can follow it left to right instead of noticing that
 * the word changed.
 */
const DURATION_MS = 1200

/**
 * How often the text is rewritten. Every frame would be four times the cost for
 * no visible gain — at 25 updates a second the substitutions already blur
 * together, and each one is a layout and a paint on that element, which is the
 * one genuinely expensive thing this effect does.
 */
const TICK_MS = 40

/**
 * How long a heading sits encrypted before it starts resolving.
 *
 * The decryption is the point of the effect and it was happening in the last
 * 140px of the screen, where nobody is looking — by the time the heading had
 * travelled somewhere the eye actually rests, it had already read true. This
 * holds the cipher while the heading climbs, so the resolve happens where it
 * can be watched.
 *
 * It delays the *resolve* and not the cipher, which matters more than it
 * sounds. The obvious way to delay this is to push the whole job back, but the
 * real text is on screen until a job starts — that is the SSR contract — so a
 * later start means the reader watches clear text turn into noise. Applying the
 * cipher on the reveal's own beat instead puts it under the fade, which is
 * still running: the heading is at zero opacity when it turns to noise and
 * arrives already encrypted. There is nothing to see turning.
 */
const HOLD_MS = 380

type Job = {
  readonly element: HTMLElement
  readonly target: string
  /** When the real text gives way to noise — under the fade, so it is unseen. */
  readonly cipherAt: number
  /** When the noise starts resolving, `HOLD_MS` later. */
  readonly start: number
  readonly widths: WidthIndex
}

/**
 * Every heading currently decrypting, driven by one timer for the whole page.
 *
 * One `requestAnimationFrame` loop rather than one per heading: four headings
 * would otherwise mean four independent callbacks waking the main thread on
 * their own schedules. The loop is only alive while the set is non-empty, so a
 * settled page schedules nothing at all.
 */
const running = new Set<Job>()
let frame = 0
let lastTick = 0

/** The string as it stands partway through, with the head at `progress`. */
function partial(target: string, progress: number, widths: WidthIndex) {
  const head = progress * target.length
  let out = ''
  for (let index = 0; index < target.length; index += 1) {
    const character = target[index]
    // Spaces hold their place: the shape of the phrase stays legible while the
    // letters are still noise, which is what makes it read as one heading
    // resolving rather than as a block of static.
    if (index < head || character === ' ') {
      out += character
      continue
    }
    const matches = widths.get(character)
    out += matches ? matches[(Math.random() * matches.length) | 0] : character
  }
  return out
}

function tick(now: number) {
  frame = 0
  if (now - lastTick >= TICK_MS) {
    lastTick = now
    for (const job of running) {
      // Waiting its turn in the stagger. The real text is already on screen and
      // is left there, so a queued element reads as untouched rather than as a
      // gap — which is also the order mega.dev goes in: real, cipher, real.
      if (now < job.cipherAt) continue
      const progress = (now - job.start) / DURATION_MS
      // One write per element per tick. Writing per character would mean a
      // node per character and a layout for each.
      //
      // Held: rewritten as fresh noise on every tick rather than frozen on one
      // string. A still cipher reads as a rendering fault; one that keeps
      // turning over reads as something working on it.
      job.element.textContent =
        progress >= 1
          ? job.target
          : partial(job.target, progress > 0 ? progress : 0, job.widths)
      if (progress >= 1) running.delete(job)
    }
  }
  if (running.size > 0) frame = requestAnimationFrame(tick)
}

/** Encrypts one element `delay` milliseconds from now, resolving `HOLD_MS` after that. */
function startOne(element: HTMLElement, delay: number) {
  if (element.dataset.scrambleDone === 'true') return
  const target = element.textContent ?? ''
  if (target.trim() === '') return
  element.dataset.scrambleDone = 'true'
  const cipherAt = performance.now() + delay
  running.add({
    element,
    target,
    cipherAt,
    start: cipherAt + HOLD_MS,
    widths: widthIndexFor(fontOf(element), target),
  })
}

/**
 * Encrypts every heading inside `block` on the reveal's beat, `delay`
 * milliseconds from now, and resolves them `HOLD_MS` after that.
 *
 * Driven by the reveal's arrival rather than by an observer of its own, which is
 * what this had first. Two observers meant two ideas of when a thing is on
 * screen: the reveal's carries a 140px offset and a safety clock, and this one
 * carried neither, so a heading began decrypting at the very edge of the screen
 * while the cell around it was still waiting to fade. One notion of "arrived",
 * one stagger, one reduced-motion gate.
 */
export function scrambleWithin(block: Element, delay: number) {
  if (typeof window === 'undefined') return
  // Checked here as well as by the caller, so the module is honest on its own
  // rather than inheriting a promise from whatever happens to trigger it.
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

  for (const element of block.querySelectorAll<HTMLElement>(`[${SCRAMBLE_ATTR}]`)) {
    startOne(element, delay)
  }
  if (running.size > 0 && frame === 0) frame = requestAnimationFrame(tick)
}

/** Stops everything and leaves every heading reading true. */
export function stopScrambling() {
  if (frame !== 0) cancelAnimationFrame(frame)
  frame = 0
  // Put the real text back, so a heading interrupted midway is left readable
  // rather than frozen as a cipher.
  for (const job of running) job.element.textContent = job.target
  running.clear()
}

/**
 * A heading that can decrypt itself: the real text twice, once for reading and
 * once for looking at.
 *
 * The `sr-only` copy is what assistive technology gets, and it is never
 * touched. The visible copy is `aria-hidden`, so a screen reader hears the
 * heading once, not twice, and never hears the cipher.
 */
export function ScrambleText({ children }: { readonly children: string }) {
  return (
    <>
      <span className="sr-only">{children}</span>
      {/* Server-rendered as the real heading. If the script never runs, this is
          simply the heading, drawn twice and announced once. */}
      <span aria-hidden="true" {...{ [SCRAMBLE_ATTR]: '' }}>
        {children as ReactNode}
      </span>
    </>
  )
}
