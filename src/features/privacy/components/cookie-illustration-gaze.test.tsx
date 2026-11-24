import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, render } from '@/test/test-utils'
import { CookieIllustration } from './cookie-illustration'

const media = (matches: Record<string, boolean>) =>
  vi.spyOn(window, 'matchMedia').mockImplementation((query: string) => ({ matches: matches[query] ?? false }) as MediaQueryList)

const movePointer = (x: number, y: number) =>
  act(() => {
    window.dispatchEvent(new PointerEvent('pointermove', { clientX: x, clientY: y }))
  })

// jsdom lays nothing out: the cookie's box is at 0,0 and 0 wide, so any offset is "beyond it".
const glint = (container: HTMLElement) => container.querySelector('[data-cookie-glint]')?.getAttribute('d')
const TOP_LEFT = 'M40 44h4v4h-4ZM64 44h4v4h-4Z'

describe('cookie eyes', () => {
  afterEach(() => vi.restoreAllMocks())

  it('turn their glint toward the pointer on a desktop; the eyes stay put', () => {
    media({ '(hover: hover) and (pointer: fine)': true })
    const { container } = render(<CookieIllustration state="whole" />)
    expect(glint(container)).toBe(TOP_LEFT)
    movePointer(500, 0)
    expect(glint(container)).toBe('M44 44h4v4h-4ZM68 44h4v4h-4Z')
    movePointer(500, 500)
    expect(glint(container)).toBe('M44 48h4v4h-4ZM68 48h4v4h-4Z')
    movePointer(-500, -500)
    expect(glint(container)).toBe(TOP_LEFT)
  })

  it('keep the glint top-left on touch screens and with reduced motion', () => {
    media({ '(hover: hover) and (pointer: fine)': false })
    const touch = render(<CookieIllustration state="whole" />)
    movePointer(500, 500)
    expect(glint(touch.container)).toBe(TOP_LEFT)

    vi.restoreAllMocks()
    media({ '(hover: hover) and (pointer: fine)': true, '(prefers-reduced-motion: reduce)': true })
    const calm = render(<CookieIllustration state="whole" />)
    movePointer(500, 500)
    expect(glint(calm.container)).toBe(TOP_LEFT)
  })
})
