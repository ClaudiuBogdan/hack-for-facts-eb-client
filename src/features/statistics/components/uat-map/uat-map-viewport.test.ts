import type { PointerEvent } from 'react'
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useMapViewport } from './uat-map-viewport'
import type { ViewBox } from './uat-map-view-box'

const FULL: ViewBox = [0, 0, 4000, 2827]
const ZOOMED: ViewBox = [1000, 700, 1000, 707]

function mapSvg() {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.getBoundingClientRect = () => ({ left: 0, top: 0, width: 400, height: 283, right: 400, bottom: 283, x: 0, y: 0, toJSON: () => ({}) })
  svg.setPointerCapture = vi.fn()
  return svg
}

const press = (svg: SVGSVGElement, over: Partial<{ clientX: number; buttons: number }> = {}) =>
  ({ pointerId: 1, pointerType: 'mouse', clientX: 100, clientY: 100, buttons: 1, currentTarget: svg, ...over }) as unknown as PointerEvent<SVGSVGElement>

function viewport(initial: ViewBox, onGesture = vi.fn()) {
  const svg = mapSvg()
  const { result } = renderHook(() => useMapViewport({ svgRef: { current: svg }, full: FULL, initial, onWholeCountry: vi.fn(), onGesture }))
  const move = (over: Partial<{ clientX: number; buttons: number }>) => {
    let moved = false
    act(() => {
      moved = result.current.pointer.onPointerMove(press(svg, over))
    })
    return moved
  }
  return { svg, result, move, onGesture }
}

describe('useMapViewport, under a press', () => {
  it('captures a press on the zoomed map at once: its release is heard off the map, and no hover drags it after', () => {
    const { svg, result, move } = viewport(ZOOMED)
    act(() => result.current.pointer.onPointerDown(press(svg)))
    expect(svg.setPointerCapture).toHaveBeenCalledWith(1)
    act(() => result.current.pointer.onPointerEnd(press(svg, { buttons: 0 })))
    expect(move({ clientX: 300, buttons: 0 })).toBe(false)
  })

  it('moves the map once a press passes the threshold, and lets go of what was under the pointer', () => {
    const { svg, result, move, onGesture } = viewport(ZOOMED)
    act(() => result.current.pointer.onPointerDown(press(svg)))
    expect(move({ clientX: 103 })).toBe(false)
    expect(move({ clientX: 130 })).toBe(true)
    expect(move({ clientX: 160 })).toBe(true)
    expect(onGesture).toHaveBeenCalledTimes(1)
  })

  it('leaves the whole country to the page: a press there is not tracked', () => {
    const { svg, result, move } = viewport(FULL)
    act(() => result.current.pointer.onPointerDown(press(svg)))
    expect(svg.setPointerCapture).not.toHaveBeenCalled()
    expect(move({ clientX: 200 })).toBe(false)
  })

  it('opens a county from the address within the map’s limits', () => {
    const { result } = viewport([-77, 100, 600, 424])
    expect(result.current.box[0]).toBe(0)
  })
})
