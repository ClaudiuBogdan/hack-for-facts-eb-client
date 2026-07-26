import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import {
  RAIL_READING_LINE_FRACTION,
  clusterInterventionRail,
  fanOutCluster,
  readingProgressFraction,
  segmentDomId,
  type StenogramInterventionMarker,
} from '../lib/stenogram-toc'
import {
  stenogramRailClassName,
  stenogramRailClusterClassName,
  stenogramRailClusterDensityClassName,
  stenogramRailFanClassName,
  stenogramRailHeadClassName,
  stenogramRailMarkerHitClassName,
  stenogramRailMarkerTickClassName,
  stenogramRailMarkerToneClassName,
  stenogramRailNodeClassName,
  stenogramRailNodeToneClassName,
  stenogramRailProgressClassName,
  stenogramRailSelectedCueClassName,
  stenogramRailTickYieldClassName,
  stenogramRailTooltipClassName,
  stenogramRailTrackClassName,
} from '../lib/stenogram-theme'

type Props = {
  readonly interventions: readonly StenogramInterventionMarker[]
  /** The block named by `?interventie=`, if it is a contribution. */
  readonly selectedPosition: number | undefined
  readonly onSelect: (intervention: StenogramInterventionMarker) => void
  /**
   * The element whose box measures the transcript — the reading region. The
   * progress fill is read from it, not from page scroll.
   */
  readonly readingRegionId?: string
  readonly className?: string
}

/**
 * The slot pitch: the smallest vertical distance at which two ticks still read
 * as two ticks. Everything closer than this collapses into one cluster.
 */
const SLOT_HEIGHT_PX = 8

/**
 * Visible tick height — the SAME for every marker state.
 *
 * There used to be a taller, wider tick for the two live states, and that is
 * what made the rail look like it had two progress positions: a live marker
 * near the reading line drew a second rule right beside it. Live states are now
 * told by the node (a dot/ring), never by growing the tick.
 */
const TICK_HEIGHT_PX = 3

/** Pitch a cluster's members are fanned to when it opens — a real hit target. */
const FAN_PITCH_PX = 12

/** Density buckets a cluster tick's width is drawn from. */
const MANY_THRESHOLD = 4
const CROWD_THRESHOLD = 8

/**
 * Track height before the client has measured the viewport — used for the first
 * render and for SSR, where there is no viewport to ask.
 */
const DEFAULT_RAIL_HEIGHT_PX = 640
const RAIL_VIEWPORT_INSET_PX = 128
const RAIL_MIN_HEIGHT_PX = 240
const RAIL_MAX_HEIGHT_PX = 1400

/**
 * The reading band the "you are here" marker is read from: a narrow band around
 * the reading line. Narrow on purpose — a band the height of the screen would
 * call a dozen contributions active at once on a dense sitting. Its top edge is
 * `RAIL_READING_LINE_FRACTION`, the same line the progress fill ends at — the
 * two are derived from one constant so they cannot drift apart.
 */
const READING_BAND_ROOT_MARGIN = `-${String(RAIL_READING_LINE_FRACTION * 100)}% 0px -45% 0px`

/** How far PageUp/PageDown jumps along the rail. */
const PAGE_STEP = 10

function densityOf(size: number): 'few' | 'many' | 'crowd' {
  if (size >= CROWD_THRESHOLD) return 'crowd'
  if (size >= MANY_THRESHOLD) return 'many'
  return 'few'
}

/**
 * The reading-progress rail — the sitting's contributions, on a scrollbar.
 *
 * WHY IT EXISTS. The agenda rail only works when the capture printed agenda
 * headings, and a great many of them did not: the 2001 Senate sittings are one
 * long undifferentiated column with no structure to navigate by. This rail is
 * derived from the document itself — the contributions in printed order — so it
 * gives those sittings a shape without inventing one. It carries no speaker
 * roster, no topic model and no summary: a tick, a printed name, an excerpt.
 *
 * WHAT IT IS. A scrollbar, not a list. The track is one viewport tall and never
 * scrolls inside itself, so a position on the rail IS a position in the
 * transcript; a continuous fill runs from the top of the sitting down to the
 * reading line, so "how far in am I" is answered before any tick is read.
 *
 * WHAT IT IS NOT. It never filters the document and never replaces it. Clicking
 * a tick goes through the same `?interventie=` selection every other affordance
 * uses, so the reading column keeps the contribution IN its debate and the URL
 * stays citable.
 *
 * ONE LINE, THEN SHAPES. The rail draws exactly one horizontal rule across the
 * track: the progress head, where the fill ends. Everything else is a compact
 * shape, because a second full-width bar — which is what the live and hover
 * ticks used to be — reads as a second reading position, and the reader has no
 * way to know which of the two is the truth. The contribution under the eye is
 * an accent DOT on the line; hover and focus are a small hollow RING; the one
 * named by the link is `aria-current` and carries a NOTCH on the outer edge, so
 * it stays legible as the SECONDARY state when the reader has scrolled away
 * from it. Arriving from a shared link and then reading on is the whole point
 * of the surface.
 *
 * DENSITY. See `clusterInterventionRail`: ticks are quantised onto fixed slots
 * so they cannot overlap, crowded slots draw one weighted tick, and hovering or
 * focusing a crowded slot fans it open so every contribution stays clickable.
 * Every contribution is a button at all times, whatever the drawing does.
 */
export function ParliamentStenogramInterventionRail({
  interventions,
  selectedPosition,
  onSelect,
  readingRegionId,
  className,
}: Props) {
  const [viewportHeight, setViewportHeight] = useState(DEFAULT_RAIL_HEIGHT_PX)
  const [inViewPosition, setInViewPosition] = useState<number | undefined>(
    undefined,
  )
  const [progress, setProgress] = useState(0)
  const [hoveredCluster, setHoveredCluster] = useState<number | undefined>(
    undefined,
  )
  const [focusedCluster, setFocusedCluster] = useState<number | undefined>(
    undefined,
  )
  const [rovingIndex, setRovingIndex] = useState<number | undefined>(undefined)
  const markerRefs = useRef(new Map<number, HTMLButtonElement>())

  const layout = useMemo(
    () =>
      clusterInterventionRail({
        fractions: interventions.map((intervention) => intervention.fraction),
        trackHeight: viewportHeight,
        slotHeight: SLOT_HEIGHT_PX,
      }),
    [interventions, viewportHeight],
  )

  // ── viewport height (client-only; never read during render) ──────────────
  useEffect(() => {
    const measure = () =>
      setViewportHeight(
        Math.min(
          RAIL_MAX_HEIGHT_PX,
          Math.max(
            RAIL_MIN_HEIGHT_PX,
            window.innerHeight - RAIL_VIEWPORT_INSET_PX,
          ),
        ),
      )
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  // ── the progress fill, from the reading region's own box ─────────────────
  // One passive scroll listener, coalesced into an animation frame, reading one
  // rect. Not an observer per block, and no layout work per tick.
  useEffect(() => {
    if (!readingRegionId) return
    const region = document.getElementById(readingRegionId)
    if (!region) return

    let frame = 0
    const read = () => {
      frame = 0
      const rect = region.getBoundingClientRect()
      setProgress(
        readingProgressFraction({
          regionTop: rect.top,
          regionHeight: rect.height,
          viewportHeight: window.innerHeight,
        }),
      )
    }
    const schedule = () => {
      if (frame === 0) frame = window.requestAnimationFrame(read)
    }

    read()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    return () => {
      if (frame !== 0) window.cancelAnimationFrame(frame)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
    }
  }, [readingRegionId, interventions])

  // ── "you are here", from ONE observer over the contribution blocks ───────
  // One IntersectionObserver for the whole document, created once per
  // transcript — not a scroll listener, and not an observer rebuilt as the
  // reader scrolls. The blocks carry `content-visibility:auto`, which skips
  // painting their contents but still lays out their boxes, so they stay
  // observable.
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return
    if (interventions.length === 0) return

    const positions = new Map<Element, number>()
    for (const intervention of interventions) {
      const node = document.getElementById(segmentDomId(intervention.position))
      if (node) positions.set(node, intervention.position)
    }
    if (positions.size === 0) return

    const inBand = new Set<number>()
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const position = positions.get(entry.target)
          if (position === undefined) continue
          if (entry.isIntersecting) inBand.add(position)
          else inBand.delete(position)
        }
        // The topmost block crossing the reading band. When the band falls
        // between two blocks we keep the last answer rather than blanking the
        // rail — a marker that flickers off mid-scroll is worse than one that
        // lags by a block.
        let topmost: number | undefined
        for (const position of inBand) {
          if (topmost === undefined || position < topmost) topmost = position
        }
        if (topmost !== undefined) setInViewPosition(topmost)
      },
      { rootMargin: READING_BAND_ROOT_MARGIN, threshold: 0 },
    )
    for (const node of positions.keys()) observer.observe(node)
    return () => observer.disconnect()
  }, [interventions])

  const readingIndex = useMemo(() => {
    if (inViewPosition === undefined) return -1
    return interventions.findIndex(
      (intervention) => intervention.position === inViewPosition,
    )
  }, [interventions, inViewPosition])

  const selectedIndex = useMemo(() => {
    if (selectedPosition === undefined) return -1
    return interventions.findIndex(
      (intervention) => intervention.position === selectedPosition,
    )
  }, [interventions, selectedPosition])

  // A crowded cluster is open while it is hovered, or while it holds focus.
  const expandedCluster = hoveredCluster ?? focusedCluster

  const fan = useMemo(() => {
    if (expandedCluster === undefined) return undefined
    const cluster = layout.clusters[expandedCluster]
    if (!cluster || cluster.indices.length < 2) return undefined
    const { tops, pitch } = fanOutCluster({
      size: cluster.indices.length,
      slotTop: cluster.top,
      slotHeight: layout.slotHeight,
      trackHeight: layout.trackHeight,
      pitch: FAN_PITCH_PX,
    })
    const byIndex = new Map<number, number>()
    cluster.indices.forEach((index, member) => {
      byIndex.set(index, tops[member] ?? cluster.top)
    })
    return {
      byIndex,
      pitch,
      top: tops[0] ?? cluster.top,
      height: cluster.indices.length * pitch,
    }
  }, [expandedCluster, layout])

  // ── ONE tab stop for the whole rail, arrows for the rest ─────────────────
  // A dense sitting would otherwise put several hundred tab stops between the
  // document and the page's footer navigation. The roving stop follows the
  // reading position, so tabbing into the rail lands where the reader is.
  const tabbableIndex =
    rovingIndex ??
    (readingIndex >= 0 ? readingIndex : selectedIndex >= 0 ? selectedIndex : 0)

  const moveFocus = useCallback(
    (next: number) => {
      const clamped = Math.min(interventions.length - 1, Math.max(0, next))
      setRovingIndex(clamped)
      markerRefs.current.get(clamped)?.focus()
    },
    [interventions.length],
  )

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      const from = tabbableIndex
      switch (event.key) {
        case 'ArrowDown':
        case 'ArrowRight':
          moveFocus(from + 1)
          break
        case 'ArrowUp':
        case 'ArrowLeft':
          moveFocus(from - 1)
          break
        case 'PageDown':
          moveFocus(from + PAGE_STEP)
          break
        case 'PageUp':
          moveFocus(from - PAGE_STEP)
          break
        case 'Home':
          moveFocus(0)
          break
        case 'End':
          moveFocus(interventions.length - 1)
          break
        default:
          return
      }
      event.preventDefault()
    },
    [tabbableIndex, moveFocus, interventions.length],
  )

  if (interventions.length === 0) return null

  const fillHeight = progress * layout.trackHeight

  return (
    <nav
      aria-label={t`Harta intervențiilor din ședință`}
      className={cn(stenogramRailClassName, className)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setFocusedCluster(undefined)
        }
      }}
    >
      <p className="sr-only">
        <Trans>
          Bara arată cât din stenogramă ai parcurs, iar fiecare reper este o
          luare de cuvânt, în ordinea din stenogramă. Unde ședința este densă,
          reperele apropiate sunt grupate și se desfac la focus. Folosește
          săgețile sus și jos pentru a trece de la o intervenție la alta;
          activarea unui reper deschide intervenția în textul integral, fără să
          ascundă restul dezbaterii.
        </Trans>
      </p>

      <TooltipProvider delayDuration={120} skipDelayDuration={200}>
        <div
          data-rail-track=""
          className={stenogramRailTrackClassName}
          style={{ height: layout.trackHeight }}
          onPointerLeave={() => setHoveredCluster(undefined)}
          onKeyDown={handleKeyDown}
        >
          {/* Read so far, and the line it ends at. */}
          <span
            aria-hidden
            data-rail-progress=""
            data-progress={String(Math.round(progress * 100))}
            className={stenogramRailProgressClassName}
            style={{ height: fillHeight }}
          />
          <span
            aria-hidden
            data-rail-head=""
            className={stenogramRailHeadClassName}
            style={{ top: fillHeight }}
          />

          {/* The paper a fanned-open cluster is drawn on. */}
          {fan ? (
            <span
              aria-hidden
              data-rail-fan=""
              className={stenogramRailFanClassName}
              style={{ top: fan.top - 2, height: fan.height + 4 }}
            />
          ) : null}

          {/* Collapsed clusters: one weighted tick, and the hover target that
              fans it open. Both are decoration — the semantics live on the
              per-contribution buttons below, which are never removed. */}
          {layout.clusters.map((cluster, clusterIndex) => {
            const size = cluster.indices.length
            if (size < 2) return null
            const open = expandedCluster === clusterIndex
            return (
              <span key={cluster.slot}>
                <span
                  aria-hidden
                  data-rail-cluster=""
                  data-size={String(size)}
                  className={cn(
                    stenogramRailClusterClassName,
                    stenogramRailClusterDensityClassName[densityOf(size)],
                    open && 'opacity-0',
                  )}
                  style={{
                    top: cluster.top + (layout.slotHeight - TICK_HEIGHT_PX) / 2,
                    height: TICK_HEIGHT_PX,
                  }}
                />
                {open ? null : (
                  <span
                    aria-hidden
                    data-rail-cluster-hit=""
                    className="absolute -left-1 -right-2 z-10"
                    style={{ top: cluster.top, height: layout.slotHeight }}
                    onPointerEnter={() => setHoveredCluster(clusterIndex)}
                  />
                )}
              </span>
            )
          })}

          {interventions.map((intervention, index) => {
            const clusterIndex = layout.clusterOfIndex[index] ?? 0
            const cluster = layout.clusters[clusterIndex]
            const crowded = (cluster?.indices.length ?? 1) > 1
            const fanned = fan?.byIndex.get(index)
            const open = fanned !== undefined

            return (
              <RailMarker
                key={intervention.segmentKey}
                intervention={intervention}
                top={fanned ?? cluster?.top ?? 0}
                height={open ? (fan?.pitch ?? FAN_PITCH_PX) : layout.slotHeight}
                selected={index === selectedIndex}
                reading={index === readingIndex}
                // A collapsed member of a crowded slot keeps its button — it is
                // simply not the pointer target while the slot stands for it.
                interactive={!crowded || open}
                tabbable={index === tabbableIndex}
                onFocus={() => {
                  setRovingIndex(index)
                  setFocusedCluster(clusterIndex)
                }}
                onSelect={onSelect}
                registerRef={(node) => {
                  if (node) markerRefs.current.set(index, node)
                  else markerRefs.current.delete(index)
                }}
              />
            )
          })}
        </div>
      </TooltipProvider>
    </nav>
  )
}

/**
 * One contribution, as a hit area with a tick inside it.
 *
 * The button owns the whole slot (or the whole fan step once its cluster is
 * open) and overhangs the track on both sides, so the target a reader has to
 * hit is always several times the tick they see.
 *
 * Inside it are two drawings with one job each. The TICK is the resting mark:
 * fixed width, fixed height, neutral, and it only ever fades. The NODE is every
 * emphasised state — the accent dot when this is the contribution being read,
 * a hollow ring when it is merely pointed at or focused. Splitting them is what
 * keeps emphasis off the tick's geometry, and therefore off the rail's one
 * horizontal line.
 */
function RailMarker({
  intervention,
  top,
  height,
  selected,
  reading,
  interactive,
  tabbable,
  onFocus,
  onSelect,
  registerRef,
}: {
  readonly intervention: StenogramInterventionMarker
  readonly top: number
  readonly height: number
  readonly selected: boolean
  readonly reading: boolean
  readonly interactive: boolean
  readonly tabbable: boolean
  readonly onFocus: () => void
  readonly onSelect: (intervention: StenogramInterventionMarker) => void
  readonly registerRef: (node: HTMLButtonElement | null) => void
}) {
  const { ordinal, speakerName, excerpt } = intervention
  // The name the transcript PRINTED, or the plain statement that it printed
  // none. Never a roster identity guessed from the surrounding turns.
  const speakerLabel = speakerName ?? t`Vorbitor netipărit în stenogramă`
  const live = reading || selected
  const tone = reading ? 'reading' : selected ? 'selected' : 'idle'

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          ref={registerRef}
          type="button"
          onClick={() => onSelect(intervention)}
          onFocus={onFocus}
          tabIndex={tabbable ? 0 : -1}
          aria-current={selected ? 'true' : undefined}
          data-rail-marker=""
          data-ordinal={String(ordinal)}
          data-state={tone}
          aria-label={
            reading
              ? t`Intervenția ${ordinal}: ${speakerLabel} — în dreptul lecturii`
              : t`Intervenția ${ordinal}: ${speakerLabel}`
          }
          className={cn(
            stenogramRailMarkerHitClassName,
            // A collapsed member of a crowded slot is still focusable and still
            // announced; it just is not what the pointer lands on until the
            // slot fans open. Focusing it opens the slot, so it can never be
            // focused while invisible.
            interactive ? 'pointer-events-auto' : 'pointer-events-none',
            live && 'z-10',
          )}
          style={{ top, height }}
        >
          <span
            aria-hidden
            data-rail-tick=""
            className={cn(
              stenogramRailMarkerTickClassName,
              stenogramRailMarkerToneClassName[tone],
              // The reading marker is told by its node, so its tick is not
              // drawn at all; every other tick fades out under the pointer or
              // focus rather than darkening into a bar.
              reading ? 'opacity-0' : stenogramRailTickYieldClassName,
              // A collapsed member draws nothing — its cluster's tick is
              // standing in for it — unless it is live. Focusing it before its
              // cluster has opened is answered by the node, not by the tick.
              !interactive && !live && 'opacity-0',
            )}
            style={{ height: TICK_HEIGHT_PX }}
          />
          <span
            aria-hidden
            data-rail-node=""
            data-node={reading ? 'reading' : 'cue'}
            className={cn(
              stenogramRailNodeClassName,
              stenogramRailNodeToneClassName[reading ? 'reading' : 'cue'],
            )}
          />
          {/* The deep link, only while it is somewhere OTHER than the reading
              position — once the reader arrives at it, the node says it. */}
          {selected && !reading ? (
            <span
              aria-hidden
              data-rail-selected-cue=""
              className={stenogramRailSelectedCueClassName}
            />
          ) : null}
        </button>
      </TooltipTrigger>
      <TooltipContent
        side="right"
        align="center"
        sideOffset={10}
        collisionPadding={12}
        className={stenogramRailTooltipClassName}
      >
        <p
          className={cn(
            'text-sm leading-5',
            speakerName
              ? 'font-bold'
              : 'italic text-[#505a5f] dark:text-[var(--pnrr-muted)]',
          )}
        >
          {speakerLabel}
        </p>
        <p className="mt-1 line-clamp-4 text-xs leading-5 text-[#505a5f] dark:text-[var(--pnrr-muted)]">
          {excerpt}
        </p>
      </TooltipContent>
    </Tooltip>
  )
}
