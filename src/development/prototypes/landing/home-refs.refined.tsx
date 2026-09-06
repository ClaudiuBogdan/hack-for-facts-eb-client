import type { CSSProperties, ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import type { LinkProps } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import leu from '@/assets/images/landing-leu.webp'
import balanta from '@/assets/images/landing-balanta.webp'
import justitia from '@/assets/images/landing-justitia.webp'
import logo from '@/assets/logo/logo.png'
import { EntitySearchInput } from '@/components/entities/EntitySearch'
import { PREDEFINED_ENTITIES } from '@/lib/constants/predefined-entities'
import { buildPreferredEntityPath } from '@/lib/entity-navigation'
import { CampaignLandingShareCard } from '@/features/campaigns/buget/components/CampaignAccessShareCard'
import { ParliamentPromoCard } from '@/features/parliament/components/parliament-promo-card'
import { useIsMobile } from '@/hooks/use-mobile'
import { cn } from '@/lib/utils'
import { scraperDatasetCatalog } from '@/lib/scraper-references'
import { NATIONAL_FACTS, formatFact } from './home-refs.national-facts'
import { PixelField } from './home-refs.pixel-art'
import { FIELD_HOST_CLASS, FieldAnimationStyles } from './home-refs.field-animation'
import { useFieldMotion } from './home-refs.field-motion'
import { ScrollLight, ScrollLightStyles, useScrollLight } from './home-refs.scroll-light'
import { LANDING_GROUPS, visibleGroups } from './home.data'
import type { LandingEntry, LandingGroup } from './home.data'

/**
 * The landing page.
 *
 * Information architecture came from round one (`landing/home`): a grouped
 * table of contents over every surface the app serves. Everything below is the
 * craft laid over it, and each item is a decision rather than a tweak:
 *
 * - **The hero headline area.** A tighter display scale (`clamp`, leading 0.92)
 *   with the lead paragraph held to about sixty characters, and the search
 *   given the left column rather than floating centred.
 * - **The search input.** Restyled *locally* — `EntitySearchInput` is shared
 *   with campaigns and the floating search, so it is reached with an arbitrary
 *   variant on the wrapper instead of being edited. Its shipped
 *   `rounded-3xl` + shadow ramp is the one element that read as off-system in
 *   every earlier screenshot.
 * - **A two-layer lattice.** A 24px minor grid under the 120px major one, both
 *   dissolving toward the edges through a radial mask, so the background stops
 *   reading as flat wallpaper and starts reading as a drawing surface.
 * - **Frame rules.** Vertical hairlines at the content-frame edges and
 *   full-bleed horizontal rules at section boundaries, so every band belongs to
 *   one system.
 * - **Real product UI in the hero.** The right column lists actual entities
 *   with their CUIs — the only honest version of the references' "put the
 *   product on the page", since this app has no platform-stats endpoint.
 * - **Index cell hover.** Border and index number pick up the single accent and
 *   an arrow fades in. No lift, no shadow.
 * - **Margin field motion.** An intro wave shortly after load, and a ripple
 *   from the click. See `home-refs.field-animation.tsx` for the constraints
 *   that keep ~990 animating cells off the main thread.
 */

/** Literal marker. `yarn build:validate` fails if this reaches `.output/`. */
const PROTOTYPE_MARKER = 'TRANSPARENTA_PROTOTYPE_MUST_NOT_SHIP'

/** Small monospace label. Numbering and section names only — never fake telemetry. */
function MonoLabel({
  children,
  className,
}: {
  readonly children: ReactNode
  readonly className?: string
}) {
  return (
    <span
      className={cn('font-mono text-[0.625rem] uppercase leading-none tracking-[0.14em]', className)}
    >
      {children}
    </span>
  )
}

/**
 * What this platform holds — deliberately kept apart from the national figures
 * in the strip above.
 *
 * The two are different universes. `NATIONAL_FACTS` describes the country; these
 * describe our coverage of it, and the institution count in particular is a
 * subset — principal ordonatori de credite that reported budget execution, not
 * a census of Romanian public institutions. Printed in the same row as a
 * national total, a reader would divide one by the other and get a number that
 * means nothing. So they live in the provenance band, under a heading that says
 * what they are.
 *
 * Everything except the institution count is derived at render from the domain
 * list and the scraper catalog, so it cannot drift out of date.
 */
function getPlatformCoverage() {
  const groups = visibleGroups()
  const surfaces = groups.reduce((sum, group) => sum + group.entries.length, 0)
  const hidden = LANDING_GROUPS.reduce(
    (sum, group) => sum + group.entries.filter((entry) => entry.gate?.() === false).length,
    0,
  )
  return {
    groups,
    coverage: [
      // The one figure here that is not derived. It is the real `totalCount`
      // from `entityAnalytics` for 2024 aggregated principal reporting, so it
      // carries its year; promotion should fetch it rather than inherit this.
      { value: '3.295', label: 'instituții cu execuție 2024' },
      { value: String(scraperDatasetCatalog.length), label: 'seturi de date' },
      {
        value: String(scraperDatasetCatalog.filter((dataset) => dataset.apiReady).length),
        label: 'servite live',
      },
      { value: String(surfaces), label: 'suprafețe' },
      { value: String(groups.length), label: 'domenii' },
    ],
    hidden,
  }
}

/** The three heaviest surfaces, reachable without scrolling. */
const SHORTCUTS: readonly { label: string; to: LinkProps['to'] }[] = [
  { label: 'Achiziții publice', to: '/procurement' },
  { label: 'Buget național', to: '/budget-explorer' },
  { label: 'Legislație', to: '/legislation' },
]

/** Dissolve the lattice toward the edges. Inline style: a Tailwind arbitrary
 *  value here would carry a gradient literal into full-checkout CSS. */
const LATTICE_MASK: CSSProperties = {
  maskImage: 'radial-gradient(115% 85% at 25% 0%, #000 20%, transparent 78%)',
  WebkitMaskImage: 'radial-gradient(115% 85% at 25% 0%, #000 20%, transparent 78%)',
}

/**
 * Fades each pixel field out before it reaches the content column. Inline
 * style rather than an arbitrary Tailwind value, which would carry the
 * gradient literal into full-checkout CSS.
 */
const FIELD_MASK = {
  left: {
    maskImage: 'linear-gradient(to right, #000 0%, #000 24%, transparent 76%)',
    WebkitMaskImage: 'linear-gradient(to right, #000 0%, #000 24%, transparent 76%)',
  },
  right: {
    maskImage: 'linear-gradient(to left, #000 0%, #000 24%, transparent 76%)',
    WebkitMaskImage: 'linear-gradient(to left, #000 0%, #000 24%, transparent 76%)',
  },
} satisfies Record<'left' | 'right', CSSProperties>

/** Major rule every 120px, minor every 24px beneath it. */
function TwoLayerLattice({ idPrefix }: { readonly idPrefix: string }) {
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
function RomanianFlag({ className }: { readonly className?: string }) {
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

/**
 * The content frame, ruled on both edges so bands read as one column.
 *
 * `marker` labels a frame for code outside the render tree — the hero's is the
 * region the ripple refuses to start in, so the field answers clicks on the
 * margin it lives in and stays still for clicks on the content.
 */
function Frame({
  children,
  className,
  marker,
}: {
  readonly children: ReactNode
  readonly className?: string
  readonly marker?: string
}) {
  return (
    <div data-frame={marker} className={cn('relative mx-auto w-full max-w-6xl px-5 sm:px-8', className)}>
      <span aria-hidden="true" className="absolute inset-y-0 left-0 w-px bg-border" />
      <span aria-hidden="true" className="absolute inset-y-0 right-0 w-px bg-border" />
      {children}
    </div>
  )
}

/** Forge's crosshairs, at the corners of the hero frame. */
function CornerTicks() {
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
 * Rendered by the band *below* the hero rather than by the hero itself. The
 * hero clips its own overflow to hold the margin field, so a cross centred on
 * its bottom edge would lose its lower half; anchored to the top edge of the
 * next band it lands on the same point with nothing to clip it. Both frames are
 * the same width, so the two corners coincide exactly.
 */
function CruxMarks() {
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

/**
 * The shipped input is reached with an arbitrary *variant* — a descendant
 * selector, which outranks the component's own utility classes — rather than
 * by editing a component three other surfaces depend on.
 */
function RefinedSearch() {
  const isMobile = useIsMobile()
  return (
    <div
      className={cn(
        // Shape and weight: flat and bordered instead of rounded-3xl on a shadow ramp.
        '[&_input]:rounded-lg [&_input]:border-input [&_input]:bg-card [&_input]:shadow-none',
        '[&_input]:transition-colors [&_input]:hover:border-ring/50 [&_input]:focus:border-ring',
        // Height and right padding only. The left padding is left alone: the
        // magnifier is absolutely positioned at `sm:left-7` in a 32px box, so
        // anything under ~80px puts the icon on top of the placeholder.
        '[&_input]:py-5 md:[&_input]:text-base sm:[&_input]:pr-6',
        // The results dropdown carries the same rounding; bring it along.
        '[&_.rounded-3xl]:rounded-lg [&_.shadow-2xl]:shadow-md',
      )}
    >
      {/* The placeholder is kept short deliberately: at 375px the field has
          about thirty characters left after the magnifier's 80px of padding,
          and the longer wording truncated mid-word. */}
      <EntitySearchInput
        placeholder="Caută o instituție sau CUI..."
        selectionBehavior="navigate-to-preferred-entity"
        autoFocus={!isMobile}
        scrollToTopOnFocus={isMobile}
      />
    </div>
  )
}

/** Real entities, as product UI. Three-tier hierarchy, tabular CUIs. */
function StartHerePanel() {
  return (
    <div className="border bg-card">
      <div className="flex items-baseline justify-between border-b px-4 py-3">
        <MonoLabel className="text-muted-foreground">Începe de aici</MonoLabel>
        <MonoLabel className="text-muted-foreground/60">CUI</MonoLabel>
      </div>
      <ul>
        {PREDEFINED_ENTITIES.slice(0, 6).map((entity) => (
          <li key={entity.cui}>
            <Link
              to={buildPreferredEntityPath({
                cui: entity.cui,
                entityType: entity.entity_type,
                isUat: entity.is_uat,
              })}
              preload="intent"
              className="group flex items-baseline justify-between gap-3 border-b px-4 py-2.5 transition-colors last:border-b-0 hover:bg-muted/50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-card-foreground group-hover:underline">
                  {entity.name}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {entity.uat?.county_name}
                </span>
              </span>
              <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                {entity.cui}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

function RefinedCell({ entry, index }: { readonly entry: LandingEntry; readonly index: number }) {
  const Icon = entry.icon
  return (
    <div className="-ml-px -mt-px border-l border-t">
      <Link
        to={entry.to}
        preload="intent"
        className="group flex h-full flex-col p-5 transition-colors hover:bg-muted/40 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      >
        <span className="flex items-center justify-between">
          <Icon className="size-4 text-muted-foreground transition-colors group-hover:text-primary" />
          <MonoLabel className="text-muted-foreground/50 transition-colors group-hover:text-primary">
            {String(index).padStart(2, '0')}
          </MonoLabel>
        </span>
        <span className="mt-4 flex items-baseline gap-1.5 text-base font-semibold tracking-tight text-foreground">
          {entry.title}
          <ArrowRight className="size-3.5 -translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
        </span>
        <span className="mt-1.5 block text-sm leading-snug text-muted-foreground">
          {entry.blurb}
        </span>
      </Link>
    </div>
  )
}

/**
 * A group's widest column count: whichever of three or two leaves fewer empty
 * cells, preferring three on a tie.
 *
 * `DESIGN.md` requires the lattice to close as a rectangle, so a short final
 * row has to be filled rather than left ragged. At a fixed three columns that
 * rule produced the sparsest parts of the page — `Politică` was one tile beside
 * two blanks, `Banii publici` put PNRR alone on a second row. Choosing the
 * count per group keeps the rule and removes the holes: 4 → 2×2, 2 → 1×2,
 * 3 and 6 → three across.
 */
type GroupImage = {
  readonly src: string
  /**
   * Whether the picture is cropped to its cell or fitted inside it.
   *
   * The choice is about whether a crop reads as framing or as damage. Justitia
   * is a figure running out of frame already, so a top-anchored crop reads as a
   * portrait. The leu is a complete object on a pedestal — crop it and it looks
   * broken, so it is fitted and the card shows through around it. Both are
   * cut-outs on transparency; neither brings a ground of its own.
   */
  readonly fit: 'cover' | 'contain'
  /** `object-position`. Load-bearing under `cover`, where the crop decides what survives. */
  readonly position: string
  /** Which side of the entries the picture sits on. */
  readonly side: 'left' | 'right'
  /**
   * The box on mobile, where the picture runs full width and has no sibling row
   * to take its height from. Roughly the source's own proportions, or a fitted
   * subject sits in mostly empty card.
   */
  readonly mobileAspect: string
}

/**
 * Illustrations, keyed by group. Skin rather than content, so they live here
 * and not in `home.data.ts`, which round one shares and which describes what
 * the surfaces *are*.
 *
 * Two things worth carrying with this map.
 *
 * Allegory generates safely; real institutions do not. A Justitia, a stone lion
 * and a balance have no referent to get wrong. A rendered Palace of the
 * Parliament that is almost right would undercut the one thing this platform
 * sells — that what you are shown is the actual record.
 *
 * And these are cropped to their alpha bounding box before encoding. Under
 * `contain` it is the empty margin in the file, not any CSS, that decides how
 * large the subject renders; trimming it there enlarges the subject at every
 * breakpoint, where a CSS scale could only do the same by risking a clip
 * wherever the cell is narrowest.
 */
const GROUP_IMAGES: Record<string, GroupImage | undefined> = {
  // The leu, in both senses — the stone lion and the currency. The widest group
  // at four entries, so its cell comes out the tallest and narrowest of the
  // three, which is what a seated figure on a pedestal wants.
  bani: {
    src: leu,
    fit: 'contain',
    position: '50% 50%',
    side: 'left',
    // 4:5 against the source's own 0.807, so mobile barely letterboxes.
    mobileAspect: 'aspect-4/5',
  },
  // On the right, so the three pictures alternate down the page rather than
  // stacking along one edge.
  //
  // The span is derived from the visible entry count rather than written here,
  // which matters most for this group: Întreprinderi publice sits behind a
  // mock-data gate, so it is three entries tall today and four when that gate
  // opens.
  institutii: {
    src: balanta,
    fit: 'contain',
    position: '50% 50%',
    side: 'right',
    // 4:5 against the cropped source's own 0.805.
    mobileAspect: 'aspect-4/5',
  },
  // Anchored to the very top. Centring lands on drapery, and anything below the
  // top edge slices the head off at desktop widths, where the cell is at its
  // shortest and the visible window is a thin band. The source carries a little
  // air above the head, so '0%' reads as headroom rather than a crop.
  lege: {
    src: justitia,
    fit: 'cover',
    position: '50% 0%',
    side: 'left',
    mobileAspect: 'aspect-4/3',
  },
}

/**
 * Rows a picture spans, by how many entries it stands beside — it has to reach
 * the bottom of the stack.
 *
 * A table of literals rather than an interpolated class, because Tailwind
 * generates only what it can see written out. Derived from the *visible* entry
 * count at render, not stored per image: a gate can drop an entry, and a span
 * fixed at authoring time would leave the picture hanging short of the group.
 */
const ROW_SPAN: Record<number, string | undefined> = {
  1: 'sm:row-span-1',
  2: 'sm:row-span-2',
  3: 'sm:row-span-3',
  4: 'sm:row-span-4',
  5: 'sm:row-span-5',
  6: 'sm:row-span-6',
}

const columnsFor = (length: number) => {
  const fillersAt = (columns: number) => (columns - (length % columns)) % columns
  return fillersAt(2) < fillersAt(3) ? 2 : 3
}

function RefinedLattice({ groups }: { readonly groups: readonly LandingGroup[] }) {
  let running = 0
  return (
    <div className="space-y-12">
      {groups.map((group, groupIndex) => {
        const start = running
        running += group.entries.length
        const image = GROUP_IMAGES[group.key]
        const columns = columnsFor(group.entries.length)
        // An illustrated group closes its own rectangle: the picture spans
        // every row of a narrow first column and the entries stack beside it,
        // so `columnsFor` and its fillers do not apply.
        const fillers = image ? 0 : (columns - (group.entries.length % columns)) % columns
        return (
          <section key={group.key} aria-labelledby={`group-${group.key}`}>
            <div className="flex items-center gap-3">
              <MonoLabel className="text-primary">{String(groupIndex + 1).padStart(2, '0')}</MonoLabel>
              {/* A heading, not a styled span: the index is the page's outline. */}
              <h3 id={`group-${group.key}`}>
                <MonoLabel className="text-foreground">{group.title}</MonoLabel>
              </h3>
              <span aria-hidden="true" className="h-px flex-1 bg-border" />
              <MonoLabel className="text-muted-foreground/60 tabular-nums">
                {String(group.entries.length).padStart(2, '0')}
              </MonoLabel>
            </div>
            <div
              className={cn(
                'mt-4 grid grid-cols-1 border',
                image
                  ? image.side === 'right'
                    ? 'sm:grid-cols-[minmax(0,8fr)_minmax(0,4fr)]'
                    : 'sm:grid-cols-[minmax(0,4fr)_minmax(0,8fr)]'
                  : cn('sm:grid-cols-2', columns === 3 && 'lg:grid-cols-3'),
              )}
            >
              {image ? (
                /* The cell's height comes from the two entries beside it, which
                   is a track height a percentage cannot resolve against — so
                   `h-full` on the image would leave it at its natural 1100px
                   and blow the row open. Absolute inside a clipped cell instead.
                   The aspect ratio is only for the stacked mobile layout, where
                   there is no sibling row to take height from; 4:3 rather than
                   3:2 because a portrait subject needs the height back once it
                   is running full-bleed. */
                <div
                  className={cn(
                    'relative -ml-px -mt-px overflow-hidden border-l border-t sm:aspect-auto',
                    image.mobileAspect,
                    ROW_SPAN[group.entries.length],
                    // The picture stays first in the DOM either way, so it
                    // leads on mobile. Placing it explicitly in the second
                    // column is what sends it right: the entries then auto-fill
                    // the column it left empty, which row-major flow would
                    // otherwise have scattered across both.
                    image.side === 'right' && 'sm:col-start-2 sm:row-start-1',
                  )}
                >
                  <img
                    src={image.src}
                    /* Decorative: the group heading beside it already names the
                       section, so announcing the picture would only make a
                       screen reader say the same thing twice. */
                    alt=""

                    loading="lazy"
                    decoding="async"
                    className={cn(
                      'absolute inset-0 size-full',
                      // Padding on the element rather than the cell: the image
                      // is absolutely positioned, so the cell's own padding
                      // would not reach it, but `object-contain` fits inside
                      // the content box.
                      image.fit === 'contain' ? 'object-contain p-2' : 'object-cover',
                    )}
                    style={{ objectPosition: image.position }}
                  />
                </div>
              ) : null}
              {group.entries.map((entry, i) => (
                <RefinedCell key={entry.title} entry={entry} index={start + i + 1} />
              ))}
              {Array.from({ length: fillers }, (_, i) => (
                <div
                  key={i}
                  className={cn(
                    '-ml-px -mt-px hidden border-l border-t',
                    columns === 3 ? 'lg:block' : 'sm:block',
                  )}
                />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}

function RefinedLanding() {
  const { groups, coverage } = getPlatformCoverage()
  const heroRef = useFieldMotion()
  // The light measures the page it runs down, so it takes the root rather than
  // being handed coordinates.
  const rootRef = useScrollLight()

  return (
    <div ref={rootRef} className="w-full bg-background" data-dev-marker={PROTOTYPE_MARKER}>
      <ScrollLightStyles />
      <ScrollLight />
      {/* Hero — open band. */}
      <section ref={heroRef} className={cn('relative overflow-hidden border-b', FIELD_HOST_CLASS)}>
        <FieldAnimationStyles />
        <TwoLayerLattice idPrefix="refined-hero" />
        {/* The grid pixelating at the margins — filled cells on the same 24px
            module the minor lattice is drawn on, so it reads as one system
            rather than a texture laid over one.

            Shown only from 1800px up. The threshold is about the margin beside
            the 1152px frame, not about "desktop": at 1506 that margin is 148px,
            which is too narrow to hold the field without crowding the headline,
            and narrow enough that the particle tail — which starts 240px in —
            is clipped away entirely, leaving the square band alone and the
            animation compressed into a fraction of its schedule. By 1800 the
            margin is around 290px and both the tail and the timing have room.
            Below it the hero simply keeps the plain lattice. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 hidden min-[1800px]:block"
        >
          {/* Clipped to 1.45x the margin beside the 1152px frame, so the tail
              carries a little past the frame while the squares stay in the
              margin.

              The overflow is a *proportion* of the margin rather than a fixed
              150px, which is what it used to be. At 1920 that fixed value was
              a fraction of a 360px margin and looked right; at 1506 the margin
              is only 148px, so the clip came out at 298px while the headline
              starts at 156px — the field ran over the first 140px of the
              headline. Scaling with the margin keeps the same relationship at
              every width.

              The mask reaches zero at roughly 76% of that width, and the frame
              edge sits at 69%, so whatever crosses into the content column is
              down to about a tenth of its weight. The field is drawn at its
              natural 24px scale rather than stretched, because scaling would
              break alignment with the lattice underneath. */}
          <div
            className="absolute inset-y-0 left-0 w-[calc((100%-72rem)/2*1.45)] overflow-hidden"
            style={FIELD_MASK.left}
          >
            <PixelField edge="left" layer="squares" className="left-0 top-0" />
            <PixelField edge="left" layer="particles" className="left-0 top-0" />
          </div>
          <div
            className="absolute inset-y-0 right-0 w-[calc((100%-72rem)/2*1.45)] overflow-hidden"
            style={FIELD_MASK.right}
          >
            <PixelField edge="right" layer="squares" className="right-0 top-0" />
            <PixelField edge="right" layer="particles" className="right-0 top-0" />
          </div>
        </div>
        <Frame marker="hero" className="py-12 sm:py-20 lg:py-24">
          <CornerTicks />
          <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12 lg:gap-8">
            <div className="min-w-0 lg:col-span-7">
              {/* The brand, not a slogan about the brand. The mark is the one
                  already in the sidebar, so the landing and the shell agree. */}
              {/* The mark is centred against the text block, but the wordmark,
                  the separator and the country sit on a shared baseline — with
                  `items-center` the 10px uppercase label centres on its own box
                  and rides high against the 14px wordmark beside it. */}
              <span className="flex items-center gap-2.5">
                <img
                  src={logo}
                  alt=""
                  aria-hidden="true"
                  className="size-5 shrink-0 rounded-sm"
                />
                {/* Spacing is deliberately uneven: the flag belongs to
                    "România", so it sits close to the word it qualifies and
                    well clear of the wordmark. An equal gap on both sides made
                    it read as a separator floating between two equals. */}
                <span className="flex items-baseline">
                  <span className="text-sm font-semibold tracking-tight text-foreground">
                    Transparenta.eu
                  </span>
                  <RomanianFlag className="ml-4" />
                  <MonoLabel className="ml-1.5 text-muted-foreground">România</MonoLabel>
                </span>
              </span>
              <h1 className="mt-6 text-[2.75rem] font-extrabold leading-[0.92] tracking-tighter text-foreground sm:text-6xl lg:text-7xl">
                Banii publici,
                <br />
                la vedere.
              </h1>
              <p className="mt-5 max-w-[40ch] text-lg leading-relaxed text-muted-foreground sm:text-xl">
                Bugete, contracte, investiții, legi și dosare — din surse
                oficiale, cu proveniența fiecărei cifre.
              </p>
              <div className="mt-6 sm:mt-7">
                <RefinedSearch />
              </div>
              {/* Balances the column against the taller panel, and gives the
                  three heaviest surfaces a direct route out of the hero. The
                  label sits on its own line below `sm`, where keeping it inline
                  pushed one shortcut onto a second row on its own. */}
              <nav aria-label="Scurtături" className="mt-4">
                <MonoLabel className="block text-muted-foreground/70 sm:inline sm:align-middle">
                  Sau mergi direct la
                </MonoLabel>
                <span className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 sm:ml-4 sm:mt-0 sm:inline-flex sm:align-middle">
                  {SHORTCUTS.map((shortcut) => (
                    <Link
                      key={shortcut.label}
                      to={shortcut.to}
                      preload="intent"
                      className="text-sm font-medium text-foreground underline-offset-4 transition-colors hover:text-primary hover:underline"
                    >
                      {shortcut.label}
                    </Link>
                  ))}
                </span>
              </nav>
            </div>
            <div className="min-w-0 lg:col-span-5">
              <StartHerePanel />
            </div>
          </div>
        </Frame>
      </section>

      {/* Facts — dense band. The scale of the thing being watched: what the
          country produces, what it spends, what it borrows, who it is for.
          Four official 2025 figures, each carrying its source and period,
          because `DESIGN.md` §Data Trust requires that beside every claim.

          A description list, because that is what it is — four terms and their
          values, not four decorative tiles. `dt` precedes `dd` in the DOM as
          the spec requires; `order` puts the value on top. */}
      <section className="border-b bg-muted/20" aria-label="România în cifre">
        <Frame>
          <CruxMarks />
          <dl className="grid grid-cols-2 lg:grid-cols-4">
            {NATIONAL_FACTS.map((fact, i) => (
              <div
                key={fact.label}
                className={cn(
                  'flex flex-col px-5 py-6 sm:py-7',
                  i % 2 === 1 && 'border-l',
                  i >= 2 && 'border-t lg:border-t-0',
                  i >= 1 && 'lg:border-l',
                )}
              >
                <dd className="order-1 flex items-baseline gap-1.5 text-3xl font-semibold tabular-nums tracking-tight text-foreground sm:text-4xl">
                  {formatFact(fact)}
                  {/* The unit never breaks across lines — 'mld.' alone on one
                      line and 'lei' on the next reads as two facts. */}
                  <span className="shrink-0 whitespace-nowrap text-sm font-medium tracking-normal text-muted-foreground">
                    {fact.unit}
                  </span>
                </dd>
                {/* Both lines live in the `dt` because a `dl` group admits only
                    `dt` and `dd`. The tile stretches to the row height, so
                    `mt-auto` drops the attribution to the bottom-left corner
                    and it lines up across all four regardless of how many lines
                    the label above it takes. */}
                <dt className="order-2 mt-2.5 flex flex-1 flex-col">
                  <MonoLabel className="block leading-relaxed text-foreground">
                    {fact.label}
                  </MonoLabel>
                  <MonoLabel className="mt-auto block pt-6 leading-relaxed text-muted-foreground">
                    {fact.source}
                  </MonoLabel>
                </dt>
              </div>
            ))}
          </dl>
        </Frame>
      </section>

      {/* Statement — open band. */}
      <section className="border-b">
        <Frame className="py-16 sm:py-20">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <MonoLabel className="text-primary">01 / Ce găsești aici</MonoLabel>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                Fiecare sursă,
                <br />
                într-un singur loc
              </h2>
            </div>
            <p className="text-base leading-relaxed text-muted-foreground lg:col-span-6 lg:col-start-7">
              Platforma acoperă banii publici de la bugetul de stat până la
              dosarul din instanță. Fiecare suprafață spune ce întrebare
              răspunde — și de unde vin cifrele.
            </p>
          </div>
        </Frame>
      </section>

      {/* Index — dense band. */}
      <section className="border-b">
        <Frame className="py-14">
          <RefinedLattice groups={groups} />
        </Frame>
      </section>

      {/* Provenance — the closing statement, and the home of every figure that
          describes *us* rather than the country. Saying "5 servite live" out of
          23 registered datasets only works next to the sentence that explains
          it; left in the strip it reads as a shortfall. `DESIGN.md` §Data Trust
          makes stating it at all a requirement. */}
      <section className="border-b">
        <Frame className="py-14 sm:py-16">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <MonoLabel className="text-primary">02 / Proveniență</MonoLabel>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                Fiecare cifră
                <br />
                își spune sursa
              </h2>
            </div>
            <div className="lg:col-span-6 lg:col-start-7">
              <p className="text-base leading-relaxed text-muted-foreground">
                Datele vin din surse oficiale — ANAF, Ministerul Finanțelor,
                SEAP, Monitorul Oficial, INS. Unele seturi sunt încă în curs de
                conectare și sunt marcate ca atare acolo unde apar. Nicio cifră
                nu este prezentată fără să spună de unde vine și din ce
                perioadă.
              </p>
              <ul className="mt-7 flex flex-wrap gap-x-6 gap-y-3 border-t pt-5">
                {coverage.map((item) => (
                  <li key={item.label}>
                    <MonoLabel className="text-muted-foreground">
                      <span className="text-foreground tabular-nums">
                        {item.value}
                      </span>{' '}
                      {item.label}
                    </MonoLabel>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Frame>
      </section>

      <section>
        <Frame className="py-12">
          <div className="space-y-4">
            <CampaignLandingShareCard className="w-full" />
            <ParliamentPromoCard className="w-full" />
          </div>
        </Frame>
      </section>
    </div>
  )
}

/**
 * The landing. One version now: the motion questions the variants existed to
 * answer are settled, so the page carries the intro wave, the click ripple and
 * the scroll light together rather than offering them as alternatives.
 */
export const LandingRefs = RefinedLanding
