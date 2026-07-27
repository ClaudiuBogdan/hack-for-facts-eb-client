import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { stubResizeObserver } from '@/test/helpers'
import {
  segmentDomId,
  type StenogramInterventionMarker,
} from '../lib/stenogram-toc'
import { ParliamentStenogramInterventionRail } from './parliament-stenogram-intervention-rail'

/**
 * THE RULE THIS FILE EXISTS TO HOLD: the rail draws exactly ONE horizontal line
 * across its track — the progress head. The reader reported an earlier drawing
 * as "two bars for the progress when I hover", because the live and hovered
 * markers grew into full-track rules of their own and a rail with two rules on
 * it has two reading positions and no way to tell which is true.
 *
 * The wave lives inside that rule rather than around it: pointing at the rail
 * lengthens and darkens the marks near the pointer, and never thickens one, so
 * no amount of hovering can raise a second horizontal rule.
 *
 * jsdom has no Tailwind and no layout, so the assertions here are on the state
 * CLASSES and the `data-rail-*` attributes rather than on painted pixels. That
 * is the point: the classes are where the regression would come back, and a
 * class assertion catches it in CI rather than in Chrome. The wave is the one
 * thing that IS measurable here — it is written as an inline custom property —
 * so it is asserted as numbers.
 */

/** An observer whose callback the test drives, so a marker can be "reading". */
class ControllableIntersectionObserver {
  static instances: ControllableIntersectionObserver[] = []
  readonly root: Element | Document | null = null
  readonly rootMargin: string = ''
  readonly scrollMargin: string = ''
  readonly thresholds: readonly number[] = []
  readonly targets: Element[] = []

  constructor(private readonly callback: IntersectionObserverCallback) {
    ControllableIntersectionObserver.instances.push(this)
  }

  observe(target: Element): void {
    this.targets.push(target)
  }
  unobserve(): void {}
  disconnect(): void {}
  takeRecords(): IntersectionObserverEntry[] {
    return []
  }

  /** Report a block as crossing the reading band. */
  enter(target: Element): void {
    act(() => {
      this.callback(
        [{ target, isIntersecting: true }] as unknown as IntersectionObserverEntry[],
        this as unknown as IntersectionObserver,
      )
    })
  }
}

function marker(
  ordinal: number,
  fraction: number,
  overrides: Partial<StenogramInterventionMarker> = {},
): StenogramInterventionMarker {
  return {
    segmentKey: `canon:s1#${String(ordinal)}`,
    speechKey: `canon:sp:${String(ordinal)}`,
    position: ordinal,
    speakerName: `Vorbitor ${String(ordinal)}`,
    excerpt: `Intervenția ${String(ordinal)}, pe scurt.`,
    ordinal,
    fraction,
    ...overrides,
  }
}

/** Three well-separated turns: one slot each, no clustering. */
const sparse: readonly StenogramInterventionMarker[] = [
  marker(1, 0.1),
  marker(2, 0.5),
  marker(3, 0.9),
]

/** Forty turns inside a tenth of the sitting: guaranteed clusters. */
const dense: readonly StenogramInterventionMarker[] = Array.from(
  { length: 40 },
  (_, index) => marker(index + 1, index / 400),
)

/**
 * Three turns a couple of dozen pixels apart: far enough to keep one slot each,
 * close enough that one wave reaches all three — which is what makes the
 * falloff measurable.
 */
const neighbours: readonly StenogramInterventionMarker[] = [
  marker(1, 0.1),
  marker(2, 0.13),
  marker(3, 0.16),
]

function renderRail({
  interventions = sparse,
  selectedPosition,
  onSelect = vi.fn(),
}: {
  readonly interventions?: readonly StenogramInterventionMarker[]
  readonly selectedPosition?: number
  readonly onSelect?: (intervention: StenogramInterventionMarker) => void
} = {}) {
  const result = render(
    <div>
      {/* The blocks the rail observes — anchors only, no prose needed. */}
      {interventions.map((intervention) => (
        <div key={intervention.position} id={segmentDomId(intervention.position)} />
      ))}
      <ParliamentStenogramInterventionRail
        interventions={interventions}
        selectedPosition={selectedPosition}
        onSelect={onSelect}
      />
    </div>,
  )
  return { ...result, onSelect }
}

const rail = () =>
  screen.getByRole('navigation', { name: 'Harta intervențiilor din ședință' })

const markers = () => within(rail()).getAllByRole('button')

const tickOf = (button: HTMLElement) =>
  button.querySelector<HTMLElement>('[data-rail-tick]')!

const nodeOf = (button: HTMLElement) =>
  button.querySelector<HTMLElement>('[data-rail-node]')

const trackOf = (container: HTMLElement) =>
  container.querySelector<HTMLElement>('[data-rail-track]')!

/** The buttons of one crowded slot — every turn quantised onto the same top. */
const markersSharingASlot = () => {
  const bySlot = new Map<string, HTMLElement[]>()
  for (const button of markers()) {
    const slot = bySlot.get(button.style.top) ?? []
    slot.push(button)
    bySlot.set(button.style.top, slot)
  }
  return [...bySlot.values()].find((slot) => slot.length > 1) ?? []
}

/** How hard one mark is leaning, 0 when it carries no wave at all. */
const waveOf = (el: HTMLElement) =>
  Number(el.style.getPropertyValue('--rail-wave') || '0')

const waveCenterOf = (el: HTMLElement) => Number(el.dataset.waveCenter)

/** Drive the reading position onto one contribution. */
function readAt(position: number) {
  const { instances } = ControllableIntersectionObserver
  const observer = instances[instances.length - 1]!
  observer.enter(document.getElementById(segmentDomId(position))!)
}

beforeEach(() => {
  ControllableIntersectionObserver.instances = []
  vi.stubGlobal('IntersectionObserver', ControllableIntersectionObserver)
  stubResizeObserver()
  // The wave is painted inside an animation frame. Running it synchronously is
  // what makes it assertable; returning 0 keeps the component's "a frame is
  // already booked" guard honest across calls.
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    callback(0)
    return 0
  })
  vi.stubGlobal('cancelAnimationFrame', () => {})
})

describe('ParliamentStenogramInterventionRail — bars, and nothing but', () => {
  it('draws no horizontal rule and no filled surface at all', () => {
    const { container } = renderRail()
    readAt(2)

    // The wash, the rule where it ended, and the paper an opened cluster used
    // to sit on: every one of them was a box around what the marks already say.
    expect(container.querySelector('[data-rail-progress]')).toBeNull()
    expect(container.querySelector('[data-rail-head]')).toBeNull()
    expect(container.querySelector('[data-rail-fan]')).toBeNull()

    // Nothing a marker draws may span the track. `inset-x-0` is how the old
    // live tick broke out of it.
    for (const button of markers()) {
      for (const drawn of button.querySelectorAll('span')) {
        expect(drawn.className).not.toContain('inset-x-0')
      }
    }
  })

  it('keeps every tick the same HEIGHT in every state — no bar can grow back', () => {
    // idle, reading and selected all at once, so a state-dependent geometry
    // would show up as a difference between these three.
    renderRail({ selectedPosition: 3 })
    readAt(2)

    const states = markers().map((button) => button.dataset.state)
    expect(states).toEqual(['idle', 'reading', 'selected'])

    for (const button of markers()) {
      const tick = tickOf(button)
      expect(tick.style.height).toBe('3px')
      // Pinned to the track's left edge and one fixed resting width. The wave
      // is allowed to lengthen it — `scale-x` — and nothing else.
      expect(tick.className).toContain('left-2')
      expect(tick.className).toContain('w-3')
      expect(tick.className).toContain(
        'scale-x-[calc(1+var(--rail-wave,0)*1.2)]',
      )
      expect(tick.className).not.toContain('scale-y')
      expect(tick.className).not.toContain('h-')
    }
  })

  it('never gives a tick a colour of its own on hover — the wave is weight', () => {
    renderRail()
    readAt(2)

    // An idle mark: resting weight, ramping to full under the pointer. A hue
    // for "pointed at" would compete with the accent the viewport run owns.
    const tick = tickOf(markers()[0]!)
    expect(tick.className).not.toContain('group-hover/marker:bg-')
    expect(tick.className).not.toContain('group-focus-visible/marker:bg-')
    expect(tick.className).toContain('opacity-[calc(0.3+var(--rail-wave,0)*0.7)]')
  })

  it('leaves the track itself unpainted — no border, no paper', () => {
    const { container } = renderRail()

    const track = trackOf(container)
    expect(track.className).not.toContain('border')
    expect(track.className).not.toContain('bg-')
  })
})

describe('ParliamentStenogramInterventionRail — the wave', () => {
  it('crests under the pointer and falls away with distance', () => {
    const { container } = renderRail({ interventions: neighbours })
    const [first, second, third] = markers() as [
      HTMLElement,
      HTMLElement,
      HTMLElement,
    ]

    act(() => {
      fireEvent.pointerMove(trackOf(container), {
        clientY: waveCenterOf(first),
      })
    })

    expect(waveOf(first)).toBe(1)
    expect(waveOf(second)).toBeGreaterThan(0)
    expect(waveOf(second)).toBeLessThan(waveOf(first))
    expect(waveOf(third)).toBeGreaterThan(0)
    expect(waveOf(third)).toBeLessThan(waveOf(second))
  })

  it('moves with the pointer, leaving no mark leaning behind it', () => {
    const { container } = renderRail({ interventions: neighbours })
    const [first, , third] = markers() as [
      HTMLElement,
      HTMLElement,
      HTMLElement,
    ]
    const track = trackOf(container)

    act(() => {
      fireEvent.pointerMove(track, { clientY: waveCenterOf(first) })
    })
    expect(waveOf(first)).toBe(1)

    // Far enough that the first mark drops out of the wave's reach entirely.
    act(() => {
      fireEvent.pointerMove(track, { clientY: waveCenterOf(third) + 400 })
    })
    expect(waveOf(first)).toBe(0)
    expect(waveOf(third)).toBe(0)
  })

  it('drops the whole wave when the pointer leaves the rail', () => {
    const { container } = renderRail({ interventions: neighbours })
    const track = trackOf(container)

    act(() => {
      fireEvent.pointerMove(track, {
        clientY: waveCenterOf(markers()[0]!),
      })
    })
    act(() => {
      fireEvent.pointerLeave(track)
    })

    for (const button of markers()) expect(waveOf(button)).toBe(0)
  })

  it('raises the same swell from the keyboard, at the focused mark', async () => {
    renderRail({ interventions: neighbours })

    await act(async () => markers()[1]!.focus())

    expect(waveOf(markers()[1]!)).toBe(1)
    expect(waveOf(markers()[0]!)).toBeGreaterThan(0)
    expect(waveOf(markers()[0]!)).toBeLessThan(1)
  })

  it('leans a collapsed cluster too, so a dense stretch is not dead to it', () => {
    const { container } = renderRail({ interventions: dense })

    const cluster = container.querySelector<HTMLElement>('[data-rail-cluster]')!
    expect(cluster.dataset.railWave).toBe('')

    act(() => {
      fireEvent.pointerMove(trackOf(container), {
        clientY: waveCenterOf(cluster),
      })
    })
    expect(waveOf(cluster)).toBe(1)
  })
})

describe('ParliamentStenogramInterventionRail — where the reader is', () => {
  it('tells the section being read with a solid accent BAR, not a dot', () => {
    renderRail()
    readAt(2)

    const reading = markers()[1]!
    expect(reading.dataset.state).toBe('reading')

    // The dot only ever made sense while there was a reading line for it to sit
    // on. Its bar is the same mark as every other, in the accent at full weight.
    expect(nodeOf(reading)).toBeNull()
    const tick = tickOf(reading)
    expect(tick.className).toContain('bg-[#1d70b8]')
    expect(tick.className).toContain('opacity-100')
    expect(tick.className).not.toContain('invisible')
    expect(tick.className).not.toContain('rounded-full')
  })

  it('lights the whole run of contributions the viewport holds', () => {
    renderRail({ interventions: neighbours })
    // Two blocks on screen at once: the run covers both, and the topmost of
    // them is the section being read.
    readAt(1)
    readAt(2)

    expect(markers().map((button) => button.dataset.state)).toEqual([
      'reading',
      'inView',
      'idle',
    ])
    expect(tickOf(markers()[1]!).className).toContain('bg-[#1d70b8]')
    expect(tickOf(markers()[1]!).className).toContain(
      'opacity-[calc(0.55+var(--rail-wave,0)*0.45)]',
    )
    // …and a contribution off screen stays ink, not accent.
    expect(tickOf(markers()[2]!).className).toContain('bg-[#0b0c0c]')
  })

  it('carries the run onto a collapsed cluster, so a dense stretch still lights', () => {
    const { container } = renderRail({ interventions: dense })
    readAt(3)

    const cluster = container.querySelector<HTMLElement>('[data-rail-cluster]')!
    expect(cluster.dataset.state).toBe('reading')
    expect(cluster.className).toContain('bg-[#1d70b8]')
  })

  it('keeps the deep link as INK among the accent bars, with its notch', () => {
    renderRail({ selectedPosition: 3 })
    readAt(2)

    const selected = markers()[2]!
    expect(selected.dataset.state).toBe('selected')
    // Ink, not a second accent: the run owns the accent, and a deep link inside
    // the run would vanish into it.
    expect(tickOf(selected).className).toContain('bg-[#0b0c0c]')
    expect(tickOf(selected).className).toContain(
      'opacity-[calc(0.8+var(--rail-wave,0)*0.2)]',
    )
  })

  it('leaves NOTHING behind on the rail when a bar is clicked', async () => {
    // Clicking a bar scrolls the reader to that contribution, so the bar turns
    // accent because they are now there. A notch, a nick or any second mark
    // beside it is the rail talking about a click that already had an answer.
    const { container } = renderRail({ selectedPosition: 2 })
    readAt(2)

    expect(container.querySelector('[data-rail-selected-cue]')).toBeNull()
    const reading = markers()[1]!
    expect(reading.dataset.state).toBe('reading')
    expect(reading).toHaveAttribute('aria-current', 'true')
    expect(reading.querySelectorAll('span')).toHaveLength(1)
  })

  it('points back to the deep link in INK once the reader scrolls away', () => {
    renderRail({ selectedPosition: 3 })
    readAt(1)

    const selected = markers()[2]!
    expect(selected.dataset.state).toBe('selected')
    expect(tickOf(selected).className).toContain('bg-[#0b0c0c]')
  })
})

describe('ParliamentStenogramInterventionRail — a rail that never moves', () => {
  it('draws ONE bar for a crowded slot and no per-member mark under it', () => {
    const { container } = renderRail({ interventions: dense })
    expect(markers()).toHaveLength(40)

    const cluster = container.querySelector<HTMLElement>('[data-rail-cluster]')!
    const members = Number(cluster.dataset.size)
    expect(members).toBeGreaterThan(1)

    // Every member of that slot keeps its button and draws nothing: a second
    // mark on top of the cluster's bar is only a heavier smudge in one place.
    const inSlot = markersSharingASlot()
    for (const button of inSlot) {
      expect(tickOf(button).className).toContain('invisible')
      expect(button.dataset.railWave).toBeUndefined()
    }
  })

  it('never moves a mark on hover — no fan, no shuffle under the pointer', () => {
    const { container } = renderRail({ interventions: dense })
    const track = trackOf(container)
    const before = markers().map((button) => button.style.top)

    // Run the pointer down the rail, over the crowded slots.
    for (const clientY of [8, 24, 40, 64]) {
      act(() => {
        fireEvent.pointerMove(track, { clientY })
      })
    }

    expect(markers().map((button) => button.style.top)).toEqual(before)
    expect(container.querySelector('[data-rail-fan]')).toBeNull()
    expect(container.querySelector('[data-rail-cluster-hit]')).toBeNull()
  })

  it('gives every turn the BAND around its bar, so a gap is never dead', () => {
    // Three turns spread over a 640px track: the bars are 3px, the space
    // between them is hundreds. Aiming at a hairline is what made the rail hard
    // to click, so each turn takes the room halfway to its neighbours.
    renderRail()
    const bands = markers().map((button) => ({
      top: Number.parseFloat(button.style.top),
      height: Number.parseFloat(button.style.height),
    }))

    expect(bands[0]!.top).toBe(0)
    expect(bands[0]!.height).toBeGreaterThan(100)
    for (const [order, band] of bands.entries()) {
      const next = bands[order + 1]
      if (next) expect(next.top).toBeCloseTo(band.top + band.height, 5)
    }
    // …and the bar itself stays where its contribution is, rather than drifting
    // to the middle of the room the band swept up.
    const firstBar = tickOf(markers()[0]!)
    expect(Number.parseFloat(firstBar.style.top)).toBeLessThan(
      bands[0]!.height / 2,
    )
  })

  it('selects the NEAREST turn when the click lands between two bars', async () => {
    const onSelect = vi.fn()
    renderRail({ interventions: neighbours, onSelect })

    // The band of the middle turn covers the gap on both sides of its bar, so
    // a click that misses the hairline still means the turn the reader aimed
    // at — a click on the rail can honestly mean nothing else.
    await userEvent.click(markers()[1]!)
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ ordinal: 2 }),
    )
  })

  it('hands the pointer the FIRST turn of a crowded slot, keyboard the rest', () => {
    renderRail({ interventions: dense })
    const inSlot = markersSharingASlot()
    expect(inSlot.length).toBeGreaterThan(1)

    expect(inSlot[0]!.className).toContain('pointer-events-auto')
    for (const button of inSlot.slice(1)) {
      expect(button.className).toContain('pointer-events-none')
      // …still focusable and still announced, so the arrows reach every turn.
      expect(button).toHaveAttribute('aria-label')
    }
  })
})

describe('ParliamentStenogramInterventionRail — behaviour that must survive', () => {
  it('opens the right-hand tooltip on hover, with the printed name and excerpt', async () => {
    renderRail()

    await userEvent.hover(markers()[0]!)

    const tip = await screen.findByRole('tooltip')
    expect(within(tip).getByText('Vorbitor 1')).toBeInTheDocument()
    expect(
      within(tip).getByText('Intervenția 1, pe scurt.'),
    ).toBeInTheDocument()
  })

  it('holds one tab stop and rove the rest with the arrow keys', async () => {
    renderRail()
    readAt(2)

    // The roving stop follows the reading position, so tabbing in lands where
    // the reader is.
    expect(markers().map((button) => button.tabIndex)).toEqual([-1, 0, -1])

    await act(async () => markers()[1]!.focus())
    await userEvent.keyboard('{ArrowDown}')
    expect(markers()[2]!).toHaveFocus()
    await userEvent.keyboard('{Home}')
    expect(markers()[0]!).toHaveFocus()
  })

  it('selects through the same callback the URL is written from', async () => {
    const onSelect = vi.fn()
    renderRail({ onSelect })

    await userEvent.click(markers()[2]!)
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ position: 3, speechKey: 'canon:sp:3' }),
    )
  })

  it('names each marker, and says which one is under the reading line', () => {
    renderRail()
    readAt(2)

    expect(
      within(rail()).getByRole('button', {
        name: 'Intervenția 2: Vorbitor 2 — în dreptul lecturii',
      }),
    ).toBeInTheDocument()
    expect(
      within(rail()).getByRole('button', { name: 'Intervenția 1: Vorbitor 1' }),
    ).toBeInTheDocument()
  })

  it('animates with scale and opacity only, and only where motion is allowed', () => {
    // Scale/opacity keep the rail off the layout path: no reflow of the track
    // as a pointer runs down several hundred marks.
    renderRail()
    readAt(2)

    expect(tickOf(markers()[0]!).className).toContain(
      'motion-safe:transition-[scale,opacity]',
    )
    expect(tickOf(markers()[0]!).className).not.toContain('transition-[width')
    // Short, because the wave is repainted every frame from the pointer's real
    // position: a long ease only puts lag between the cursor and the rail.
    expect(tickOf(markers()[0]!).className).toContain('motion-safe:duration-75')
  })
})
