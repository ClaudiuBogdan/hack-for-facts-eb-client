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
 * across its track — the progress head. The reader reported the previous
 * drawing as "two bars for the progress when I hover", because the live and
 * hovered markers grew into full-track rules of their own and a rail with two
 * rules on it has two reading positions and no way to tell which is true.
 *
 * jsdom has no Tailwind and no layout, so the assertions here are on the state
 * CLASSES and the `data-rail-*` attributes rather than on painted pixels. That
 * is the point: the classes are where the regression would come back, and a
 * class assertion catches it in CI rather than in Chrome.
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
  button.querySelector<HTMLElement>('[data-rail-node]')!

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
})

describe('ParliamentStenogramInterventionRail — one progress line', () => {
  it('draws exactly one horizontal rule, and it is the progress head', () => {
    const { container } = renderRail()
    readAt(2)

    const heads = container.querySelectorAll('[data-rail-head]')
    expect(heads).toHaveLength(1)
    // The head is the only full-bleed rule: `inset-x-0` plus a height class.
    expect(heads[0]!.className).toContain('inset-x-0')
    expect(heads[0]!.className).toContain('h-0.5')

    // Nothing a marker draws may span the track. `inset-x-0` is how the old
    // live tick broke out of it.
    for (const button of markers()) {
      for (const drawn of button.querySelectorAll('span')) {
        expect(drawn.className).not.toContain('inset-x-0')
      }
    }
  })

  it('keeps every tick the same size in every state — no bar can grow back', () => {
    // idle, reading and selected all at once, so a state-dependent geometry
    // would show up as a difference between these three.
    renderRail({ selectedPosition: 3 })
    readAt(2)

    const states = markers().map((button) => button.dataset.state)
    expect(states).toEqual(['idle', 'reading', 'selected'])

    for (const button of markers()) {
      const tick = tickOf(button)
      expect(tick.style.height).toBe('3px')
      // Exactly the track's own width, never wider.
      expect(tick.className).toContain('left-1')
      expect(tick.className).toContain('right-2')
      expect(tick.className).not.toContain('left-0')
      expect(tick.className).not.toContain('right-1')
    }
  })

  it('never darkens a tick on hover or focus — the emphasis is the node', () => {
    renderRail()
    readAt(2)

    for (const button of markers()) {
      const tick = tickOf(button)
      // A near-black tick spanning the track IS a second progress bar.
      expect(tick.className).not.toContain('group-hover/marker:bg-')
      expect(tick.className).not.toContain('group-focus-visible/marker:bg-')
    }
  })
})

describe('ParliamentStenogramInterventionRail — the compact shape vocabulary', () => {
  it('tells the reading position with a round accent node, ringed for contrast', () => {
    renderRail()
    readAt(2)

    const reading = markers()[1]!
    expect(reading.dataset.state).toBe('reading')

    const node = nodeOf(reading)
    expect(node.dataset.node).toBe('reading')
    expect(node.className).toContain('rounded-full')
    expect(node.className).toContain('bg-[#1d70b8]')
    // The surface ring is what keeps the dot legible over the progress fill in
    // either theme.
    expect(node.className).toContain('ring-2')
    expect(node.className).toContain('ring-white')
    expect(node.className).toContain('dark:ring-[var(--pnrr-card)]')

    // The tick under it is not drawn at all, so the two cannot read as two.
    expect(tickOf(reading).className).toContain('opacity-0')
  })

  it('answers hover and focus with a hollow ring that is secondary to it', () => {
    renderRail()
    readAt(2)

    const idle = markers()[0]!
    const cue = nodeOf(idle)
    expect(cue.dataset.node).toBe('cue')
    expect(cue.className).toContain('rounded-full')
    // Hollow and smaller than the accent dot: obvious, but plainly not the
    // reading position.
    expect(cue.className).toContain('size-2')
    expect(cue.className).toContain('border-2')
    expect(nodeOf(markers()[1]!).className).toContain('size-2.5')

    // Hidden until pointed at or focused, and it grows in place.
    expect(cue.className).toContain('scale-0')
    expect(cue.className).toContain('group-hover/marker:scale-100')
    expect(cue.className).toContain('group-focus-visible/marker:scale-100')
    // …while the tick it replaces steps aside instead of stacking with it.
    expect(tickOf(idle).className).toContain('group-hover/marker:opacity-0')
    expect(tickOf(idle).className).toContain(
      'group-focus-visible/marker:opacity-0',
    )
  })

  it('keeps the deep link as an outer-edge notch, taller than it is wide', () => {
    renderRail({ selectedPosition: 3 })
    readAt(2)

    const selected = markers()[2]!
    expect(selected).toHaveAttribute('aria-current', 'true')

    const notch = selected.querySelector<HTMLElement>('[data-rail-selected-cue]')!
    expect(notch.className).toContain('h-3')
    expect(notch.className).toContain('w-1')
    expect(notch.className).not.toContain('inset-x-0')
  })

  it('drops the notch once the reader arrives at the deep link', () => {
    // Selected AND read: one position, one shape. Drawing both would put a
    // second cue on the very marker the node already claims.
    renderRail({ selectedPosition: 2 })
    readAt(2)

    const reading = markers()[1]!
    expect(reading.dataset.state).toBe('reading')
    expect(reading).toHaveAttribute('aria-current', 'true')
    expect(reading.querySelector('[data-rail-selected-cue]')).toBeNull()
  })
})

describe('ParliamentStenogramInterventionRail — the fanned cluster', () => {
  it('opens a crowded slot on hover and draws its paper without top or bottom rules', () => {
    const { container } = renderRail({ interventions: dense })

    const hit = container.querySelector<HTMLElement>('[data-rail-cluster-hit]')!
    act(() => {
      fireEvent.pointerEnter(hit)
    })

    const fan = container.querySelector<HTMLElement>('[data-rail-fan]')!
    // The border-y-2 this used to carry was two more black horizontal lines on
    // a rail that is allowed exactly one.
    expect(fan.className).not.toContain('border-y')
    expect(fan.className).not.toContain('border-t')
    expect(fan.className).not.toContain('border-b')
    // Paper instead: a raised surface with a single vertical leading rule.
    expect(fan.className).toContain('shadow-md')
    expect(fan.className).toContain('bg-white')
    expect(fan.className).toContain('border-l-2')
  })

  it('still fans every member out to its own hit target, losing nobody', () => {
    const { container } = renderRail({ interventions: dense })
    expect(markers()).toHaveLength(40)

    const hit = container.querySelector<HTMLElement>('[data-rail-cluster-hit]')!
    act(() => {
      fireEvent.pointerEnter(hit)
    })

    // The members of the opened slot now stand 12px apart instead of sharing
    // one 8px slot.
    const heights = markers().map((button) => button.style.height)
    expect(heights.filter((height) => height === '12px').length).toBeGreaterThan(1)
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

  it('animates with transform and opacity only, and only where motion is allowed', () => {
    // Transform/opacity keep the rail off the layout path: no reflow of the
    // track as a pointer runs down it.
    renderRail()
    readAt(2)

    expect(nodeOf(markers()[0]!).className).toContain(
      'motion-safe:transition-transform',
    )
    expect(tickOf(markers()[0]!).className).toContain(
      'motion-safe:transition-opacity',
    )
  })
})
