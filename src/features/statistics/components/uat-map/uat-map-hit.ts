/**
 * Which UAT is at a point of the map's grid — found without a DOM node per
 * UAT, which the page would otherwise restyle and lay out 3,181 times. The
 * shapes' boxes, sorted into a coarse grid, narrow the country to the few
 * whose box holds the point; the exact test (`isPointInPath`) settles it.
 */

/** x0, y0, x1, y1 on the grid. */
export type Box = readonly [number, number, number, number]

/** A grid cell's side, in grid units: ~63 × 45 cells over the country, a few UATs each. */
const CELL = 64

/** A path's box. Paths are the generator's: `M x y`, relative `l` pairs, `z`. */
export function pathBox(d: string): Box {
  let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity]
  let command = 'M'
  let [x, y, startX, startY] = [0, 0, 0, 0]
  let pending: number | null = null
  for (const token of d.match(/[A-Za-z]|-?\d*\.?\d+/g) ?? []) {
    if (/[A-Za-z]/.test(token)) {
      command = token
      if (token === 'z' || token === 'Z') [x, y] = [startX, startY]
      continue
    }
    if (pending === null) {
      pending = Number(token)
      continue
    }
    const relative = command === 'l' || command === 'm'
    x = relative ? x + pending : pending
    y = relative ? y + Number(token) : Number(token)
    pending = null
    // Pairs after a move are lines, in the move's own terms.
    if (command === 'M' || command === 'm') {
      ;[startX, startY] = [x, y]
      command = command === 'M' ? 'L' : 'l'
    }
    ;[x0, y0, x1, y1] = [Math.min(x0, x), Math.min(y0, y), Math.max(x1, x), Math.max(y1, y)]
  }
  return [x0, y0, x1, y1]
}

/** The boxes sorted into cells: `at(x, y)` gives the UATs whose box holds the point. */
export function boxGrid(boxes: readonly Box[], width: number, height: number, cell = CELL) {
  const columns = Math.ceil(width / cell)
  const rows = Math.ceil(height / cell)
  const cells: number[][] = Array.from({ length: columns * rows }, () => [])
  const clamp = (value: number, count: number) => Math.min(count - 1, Math.max(0, Math.floor(value / cell)))
  boxes.forEach(([x0, y0, x1, y1], index) => {
    for (let row = clamp(y0, rows); row <= clamp(y1, rows); row += 1) {
      for (let column = clamp(x0, columns); column <= clamp(x1, columns); column += 1) cells[row * columns + column]!.push(index)
    }
  })
  return {
    at(x: number, y: number): readonly number[] {
      if (x < 0 || y < 0 || x >= width || y >= height) return []
      return cells[clamp(y, rows) * columns + clamp(x, columns)]!.filter((index) => {
        const [x0, y0, x1, y1] = boxes[index]!
        return x >= x0 && x <= x1 && y >= y0 && y <= y1
      })
    },
  }
}

/**
 * The UAT at a grid point (`at`), or null — in the browser only. The grid
 * is built by `prepare`, which the band calls when the browser is idle, or
 * else by the first `at`; the exact shapes are made as they are asked for.
 */
export function uatHitTest({ paths, width, height }: { readonly paths: readonly string[]; readonly width: number; readonly height: number }) {
  let grid: ReturnType<typeof boxGrid> | null = null
  let context: CanvasRenderingContext2D | null = null
  const shapes = new Map<number, Path2D>()
  const prepare = () => {
    grid ??= boxGrid(paths.map(pathBox), width, height)
    context ??= document.createElement('canvas').getContext('2d')
    return grid
  }
  return {
    prepare,
    at(x: number, y: number): number | null {
      for (const index of prepare().at(x, y)) {
        let shape = shapes.get(index)
        if (!shape) {
          shape = new Path2D(paths[index])
          shapes.set(index, shape)
        }
        if (context?.isPointInPath(shape, x, y, 'evenodd')) return index
      }
      return null
    },
  }
}
