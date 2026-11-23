import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { Trans, useLingui } from '@lingui/react/macro'
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
  /** How far forward the picture sits. See `GroupPicture`. */
  readonly zoom?: number
  /**
   * `object-position`, and the point the zoom grows from. Load-bearing under
   * `cover`, where the crop decides what survives.
   */
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
  // The leu, in both senses — the stone lion and the currency.
  bani: {
    src: leu,
    avif: leuAvif,
    width: 760,
    height: 942,
    // A portrait, cropped from the top: the head is always whole and the
    // cell's edge takes the plinth. `12px` rather than `0%`: the file is
    // trimmed to the figure's outline, and the length is the air above the
    // mane. It was fitted and zoomed 1.2 from its centre, which cut the plinth
    // on a desktop and the head as well on a phone.
    position: '50% 12px',
    // At 1 the desktop cell, about square, cuts the figure exactly along the
    // paws, which reads as a mistake. A little closer and the cut falls across
    // the legs there and on a phone, and under the paws on a tablet.
    zoom: 1.12,
    side: 'left',
    // 4:5 against the source's own 0.807, so a phone crops almost nothing.
    mobileAspect: 'aspect-4/5',
  },
  // On the right, so the three pictures alternate down the page rather than
  // stacking along one edge.
  //
  // The span is derived from the visible entry count rather than written here:
  // a gated entry in this group would change its height.
  institutii: {
    src: atlas,
    avif: atlasAvif,
    width: 760,
    height: 1250,
    /*
     * The one whose proportions fight the cell: the desktop cell comes out
     * about square — 363x365 beside three entries — and this source is 0.608.
     * Fitted whole it would be 221px wide in a 363px box, a small statue
     * marooned in white space. Cropped, it fills the cell at the price of the
     * pedestal.
     *
     * Worth the price: what is lost is the base, and what survives is the globe
     * and the figure carrying it, which is the whole of what the picture is
     * for. Cropped from the top, with `14px` of air above the globe (the file
     * is trimmed to the figure's outline): the group's tab stands right over
     * this cell, and at the earlier `15%` the globe's crown was cut flat
     * against the tab's underside. The cut now falls across the shin on a
     * desktop and under the plinth on a tablet.
     */
    position: '50% 14px',
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

function SurfaceCell({ entry }: { readonly entry: LandingEntry }) {
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
        {/* The arrow is always there, at rest: a phone has no hover to
            reveal it, and a tile that only looks like a link once the pointer
            is on it does not look like one. */}
        <span className="flex items-center justify-between">
          <Icon aria-hidden="true" className="size-4 text-muted-foreground transition-colors group-hover:text-primary" />
          <ArrowRight
            aria-hidden="true"
            className="size-4 text-muted-foreground/40 transition-all group-hover:translate-x-0.5 group-hover:text-primary motion-reduce:transition-none"
          />
        </span>
        <span className="mt-4 block text-lg font-semibold leading-snug tracking-tight text-foreground">{i18n._(entry.title)}</span>
        <span className="mt-1 block text-sm leading-snug text-muted-foreground">
          {i18n._(entry.blurb)}
        </span>
      </Link>
    </div>
  )
}

export function SurfaceIndex({ groups }: { readonly groups: readonly LandingGroup[] }) {
  const { i18n } = useLingui()
  return (
    <div className="space-y-12">
      {/* The list's own heading, for the page outline only: on screen the
          groups' titles are enough. The words are the hero menu's. */}
      <h2 className="sr-only">
        <Trans>Toate secțiunile</Trans>
      </h2>
      {groups.map((group) => {
        const image = GROUP_IMAGES[group.key]
        const columns = columnsFor(group.entries.length)
        // An illustrated group closes its own rectangle: the picture spans
        // every row of a narrow first column and the entries stack beside it,
        // so `columnsFor` and its fillers do not apply.
        const fillers = image ? 0 : fillersFor(group.entries.length, columns)
        return (
          <section key={group.key} aria-labelledby={`group-${group.key}`}>
            {/* The title is a folder tab on the group's box: it shares the box's
                left rule and covers the box's top rule under itself (`-mb-px`
                over the page's own colour), so tab and box read as one sheet.

                A heading, not a styled span: the index is the page's outline.
                Its accessible name comes from the `sr-only` copy inside
                `ScrambleText`, so `aria-labelledby` above keeps resolving to
                the real title while the visible copy is still noise. */}
            <h3
              id={`group-${group.key}`}
              data-reveal
              className={cn(
                'relative z-10 -mb-px w-fit border border-b-0 bg-background px-4 py-2.5',
                // The tab stands over the picture, so it follows it to the
                // right. On a phone the picture is on top, full width, and
                // every tab stays on the left.
                image?.side === 'right' && 'sm:ml-auto',
              )}
            >
              {/* A size up from the label's own 10px: this one is a heading. */}
              <MonoLabel className="text-[0.8125rem] text-foreground">
                <ScrambleText>{i18n._(group.title)}</ScrambleText>
              </MonoLabel>
            </h3>
            <div
              {...{ [SECTION_LIGHT_ATTR]: '' }}
              className={cn(
                'grid grid-cols-1 border',
                // 5/7 between `sm` and `lg`, 4/8 from `lg`: at 768 a 4fr
                // column is 218px, too narrow for a picture as tall as four
                // entries. On the wider track the pictures show more of
                // themselves.
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
                    position={image.position}
                    width={image.width}
                    height={image.height}
                    zoom={image.zoom}
                  />
                </div>
              ) : null}
              {group.entries.map((entry) => (
                <SurfaceCell key={entry.to} entry={entry} />
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
