import { describe, expect, it } from 'vitest'
import type { UatMapGeometry } from '../../lib/uat-map-snapshot'
import { visibleLabels } from './uat-map-labels'

// Four UATs: two close together, one roomy, one outside the view. Label points are x, y, room.
const geometry = {
  siruta: ['1', '2', '3', '4'],
  name: ['Aaa', 'Bbb', 'Ccc', 'Ddd'],
  labels: [100, 100, 20, 104, 101, 15, 300, 300, 40, 900, 900, 50],
} as unknown as UatMapGeometry

describe('visibleLabels', () => {
  it('draws the roomiest names in view, none over another', () => {
    const labels = visibleLabels(geometry, [0, 0, 500, 500], 1)
    expect(labels.map((label) => label.text)).toEqual(['Ccc', 'Aaa'])
  })

  it('skips a name without room at this zoom, and keeps to `only` and `max`', () => {
    expect(visibleLabels(geometry, [0, 0, 500, 500], 0.3).map((label) => label.text)).toEqual(['Ccc'])
    expect(visibleLabels(geometry, [0, 0, 500, 500], 1, { only: (i) => i !== 2 }).map((label) => label.text)).toEqual(['Aaa'])
    expect(visibleLabels(geometry, [0, 0, 500, 500], 1, { max: 1 })).toHaveLength(1)
  })
})
