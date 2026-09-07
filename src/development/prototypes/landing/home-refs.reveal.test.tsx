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
 * Reports the given groups to the observer.
 *
 * The rect is separate from `isIntersecting` on purpose, because that is exactly
 * the case the hook has to get right: the observer can call a group invisible
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

function Page() {
  const ref = useRef<HTMLDivElement>(null)
  useRevealOnView(ref)
  return (
    <div ref={ref}>
      <RevealStyles />
      <section data-reveal-group data-testid="near">
        <span data-reveal>label</span>
        <h2 data-reveal>heading</h2>
        <p data-reveal>body</p>
      </section>
      <section data-reveal-group data-testid="far">
        <h2 data-reveal>far heading</h2>
        <p data-reveal>far body</p>
      </section>
    </div>
  )
}

/**
 * What an untouched block reads as. React renders the bare `data-reveal` marker
 * as `data-reveal="true"`, which is the whole reason the hidden state is safe to
 * key on a *value*: no server output can accidentally match `'pending'`.
 */
const UNTOUCHED = 'true'

const states = (el: HTMLElement) =>
  Array.from(el.querySelectorAll('[data-reveal]')).map((b) => b.getAttribute('data-reveal'))

const delays = (el: HTMLElement) =>
  Array.from(el.querySelectorAll<HTMLElement>('[data-reveal]')).map(
    (b) => b.style.getPropertyValue('--tpz-reveal-delay'),
  )

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
    expect(states(getByTestId('near'))).toEqual([UNTOUCHED, UNTOUCHED, UNTOUCHED])
    expect(states(getByTestId('far'))).toEqual([UNTOUCHED, UNTOUCHED])
  })

  it('hides only what is off screen, and never what is already in view', () => {
    const { getByTestId } = render(<Page />)
    const near = getByTestId('near')
    const far = getByTestId('far')

    report([
      [near, true],
      [far, false],
    ])

    // The group in view goes straight to its final state. It is never 'pending',
    // so its computed opacity never changes and no transition runs — which is
    // what stops the page flashing on load.
    expect(states(near)).toEqual(['shown', 'shown', 'shown'])
    expect(states(far)).toEqual(['pending', 'pending'])
  })

  it('reveals a group when it arrives, staggered in document order', () => {
    const { getByTestId } = render(<Page />)
    const far = getByTestId('far')

    report([[far, false]])
    expect(states(far)).toEqual(['pending', 'pending'])

    report([[far, true]])
    expect(states(far)).toEqual(['shown', 'shown'])
    expect(delays(far)).toEqual(['0ms', '70ms'])
  })

  it('staggers each group from zero rather than from the page', () => {
    const { getByTestId } = render(<Page />)

    report([[getByTestId('near'), true]])

    // A group is its own sequence. Continuing one counter down the page would
    // leave the last block waiting on a delay measured in seconds.
    expect(delays(getByTestId('near'))).toEqual(['0ms', '70ms', '140ms'])
  })

  it('shows a group the observer calls invisible but the reader can see', () => {
    const { getByTestId } = render(<Page />)
    const far = getByTestId('far')

    // This is what a bottom root margin does: it shrinks the observer's idea of
    // the viewport, so a group sitting in that band is reported as not
    // intersecting while being plainly on screen. Hiding it there erases text
    // the server had already painted, and no further callback comes to undo it.
    report([[far, false, BOTTOM_SLIVER]])

    expect(states(far)).toEqual(['shown', 'shown'])
    expect(observers[0].unobserved).toEqual([far])
  })

  it('stops watching a group once it has arrived', () => {
    const { getByTestId } = render(<Page />)
    const far = getByTestId('far')

    report([[far, false]])
    expect(observers[0].unobserved).toEqual([])

    report([[far, true]])
    expect(observers[0].unobserved).toEqual([far])
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
    expect(states(getByTestId('near'))).toEqual([UNTOUCHED, UNTOUCHED, UNTOUCHED])
    expect(states(getByTestId('far'))).toEqual([UNTOUCHED, UNTOUCHED])
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
