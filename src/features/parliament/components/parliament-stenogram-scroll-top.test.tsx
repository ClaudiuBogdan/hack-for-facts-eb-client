import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockMatchMedia } from '@/test/helpers'
import { ParliamentStenogramScrollTop } from './parliament-stenogram-scroll-top'

/** jsdom has no layout, so scroll position is set, then announced. */
function scrollTo(y: number) {
  Object.defineProperty(window, 'scrollY', {
    writable: true,
    configurable: true,
    value: y,
  })
  act(() => {
    window.dispatchEvent(new Event('scroll'))
  })
}

function renderButton() {
  return render(
    <>
      <h1 id="reader-top" tabIndex={-1}>
        Ședința
      </h1>
      <ParliamentStenogramScrollTop targetId="reader-top" />
    </>,
  )
}

const button = () =>
  screen.queryByRole('button', { name: 'Înapoi la începutul stenogramei' })

beforeEach(() => {
  // rAF-coalesced, like the rail: run the callback synchronously in tests.
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    callback(0)
    return 1
  })
  vi.stubGlobal('cancelAnimationFrame', vi.fn())
  mockMatchMedia(false)
  window.scrollTo = vi.fn()
  scrollTo(0)
})

afterEach(() => {
  scrollTo(0)
})

describe('the reader scroll-to-top button', () => {
  it('renders NOTHING before meaningful scroll — including on the server', () => {
    // The first render is the SSR render: no scroll position exists yet, so a
    // button in the HTML would flash on every first paint.
    renderButton()
    expect(button()).toBeNull()
  })

  it('appears once the reader is well past the first screen', () => {
    renderButton()
    scrollTo(900)
    expect(button()).toBeInTheDocument()
  })

  it('disappears again on the way back up, taking its tab stop with it', () => {
    // Unmounted, not merely invisible: a hidden-but-focusable button is a trap.
    renderButton()
    scrollTo(900)
    expect(button()).toBeInTheDocument()
    scrollTo(120)
    expect(button()).toBeNull()
  })

  it('scrolls SMOOTHLY and returns focus to the reader heading', async () => {
    renderButton()
    scrollTo(900)

    await userEvent.click(button()!)
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' })
    expect(document.getElementById('reader-top')).toHaveFocus()
  })

  it('jumps instantly when the reader asked for reduced motion', async () => {
    mockMatchMedia(true)
    renderButton()
    scrollTo(900)

    await userEvent.click(button()!)
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'auto' })
  })

  it('is keyboard reachable and activates on Enter', async () => {
    renderButton()
    scrollTo(900)

    await act(async () => button()!.focus())
    expect(button()).toHaveFocus()
    await userEvent.keyboard('{Enter}')
    expect(window.scrollTo).toHaveBeenCalled()
  })

  it('OVERLAPS NOTHING: it is in flow, not pinned to a corner', () => {
    // It used to be a fixed bottom-right FAB, and it landed on the prose, on
    // the intervention rail and on the app's own dock and chat/feedback
    // buttons. Nothing here may position it out of the document flow.
    renderButton()
    scrollTo(900)
    const className = button()!.className
    expect(className).not.toContain('fixed')
    expect(className).not.toContain('absolute')
    expect(className).not.toMatch(/(^|\s|:)(bottom|right)-/)
    expect(className).not.toContain('z-')
    expect(className).toContain('print:hidden')
  })

  it('reads as a left-aligned action in the lane its caller gives it', () => {
    renderButton()
    scrollTo(900)
    expect(button()!.className).toContain('justify-start')
    // The label is always shown: this is a labelled action in a rail, not an
    // icon-only corner button that has to guess whether it has room.
    expect(button()!.textContent).toContain('Înapoi sus')
  })

  it('takes the placement its caller passes, so the lane owns the geometry', () => {
    render(
      <>
        <h1 id="reader-top" tabIndex={-1}>
          Ședința
        </h1>
        <ParliamentStenogramScrollTop
          targetId="reader-top"
          className="hidden lg:inline-flex"
        />
      </>,
    )
    scrollTo(900)
    expect(button()!.className).toContain('lg:inline-flex')
  })
})
