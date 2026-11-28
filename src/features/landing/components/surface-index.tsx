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
  /** Responsive width and horizontal alignment of the artwork. */
  readonly framing: string
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
 * The assets are trimmed to their silhouettes. Their widths leave room for
 * the complete subject in a tall cell and keep the focal point on screen when
 * a short cell crops the bottom.
 */
const GROUP_IMAGES: Record<string, GroupImage | undefined> = {
  // The leu, in both senses — the stone lion and the currency.
  bani: {
    src: leu,
    avif: leuAvif,
    width: 760,
    height: 942,
    // Center the mane on phones and keep the paws above the desktop crop.
    framing: 'w-[88%] max-sm:-translate-x-[4%] sm:w-[94%] lg:max-w-77',
    side: 'left',
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
    // Leave room for both the globe and Atlas's shoulders on a phone.
    framing: 'w-4/5 max-sm:-translate-x-[6%] sm:w-[92%]',
    side: 'right',
    mobileAspect: 'aspect-4/5',
  },
  lege: {
    src: justitia,
    avif: justitiaAvif,
    width: 760,
    height: 1140,
    // Anchor the desktop zoom on the raised scales and crop at the cell edge.
    framing: 'w-[90%] sm:w-[92%] lg:mt-0 lg:w-[max(92%,18.5rem)] lg:self-end lg:origin-top-right lg:-translate-x-1 lg:-translate-y-1 lg:scale-[1.22] lg:[&>img]:origin-top-right',
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
                    // The stacked cell has a height cap so the entries stay
                    // close to their illustration on wider phones.
                    'relative -ml-px -mt-px w-full max-h-[min(70vw,22rem)] overflow-hidden border-l border-t sm:aspect-auto sm:max-h-none',
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
                    framing={image.framing}
                    width={image.width}
                    height={image.height}
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
