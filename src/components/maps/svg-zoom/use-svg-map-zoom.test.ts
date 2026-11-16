import type { PointerEvent } from 'react'
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useSvgMapZoom } from './use-svg-map-zoom'
import { gridPointAt, type ViewBox } from './view-box'

/**
 * The engine's state machine: one owner of the map's movement at a time, and
 * every movement settled however it ends. Each case is a failure a review
 * found (2026-11-16) or a promise the hook's comment makes.
 */

const FULL: ViewBox = [0, 0, 4000, 2000]
const RECT = { left: 0, top: 0, width: 400, height: 200, right: 400, bottom: 200, x: 0, y: 0, toJSON: () => ({}) }

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame', 'performance'] })
})
afterEach(() => {
  vi.useRealTimers()
})

function setup({ enabled = true, initial = FULL }: { readonly enabled?: boolean; readonly initial?: ViewBox } = {}) {
  const frame = document.createElement('div')
  frame.getBoundingClientRect = () => RECT
  Object.defineProperty(frame, 'clientWidth', { value: RECT.width })
  frame.setPointerCapture = vi.fn()
  const surface = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  frame.appendChild(surface)
  const onGesture = vi.fn()
  const onWholeCountry = vi.fn()
  const hook = renderHook(() => useSvgMapZoom({ frameRef: { current: frame }, surfaceRef: { current: surface }, full: FULL, initial, enabled, onGesture, onWholeCountry }))
  const run = (ms: number) => act(() => void vi.advanceTimersByTime(ms))
  const wheel = (deltaY: number, at = { x: 100, y: 100 }) =>
    act(() => void frame.dispatchEvent(new WheelEvent('wheel', { deltaY, clientX: at.x, clientY: at.y, ctrlKey: true, cancelable: true })))
  const press = (over: Partial<{ clientX: number; clientY: number; buttons: number }> = {}) =>
    ({ pointerId: 1, pointerType: 'mouse', button: 0, buttons: 1, clientX: 200, clientY: 100, currentTarget: frame, ...over }) as unknown as PointerEvent
  const mouse = {
    down: (over = {}) => act(() => hook.result.current.pointer.onPointerDown(press(over))),
    move: (over = {}) => act(() => void hook.result.current.pointer.onPointerMove(press(over))),
    up: (over = {}) => act(() => hook.result.current.pointer.onPointerEnd(press({ buttons: 0, ...over }))),
  }
  /** A touch event with the fingers on the map (`targetTouches`) and, optionally, others on the screen. */
  const touch = (type: string, fingers: readonly (readonly [number, number])[], elsewhere: readonly (readonly [number, number])[] = []) => {
    const list = (points: readonly (readonly [number, number])[]) => points.map(([clientX, clientY], identifier) => ({ clientX, clientY, identifier }))
    const event = new Event(type, { cancelable: true })
    Object.defineProperties(event, { targetTouches: { value: list(fingers) }, touches: { value: list([...fingers, ...elsewhere]) }, changedTouches: { value: list(fingers) } })
    act(() => void frame.dispatchEvent(event))
  }
  return { hook, frame, surface, run, wheel, mouse, touch, onGesture, onWholeCountry }
}

const width = (box: ViewBox) => Math.round(box[2])

describe('useSvgMapZoom', () => {
  it('attaches nothing when disabled', () => {
    const { hook, wheel, run } = setup({ enabled: false })
    wheel(-100)
    run(500)
    expect(hook.result.current.box).toEqual(FULL)
    expect(hook.result.current.frameProps).toEqual({})
  })

  it('zooms about the pointer: the grid point under it stays under it', () => {
    const { hook, wheel, run } = setup()
    const at = { x: 120, y: 60 }
    const before = gridPointAt(FULL, RECT, at)
    wheel(-200, at)
    run(500)
    const { box } = hook.result.current
    expect(width(box)).toBeLessThan(4000)
    const after = gridPointAt(box, RECT, at)
    expect(after.x).toBeCloseTo(before.x)
    expect(after.y).toBeCloseTo(before.y)
  })

  it('a drag right after a wheel owns the map: the wheel never settles it mid-drag, the release does', () => {
    const { hook, wheel, mouse, run, surface } = setup()
    wheel(-400)
    mouse.down()
    mouse.move({ clientX: 230 })
    mouse.move({ clientX: 260 })
    run(500) // the wheel's settle time passes mid-drag
    expect(hook.result.current.gesturing).toBe(true)
    mouse.move({ clientX: 300 })
    run(20)
    mouse.up()
    expect(hook.result.current.gesturing).toBe(false)
    expect(surface.style.transform).toBe('')
  })

  it('„+" after a wheel starts from where the wheel left the map, not the box before it', () => {
    const { hook, wheel, run } = setup()
    wheel(-200)
    const wheeled = 4000 * 2 ** (-200 * 0.005)
    act(() => hook.result.current.zoomBy(2))
    run(1000)
    expect(width(hook.result.current.box)).toBe(Math.round(wheeled / 2))
  })

  it('a click during an animation lets it finish', () => {
    const { hook, mouse, run } = setup()
    act(() => hook.result.current.zoomBy(2))
    run(100)
    mouse.down()
    mouse.up()
    run(1000)
    expect(width(hook.result.current.box)).toBe(2000)
    expect(hook.result.current.animating).toBe(false)
  })

  it('a pinch keeps the point between the fingers under them, and settles when the fingers lift one by one', () => {
    const { hook, touch, run, surface } = setup()
    const mid = gridPointAt(FULL, RECT, { x: 200, y: 100 })
    touch('touchstart', [
      [180, 100],
      [220, 100],
    ])
    touch('touchmove', [
      [140, 100],
      [260, 100],
    ])
    run(20)
    touch('touchend', [[260, 100]])
    touch('touchend', [])
    const { box } = hook.result.current
    expect(width(box)).toBe(Math.round(4000 / 3))
    const after = gridPointAt(box, RECT, { x: 200, y: 100 })
    expect(after.x).toBeCloseTo(mid.x)
    expect(after.y).toBeCloseTo(mid.y)
    expect(hook.result.current.gesturing).toBe(false)
    expect(surface.style.transform).toBe('')
  })

  it('a finger on the map with a thumb resting elsewhere is not a pinch', () => {
    const { hook, touch, onGesture } = setup()
    touch('touchstart', [[200, 100]], [[50, 400]])
    expect(hook.result.current.gesturing).toBe(false)
    expect(onGesture).not.toHaveBeenCalled()
  })

  it('a tap during an animation lets it finish', () => {
    const { hook, touch, run } = setup()
    act(() => hook.result.current.zoomBy(2))
    run(100)
    touch('touchstart', [[200, 100]])
    touch('touchend', [])
    run(1000)
    expect(width(hook.result.current.box)).toBe(2000)
  })

  it('leaves one finger on the whole map to the page, and pans with it once zoomed', () => {
    const whole = setup()
    whole.touch('touchstart', [[200, 100]])
    whole.touch('touchmove', [[200, 160]])
    whole.touch('touchend', [])
    expect(whole.hook.result.current.box).toEqual(FULL)
    expect(whole.hook.result.current.frameProps.style?.touchAction).toBe('pan-y')

    const zoomed = setup({ initial: [1000, 500, 2000, 1000] })
    zoomed.touch('touchstart', [[200, 100]])
    zoomed.touch('touchmove', [[220, 100]])
    zoomed.touch('touchmove', [[260, 100]])
    zoomed.run(20)
    zoomed.touch('touchend', [])
    expect(zoomed.hook.result.current.box[0]).toBeLessThan(1000)
    expect(zoomed.hook.result.current.frameProps.style?.touchAction).toBe('none')
  })

  it('tells the page when the map comes to rest on the whole country', () => {
    const { hook, run, onWholeCountry } = setup({ initial: [1000, 500, 2000, 1000] })
    act(() => hook.result.current.zoomTo(FULL))
    run(1000)
    expect(onWholeCountry).toHaveBeenCalled()
  })
})
