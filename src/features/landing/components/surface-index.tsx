import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { useLingui } from '@lingui/react/macro'
import leu from '@/assets/images/landing-leu.webp'
import leuAvif from '@/assets/images/landing-leu.avif'
import atlas from '@/assets/images/landing-atlas.webp'
import atlasAvif from '@/assets/images/landing-atlas.avif'
import justitia from '@/assets/images/landing-justitia.webp'
import justitiaAvif from '@/assets/images/landing-justitia.avif'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { cn } from '@/lib/utils'
import type { LandingEntry, LandingGroup } from '@/features/landing/lib/landing-groups'
import { columnsFor, fillersFor } from '@/features/landing/lib/surface-layout'
import { GroupPicture, PICTURE_ATTR } from './image-reveal'
import { ScrambleText } from './scramble-text'
import { SECTION_LIGHT_ATTR } from './section-light'

/**
 * The index: every surface the app serves, grouped by the question it answers,
 * laid out as a lattice that closes as a rectangle.
 */

type GroupImage = {
  readonly src: string
  /** The same picture in AVIF, offered ahead of the WebP. */
  readonly avif: string
  /** The art's own pixels. See `GroupPicture` — the cell reserves the box. */
  readonly width: number
  readonly height: number
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
  readonly zoom?: number
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
 * and not in `landing-groups.ts`, which describes what the surfaces *are*.
 *
 * Two things worth carrying with this map.
 *
 * Allegory generates safely; real institutions do not. A Justitia, a stone lion
 * and an Atlas have no referent to get wrong. A rendered Palace of the
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
    avif: leuAvif,
    width: 760,
    height: 942,
    fit: 'contain',
    // Sat low rather than centred. `contain` fits this one by width, which
    // leaves vertical slack, and centred in that slack the statue floated above
    // its own plinth line.
    position: '50% 82%',
    // The only picture that needs it: `contain` inside a cell as tall as the
    // four entries beside it left the statue small in a wide frame.
    zoom: 1.2,
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
    src: atlas,
    avif: atlasAvif,
    width: 760,
    height: 1250,
    /*
     * The only one of the three that is cropped on desktop rather than fitted,
     * because it is the only one whose proportions fight the cell.
     *
     * The desktop cell comes out about square — 363x365 beside three entries —
     * and this source is 0.608. Under 'contain' that fits to height and renders
     * the figure 221px wide in a 363px box, a small statue marooned in white
     * space. 'cover' fills it, at the price of the pedestal.
     *
     * Worth the price: what is lost is the base, and what survives is the globe
     * and the figure carrying it, which is the whole of what the picture is
     * for. '15%' rather than '0%' because anchoring the top gives the globe the
     * entire upper half and pushes the head to the middle; a little lower
     * trades the crown of the globe — which stays legible as a sphere even
     * clipped — for the head, the shoulders and a knee.
     */
    fit: 'cover',
    position: '50% 15%',
    side: 'right',
    /*
     * 4:5, which crops on a phone exactly as it does on the desktop row.
     *
     * It was 3:5 — near enough the source's own 0.608 that mobile got the whole
     * figure, pedestal included, which was the point. Measured on a 390x844
     * screen that box is 582px tall: 69% of the viewport for one decorative
     * picture, with the entries it illustrates pushed off the bottom entirely.
     * 4:5 brings it to 423 — half the screen — and costs the pedestal, which
     * the desktop crop had already given up.
     */
    mobileAspect: 'aspect-4/5',
  },
  // Anchored to the very top. Centring lands on drapery, and anything below the
  // top edge slices the head off at desktop widths, where the cell is at its
  // shortest and the visible window is a thin band. The source carries a little
  // air above the head, so '0%' reads as headroom rather than a crop.
  lege: {
    src: justitia,
    avif: justitiaAvif,
    width: 760,
    height: 1140,
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

function SurfaceCell({ entry, index }: { readonly entry: LandingEntry; readonly index: number }) {
  const { i18n } = useLingui()
  const Icon = entry.icon
  return (
    // The cell arrives, not its text: fading the title and the blurb separately
    // inside a bordered box leaves the box sitting there empty first, which
    // reads as a loading state rather than as an entrance.
    <div data-reveal className="-ml-px -mt-px border-l border-t">
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
          {i18n._(entry.title)}
          <ArrowRight className="size-3.5 -translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
        </span>
        <span className="mt-1.5 block text-sm leading-snug text-muted-foreground">
          {i18n._(entry.blurb)}
        </span>
      </Link>
    </div>
  )
}

export function SurfaceIndex({ groups }: { readonly groups: readonly LandingGroup[] }) {
  const { i18n } = useLingui()
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
        const fillers = image ? 0 : fillersFor(group.entries.length, columns)
        return (
          <section key={group.key} aria-labelledby={`group-${group.key}`}>
            <div data-reveal className="flex items-center gap-3">
              <MonoLabel className="text-primary">{String(groupIndex + 1).padStart(2, '0')}</MonoLabel>
              {/* A heading, not a styled span: the index is the page's outline.
                  Its accessible name comes from the `sr-only` copy inside
                  `ScrambleText`, so `aria-labelledby` above keeps resolving to
                  the real title while the visible copy is still noise. */}
              <h3 id={`group-${group.key}`}>
                <MonoLabel className="text-foreground">
                  <ScrambleText>{i18n._(group.title)}</ScrambleText>
                </MonoLabel>
              </h3>
              <span aria-hidden="true" className="h-px flex-1 bg-border" />
              <MonoLabel className="text-muted-foreground/60 tabular-nums">
                {String(group.entries.length).padStart(2, '0')}
              </MonoLabel>
            </div>
            <div
              {...{ [SECTION_LIGHT_ATTR]: '' }}
              className={cn(
                'mt-4 grid grid-cols-1 border',
                // 5/7 between `sm` and `lg`, 4/8 from `lg`. At 768 the 4fr
                // column is 218px, and the lion — a `contain` fit in a cell as
                // tall as four entries — rendered 300px tall at the foot of a
                // 544px box with 240px of nothing above it. On the wider track
                // it is 382px tall under 179px of air: a quarter more statue,
                // and the slack is what the fit costs, not what the track
                // does. The cropped pictures simply show more of themselves.
                image
                  ? image.side === 'right'
                    ? 'sm:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:grid-cols-[minmax(0,8fr)_minmax(0,4fr)]'
                    : 'sm:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)]'
                  : cn('sm:grid-cols-2', columns === 3 && 'lg:grid-cols-3'),
              )}
            >
              {image ? (
                /* The cell's height comes from the two entries beside it, which
                   is a track height a percentage cannot resolve against — so
                   `h-full` on the image would leave it at its natural 1100px
                   and blow the row open. Absolute inside a clipped cell instead.
                   The aspect ratio is only for the stacked mobile layout, where
                   there is no sibling row to take height from. */
                <div
                  {...{ [PICTURE_ATTR]: '' }}
                  className={cn(
                    // `max-h` only bites on a phone, where the cell takes its
                    // height from an aspect ratio rather than from the entries
                    // beside it. At 4:5 on a 390px screen the picture is 437px
                    // tall and pushes its own list off the bottom of the
                    // viewport; capped, the group arrives as one thing. The
                    // base zoom in `image-reveal.tsx` spends the height that
                    // buys back on the subject.
                    //
                    // `w-full` is load-bearing, not decoration. An element with
                    // an `aspect-ratio` and a `max-height` satisfies the ratio
                    // by *narrowing* when it is allowed to, so the cell came out
                    // 218px wide in a 349px column with the picture stranded
                    // beside a stripe of nothing. Fixing the width makes the cap
                    // do what it says.
                    'relative -ml-px -mt-px w-full max-h-[70vw] overflow-hidden border-l border-t sm:aspect-auto sm:max-h-none',
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
                  <GroupPicture
                    src={image.src}
                    avif={image.avif}
                    fit={image.fit}
                    position={image.position}
                    width={image.width}
                    height={image.height}
                    zoom={image.zoom}
                  />
                </div>
              ) : null}
              {group.entries.map((entry, i) => (
                <SurfaceCell key={entry.to} entry={entry} index={start + i + 1} />
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
