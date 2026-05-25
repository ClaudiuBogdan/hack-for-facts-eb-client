export type HemicyclePosition = {
  readonly x: number
  readonly y: number
  readonly angle: number
}

export type HemicycleLayout = {
  readonly positions: ReadonlyArray<HemicyclePosition>
  readonly viewBox: string
  readonly seatRadius: number
}

/** Shared focal point — bottom center of the semicircle (arc opens upward). */
const CENTER_X = 50
const CENTER_Y = 52
const START_ANGLE = Math.PI
const END_ANGLE = 0
const SEAT_RADIUS = 1.65
const MIN_SEAT_CENTER_SPACING = SEAT_RADIUS * 2 + 0.45
const INNER_RADIUS = 7
const BASE_OUTER_RADIUS = 38

const CENTER_ROW_EVEN_OUT_LIMIT = 6

function allocateSeatsByWeights(
  totalSeats: number,
  weights: ReadonlyArray<number>,
): number[] {
  if (totalSeats <= 0 || weights.length === 0) {
    return []
  }

  const weightSum = weights.reduce((sum, weight) => sum + weight, 0)
  const raw = weights.map((weight) => (totalSeats * weight) / weightSum)
  const floored = raw.map((value) => Math.floor(value))
  let remainder = totalSeats - floored.reduce((sum, value) => sum + value, 0)

  const order = raw
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction)

  const result = [...floored]
  for (const item of order) {
    if (remainder <= 0) break
    result[item.index] = (result[item.index] ?? 0) + 1
    remainder -= 1
  }

  return result
}

function rowArcSpacing(seatsInRow: number, radius: number): number {
  if (seatsInRow <= 0) return Number.POSITIVE_INFINITY
  return (Math.PI * radius) / seatsInRow
}

/** Smooth the first center rows so spacing matches neighboring arcs more closely. */
function evenOutCenterRowDensity(
  seatsPerRow: number[],
  rowRadii: ReadonlyArray<number>,
): number[] {
  const result = [...seatsPerRow]
  const rowLimit = Math.min(result.length - 1, CENTER_ROW_EVEN_OUT_LIMIT)

  for (let pass = 0; pass < rowLimit; pass += 1) {
    let moved = false

    for (let row = 1; row < rowLimit; row += 1) {
      const currentSeats = result[row] ?? 0
      const nextSeats = result[row + 1] ?? 0
      if (currentSeats <= 1 || nextSeats <= 0) continue

      const currentSpacing = rowArcSpacing(
        currentSeats,
        rowRadii[row] ?? INNER_RADIUS,
      )
      const nextSpacing = rowArcSpacing(
        nextSeats,
        rowRadii[row + 1] ?? INNER_RADIUS,
      )

      if (currentSpacing + 0.05 < nextSpacing * 0.95) {
        result[row] = currentSeats - 1
        result[row + 1] = nextSeats + 1
        moved = true
      }
    }

    if (!moved) break
  }

  return result
}

function distributeSeatsToRows(
  totalSeats: number,
  rowCount: number,
  rowRadii: ReadonlyArray<number>,
): ReadonlyArray<number> {
  if (totalSeats <= 0 || rowCount <= 0) {
    return []
  }

  if (rowCount === 1) {
    return [totalSeats]
  }

  const outerRowWeights = rowRadii.slice(1)
  const outerSeats = allocateSeatsByWeights(totalSeats, outerRowWeights)
  const result = [0, ...outerSeats]

  return evenOutCenterRowDensity(result, rowRadii)
}

function computeRowCount(totalSeats: number): number {
  if (totalSeats > 300) return 15
  if (totalSeats > 250) return 12
  if (totalSeats > 160) return 10
  if (totalSeats > 100) return 7
  if (totalSeats > 60) return 5
  return 4
}

function computeRowRadii(rowCount: number): ReadonlyArray<number> {
  const outerRadius = Math.max(
    BASE_OUTER_RADIUS,
    INNER_RADIUS + (rowCount - 1) * MIN_SEAT_CENTER_SPACING,
  )
  if (rowCount <= 1) return [INNER_RADIUS]

  return Array.from({ length: rowCount }, (_, row) => {
    const t = row / (rowCount - 1)
    return INNER_RADIUS + t * (outerRadius - INNER_RADIUS)
  })
}

/**
 * Compute seat positions on concentric semicircular arcs.
 * All rows share one focal point; each row spans the same 180° sweep.
 */
export function computeHemicycleLayout(totalSeats: number): HemicycleLayout {
  if (totalSeats <= 0) {
    return { positions: [], viewBox: '0 0 100 50', seatRadius: SEAT_RADIUS }
  }

  const rowCount = computeRowCount(totalSeats)
  const rowRadii = computeRowRadii(rowCount)
  const seatsPerRow = distributeSeatsToRows(totalSeats, rowCount, rowRadii)
  const seatRadius = SEAT_RADIUS
  const positions: HemicyclePosition[] = []

  for (let row = 0; row < rowCount; row += 1) {
    const seatsInRow = seatsPerRow[row] ?? 0
    const radius = rowRadii[row] ?? rowRadii[rowRadii.length - 1] ?? INNER_RADIUS
    if (seatsInRow <= 0) continue

    for (let seat = 0; seat < seatsInRow; seat += 1) {
      const angle =
        seatsInRow === 1
          ? Math.PI / 2
          : START_ANGLE + (seat / (seatsInRow - 1)) * (END_ANGLE - START_ANGLE)

      positions.push({
        x: CENTER_X + radius * Math.cos(angle),
        y: CENTER_Y - radius * Math.sin(angle),
        angle,
      })
    }
  }

  const trimmed = positions.slice(0, totalSeats)
  const xs = trimmed.map((position) => position.x)
  const ys = trimmed.map((position) => position.y)
  const padding = seatRadius + 1.5
  const minX = Math.min(...xs) - padding
  const maxX = Math.max(...xs) + padding
  const minY = Math.min(...ys) - padding
  const maxY = CENTER_Y + padding

  return {
    positions: trimmed,
    viewBox: `${minX.toFixed(2)} ${minY.toFixed(2)} ${(maxX - minX).toFixed(2)} ${(maxY - minY).toFixed(2)}`,
    seatRadius,
  }
}

/** Sort layout slots left-to-right so party blocks fill the hemicycle wings. */
export function sortHemicyclePositionsLeftToRight(
  positions: ReadonlyArray<HemicyclePosition>,
): ReadonlyArray<number> {
  return positions
    .map((position, index) => ({ index, x: position.x, y: position.y }))
    .sort((a, b) => {
      if (Math.abs(a.x - b.x) > 0.05) return a.x - b.x
      return b.y - a.y
    })
    .map((entry) => entry.index)
}

/** @deprecated Use computeHemicycleLayout */
export function computeHemicyclePositions(
  totalSeats: number,
): ReadonlyArray<{ x: number; y: number }> {
  return computeHemicycleLayout(totalSeats).positions.map(({ x, y }) => ({ x, y }))
}
