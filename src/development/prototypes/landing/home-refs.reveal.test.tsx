import { useRef } from 'react'
import { render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { RevealStyles, useRevealOnView } from './home-refs.reveal'

/**
 * The contract this file defends is the SSR one.
 *
 * The visual effect is a nicety and reads fine in a browser; what a test can
 * hold onto is the rule that *nothing the server rendered is ever hidden unless
 * it is already off screen*. That rule is easy to break in a way no browser
 * check catches — hide first and reveal on intersection is the obvious
 * implementation, it looks identical once JavaScript has run, and it blanks the
 * page for anyone whose JavaScript did not.
 */

type Callback = (entries: readonly Partial<IntersectionObserverEntry>[]) => void

/** The observers built during a test, so a test can drive their callbacks. */
let observers: { cb: Callback; observed: Element[]; unobserved: Element[] }[] = []

class ControllableObserver {
  readonly observed: Element[] = []
  readonly unobserved: Element[] = []
  constructor(cb: Callback) {
    observers.push({ cb, observed: this.observed, unobserved: this.unobserved })
  }
  observe(el: Element) {
    this.observed.push(el)
  }
  unobserve(el: Element) {
    this.unobserved.push(el)
  }
  disconnect() {}
  takeRecords() {
    return []
  }
}

/** A rect far below the fold — the default for anything reported as not visible. */
const BELOW_THE_FOLD = { top: 5000, bottom: 5200 } as DOMRectReadOnly

/** On screen, but only just: the bottom sliver of a 768px-tall jsdom viewport. */
const BOTTOM_SLIVER = { top: 700, bottom: 880 } as DOMRectReadOnly

/**
 * Reports the given blocks to the observer.
 *
 * The rect is separate from `isIntersecting` on purpose, because that is exactly
 * the case the hook has to get right: the observer can call a block invisible
 * while its rectangle is plainly on screen.
 */
function report(entries: readonly [Element, boolean, DOMRectReadOnly?][]) {
  const observer = observers[0]
  observer.cb(
    entries.map(([target, isIntersecting, rect]) => ({
      target,
      isIntersecting,
      boundingClientRect: rect ?? BELOW_THE_FOLD,
    })),
  )
}

/**
 * What an untouched block reads as. React renders the bare `data-reveal` marker
 * as `data-reveal="true"`, which is the whole reason the hidden state is safe to
 * key on a *value*: no server output can accidentally match `'pending'`.
 */
const UNTOUCHED = 'true'

function Page() {
  const ref = useRef<HTMLDivElement>(null)
  useRevealOnView(ref)
  return (
    <div ref={ref}>
      <RevealStyles />
      <section data-testid="band">
        <span data-reveal data-testid="label">
          label
        </span>
        <h2 data-reveal data-testid="heading">
          heading
        </h2>
        <p data-reveal data-testid="body">
          body
        </p>
      </section>
    </div>
  )
}

const blocks = (el: HTMLElement) => Array.from(el.querySelectorAll<HTMLElement>('[data-reveal]'))
const states = (el: HTMLElement) => blocks(el).map((b) => b.getAttribute('data-reveal'))
const delays = (el: HTMLElement) => blocks(el).map((b) => b.style.getPropertyValue('--tpz-reveal-delay'))

beforeEach(() => {
  observers = []
  vi.stubGlobal('IntersectionObserver', ControllableObserver)
  vi.mocked(window.matchMedia).mockImplementation(
    (query: string) => ({ matches: false, media: query }) as MediaQueryList,
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('reveal on view', () => {
  it('renders nothing that would hide the text, so the server output stands alone', () => {
    const { getByTestId } = render(<Page />)

    // Before the observer says anything, every block carries only the inert
    // marker. This is exactly the markup the server produces.
    expect(states(getByTestId('band'))).toEqual([UNTOUCHED, UNTOUCHED, UNTOUCHED])
  })

  it('watches every block, not the section around them', () => {
    const { getByTestId } = render(<Page />)

    // Watching a container would fire its whole contents the moment its top
    // edge appeared, which for a tall section settles its lower half off
    // screen.
    expect(observers[0].observed).toEqual(blocks(getByTestId('band')))
  })

  it('hides only what is off screen, and never what is already in view', () => {
    const { getByTestId } = render(<Page />)
    const [label, heading, body] = blocks(getByTestId('band'))

    report([
      [label, true],
      [heading, false],
      [body, false],
    ])

    // The block in view goes straight to its final state. It is never 'pending',
    // so its computed opacity never changes and no transition runs — which is
    // what stops the page flashing on load.
    expect(states(getByTestId('band'))).toEqual(['shown', 'pending', 'pending'])
  })

  it('shows a block the observer calls invisible but the reader can see', () => {
    const { getByTestId } = render(<Page />)
    const [label] = blocks(getByTestId('band'))

    // This is what a bottom root margin does: it shrinks the observer's idea of
    // the viewport, so a block sitting in that band is reported as not
    // intersecting while being plainly on screen. Hiding it there erases text
    // the server had already painted, and no further callback comes to undo it.
    report([[label, false, BOTTOM_SLIVER]])

    expect(label.getAttribute('data-reveal')).toBe('shown')
    expect(observers[0].unobserved).toEqual([label])
  })

  it('staggers blocks that arrive together, in document order', () => {
    const { getByTestId } = render(<Page />)
    const [label, heading, body] = blocks(getByTestId('band'))

    // Reported back to front, to prove the order comes from the document and
    // not from the observer.
    report([
      [body, true],
      [heading, true],
      [label, true],
    ])

    expect(states(getByTestId('band'))).toEqual(['shown', 'shown', 'shown'])
    // Every delay carries the entrance beat; the stagger is the 70ms on top.
    expect(delays(getByTestId('band'))).toEqual(['140ms', '210ms', '280ms'])
  })

  it('gives a block arriving on its own the entrance beat and nothing more', () => {
    const { getByTestId } = render(<Page />)
    const [, heading] = blocks(getByTestId('band'))

    report([[heading, true]])

    // Each arrival is its own sequence. Counting from a page-wide index would
    // leave a block near the bottom waiting on a delay measured in seconds.
    expect(heading.style.getPropertyValue('--tpz-reveal-delay')).toBe('140ms')
  })

  it('keeps the entrance beat short enough that a block cannot sit blank', () => {
    const { getByTestId } = render(<Page />)
    const [label] = blocks(getByTestId('band'))

    report([[label, false]])
    report([[label, true]])

    // The beat is a delay, not a deeper trigger line. That distinction is the
    // whole point: a trigger held until a block is further into the viewport
    // leaves it hidden on screen with no callback coming, which is how the old
    // `-12%` root margin erased text. A delay always ends.
    const delay = Number.parseInt(label.style.getPropertyValue('--tpz-reveal-delay'), 10)
    expect(delay).toBeGreaterThan(0)
    expect(delay).toBeLessThanOrEqual(250)
  })

  it('stops watching a block once it has arrived', () => {
    const { getByTestId } = render(<Page />)
    const [label] = blocks(getByTestId('band'))

    report([[label, false]])
    expect(observers[0].unobserved).toEqual([])

    report([[label, true]])
    expect(observers[0].unobserved).toEqual([label])
  })

  it('leaves the text alone entirely when motion is not wanted', () => {
    vi.mocked(window.matchMedia).mockImplementation(
      (query: string) =>
        ({ matches: query.includes('prefers-reduced-motion'), media: query }) as MediaQueryList,
    )

    const { getByTestId } = render(<Page />)

    // No observer is built at all, so there is no path by which a block could
    // be hidden — the stylesheet's reduced-motion rule is a second line of
    // defence, not the only one.
    expect(observers).toEqual([])
    expect(states(getByTestId('band'))).toEqual([UNTOUCHED, UNTOUCHED, UNTOUCHED])
  })

  it('keys the hidden state on a value the server never emits', () => {
    render(<Page />)
    const css = document.querySelector('style')?.textContent ?? ''

    // The hidden rule matches data-reveal='pending'. React renders the bare
    // marker as data-reveal="true", so server output cannot match it however
    // the page is authored.
    expect(css).toContain("[data-reveal='pending']")
    expect(css).not.toMatch(/\[data-reveal]\s*\{[^}]*opacity:\s*0/)
  })
})
