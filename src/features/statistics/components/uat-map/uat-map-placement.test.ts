import { describe, expect, it } from 'vitest'
import type { UatMapGeometry } from '../../lib/uat-map-snapshot'
import { tooltipPosition, uatAnchor } from './uat-map-placement'

const size = { width: 200, height: 120 }

describe('tooltipPosition', () => {
  it('sits below and to the right where there is room', () => {
    expect(tooltipPosition({ anchor: { x: 100, y: 100 }, size, frame: { width: 800, height: 500 } })).toEqual({ x: 114, y: 114 })
  })

  it('goes left near the right edge and above near the bottom, inside the frame', () => {
    expect(tooltipPosition({ anchor: { x: 750, y: 450 }, size, frame: { width: 800, height: 500 } })).toEqual({ x: 536, y: 316 })
  })

  it('on a map too narrow for either side, goes below the point, centred, never over it', () => {
    const at = tooltipPosition({ anchor: { x: 160, y: 200 }, size, frame: { width: 330, height: 230 } })
    expect(at).toEqual({ x: 60, y: 214 })
    expect(at.y).toBeGreaterThan(200)
  })
})

describe('uatAnchor', () => {
  const geometry = { labels: [1000, 500, 40] } as unknown as UatMapGeometry
  const frame = { width: 400, height: 200 }

  it('puts a UAT’s label point on screen through the box', () => {
    expect(uatAnchor(geometry, 0, [0, 0, 4000, 2000], frame)).toEqual({ x: 100, y: 50 })
  })

  it('points at nothing where the zoomed map no longer shows the UAT', () => {
    expect(uatAnchor(geometry, 0, [2000, 0, 1000, 500], frame)).toBeNull()
  })
})
