import type { CSSProperties } from 'react'
import { cn } from '@/lib/utils'

/**
 * The drawn chrome around the hero: the lattice it sits on, the tricolour in
 * the wordmark, and the marks at the frame's corners. Nothing here carries
 * text or state.
 */

/** Dissolve the lattice toward the edges. Inline style: a Tailwind arbitrary
 *  value here would carry a gradient literal into the stylesheet. */
const LATTICE_MASK: CSSProperties = {
  maskImage: 'radial-gradient(115% 85% at 25% 0%, #000 20%, transparent 78%)',
  WebkitMaskImage: 'radial-gradient(115% 85% at 25% 0%, #000 20%, transparent 78%)',
}

/** The minor module, and the major one: six minor cells. */
const MINOR = 24
const MAJOR = 144
/** How far left of the frame the drawing starts: a whole number of major cells, past any screen's margin. */
const REACH = MAJOR * 20

/**
 * The drawing's own box, starting a whole number of cells left of the frame's
 * left rule: `50% - 36rem` is where a centred 1152px frame begins, and zero
 * once the window is narrower than the frame and the rule is at its edge.
 */
const LATTICE_BOX: CSSProperties = {
  left: `calc(max(0px, 50% - 36rem) - ${REACH}px)`,
  width: `calc(100% + ${REACH}px)`,
}

/**
 * Major rule every 144px, minor every 24px beneath it, both counted from the
 * frame's left rule.
 *
 * The frame (`RuledFrame`) is 1152px wide and centred. Counting the lattice
 * from the window's left edge left the nearest line a few pixels beside each
 * rule, by an amount that changed with the window; counted from the left rule,
 * a major line lies on it at every width. 144 rather than the earlier 120
 * because 1152 is eight cells of it, so the right rule closes a cell too; 120
 * put it 0.6 of a cell in.
 *
 * The drawing is a box of its own, placed by the same arithmetic as the frame,
 * so at an odd width both round to the same pixel; a percentage inside the
 * `svg` left the lines half a pixel off and two pixels wide. Each line is
 * drawn half a pixel in, so it fills the pixel column the left rule occupies.
 */
export function TwoLayerLattice({ idPrefix }: { readonly idPrefix: string }) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden text-foreground"
      style={LATTICE_MASK}
    >
      <svg className="absolute top-0 h-full" style={LATTICE_BOX}>
        <defs>
          <pattern id={`${idPrefix}-minor`} width={MINOR} height={MINOR} patternUnits="userSpaceOnUse">
            <path d={`M 0.5 0 V ${MINOR} M 0 0.5 H ${MINOR}`} fill="none" stroke="currentColor" strokeWidth="1" opacity="0.011" />
          </pattern>
          <pattern id={`${idPrefix}-major`} width={MAJOR} height={MAJOR} patternUnits="userSpaceOnUse">
            <path d={`M 0.5 0 V ${MAJOR} M 0 0.5 H ${MAJOR}`} fill="none" stroke="currentColor" strokeWidth="1" opacity="0.053" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${idPrefix}-minor)`} />
        <rect width="100%" height="100%" fill={`url(#${idPrefix}-major)`} />
      </svg>
    </div>
  )
}

/**
 * The tricolour, as the separator in the wordmark.
 *
 * Drawn rather than set as 🇷🇴: regional-indicator flags do not render on
 * Windows, which falls back to the letters "RO", and the emoji's size and
 * baseline vary by platform font — which a mark aligned against a 14px
 * wordmark cannot afford.
 *
 * The polish is in three details. It holds the official 3:2 ratio at 12×8, so
 * it reads as a flag and not as a coloured chip. The corners are rounded by a
 * hair — enough to stop it looking like a raw rectangle, not so much that it
 * becomes a pill. And it carries an inset hairline rather than an outset
 * border, so the stroke sits inside the silhouette and the blue band still has
 * an edge against a dark background. The viewBox is drawn at 3× the rendered
 * size to keep those corners crisp.
 */
export function RomanianFlag({ className }: { readonly className?: string }) {
  return (
    <svg
      width="12"
      height="8"
      viewBox="0 0 36 24"
      aria-hidden="true"
      focusable="false"
      className={cn('shrink-0', className)}
    >
      <clipPath id="ro-flag">
        <rect width="36" height="24" rx="3" />
      </clipPath>
      <g clipPath="url(#ro-flag)">
        <rect width="12" height="24" fill="#002B7F" />
        <rect x="12" width="12" height="24" fill="#FCD116" />
        <rect x="24" width="12" height="24" fill="#CE1126" />
        <rect
          width="36"
          height="24"
          rx="3"
          fill="none"
          stroke="currentColor"
          strokeOpacity="0.22"
          strokeWidth="3"
        />
      </g>
    </svg>
  )
}

/** Forge's crosshairs, at the corners of the hero frame. */
export function CornerTicks() {
  const arm = 'absolute size-2 border-foreground/25'
  return (
    <span aria-hidden="true">
      <span className={cn(arm, '-left-px -top-px border-l border-t')} />
      <span className={cn(arm, '-right-px -top-px border-r border-t')} />
    </span>
  )
}

/**
 * The crossing mark that sits where the hero's bottom rule meets each side of
 * the frame — the bottom pair of corner ticks, opened out into a full cross and
 * given the brand blue so the frame closes on a deliberate mark rather than
 * trailing off.
 *
 * Rendered by the band *below* the hero rather than by the hero itself. That
 * began as a workaround — the hero used to clip its overflow, so a cross
 * centred on its bottom edge lost its lower half — and the clip is gone now,
 * removed so the search dropdown could extend past the section. The mark stays
 * here anyway: both frames are the same width, so the two corners coincide
 * exactly, and owning the mark from the band it opens is the more honest
 * arrangement of the two.
 */
export function CruxMarks() {
  // Centred on where the lines actually cross, which is half a pixel off the
  // box edges the marks are anchored to: the frame's rule occupies x 0..1 and
  // the band's top rule y -1..0, so their centres are at 0.5 and -0.5. The
  // half-pixel margins take out that offset — without them a 2px arm sits
  // visibly proud of a 1px line.
  const arm = 'absolute -translate-x-1/2 -translate-y-1/2 bg-primary'
  const left = 'left-0 top-0 ml-[0.5px] -mt-[0.5px]'
  const right = 'right-0 top-0 mr-[0.5px] -mt-[0.5px] translate-x-1/2'
  return (
    <span aria-hidden="true">
      <span className={cn(arm, left, 'h-3 w-0.5')} />
      <span className={cn(arm, left, 'h-0.5 w-3')} />
      <span className={cn(arm, right, 'h-3 w-0.5')} />
      <span className={cn(arm, right, 'h-0.5 w-3')} />
    </span>
  )
}
