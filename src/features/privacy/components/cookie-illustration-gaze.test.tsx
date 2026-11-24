import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, render } from '@/test/test-utils'
import { CookieIllustration } from './cookie-illustration'

const media = (matches: Record<string, boolean>) =>
  vi.spyOn(window, 'matchMedia').mockImplementation((query: string) => ({ matches: matches[query] ?? false }) as MediaQueryList)

const movePointer = (x: number, y: number) =>
  act(() => {
    window.dispatchEvent(new PointerEvent('pointermove', { clientX: x, clientY: y }))
  })

// jsdom lays nothing out: the cookie's box is at 0,0, so the pointer's position is its direction.
const eyeShift = (container: HTMLElement) => container.querySelector('.tpz-cookie-open g[transform]')?.getAttribute('transform') ?? null

describe('cookie eyes', () => {
  afterEach(() => vi.restoreAllMocks())

  it('follow the pointer on a desktop, a whole pixel at a time', () => {
    media({ '(hover: hover) and (pointer: fine)': true })
    const { container } = render(<CookieIllustration state="whole" />)
    movePointer(500, 0)
    expect(eyeShift(container)).toBe('translate(4 0)')
    movePointer(0, -500)
    expect(eyeShift(container)).toBe('translate(0 -2)')
  })

  it('stay put on touch screens and with reduced motion', () => {
    media({ '(hover: hover) and (pointer: fine)': false })
    const touch = render(<CookieIllustration state="whole" />)
    movePointer(500, 0)
    expect(eyeShift(touch.container)).toBeNull()

    vi.restoreAllMocks()
    media({ '(hover: hover) and (pointer: fine)': true, '(prefers-reduced-motion: reduce)': true })
    const calm = render(<CookieIllustration state="whole" />)
    movePointer(500, 0)
    expect(eyeShift(calm.container)).toBeNull()
  })
})
