import { describe, expect, it } from 'vitest'
import { computeHemicycleLayout } from './hemicycle-layout'

describe('computeHemicycleLayout', () => {
  it('keeps seat circles the same size across chambers', () => {
    const cameraLayout = computeHemicycleLayout(330)
    const senateLayout = computeHemicycleLayout(135)

    expect(cameraLayout.seatRadius).toBe(senateLayout.seatRadius)
  })

  it('keeps dense Camera seats from overlapping', () => {
    const layout = computeHemicycleLayout(330)
    const minimumDistance = layout.seatRadius * 2

    for (let index = 0; index < layout.positions.length; index += 1) {
      for (
        let comparisonIndex = index + 1;
        comparisonIndex < layout.positions.length;
        comparisonIndex += 1
      ) {
        const current = layout.positions[index]
        const comparison = layout.positions[comparisonIndex]
        if (!current || !comparison) continue

        const distance = Math.hypot(
          current.x - comparison.x,
          current.y - comparison.y,
        )

        expect(distance).toBeGreaterThanOrEqual(minimumDistance)
      }
    }
  })

  it('merges sparse inner center seats into the next row', () => {
    const layout = computeHemicycleLayout(330)
    const centerY = 52
    const innerRadiusY = centerY - 7
    const innerRowSeats = layout.positions.filter(
      (position) => Math.abs(position.y - innerRadiusY) < 0.5,
    )

    expect(innerRowSeats).toHaveLength(0)
  })

  it('keeps center row spacing close to the next neighbor row', () => {
    const layout = computeHemicycleLayout(330)
    const centerY = 52
    const rowRadii = Array.from({ length: 15 }, (_, row) => {
      const outerRadius = Math.max(38, 7 + 14 * (1.65 * 2 + 0.45))
      return 7 + (row / 14) * (outerRadius - 7)
    })

    const spacingForRow = (row: number) => {
      const radius = rowRadii[row] ?? 7
      const rowY = centerY - radius
      const rowSeats = layout.positions.filter(
        (position) => Math.abs(position.y - rowY) < 1.2,
      )
      return (Math.PI * radius) / rowSeats.length
    }

    const firstRowSpacing = spacingForRow(1)
    const secondRowSpacing = spacingForRow(2)

    expect(firstRowSpacing / secondRowSpacing).toBeGreaterThan(0.9)
    expect(firstRowSpacing / secondRowSpacing).toBeLessThan(1.15)
  })
})
