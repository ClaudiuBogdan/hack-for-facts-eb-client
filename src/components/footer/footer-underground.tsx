import underground from '@/assets/images/underground.webp'

/** Fully covered artwork disappeared in Chrome overscroll; keep 1px exposed. */
export function FooterUnderground() {
  return (
    <div
      aria-hidden="true"
      data-footer-underground=""
      style={{ backgroundImage: `url(${underground})` }}
      className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-[216px] translate-y-[calc(100%-1px)] bg-size-[72px_216px] bg-top-left bg-repeat-x select-none [image-rendering:pixelated]"
    />
  )
}
