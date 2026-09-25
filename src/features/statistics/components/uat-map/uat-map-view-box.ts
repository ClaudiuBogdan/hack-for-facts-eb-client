/**
 * The map's view box as numbers: fitting a county, keeping the view inside
 * the country, stepping between two views. Pure — the frames that move the
 * `<svg>` are `useMapViewport`'s.
 */

/** x, y, width, height on the map's grid. */
export type ViewBox = readonly [number, number, number, number]

/** A box around `bounds` (x0, y0, x1, y1), padded, at the map's own aspect ratio. */
export function fitBox(bounds: readonly [number, number, number, number], full: ViewBox, pad = 0.08): ViewBox {
  const [x0, y0, x1, y1] = bounds
  let w = (x1 - x0) * (1 + pad * 2)
  let h = (y1 - y0) * (1 + pad * 2)
  const aspect = full[2] / full[3]
  if (w / h > aspect) h = w / aspect
  else w = h * aspect
  return [(x0 + x1) / 2 - w / 2, (y0 + y1) / 2 - h / 2, w, h]
}

/** Keeps a box inside the map, no wider than it and no narrower than `minWidth`, about its centre. */
export function clampBox([x, y, w, h]: ViewBox, full: ViewBox, minWidth: number): ViewBox {
  const scale = Math.min(Math.max(w, minWidth), full[2]) / w
  const cw = w * scale
  const ch = h * scale
  const cx = x + (w - cw) / 2
  const cy = y + (h - ch) / 2
  return [Math.min(Math.max(cx, full[0]), full[0] + full[2] - cw), Math.min(Math.max(cy, full[1]), full[1] + full[3] - ch), cw, ch]
}

/** `factor` times closer (or farther, under 1) about a point on the grid, kept inside the map. */
export function zoomAbout(box: ViewBox, at: { readonly x: number; readonly y: number }, factor: number, full: ViewBox, minWidth: number): ViewBox {
  const [x, y, w, h] = box
  return clampBox([at.x - (at.x - x) / factor, at.y - (at.y - y) / factor, w / factor, h / factor], full, minWidth)
}

/** Ease in and out: slow at both ends, so a zoom neither jumps nor stops dead. */
export const ease = (p: number) => (p < 0.5 ? 4 * p * p * p : 1 - (-2 * p + 2) ** 3 / 2)

/** The box `k` of the way (0 to 1) from `from` to `to`. */
export function interpolateBox(from: ViewBox, to: ViewBox, k: number): ViewBox {
  return [from[0] + (to[0] - from[0]) * k, from[1] + (to[1] - from[1]) * k, from[2] + (to[2] - from[2]) * k, from[3] + (to[3] - from[3]) * k]
}
