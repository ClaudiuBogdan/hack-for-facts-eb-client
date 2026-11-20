/**
 * Where the landing's margin pixel field is shown, and the one place script asks.
 *
 * The field is shown only from 1800px up. The threshold is about the margin
 * beside the 1152px frame, not about "desktop": at 1506 that margin is 148px,
 * which is too narrow to hold the field without crowding the headline, and
 * narrow enough that the particle tail — which starts 240px in — is clipped
 * away entirely, leaving the square band alone and the animation compressed
 * into a fraction of its schedule. By 1800 the margin is around 290px and both
 * the tail and the timing have room. Below it the hero keeps the plain lattice.
 *
 * CSS hides the field (`hidden min-[1800px]:block` in the landing page; a
 * Tailwind class has to be a literal, so it cannot read this constant, and a
 * test keeps the two equal). Script asks the same question through a media
 * query rather than by measuring the canvas: reading a box forces a layout of
 * the whole page, and on a phone that layout landed inside hydration.
 */
export const MARGIN_FIELD_MIN_WIDTH_PX = 1800

export const MARGIN_FIELD_QUERY = `(min-width: ${MARGIN_FIELD_MIN_WIDTH_PX}px)`

/**
 * The breakpoint's live query list: `matches` says whether this viewport shows
 * the field, without reading any layout, and `change` fires when it starts or
 * stops showing it.
 */
export function marginFieldQuery(): MediaQueryList {
  return window.matchMedia(MARGIN_FIELD_QUERY)
}
