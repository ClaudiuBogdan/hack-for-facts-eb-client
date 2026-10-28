/**
 * Decorative header art that only a wide screen shows.
 *
 * The parliament and legislation headers put their engravings in a column that
 * is hidden below Tailwind's `xl`. Hiding an `<img>` with CSS does not stop its
 * download, and React's server renderer turns every eager `<img>` into a
 * `<link rel=preload>` above the stylesheet, so phones used to fetch 300+ KB of
 * art they never displayed, in the same window as the CSS and the entry chunk.
 *
 * Inside a `<picture>` React emits no preload, and a `<source>` bound to the
 * same breakpoint as the column means a narrower screen falls back to the
 * `<img>`'s own `src`: a blank pixel inlined in the HTML, so nothing is fetched.
 */
// Tailwind's `xl`, in its own unit: a rem breakpoint follows the browser's
// font size, so a pixel one would show the column without its art.
export const WIDE_SCREEN_ART_MEDIA = '(min-width: 80rem)'

/** A transparent 1×1 GIF: the `<img>` fallback below the breakpoint. */
export const BLANK_IMAGE_SRC =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
