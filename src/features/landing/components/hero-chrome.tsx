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

/** Major rule every 120px, minor every 24px beneath it. */
export function TwoLayerLattice({ idPrefix }: { readonly idPrefix: string }) {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full text-foreground"
      style={LATTICE_MASK}
    >
      <defs>
        <pattern id={`${idPrefix}-minor`} width="24" height="24" patternUnits="userSpaceOnUse">
          <path d="M 24 0 L 0 0 0 24" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.03" />
        </pattern>
        <pattern id={`${idPrefix}-major`} width="120" height="120" patternUnits="userSpaceOnUse">
          <path d="M 120 0 L 0 0 0 120" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.11" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${idPrefix}-minor)`} />
      <rect width="100%" height="100%" fill={`url(#${idPrefix}-major)`} />
    </svg>
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
