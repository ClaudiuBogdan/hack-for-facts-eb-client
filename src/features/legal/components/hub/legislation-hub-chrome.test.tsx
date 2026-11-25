import { act, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LegalSectionNav } from './legislation-hub-chrome'
import { legalHubSections } from './legislation-hub-lib'

/**
 * The landing's pinned bar under a driven IntersectionObserver: entries are delivered by hand, in the batches a
 * browser sends while a reader scrolls, and after each one exactly one section is current. The case the review
 * found (astra-client-6): the next section enters the band while the current one is still in it, then the
 * reader scrolls back and only the next section's exit arrives; the mark must stay on the first.
 */

type Callback = (entries: IntersectionObserverEntry[]) => void

const observers: { callback: Callback; margin: string | undefined; targets: Element[] }[] = []

class DrivenObserver {
  readonly root = null
  readonly rootMargin: string
  readonly thresholds = [0]
  private readonly record: { callback: Callback; margin: string | undefined; targets: Element[] }
  constructor(callback: Callback, options?: IntersectionObserverInit) {
    this.rootMargin = options?.rootMargin ?? ''
    this.record = { callback, margin: options?.rootMargin, targets: [] }
    observers.push(this.record)
  }
  observe(target: Element) {
    this.record.targets.push(target)
  }
  unobserve() {}
  disconnect() {
    this.record.targets = []
  }
  takeRecords() {
    return []
  }
}

/** One batch of entries to the live observer: [section id, whether it crosses the band]. */
function deliver(batch: readonly (readonly [string, boolean])[]) {
  const live = observers[observers.length - 1]
  if (!live) throw new Error('no observer')
  act(() => {
    live.callback(batch.map(([id, isIntersecting]) => ({ target: document.getElementById(id) as Element, isIntersecting }) as IntersectionObserverEntry))
  })
}

function current(): string[] {
  const bar = screen.getByRole('navigation', { name: 'Secțiunile paginii' })
  return within(bar)
    .getAllByRole('link')
    .filter((link) => link.getAttribute('aria-current') === 'location')
    .map((link) => link.textContent ?? '')
}

function renderBar() {
  const sections = legalHubSections()
  render(
    <>
      <LegalSectionNav title="Legislația României" sections={sections} />
      {sections.map((section) => (
        <section key={section.id} id={section.id}>
          {section.label}
        </section>
      ))}
    </>,
  )
}

describe('LegalSectionNav', () => {
  beforeEach(() => {
    observers.length = 0
    vi.stubGlobal('IntersectionObserver', DrivenObserver)
    vi.stubGlobal('innerHeight', 844)
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('draws each section after its hidden icon', () => {
    renderBar()
    const links = within(screen.getByRole('navigation', { name: 'Secțiunile paginii' })).getAllByRole('link')
    expect(links).toHaveLength(6)
    for (const link of links) {
      const first = link.firstElementChild
      expect(first?.tagName.toLowerCase()).toBe('svg')
      expect(first).toHaveAttribute('aria-hidden', 'true')
    }
  })

  it('sets the reading line in pixels from the window height, a quarter down', () => {
    renderBar()
    // 844 px: the band starts at 211 px and is 2 px tall
    expect(observers[observers.length - 1]?.margin).toBe('-211px 0px -631px 0px')
    expect(observers[observers.length - 1]?.targets.map((target) => target.id)).toEqual(['schimbari', 'feluri', 'emitenti', 'ani', 'legaturi', 'monitor'])
  })

  it('keeps one section current through an overlap and an exit in either direction', () => {
    renderBar()
    deliver([['schimbari', true]])
    expect(current()).toEqual(['Modificări'])
    // the next section enters while the first is still in the band: the first, in page order, stays current
    deliver([['feluri', true]])
    expect(current()).toEqual(['Modificări'])
    // the reader turns back before the first has left: only the next one's exit arrives (the old hook cleared it)
    deliver([['feluri', false]])
    expect(current()).toEqual(['Modificări'])
    deliver([['feluri', true]])
    expect(current()).toEqual(['Modificări'])
    deliver([['schimbari', false]])
    expect(current()).toEqual(['Fel'])
    // scrolling back: the first re-enters, then only the next one's exit arrives
    deliver([['schimbari', true]])
    expect(current()).toEqual(['Modificări'])
    deliver([['feluri', false]])
    expect(current()).toEqual(['Modificări'])
    // a batch carrying an exit and an entry together is read as a whole
    deliver([
      ['schimbari', false],
      ['emitenti', true],
    ])
    expect(current()).toEqual(['Emitenți'])
  })

  it('rebuilds the band when the window height changes', () => {
    renderBar()
    const before = observers.length
    vi.stubGlobal('innerHeight', 600)
    act(() => {
      window.dispatchEvent(new Event('resize'))
    })
    expect(observers.length).toBe(before + 1)
    expect(observers[observers.length - 1]?.margin).toBe('-150px 0px -448px 0px')
  })
})
