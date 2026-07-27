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
  clusterInterventionRail,
  segmentDomId,
  type StenogramInterventionMarker,
} from '../lib/stenogram-toc'
import {
  stenogramRailClassName,
  stenogramRailClusterClassName,
  stenogramRailClusterDensityClassName,
  stenogramRailMarkerHitClassName,
  stenogramRailMarkerTickClassName,
  stenogramRailMarkerToneClassName,
  stenogramRailTooltipClassName,
  stenogramRailTrackClassName,
} from '../lib/stenogram-theme'

type Props = {
  readonly interventions: readonly StenogramInterventionMarker[]
  /** The block named by `?interventie=`, if it is a contribution. */
  readonly selectedPosition: number | undefined
  readonly onSelect: (intervention: StenogramInterventionMarker) => void
  readonly className?: string
}

/** The tone a mark is drawn in — see `stenogramRailMarkerToneClassName`. */
type RailTone = 'idle' | 'inView' | 'reading' | 'selected'

/** The contiguous run of contributions the viewport currently holds. */
type VisibleRun = { readonly first: number; readonly last: number }

/**
 * The slot pitch: the smallest vertical distance at which two ticks still read
 * as two ticks. Everything closer than this collapses into one cluster.
 */
const SLOT_HEIGHT_PX = 8

/**
 * Visible tick height — the SAME for every marker state.
 *
 * There used to be a taller, wider tick for the live states, and that is what
 * made the rail look like it had two progress positions: a live marker near the
 * reading line drew a second rule right beside it. States are told in colour and
 * weight, never by growing a mark's height.
 */
const TICK_HEIGHT_PX = 3

/** Density buckets a cluster tick's width is drawn from. */
const MANY_THRESHOLD = 4
const CROWD_THRESHOLD = 8

/**
 * How far the wave reaches, in pixels of track. Wide on purpose: the point is a
 * swell across the rail, not a spotlight on one tick, and a wide swell is also
 * what makes the rail feel aimed — the reader sees the crest coming several
 * marks before the pointer arrives. At an 8px slot pitch this leans roughly two
 * dozen marks at once.
 */
const WAVE_RADIUS_PX = 104

/**
 * Track height before the client has measured the viewport — used for the first
 * render and for SSR, where there is no viewport to ask.
 */
const DEFAULT_RAIL_HEIGHT_PX = 560

/**
 * What the track gives back to the viewport it hangs in: the 96px sticky offset
 * above it, then the 12px gap, the 40px "back to the top" button hung off its
 * foot, and 60px of air under that. Take any of it and the button lands on or
 * under the fold — the rail has to end while there is still room for the
 * control that follows it, with enough clearance that the two read as a column
 * rather than as a bar jammed against the bottom of the screen.
 */
const RAIL_VIEWPORT_INSET_PX = 208
const RAIL_MIN_HEIGHT_PX = 240
const RAIL_MAX_HEIGHT_PX = 1400

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
 * transcript.
 *
 * WHAT IT IS NOT. It never filters the document and never replaces it. Clicking
 * a tick goes through the same `?interventie=` selection every other affordance
 * uses, so the reading column keeps the contribution IN its debate and the URL
 * stays citable.
 *
 * BARS, AND NOTHING BUT. No border, no paper, no wash, no rule, no dot. Every
 * surface this rail used to draw was a box around something the marks already
 * said, and each one had to be told apart from the marks before it could be
 * read. Where the reader is now is a RUN OF ACCENT BARS — the contributions the
 * viewport holds — with the topmost of them, the section being read, at full
 * weight. Its length is how much of the sitting fits on a screen and its
 * position is how far in the reader has come, so it answers "how far am I"
 * without a filled rectangle claiming the rail's whole width to say it.
 *
 * THE WAVE. Pointing at the rail raises a swell around the pointer — each mark
 * lengthens by its distance to it, so the rail leans as one motion and the mark
 * under the pointer is the crest of it. It is written straight to the DOM as a
 * `--rail-wave` custom property inside one animation frame, never through React
 * state: a dense sitting is several hundred marks, and re-rendering them per
 * pointer move would stutter exactly when the reader is scrubbing. Keyboard
 * focus raises the same swell at the focused mark, so the rail answers the
 * arrow keys the way it answers the pointer.
 *
 * NOTHING EVER MOVES. Every mark sits at the position its contribution has in
 * the sitting and stays there: the wave changes how long and how dark a mark
 * is, never where it is. Crowded slots used to fan their turns apart on hover,
 * which slid marks out from under the pointer at the exact moment the reader
 * was aiming at one — a rail that rearranges itself when you approach it cannot
 * be aimed at. Clicking leaves nothing behind either: the clicked bar becomes
 * the accent one because the reader is now there, and that is the whole answer.
 *
 * NO HORIZONTAL RULES. A mark may gain length and weight, never height. The
 * reader once read a rail with two full-width bars on it as having two reading
 * positions, with no way to tell which was true; keeping every state inside one
 * fixed height is what makes that unrepeatable.
 *
 * DENSITY. See `clusterInterventionRail`: turns are quantised onto fixed slots
 * so they cannot overlap, and a crowded slot draws ONE bar weighted by how many
 * turns it stands for. The pointer lands on the first turn of that stretch —
 * five turns cannot share one 8px target, and the first is the only one a
 * reader can name from the rail. Every contribution stays a button, so the
 * keyboard still walks the sitting turn by turn.
 */
export function ParliamentStenogramInterventionRail({
  interventions,
  selectedPosition,
  onSelect,
  className,
}: Props) {
  const [viewportHeight, setViewportHeight] = useState(DEFAULT_RAIL_HEIGHT_PX)
  const [visibleRun, setVisibleRun] = useState<VisibleRun | undefined>(undefined)
  const [rovingIndex, setRovingIndex] = useState<number | undefined>(undefined)
  const markerRefs = useRef(new Map<number, HTMLButtonElement>())

  const trackRef = useRef<HTMLDivElement | null>(null)
  /** Where the pointer is, in client coordinates — undefined once it leaves. */
  const pointerClientY = useRef<number | undefined>(undefined)
  /** Where the keyboard is, in track coordinates. The pointer outranks it. */
  const focusCenter = useRef<number | undefined>(undefined)
  const waveFrame = useRef(0)
  /** Every mark currently drawn, with its centre in track coordinates. */
  const waveTargets = useRef<readonly { el: HTMLElement; center: number }[]>([])
  /** The marks carrying a wave right now, so they can be cleared exactly once. */
  const wavePainted = useRef(new Set<HTMLElement>())

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

  // ── what is on screen, from ONE observer over the contribution blocks ────
  // One IntersectionObserver for the whole document, created once per
  // transcript — not a scroll listener, and not an observer rebuilt as the
  // reader scrolls. The blocks carry `content-visibility:auto`, which skips
  // painting their contents but still lays out their boxes, so they stay
  // observable.
  //
  // The root is the viewport itself, not a narrow band inside it: the run of
  // accent bars IS the reader's window onto the sitting, so it has to be
  // measured against the actual window. Contributions are observed in printed
  // order and the viewport is contiguous, so the run only ever needs its two
  // ends — which is also what keeps this to one small state change per block
  // boundary instead of a set that churns on every scroll tick.
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return
    if (interventions.length === 0) return

    const indexOfNode = new Map<Element, number>()
    interventions.forEach((intervention, index) => {
      const node = document.getElementById(segmentDomId(intervention.position))
      if (node) indexOfNode.set(node, index)
    })
    if (indexOfNode.size === 0) return

    const onScreen = new Set<number>()
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const index = indexOfNode.get(entry.target)
          if (index === undefined) continue
          if (entry.isIntersecting) onScreen.add(index)
          else onScreen.delete(index)
        }
        // Between two blocks — a long stretch of debate with no contribution in
        // it — we keep the last answer rather than blanking the rail. A run
        // that flickers off mid-scroll is worse than one that lags by a block.
        if (onScreen.size === 0) return
        let first = Number.POSITIVE_INFINITY
        let last = Number.NEGATIVE_INFINITY
        for (const index of onScreen) {
          if (index < first) first = index
          if (index > last) last = index
        }
        setVisibleRun((current) =>
          current?.first === first && current.last === last
            ? current
            : { first, last },
        )
      },
      { threshold: 0 },
    )
    for (const node of indexOfNode.keys()) observer.observe(node)
    return () => observer.disconnect()
  }, [interventions])

  // The section being read: the topmost contribution on screen.
  const readingIndex = visibleRun?.first ?? -1

  const selectedIndex = useMemo(() => {
    if (selectedPosition === undefined) return -1
    return interventions.findIndex(
      (intervention) => intervention.position === selectedPosition,
    )
  }, [interventions, selectedPosition])

  // ── every pixel of the rail belongs to some contribution ─────────────────
  // A 3px bar is not a target, and the gaps between bars were dead: a reader
  // aiming at a turn had to hit a hairline, and missing it did nothing at all.
  // So the track is PARTITIONED — each turn that takes the pointer owns the
  // band running halfway to the turn above it and halfway to the one below,
  // and the first and last own the ends outright. Clicking anywhere on the rail
  // now selects the nearest contribution, which is the only thing a click on a
  // gap could honestly mean.
  //
  // The band is the hit area only. The bar stays drawn at its own position
  // inside it, and the wave still crests on the bar rather than on the band's
  // middle — the reader must not see a mark move because the space around it
  // grew.
  const hitBands = useMemo(() => {
    const marks: { index: number; center: number }[] = []
    interventions.forEach((_, index) => {
      const cluster = layout.clusters[layout.clusterOfIndex[index] ?? 0]
      // One target per SLOT: the members of a crowded slot cannot each own a
      // band inside a slot they already had to share.
      if (cluster && cluster.indices.length > 1 && cluster.indices[0] !== index)
        return
      marks.push({
        index,
        center: (cluster?.top ?? 0) + layout.slotHeight / 2,
      })
    })

    const bands = new Map<number, { top: number; height: number }>()
    marks.forEach((mark, order) => {
      const previous = marks[order - 1]
      const next = marks[order + 1]
      const top = previous ? (previous.center + mark.center) / 2 : 0
      const bottom = next ? (mark.center + next.center) / 2 : layout.trackHeight
      bands.set(mark.index, { top, height: Math.max(1, bottom - top) })
    })
    return bands
  }, [interventions, layout])

  // ── the wave, written straight to the DOM ────────────────────────────────
  // Style writes only, and only on the handful of marks inside the wave's
  // reach: `--rail-wave` drives `scale`/`opacity`, neither of which touches
  // layout, so a pointer running the length of a dense sitting stays on the
  // compositor. Marks outside the reach are read (cheap arithmetic) but not
  // written, and a mark that has just left it is cleared exactly once.
  const paintWave = useCallback((center: number | undefined) => {
    const next = new Set<HTMLElement>()
    if (center !== undefined) {
      for (const target of waveTargets.current) {
        const distance = Math.abs(target.center - center)
        if (distance >= WAVE_RADIUS_PX) continue
        const strength = Math.cos((distance / WAVE_RADIUS_PX) * (Math.PI / 2))
        target.el.style.setProperty('--rail-wave', strength.toFixed(3))
        next.add(target.el)
      }
    }
    for (const el of wavePainted.current) {
      if (!next.has(el)) el.style.removeProperty('--rail-wave')
    }
    wavePainted.current = next
  }, [])

  // The track is sticky, so its box moves under the page as the reader
  // scrolls — the pointer is kept in client coordinates and converted once per
  // frame rather than at the moment of the event.
  const readWave = useCallback(() => {
    waveFrame.current = 0
    const track = trackRef.current
    const pointer = pointerClientY.current
    if (track && pointer !== undefined) {
      paintWave(pointer - track.getBoundingClientRect().top)
      return
    }
    paintWave(focusCenter.current)
  }, [paintWave])

  const scheduleWave = useCallback(() => {
    if (waveFrame.current !== 0) return
    waveFrame.current = window.requestAnimationFrame(readWave)
  }, [readWave])

  // Re-collect only when the LAYOUT changes — a resize, or a different sitting.
  // Nothing else can move a mark or change which marks are drawn: that is the
  // whole point of a rail with no fan in it. One DOM query per resize, never
  // per frame and never per scroll.
  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    waveTargets.current = Array.from(
      track.querySelectorAll<HTMLElement>('[data-rail-wave]'),
    ).map((el) => ({ el, center: Number(el.dataset.waveCenter ?? 0) }))
    readWave()
  }, [layout, readWave])

  useEffect(
    () => () => {
      if (waveFrame.current !== 0) {
        window.cancelAnimationFrame(waveFrame.current)
      }
    },
    [],
  )

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

  const inView = (index: number) =>
    visibleRun !== undefined &&
    index >= visibleRun.first &&
    index <= visibleRun.last

  return (
    <nav
      aria-label={t`Harta intervențiilor din ședință`}
      className={cn(stenogramRailClassName, className)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          focusCenter.current = undefined
          scheduleWave()
        }
      }}
    >
      <p className="sr-only">
        <Trans>
          Fiecare reper de pe bară este o luare de cuvânt, în ordinea din
          stenogramă, iar reperele colorate sunt intervențiile aflate acum pe
          ecran. Unde ședința este densă, reperele apropiate sunt grupate
          într-unul singur. Folosește săgețile sus și jos pentru a trece de la o
          intervenție la alta; activarea unui reper deschide intervenția în
          textul integral, fără să ascundă restul dezbaterii.
        </Trans>
      </p>

      <TooltipProvider delayDuration={120} skipDelayDuration={200}>
        <div
          ref={trackRef}
          data-rail-track=""
          className={stenogramRailTrackClassName}
          style={{ height: layout.trackHeight }}
          onPointerMove={(event) => {
            pointerClientY.current = event.clientY
            scheduleWave()
          }}
          onPointerLeave={() => {
            pointerClientY.current = undefined
            scheduleWave()
          }}
          onKeyDown={handleKeyDown}
        >
          {/* A crowded slot draws ONE bar for the whole stretch, weighted by how
              many turns it stands for, and that bar is the only drawing there:
              its members are hit areas, nothing more. Hovering used to fan them
              apart into their own bars, which moved marks out from under the
              pointer at the exact moment the reader was aiming at one. Nothing
              on this rail moves any more. */}
          {layout.clusters.map((cluster) => {
            const size = cluster.indices.length
            if (size < 2) return null
            // The strongest tone any member holds, so a dense stretch inside
            // the viewport is not left dark by its own quantisation.
            const tone: RailTone = cluster.indices.includes(readingIndex)
              ? 'reading'
              : cluster.indices.includes(selectedIndex)
                ? 'selected'
                : cluster.indices.some(inView)
                  ? 'inView'
                  : 'idle'
            return (
              <span
                key={cluster.slot}
                aria-hidden
                data-rail-cluster=""
                data-size={String(size)}
                data-state={tone}
                data-rail-wave=""
                data-wave-center={String(cluster.top + layout.slotHeight / 2)}
                className={cn(
                  stenogramRailClusterClassName,
                  stenogramRailClusterDensityClassName[densityOf(size)],
                  stenogramRailMarkerToneClassName[tone],
                )}
                style={{
                  top: cluster.top + (layout.slotHeight - TICK_HEIGHT_PX) / 2,
                  height: TICK_HEIGHT_PX,
                }}
              />
            )
          })}

          {interventions.map((intervention, index) => {
            const clusterIndex = layout.clusterOfIndex[index] ?? 0
            const cluster = layout.clusters[clusterIndex]
            const crowded = (cluster?.indices.length ?? 1) > 1
            const markCenter = (cluster?.top ?? 0) + layout.slotHeight / 2
            // The band this turn takes the pointer in — the slot itself for the
            // members of a crowded slot, which never take it.
            const band = hitBands.get(index)
            const top = band?.top ?? cluster?.top ?? 0
            const height = band?.height ?? layout.slotHeight

            return (
              <RailMarker
                key={intervention.segmentKey}
                intervention={intervention}
                top={top}
                height={height}
                // The bar's own place inside that band: it is drawn where the
                // contribution IS, however much dead space around it the band
                // swept up.
                tickTop={markCenter - top}
                center={markCenter}
                selected={index === selectedIndex}
                reading={index === readingIndex}
                inView={inView(index)}
                crowded={crowded}
                // In a crowded slot the FIRST turn takes the pointer — clicking
                // a bar that stands for five turns lands the reader at the start
                // of that stretch, which is the only member of it a reader can
                // name from the rail. The rest keep their buttons for the
                // keyboard, which walks them one by one.
                interactive={band !== undefined}
                tabbable={index === tabbableIndex}
                onFocus={() => {
                  setRovingIndex(index)
                  // The keyboard raises the swell where the pointer would: the
                  // rail must answer the arrow keys the same way it answers a
                  // hover, or focus lands on a mark that never lights up.
                  focusCenter.current = markCenter
                  scheduleWave()
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
 * One contribution, as a hit area with a bar inside it.
 *
 * The button owns the BAND around its bar — halfway to the turn above, halfway
 * to the turn below — and overhangs the track to the left, into the column gap.
 * A reader aiming at a turn therefore never has to hit the 3px bar itself, and
 * a click that lands between two bars goes to the nearer one instead of
 * nowhere. The room to the right stays clear for the bar to lengthen into.
 *
 * The button is also the WAVE CARRIER for the turns that draw their own bar:
 * `--rail-wave` is written on it and the mark inside inherits it. A turn inside
 * a crowded slot draws nothing and carries nothing — its cluster's bar does
 * both for the whole stretch.
 *
 * Its one drawing is the BAR. It gains length and weight, never height: a mark
 * that thickened would start reading as a rule across the track, and a rail
 * with a rule on it claims a reading position the bars have already claimed.
 * Which of the four tones it takes is the only thing that changes between
 * states — being on screen, being the section read, being the deep link.
 */
function RailMarker({
  intervention,
  top,
  height,
  tickTop,
  center,
  selected,
  reading,
  inView,
  crowded,
  interactive,
  tabbable,
  onFocus,
  onSelect,
  registerRef,
}: {
  readonly intervention: StenogramInterventionMarker
  /** The band the button takes the pointer in, in track coordinates. */
  readonly top: number
  readonly height: number
  /** Where the bar sits INSIDE that band — the contribution's own position. */
  readonly tickTop: number
  /** The mark's centre in track coordinates — what the wave measures from. */
  readonly center: number
  readonly selected: boolean
  readonly reading: boolean
  /** Its block is somewhere on screen — a member of the accent run. */
  readonly inView: boolean
  /** It shares a slot with other turns, which the cluster's bar draws for all. */
  readonly crowded: boolean
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
  // The deep link is ink among accent bars — but ONLY once the reader has
  // scrolled away from it. While it is on screen it is simply part of the run,
  // so clicking a bar leaves no extra mark behind on the rail: the bar the
  // reader clicked turns into the accent one and that is the whole answer.
  const tone: RailTone = reading
    ? 'reading'
    : inView
      ? 'inView'
      : selected
        ? 'selected'
        : 'idle'
  // A member of a crowded slot draws nothing: the cluster's single bar stands
  // for the whole stretch, so a second mark on top of it would only be a
  // heavier smudge at the same place. It keeps its button, and its wave is the
  // cluster's.
  const drawn = !crowded

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
          {...(drawn
            ? { 'data-rail-wave': '', 'data-wave-center': String(center) }
            : {})}
          aria-label={
            reading
              ? t`Intervenția ${ordinal}: ${speakerLabel} — în dreptul lecturii`
              : t`Intervenția ${ordinal}: ${speakerLabel}`
          }
          className={cn(
            stenogramRailMarkerHitClassName,
            // A member of a crowded slot that is not its first turn is still
            // focusable and still announced; it simply is not what the pointer
            // lands on, because five turns cannot share one 8px target.
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
              // `invisible` rather than `opacity-0`: the tone writes this
              // element's opacity, and stacking a second opacity rule on it
              // would leave which one wins to the stylesheet's ordering.
              !drawn && 'invisible',
            )}
            // `top` overrides the class's `top-1/2`: the bar belongs at the
            // contribution's position, not at the middle of a band that may
            // have swept up a long silence on one side of it.
            style={{ top: tickTop, height: TICK_HEIGHT_PX }}
          />
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
