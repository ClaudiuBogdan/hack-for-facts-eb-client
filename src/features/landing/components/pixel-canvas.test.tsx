import { fireEvent, render } from '@testing-library/react'
import { useLayoutEffect, useRef } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fieldCells, fieldGeometry } from '@/features/landing/lib/pixel-art'
import { INTRO_DELAY_MS } from '@/features/landing/lib/field-motion'
import { MARGIN_FIELD_QUERY } from '@/features/landing/lib/margin-field'
import { PixelFieldCanvas, useCanvasFieldMotion } from './pixel-canvas'

// The field builder, watched: building it is the cost the hidden field must not pay.
vi.mock('@/features/landing/lib/pixel-art', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/landing/lib/pixel-art')>()
  return { ...actual, fieldCells: vi.fn(actual.fieldCells) }
})

/**
 * The margin field must cost nothing where it is not shown: below its
 * breakpoint it builds no field, reads no layout and draws nothing. These
 * tests hold that, and that it still appears when a window is widened.
 */

/**
 * A media query whose answer a test can change, firing `change` like a browser.
 * As in a browser, every `matchMedia` call returns its own list with its own
 * listeners, kept by event type, so a listener removed from the wrong list, or
 * added for the wrong event, is still caught.
 */
function controllableQuery(initial: boolean) {
  type Listener = (event: MediaQueryListEvent) => void
  let matches = initial
  const lists: Map<string, Set<Listener>>[] = []
  window.matchMedia = vi.fn((query: string) => {
    if (query !== MARGIN_FIELD_QUERY) return { matches: false, media: query } as MediaQueryList
    const byType = new Map<string, Set<Listener>>()
    lists.push(byType)
    return {
      get matches() {
        return matches
      },
      media: query,
      addEventListener: (type: string, listener: Listener) => byType.set(type, (byType.get(type) ?? new Set()).add(listener)),
      removeEventListener: (type: string, listener: Listener) => byType.get(type)?.delete(listener),
    } as unknown as MediaQueryList
  })
  return {
    set(next: boolean) {
      matches = next
      for (const byType of lists) for (const listener of [...(byType.get('change') ?? [])]) listener({ matches: next } as MediaQueryListEvent)
    },
    listenerCount: () => lists.reduce((sum, byType) => sum + [...byType.values()].reduce((n, set) => n + set.size, 0), 0),
  }
}

/** Enough of a 2D context for the field's drawing calls, pointing back at its canvas as a real one does. */
function stubContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  return {
    canvas,
    setTransform: vi.fn(),
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    scale: vi.fn(),
  } as unknown as CanvasRenderingContext2D
}

const originalMatchMedia = window.matchMedia
let getContext: ReturnType<typeof vi.spyOn>
let getClientRects: ReturnType<typeof vi.spyOn>
let getBoundingClientRect: ReturnType<typeof vi.spyOn>
let clientWidth: ReturnType<typeof vi.spyOn>

/** Every way the field could read layout. On mount it must use none of them. */
const layoutReads = () => getClientRects.mock.calls.length + getBoundingClientRect.mock.calls.length + clientWidth.mock.calls.length

/** The canvases sit side by side as in the hero: the first at x 0, the second at x 1200. */
function canvasRect(this: Element): DOMRect {
  const left = [...document.querySelectorAll('canvas')].indexOf(this as HTMLCanvasElement) === 1 ? 1200 : 0
  return { x: left, y: 0, left, top: 0, right: left + 720, bottom: 624, width: 720, height: 624, toJSON: () => ({}) }
}

beforeEach(() => {
  // One context per canvas, as a browser returns the same context on every call.
  const contexts = new WeakMap<HTMLCanvasElement, CanvasRenderingContext2D>()
  getContext = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
    if (!contexts.has(this)) contexts.set(this, stubContext(this))
    return contexts.get(this) as never
  })
  vi.mocked(fieldCells).mockClear()
  getClientRects = vi.spyOn(Element.prototype, 'getClientRects')
  getBoundingClientRect = vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(canvasRect)
  clientWidth = vi.spyOn(Element.prototype, 'clientWidth', 'get')
})

afterEach(() => {
  // Restored one by one: a spy created again on the same method would otherwise keep its calls.
  getContext.mockRestore()
  getClientRects.mockRestore()
  getBoundingClientRect.mockRestore()
  clientWidth.mockRestore()
  window.matchMedia = originalMatchMedia
  vi.unstubAllGlobals()
})

const canvasOf = (container: HTMLElement) => container.querySelector('canvas') as HTMLCanvasElement

/** The stub context of a canvas, to read what was drawn into it. */
const contextOf = (canvas: HTMLCanvasElement) => canvas.getContext('2d') as unknown as { readonly fillRect: ReturnType<typeof vi.fn> }

describe('PixelFieldCanvas', () => {
  it('builds no field while hidden, and builds it on widening', () => {
    // 24px is a module no other test here builds, so the packed-field cache is
    // cold for it and a build cannot hide behind a cached one.
    const query = controllableQuery(false)
    render(<PixelFieldCanvas edge="left" cell={24} />)

    expect(fieldCells).not.toHaveBeenCalled()
    query.set(true)
    expect(fieldCells).toHaveBeenCalledWith('left', 24)
  })

  it('builds and draws nothing while the field is hidden', () => {
    controllableQuery(false)
    const { container } = render(<PixelFieldCanvas edge="left" cell={12} />)

    expect(getContext).not.toHaveBeenCalled()
    expect(layoutReads()).toBe(0)
    expect(canvasOf(container).width).toBe(300)
  })

  it('draws the resting field when shown at mount, without measuring the page', () => {
    controllableQuery(true)
    const { container } = render(<PixelFieldCanvas edge="left" cell={12} />)

    const { columns } = fieldGeometry(12)
    expect(getContext).toHaveBeenCalledTimes(1)
    expect(canvasOf(container).width).toBe(Math.round(columns * 12 * (window.devicePixelRatio || 1)))
    expect(layoutReads()).toBe(0)
    // The resting field is on the canvas before any animation frame runs.
    expect(contextOf(canvasOf(container)).fillRect).toHaveBeenCalled()
  })

  it('draws it when the window widens past the breakpoint', () => {
    const query = controllableQuery(false)
    render(<PixelFieldCanvas edge="left" cell={12} />)

    query.set(true)
    expect(getContext).toHaveBeenCalledTimes(1)
  })

  it('builds nothing on a density change while hidden', () => {
    controllableQuery(false)
    render(<PixelFieldCanvas edge="left" cell={12} />)

    vi.stubGlobal('devicePixelRatio', 2)
    window.dispatchEvent(new Event('resize'))
    expect(getContext).not.toHaveBeenCalled()
  })

  it('stops listening for the breakpoint when unmounted', () => {
    const query = controllableQuery(false)
    const { unmount } = render(<PixelFieldCanvas edge="left" cell={12} />)

    expect(query.listenerCount()).toBe(1)
    unmount()
    expect(query.listenerCount()).toBe(0)
  })
})

/**
 * The hero's arrangement: a host carrying the motion, with a field on each side.
 * `afterCanvases` runs in a layout effect after both canvases have run theirs,
 * and before the motion hook's passive effect.
 */
function FieldHost({ afterCanvases }: { readonly afterCanvases?: () => void }) {
  const ref = useRef<HTMLElement>(null)
  useCanvasFieldMotion(ref, { cell: 12 })
  return (
    <section ref={ref} data-testid="host">
      <PixelFieldCanvas edge="left" cell={12} />
      <PixelFieldCanvas edge="right" cell={12} />
      <AfterCanvases run={afterCanvases} />
    </section>
  )
}

function AfterCanvases({ run }: { readonly run?: () => void }) {
  useLayoutEffect(() => run?.(), [run])
  return null
}

describe('useCanvasFieldMotion', () => {
  /** A fixed clock, so every frame lands at an exact offset into its animation. */
  const NOW = 1_000
  let pending: FrameRequestCallback[]
  let requestFrame: ReturnType<typeof vi.spyOn>
  let clock: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    pending = []
    requestFrame = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => pending.push(callback))
    clock = vi.spyOn(performance, 'now').mockReturnValue(NOW)
  })

  afterEach(() => {
    requestFrame.mockRestore()
    clock.mockRestore()
  })

  /** Run the scheduled frames at `at` (default: far past any animation's end). */
  const runFrames = (at = NOW + 60_000) => {
    for (const callback of pending.splice(0)) callback(at)
  }

  /** The cells of a canvas's latest frame, as `x,y,w,h`: what it drew since its last `clearRect`. */
  const lastFrame = (canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d') as unknown as { readonly clearRect: ReturnType<typeof vi.fn>; readonly fillRect: ReturnType<typeof vi.fn> }
    const cleared = Math.max(0, ...ctx.clearRect.mock.invocationCallOrder)
    return ctx.fillRect.mock.calls.filter((_, i) => (ctx.fillRect.mock.invocationCallOrder[i] ?? 0) > cleared).map((call) => call.join(','))
  }

  /** Mount the hero's two fields and keep each one's resting frame to compare against. */
  const mountField = (props: { readonly afterCanvases?: () => void } = {}) => {
    const view = render(<FieldHost {...props} />)
    const [left, right] = [...view.container.querySelectorAll('canvas')]
    const rest = left.width === 300 ? null : { left: lastFrame(left), right: lastFrame(right) }
    return { ...view, left, right, rest }
  }

  it.each([true, false])('reads no layout on mount (shown: %s)', (shown) => {
    controllableQuery(shown)
    mountField()
    expect(layoutReads()).toBe(0)
  })

  it('plays the intro from the resting field and settles back on it', () => {
    controllableQuery(true)
    const { left, right, rest } = mountField()
    expect(requestFrame).toHaveBeenCalledTimes(1)

    runFrames(NOW + INTRO_DELAY_MS + 400)
    expect(lastFrame(left)).not.toEqual(rest?.left)

    runFrames()
    expect(pending).toHaveLength(0)
    expect(lastFrame(left)).toEqual(rest?.left)
    expect(lastFrame(right)).toEqual(rest?.right)
  })

  it('plays no intro when the field is hidden at load', () => {
    controllableQuery(false)
    mountField()
    expect(requestFrame).not.toHaveBeenCalled()
  })

  it('ripples on a click once a narrow window has been widened, without playing the intro', () => {
    const query = controllableQuery(false)
    const { getByTestId, left } = mountField()
    query.set(true)
    const rest = lastFrame(left)
    expect(rest.length).toBeGreaterThan(0)
    expect(requestFrame).not.toHaveBeenCalled()

    fireEvent.pointerDown(getByTestId('host'), { button: 0, clientX: 40, clientY: 40 })
    expect(requestFrame).toHaveBeenCalledTimes(1)
    runFrames(NOW + 300)
    expect(lastFrame(left)).not.toEqual(rest)
  })

  it('starts no intro when the window narrows before the motion starts', () => {
    const query = controllableQuery(true)
    mountField({ afterCanvases: () => query.set(false) })
    expect(requestFrame).not.toHaveBeenCalled()
  })

  it('settles on the resting field and stops when the window narrows mid-animation', () => {
    const query = controllableQuery(true)
    const { left, right, rest } = mountField()
    runFrames(NOW + INTRO_DELAY_MS + 400)
    expect(lastFrame(left)).not.toEqual(rest?.left)

    query.set(false)
    runFrames(NOW + INTRO_DELAY_MS + 420)
    expect(pending).toHaveLength(0)
    expect(lastFrame(left)).toEqual(rest?.left)
    expect(lastFrame(right)).toEqual(rest?.right)
  })

  it('ripples on the side the click lands on, and leaves the far side at rest', () => {
    controllableQuery(true)
    const { getByTestId, left, right, rest } = mountField()
    runFrames()

    const frameAfterClickAt = (clientX: number) => {
      fireEvent.pointerDown(getByTestId('host'), { button: 0, clientX, clientY: 40 })
      runFrames(NOW + 300)
      const frame = { left: lastFrame(left), right: lastFrame(right) }
      runFrames()
      return frame
    }
    const nearLeft = frameAfterClickAt(40)
    expect(nearLeft.left).not.toEqual(rest?.left)
    expect(nearLeft.right).toEqual(rest?.right)

    const nearRight = frameAfterClickAt(1240)
    expect(nearRight.right).not.toEqual(rest?.right)
    expect(nearRight.left).toEqual(rest?.left)
  })

  it('schedules nothing for a click once the window is narrowed', () => {
    const query = controllableQuery(true)
    const { getByTestId } = mountField()
    runFrames()
    query.set(false)

    fireEvent.pointerDown(getByTestId('host'), { button: 0 })
    expect(requestFrame).toHaveBeenCalledTimes(1)
  })
})
