import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { GraphQLRequestError } from '@/lib/graphql/graphql-client'
import { ParliamentStenogramFailureError } from '../lib/parliament-stenogram-error'
import {
  ParliamentStenogramSegmentSchema,
  ParliamentStenogramSessionSchema,
  type ParliamentStenogramSegment,
  type ParliamentStenogramSession,
} from '@/schemas/parliament'
import { stubScrollIntoView } from '@/test/helpers'
import { segmentDomId } from '../lib/stenogram-toc'

const navigate = vi.fn()

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigate,
  Link: ({
    children,
    to,
    params,
    search,
    className,
  }: {
    children: ReactNode
    to: string
    params?: Record<string, string>
    search?: Record<string, string>
    className?: string
  }) => {
    const path = Object.entries(params ?? {}).reduce(
      (acc, [key, value]) => acc.replace(`$${key}`, value),
      to,
    )
    const query = new URLSearchParams(search ?? {}).toString()
    return (
      <a href={query ? `${path}?${query}` : path} className={className}>
        {children}
      </a>
    )
  },
}))

const useParliamentTranscript = vi.fn()
const useParliamentSpeechContext = vi.fn()

vi.mock('../hooks/use-parliament-data', () => ({
  useParliamentTranscript: (key: string) =>
    useParliamentTranscript(key) as unknown,
  useParliamentSpeechContext: (key: string) =>
    useParliamentSpeechContext(key) as unknown,
}))

vi.mock('./parliament-shell', () => ({
  ParliamentShell: ({ children }: { children: ReactNode }) => <>{children}</>,
}))

/**
 * The shared multi-select, as a plain list of toggles: this file tests what the
 * READER does with a selection, not the dropdown/virtualiser the shared control
 * owns (and which needs a layout engine jsdom does not have).
 */
vi.mock('@/components/ui/styled-multi-select', () => ({
  StyledMultiSelect: ({
    options,
    selected,
    onChange,
  }: {
    options: readonly { value: string; label: string; description?: string }[]
    selected: readonly string[]
    onChange: (values: string[]) => void
  }) => (
    <div data-testid="speaker-select">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={selected.includes(option.value)}
          onClick={() =>
            onChange(
              selected.includes(option.value)
                ? selected.filter((value) => value !== option.value)
                : [...selected, option.value],
            )
          }
        >
          {`Filtru: ${option.label} (${option.description ?? ''})`}
        </button>
      ))}
    </div>
  ),
}))

const { ParliamentStenogramReaderPage } = await import(
  './parliament-stenogram-reader-page'
)

function session(
  overrides: Partial<ParliamentStenogramSession> = {},
): ParliamentStenogramSession {
  return ParliamentStenogramSessionSchema.parse({
    sessionKey: 'canon:s1',
    chamber: 'camera_deputatilor',
    sessionDate: '2026-05-13',
    sessionDateSource: 'stenogram_title',
    title: 'Ședința Camerei Deputaților din 13 mai 2026',
    sourceSystem: 'cdep_stenogram',
    availability: 'COMPLETE',
    sourceUrl: 'https://cdep.ro/steno/1',
    sourceUrlKind: 'exact',
    segmentCount: 4,
    speechCount: 2,
    speakerCount: 2,
    ...overrides,
  })
}

function segment(
  position: number,
  kind: ParliamentStenogramSegment['kind'],
  text: string,
  extra: Partial<ParliamentStenogramSegment> = {},
): ParliamentStenogramSegment {
  return ParliamentStenogramSegmentSchema.parse({
    segmentKey: `canon:s1#${String(position)}`,
    sessionKey: 'canon:s1',
    position,
    kind,
    text,
    textChars: text.length,
    sourceUrl: 'https://cdep.ro/steno/1',
    sourceUrlKind: 'exact',
    ...extra,
  })
}

const SEGMENTS = [
  segment(0, 'AGENDA_HEADING', 'Punctul 1 — bugetul sănătății'),
  segment(1, 'SPEECH', 'Susțin proiectul privind sănătatea.', {
    speakerName: 'Ion Popescu',
    speechKey: 'canon:sp:1',
  }),
  segment(2, 'CONTEXT', '(rumoare în sală)'),
  segment(3, 'SPEECH', 'Nu sunt de acord.', {
    speakerName: 'Maria Ionescu',
    speechKey: 'canon:sp:3',
  }),
]

const idleQuery = {
  data: undefined,
  isLoading: false,
  isError: false,
  error: null,
  refetch: vi.fn(),
}

/** One COMPLETE transcript — the only successful shape the reader accepts. */
function mockTranscript(
  overrides: Partial<typeof idleQuery> = {},
  sessionOverrides: Partial<ParliamentStenogramSession> = {},
  segments = SEGMENTS,
  navigation: Record<string, unknown> = {},
) {
  useParliamentTranscript.mockReturnValue({
    ...idleQuery,
    data: {
      session: session(sessionOverrides),
      segments,
      totalSegments: segments.length,
      navigation,
      complete: true,
    },
    ...overrides,
  })
}

beforeEach(() => {
  // jsdom has no layout, so `scrollIntoView` does not exist — the reader calls
  // it when moving to a contribution or a search hit.
  stubScrollIntoView()
  navigate.mockClear()
  useParliamentTranscript.mockReturnValue(idleQuery)
  useParliamentSpeechContext.mockReturnValue({ ...idleQuery, data: null })
})

function renderReader(
  search: { interventie?: string; vorbitori?: string[] } = {},
) {
  return render(
    <ParliamentStenogramReaderPage sessionKey="canon:s1" search={search} />,
  )
}

/** The reader's left column — one sticky stack, whatever it currently holds. */
function leftLane(): HTMLElement {
  return document.querySelector<HTMLElement>('[data-reader-lane]')!
}

describe('the reader renders a readable document', () => {
  it('shows a layout-matching skeleton while loading', () => {
    useParliamentTranscript.mockReturnValue({
      ...idleQuery,
      isLoading: true,
    })
    renderReader()
    expect(
      screen.getByLabelText('Se încarcă stenograma ședinței'),
    ).toBeInTheDocument()
  })

  it('renders the sitting heading, agenda and full reading', () => {
    mockTranscript()
    renderReader()

    expect(
      screen.getByRole('heading', {
        name: 'Ședința Camerei Deputaților din 13 mai 2026',
        level: 1,
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('navigation', { name: 'Ordinea de zi a ședinței' }),
    ).toBeInTheDocument()
    expect(screen.getByText(/Susțin proiectul/)).toBeInTheDocument()
    expect(screen.getByText(/Nu sunt de acord/)).toBeInTheDocument()
  })

  it('states the source precision and date provenance next to the claim', () => {
    mockTranscript()
    renderReader()
    expect(
      screen.getByText(/Data este citită din titlul tipărit al stenogramei/),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: /Vezi în stenograma oficială/ }),
    ).toHaveAttribute('href', 'https://cdep.ro/steno/1')
  })

  it('warns when the source link is only a sitting root', () => {
    mockTranscript({}, { sourceUrlKind: 'lossy_root', sourceSystem: 'senat_stenogram' })
    renderReader()
    expect(
      screen.getByText(/nu poziția exactă a acestei luări de cuvânt/),
    ).toBeInTheDocument()
  })

  it('offers print and copy-link actions', () => {
    mockTranscript()
    renderReader()
    expect(screen.getByRole('button', { name: /Printează/ })).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /Copiază linkul acestei ședințe/ }),
    ).toBeInTheDocument()
  })

  it('stacks on mobile and becomes a sticky lane + column at lg', () => {
    mockTranscript()
    const { container } = renderReader()
    const grid = container.querySelector('.lg\\:flex-row')!
    expect(grid.className).toContain('flex-col')
    expect(leftLane().className).toContain('lg:sticky')
    expect(leftLane().className).toContain('lg:w-72')
  })
})

/**
 * The left lane is ONE sticky stack, and the geometry it produces must not
 * depend on the filter: a document that jumps left and re-wraps the moment a
 * speaker is selected reads as a different document — the exact impression an
 * excerpt must not give.
 */
describe('the left lane holds its geometry in both modes', () => {
  it('is a single sticky STACK, not several sticky children', () => {
    // Separately sticky children pile onto the same offset and overlap; the
    // stack sticks, its contents ride along in a fixed order.
    mockTranscript()
    renderReader()
    const lane = leftLane()
    expect(lane.className).toContain('lg:sticky')
    expect(lane.className).toContain('lg:top-24')
    expect(lane.className).toContain('lg:shrink-0')
    const agenda = screen.getByRole('navigation', {
      name: 'Ordinea de zi a ședinței',
    })
    expect(agenda.className).not.toContain('lg:sticky')
    expect(lane.contains(agenda)).toBe(true)
  })

  it('keeps the SAME lane width and prose measure when filtering', () => {
    mockTranscript()
    const full = renderReader()
    const fullLane = leftLane().className
    const fullReading = screen.getByRole('region', { name: 'Textul ședinței' })
      .className
    full.unmount()

    mockTranscript()
    renderReader({ vorbitori: ['Maria Ionescu'] })
    expect(leftLane().className).toBe(fullLane)
    expect(
      screen.getByRole('region', { name: 'Textul ședinței' }).className,
    ).toBe(fullReading)
  })

  it('keeps the lane even when a filtered excerpt has no usable agenda', () => {
    // No headings survive the selection, so no navigation is rendered — but the
    // column stays, carrying the notice and the way back to the top.
    mockTranscript({}, {}, [SEGMENTS[1]!, SEGMENTS[3]!])
    renderReader({ vorbitori: ['Maria Ionescu'] })
    expect(leftLane().className).toContain('lg:w-72')
    expect(screen.queryByRole('navigation', { name: /Ordinea de zi/ })).toBeNull()
    expect(screen.getByText('Extras filtrat — nu este stenograma integrală.'))
      .toBeInTheDocument()
  })

  it('orders the lane: agenda, then the excerpt notice, then "back to top"', () => {
    mockTranscript()
    renderReader({ vorbitori: ['Maria Ionescu'] })
    const lane = leftLane()
    const agenda = screen.getByRole('navigation', {
      name: 'Ordinea de zi din extras',
    })
    const notice = screen
      .getByText('Extras filtrat — nu este stenograma integrală.')
      .closest('[role="status"]')!
    expect(lane.contains(agenda)).toBe(true)
    expect(lane.contains(notice)).toBe(true)
    expect(
      agenda.compareDocumentPosition(notice) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })

  it('precedes the reading column, and the rail follows it', () => {
    mockTranscript()
    renderReader()
    const reading = screen.getByRole('region', { name: 'Textul ședinței' })
    expect(
      leftLane().compareDocumentPosition(reading) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })
})

describe('the highlighted contribution keeps its context', () => {
  it('marks the requested block and leaves the rest of the debate visible', () => {
    mockTranscript()
    const { container } = renderReader({ interventie: 'canon:sp:1' })

    const selected = container.querySelector(`#${segmentDomId(1)}`)!
    expect(selected).toHaveAttribute('aria-current', 'true')
    // Every other block is still on the page.
    expect(container.querySelectorAll('[id^="stenogram-block-"]')).toHaveLength(
      4,
    )
    expect(screen.getByText(/Nu sunt de acord/)).toBeInTheDocument()
  })

  it('scrolls and FOCUSES the highlighted block', async () => {
    mockTranscript()
    const { container } = renderReader({ interventie: 'canon:sp:3' })
    await waitFor(() =>
      expect(container.querySelector(`#${segmentDomId(3)}`)).toHaveFocus(),
    )
  })

  it('steps to the next CONTRIBUTION, skipping the narration between', async () => {
    mockTranscript()
    renderReader({ interventie: 'canon:sp:1' })

    await userEvent.click(
      screen.getByRole('button', { name: /Intervenția următoare/ }),
    )
    expect(navigate).toHaveBeenCalledWith(
      expect.objectContaining({ search: { interventie: 'canon:sp:3' } }),
    )
  })

  it('offers no "previous" at the first contribution', () => {
    mockTranscript()
    renderReader({ interventie: 'canon:sp:1' })
    expect(
      screen.queryByRole('button', { name: /Intervenția anterioară/ }),
    ).toBeNull()
  })

  it('says so — and still renders the document — when the link cannot be placed', () => {
    mockTranscript()
    renderReader({ interventie: 'canon:sp:nope' })
    expect(
      screen.getByText(/Nu am putut localiza intervenția din link/),
    ).toBeInTheDocument()
    expect(screen.getByText(/Susțin proiectul/)).toBeInTheDocument()
  })
})

describe('the intervention rail maps the sitting', () => {
  const rail = () =>
    screen.getByRole('navigation', { name: 'Harta intervențiilor din ședință' })

  /** A sitting dense enough that ticks cannot be drawn one per contribution. */
  function denseSegments(count: number) {
    return Array.from({ length: count }, (_, index) =>
      segment(index, 'SPEECH', `Intervenția ${String(index)}.`, {
        speakerName: `Vorbitor ${String(index)}`,
        speechKey: `canon:sp:${String(index)}`,
      }),
    )
  }

  it('marks the CONTRIBUTIONS, and only those', () => {
    // The agenda heading and the `(rumoare în sală)` narration get no tick:
    // a rail of speakers must not imply somebody said them.
    mockTranscript()
    renderReader()

    const markers = within(rail()).getAllByRole('button')
    expect(markers).toHaveLength(2)
    expect(markers.map((marker) => marker.getAttribute('aria-label'))).toEqual([
      'Intervenția 1: Ion Popescu',
      'Intervenția 2: Maria Ionescu',
    ])
  })

  it('names an unresolved speaker as unprinted, never as a guessed member', () => {
    mockTranscript({}, { availability: 'PARTIAL' }, [
      SEGMENTS[1]!,
      segment(2, 'SPEECH', 'Vă mulțumesc.', { speechKey: 'canon:sp:2' }),
    ])
    renderReader()

    expect(
      within(rail()).getByRole('button', {
        name: 'Intervenția 2: Vorbitor netipărit în stenogramă',
      }),
    ).toBeInTheDocument()
  })

  it('selects the contribution through the shared, shareable URL flow', async () => {
    mockTranscript()
    renderReader()

    await userEvent.click(
      within(rail()).getByRole('button', { name: 'Intervenția 2: Maria Ionescu' }),
    )
    expect(navigate).toHaveBeenCalledWith(
      expect.objectContaining({
        search: { interventie: 'canon:sp:3' },
        replace: true,
        resetScroll: false,
      }),
    )
  })

  it('marks the linked contribution as current, without hiding its context', () => {
    mockTranscript()
    const { container } = renderReader({ interventie: 'canon:sp:3' })

    expect(
      within(rail()).getByRole('button', { name: 'Intervenția 2: Maria Ionescu' }),
    ).toHaveAttribute('aria-current', 'true')
    expect(
      within(rail()).getByRole('button', { name: 'Intervenția 1: Ion Popescu' }),
    ).not.toHaveAttribute('aria-current')
    expect(container.querySelectorAll('[id^="stenogram-block-"]')).toHaveLength(
      4,
    )
  })

  it('is ABSENT when the sitting printed no contributions', () => {
    mockTranscript({}, {}, [SEGMENTS[0]!, SEGMENTS[2]!])
    renderReader()
    expect(
      screen.queryByRole('navigation', {
        name: 'Harta intervențiilor din ședință',
      }),
    ).toBeNull()
  })

  it('is a sticky, print-hidden column that only appears at xl', () => {
    // Below xl the third column would eat the reading measure; the document
    // and the previous/next contribution controls navigate there instead.
    mockTranscript()
    renderReader()
    expect(rail().className).toContain('hidden')
    expect(rail().className).toContain('xl:block')
    expect(rail().className).toContain('xl:sticky')
    expect(rail().className).toContain('print:hidden')
  })

  it('sits to the RIGHT of the reading column, and after it in source order', () => {
    // A scrollbar belongs on the trailing edge of what it measures — and a
    // keyboard reader must reach the transcript before the map of it.
    mockTranscript()
    renderReader()
    const reading = screen.getByRole('region', { name: 'Textul ședinței' })
    expect(
      reading.compareDocumentPosition(rail()) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
    expect(reading.className).toContain('xl:max-w-3xl')
  })

  it('fills from the top of the sitting down to the reading line', () => {
    // The rail is a progress bar first: the fill is read from the reading
    // region's own box, so the heading band and the footers are not counted as
    // transcript the reader has been through.
    const rect = vi
      .spyOn(Element.prototype, 'getBoundingClientRect')
      .mockReturnValue({
        ...new DOMRect(),
        top: -400,
        height: 4000,
      } as DOMRect)
    try {
      mockTranscript()
      const { container } = renderReader()
      // The reading line sits at 40% of a 768px viewport: 307px of the 4000px
      // transcript above it, plus the 400px already scrolled past.
      expect(
        container.querySelector('[data-rail-progress]'),
      ).toHaveAttribute('data-progress', '18')
    } finally {
      rect.mockRestore()
    }
  })

  it('never grows past one viewport, however dense the sitting', () => {
    // The previous rail grew its track and scrolled inside its own box, which
    // stopped a point on the rail meaning a point in the document. The track is
    // now fixed: density is absorbed by clustering, not by scrolling.
    mockTranscript({}, {}, denseSegments(120))
    const { container } = renderReader()

    const track = container.querySelector<HTMLElement>('[data-rail-track]')!
    expect(track.style.height).toBe('640px')
    expect(track.className).not.toContain('overflow-y-auto')
  })

  it('clusters crowded ticks instead of overlapping them, losing nobody', () => {
    // 120 contributions cannot each own an 8px slot on a 640px track, so
    // neighbours quantise onto one weighted tick — while every contribution
    // keeps its own button, at its own position, for pointer and keyboard.
    mockTranscript({}, {}, denseSegments(120))
    const { container } = renderReader()

    const markers = within(rail()).getAllByRole('button')
    expect(markers).toHaveLength(120)

    const clusters = container.querySelectorAll('[data-rail-cluster]')
    expect(clusters.length).toBeGreaterThan(0)
    expect(clusters.length).toBeLessThanOrEqual(640 / 8)
    // A cluster tick states how many turns it stands for, and no two ticks may
    // land on the same pixel.
    const sizes = [...clusters].map((tick) =>
      Number(tick.getAttribute('data-size')),
    )
    expect(Math.max(...sizes)).toBeGreaterThan(1)
    const tops = [...container.querySelectorAll<HTMLElement>('[data-rail-cluster]')]
      .map((tick) => tick.style.top)
    expect(new Set(tops).size).toBe(tops.length)
  })

  it('gives every tick a hit area several times its own size', () => {
    mockTranscript()
    renderReader()
    const marker = within(rail()).getAllByRole('button')[0]!
    // One slot tall (8px) against a 3px tick, and overhanging the 24px track on
    // both sides.
    expect(marker.style.height).toBe('8px')
    expect(marker.querySelector('span')!.style.height).toBe('3px')
    expect(marker.className).toContain('-left-1')
    expect(marker.className).toContain('-right-2')
  })

  it('holds ONE tab stop and moves between contributions with the arrows', async () => {
    // A dense sitting must not put hundreds of tab stops between the document
    // and the page's own navigation.
    mockTranscript()
    renderReader()

    const markers = within(rail()).getAllByRole('button')
    expect(markers.map((marker) => marker.tabIndex)).toEqual([0, -1])

    await act(async () => markers[0]!.focus())
    await userEvent.keyboard('{ArrowDown}')
    expect(markers[1]!).toHaveFocus()
    expect(markers.map((marker) => marker.tabIndex)).toEqual([-1, 0])

    await userEvent.keyboard('{Home}')
    expect(markers[0]!).toHaveFocus()
  })

  it('animates only where the reader allows motion', () => {
    mockTranscript()
    const { container } = renderReader()
    expect(
      container.querySelector('[data-rail-progress]')!.className,
    ).toContain('motion-safe:transition-[height]')
    expect(within(rail()).getAllByRole('button')[0]!.className).toContain(
      'motion-safe:transition-[top,height]',
    )
  })

  it('tracks the reading with ONE observer over the contribution blocks', () => {
    // Not one scroll listener per tick, and not an observer rebuilt per scroll:
    // exactly one observer, over a narrow reading band, for the whole sitting.
    const Real = window.IntersectionObserver
    const built: (IntersectionObserverInit | undefined)[] = []
    class CountingObserver extends Real {
      constructor(
        callback: IntersectionObserverCallback,
        init?: IntersectionObserverInit,
      ) {
        super(callback, init)
        built.push(init)
      }
    }
    window.IntersectionObserver = CountingObserver

    try {
      mockTranscript()
      renderReader()
      expect(built).toHaveLength(1)
      expect(built[0]?.rootMargin).toBe('-40% 0px -45% 0px')
    } finally {
      window.IntersectionObserver = Real
    }
  })
})

describe('filtering the reading by speaker', () => {
  const rail = () =>
    screen.getByRole('navigation', { name: 'Harta intervențiilor din ședință' })

  it('offers the sitting own printed speakers, counted', () => {
    mockTranscript()
    renderReader()
    expect(
      screen.getByRole('button', { name: 'Filtru: Ion Popescu (1 luare de cuvânt)' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', {
        name: 'Filtru: Maria Ionescu (1 luare de cuvânt)',
      }),
    ).toBeInTheDocument()
  })

  it('puts a chosen speaker in the URL, so a filtered reading is shareable', async () => {
    mockTranscript()
    renderReader()

    await userEvent.click(
      screen.getByRole('button', { name: /Filtru: Maria Ionescu/ }),
    )
    expect(navigate).toHaveBeenCalledWith(
      expect.objectContaining({
        search: { vorbitori: ['Maria Ionescu'] },
        replace: true,
        resetScroll: false,
      }),
    )
  })

  it('supports MANY speakers at once', async () => {
    mockTranscript()
    renderReader({ vorbitori: ['Ion Popescu'] })

    await userEvent.click(
      screen.getByRole('button', { name: /Filtru: Maria Ionescu/ }),
    )
    expect(navigate).toHaveBeenCalledWith(
      expect.objectContaining({
        search: { vorbitori: ['Ion Popescu', 'Maria Ionescu'] },
      }),
    )
  })

  it('renders ONLY the selected speaker contributions', () => {
    mockTranscript()
    const { container } = renderReader({ vorbitori: ['Maria Ionescu'] })

    expect(container.querySelectorAll('[id^="stenogram-block-"]')).toHaveLength(1)
    expect(screen.getByText(/Nu sunt de acord/)).toBeInTheDocument()
    expect(screen.queryByText(/Susțin proiectul/)).toBeNull()
    // The heading and the narration are gone from the READING with everything
    // else: an excerpt must not keep the structure of a document it no longer
    // contains. (The left lane still names the surviving section — see below.)
    const reading = screen.getByRole('region', { name: 'Textul ședinței' })
    expect(within(reading).queryByText(/Punctul 1/)).toBeNull()
    expect(screen.queryByText(/rumoare în sală/)).toBeNull()
  })

  it('says it is an excerpt, counted against the WHOLE sitting, IN THE LANE', () => {
    // Not a full-width band above the reader: as a band the claim is read once
    // and then scrolls away, leaving screens of text that look like a sitting.
    mockTranscript()
    renderReader({ vorbitori: ['Maria Ionescu'] })
    const notice = screen.getByText(
      'Extras filtrat — nu este stenograma integrală.',
    )
    expect(notice).toBeInTheDocument()
    expect(leftLane().contains(notice)).toBe(true)
    expect(
      screen.getByText(
        /Se afișează 1 din 2 luări de cuvânt ale ședinței, doar de la: Maria Ionescu\./,
      ),
    ).toBeInTheDocument()
  })

  it('clears the whole filter in one click, back to the complete record', async () => {
    mockTranscript()
    renderReader({ vorbitori: ['Maria Ionescu'] })

    const restore = screen.getAllByRole('button', {
      name: 'Arată stenograma integrală',
    })
    // ONE restore-full action on the surface, not a pair with the toolbar.
    expect(restore).toHaveLength(1)
    await userEvent.click(restore[0]!)
    expect(navigate).toHaveBeenCalledWith(
      expect.objectContaining({ search: {} }),
    )
  })

  it('rebuilds the AGENDA over the excerpt instead of hiding or faking it', () => {
    mockTranscript()
    renderReader({ vorbitori: ['Maria Ionescu'] })

    // Named as what it is: the agenda OF THE EXCERPT.
    const agenda = screen.getByRole('navigation', {
      name: 'Ordinea de zi din extras',
    })
    expect(
      screen.queryByRole('navigation', { name: 'Ordinea de zi a ședinței' }),
    ).toBeNull()
    // Its one entry counts the VISIBLE turns, not the section's real size.
    expect(
      within(agenda).getByRole('button', { name: /Punctul 1/ }).textContent,
    ).toContain('1 luare de cuvânt afișată')
  })

  it('agenda entries land on a VISIBLE block, never on a hidden heading', async () => {
    mockTranscript({}, {}, [
      SEGMENTS[0]!,
      SEGMENTS[1]!,
      SEGMENTS[3]!,
      segment(4, 'SPEECH', 'Revin cu o precizare.', {
        speakerName: 'Maria Ionescu',
        speechKey: 'canon:sp:4',
      }),
    ])
    const { container } = renderReader({ vorbitori: ['Maria Ionescu'] })

    await userEvent.click(
      screen.getByRole('button', { name: /Punctul 1/ }),
    )
    // Position 3 is Maria's first surviving turn; the heading at 0 is gone.
    await waitFor(() =>
      expect(container.querySelector(`#${segmentDomId(3)}`)).toHaveFocus(),
    )
    expect(container.querySelector(`#${segmentDomId(0)}`)).toBeNull()
  })

  it('renders NO agenda when the excerpt sits under no heading at all', () => {
    // An honest gap beats a map of a document that is not on screen.
    mockTranscript({}, {}, [SEGMENTS[1]!, SEGMENTS[3]!])
    renderReader({ vorbitori: ['Maria Ionescu'] })
    expect(screen.queryByRole('navigation', { name: /Ordinea de zi/ })).toBeNull()
    expect(
      screen.queryByRole('link', { name: 'Sari la textul ședinței' }),
    ).toBeNull()
  })

  it('keeps the FULL reading, agenda and order intact when nothing is selected', () => {
    mockTranscript()
    const { container } = renderReader()
    expect(container.querySelectorAll('[id^="stenogram-block-"]')).toHaveLength(4)
    expect(
      screen.getByRole('navigation', { name: 'Ordinea de zi a ședinței' }),
    ).toBeInTheDocument()
    expect(screen.queryByText(/Extras filtrat/)).toBeNull()
  })

  it('narrows the intervention rail to the VISIBLE contributions', () => {
    mockTranscript()
    renderReader({ vorbitori: ['Maria Ionescu'] })
    const markers = within(rail()).getAllByRole('button')
    expect(markers.map((marker) => marker.getAttribute('aria-label'))).toEqual([
      'Intervenția 1: Maria Ionescu',
    ])
  })

  it('steps prev/next through the FILTERED set only', async () => {
    mockTranscript({}, {}, [
      SEGMENTS[0]!,
      SEGMENTS[1]!,
      SEGMENTS[3]!,
      segment(4, 'SPEECH', 'Revin cu o precizare.', {
        speakerName: 'Ion Popescu',
        speechKey: 'canon:sp:4',
      }),
    ])
    renderReader({ interventie: 'canon:sp:1', vorbitori: ['Ion Popescu'] })

    await userEvent.click(
      screen.getByRole('button', { name: /Intervenția următoare/ }),
    )
    // Maria's turn sits between the two in the document and is skipped.
    expect(navigate).toHaveBeenCalledWith(
      expect.objectContaining({
        search: { interventie: 'canon:sp:4', vorbitori: ['Ion Popescu'] },
      }),
    )
  })

  it('prints the EXCERPT, and labels the print action as such', () => {
    mockTranscript()
    renderReader({ vorbitori: ['Maria Ionescu'] })
    expect(
      screen.getByRole('button', { name: /Printează extrasul filtrat/ }),
    ).toBeInTheDocument()
    // The notice that says it is an excerpt goes onto paper with it — so the
    // lane that now holds it must not be `print:hidden` either.
    const notice = screen
      .getByText('Extras filtrat — nu este stenograma integrală.')
      .closest('[role="status"]')!
    expect(notice.className).not.toContain('print:hidden')
    expect(leftLane().className).not.toContain('print:hidden')
  })

  it('prints the complete sitting, plainly labelled, when unfiltered', () => {
    mockTranscript()
    renderReader()
    expect(screen.getByRole('button', { name: /Printează/ }).textContent).toBe(
      'Printează',
    )
  })
})

describe('a deep link and a speaker filter that disagree', () => {
  it('says the linked contribution is outside the excerpt, and offers the way back', () => {
    mockTranscript()
    renderReader({ interventie: 'canon:sp:1', vorbitori: ['Maria Ionescu'] })

    // Stated inside the excerpt notice, which already carries the ONE way back
    // — a second card with its own identical button would be the duplicate.
    expect(
      screen.getByText(/Intervenția din link nu aparține vorbitorilor selectați/),
    ).toBeInTheDocument()
    expect(
      screen.getAllByRole('button', { name: 'Arată stenograma integrală' }),
    ).toHaveLength(1)
    // Nothing crashes, and the excerpt still reads.
    expect(screen.getByText(/Nu sunt de acord/)).toBeInTheDocument()
  })

  it('drops the hidden link on the next filter action, keeping the URL honest', async () => {
    mockTranscript()
    renderReader({ interventie: 'canon:sp:1' })

    await userEvent.click(
      screen.getByRole('button', { name: /Filtru: Maria Ionescu/ }),
    )
    expect(navigate).toHaveBeenCalledWith(
      expect.objectContaining({ search: { vorbitori: ['Maria Ionescu'] } }),
    )
  })

  it('KEEPS a link whose speaker survives the new selection', async () => {
    mockTranscript()
    renderReader({ interventie: 'canon:sp:1' })

    await userEvent.click(
      screen.getByRole('button', { name: /Filtru: Ion Popescu/ }),
    )
    expect(navigate).toHaveBeenCalledWith(
      expect.objectContaining({
        search: { interventie: 'canon:sp:1', vorbitori: ['Ion Popescu'] },
      }),
    )
  })

  it('keeps an UNRESOLVED legacy link rather than silently dropping it', async () => {
    // It may still resolve through the server redirect map; discarding somebody
    // shared URL because we cannot yet place it is the worse failure.
    mockTranscript()
    renderReader({ interventie: 'cdep:legacy:9043:9:718' })

    await userEvent.click(
      screen.getByRole('button', { name: /Filtru: Ion Popescu/ }),
    )
    expect(navigate).toHaveBeenCalledWith(
      expect.objectContaining({
        search: {
          interventie: 'cdep:legacy:9043:9:718',
          vorbitori: ['Ion Popescu'],
        },
      }),
    )
  })

  it('a deep link still lands normally in FULL mode', async () => {
    mockTranscript()
    const { container } = renderReader({ interventie: 'canon:sp:3' })
    await waitFor(() =>
      expect(container.querySelector(`#${segmentDomId(3)}`)).toHaveFocus(),
    )
    expect(screen.queryByText(/nu aparține vorbitorilor selectați/)).toBeNull()
  })
})

describe('the way back to the top of a long sitting', () => {
  function scrollTo(y: number) {
    Object.defineProperty(window, 'scrollY', {
      writable: true,
      configurable: true,
      value: y,
    })
    act(() => {
      window.dispatchEvent(new Event('scroll'))
    })
  }

  const LABEL = 'Înapoi la începutul stenogramei'

  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0)
      return 1
    })
    window.scrollTo = vi.fn() as unknown as typeof window.scrollTo
  })

  afterEach(() => {
    scrollTo(0)
  })

  it('appears only after meaningful scroll, and returns focus to the heading', async () => {
    mockTranscript()
    renderReader()
    expect(screen.queryByRole('button', { name: LABEL })).toBeNull()

    scrollTo(1200)
    await userEvent.click(screen.getAllByRole('button', { name: LABEL })[0]!)
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' })
    expect(
      screen.getByRole('heading', {
        name: 'Ședința Camerei Deputaților din 13 mai 2026',
        level: 1,
      }),
    ).toHaveFocus()
  })

  it('lives in the LEFT lane on desktop — never floating over the reading', () => {
    // It used to be a fixed bottom-right FAB and it covered the prose, the
    // intervention rail and the app's own dock. No overlay, no corner.
    mockTranscript()
    renderReader()
    scrollTo(1200)

    const inLane = screen
      .getAllByRole('button', { name: LABEL })
      .find((node) => leftLane().contains(node))!
    expect(inLane).toBeDefined()
    expect(inLane.className).not.toContain('fixed')
    expect(inLane.className).toContain('lg:inline-flex')
    // …and it sits BELOW the agenda and the notice in the lane.
    const agenda = screen.getByRole('navigation', {
      name: 'Ordinea de zi a ședinței',
    })
    expect(
      agenda.compareDocumentPosition(inLane) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })

  it('gives narrow screens an in-flow action at the END of the reading', () => {
    // Below `lg` the bottom of the viewport belongs to the app's dock and its
    // chat/feedback buttons; the desktop lane is hidden there instead.
    mockTranscript()
    renderReader()
    scrollTo(1200)

    const outside = screen
      .getAllByRole('button', { name: LABEL })
      .filter((node) => !leftLane().contains(node))
    expect(outside).toHaveLength(1)
    expect(outside[0]!.parentElement?.className).toContain('lg:hidden')
    const reading = screen.getByRole('region', { name: 'Textul ședinței' })
    expect(
      reading.compareDocumentPosition(outside[0]!) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })

  it('never covers the transcript: no fixed positioning anywhere', () => {
    mockTranscript()
    const { container } = renderReader()
    scrollTo(1200)
    for (const node of screen.getAllByRole('button', { name: LABEL })) {
      expect(node.className).not.toContain('fixed')
    }
    expect(container.querySelector('.fixed')).toBeNull()
  })
})

describe('honest availability and failure states', () => {
  /** The typed refusal a SOURCE_ONLY sitting produces, sitting ref attached. */
  function sourceOnlyFailure() {
    return new ParliamentStenogramFailureError({
      kind: 'transcript_unavailable',
      reason: 'source_only',
      sessionKey: 'canon:s1',
      session: {
        sessionKey: 'canon:s1',
        chamber: 'senat',
        sessionDate: '2026-05-13',
        title: 'Ședința Senatului din 13 mai 2026',
        availability: 'SOURCE_ONLY',
        sourceUrl: 'https://senat.ro/lista',
        sourceUrlKind: 'lossy_root',
      },
      message: 'blank capture',
      retryable: false,
    })
  }

  it('a SOURCE_ONLY sitting is a REFUSAL that still names the sitting', () => {
    // It arrives as a typed 409 carrying the sitting — never as a 200 with an
    // empty reading, which would render a real sitting as a silent one.
    useParliamentTranscript.mockReturnValue({
      ...idleQuery,
      isError: true,
      error: sourceOnlyFailure(),
    })
    renderReader()

    expect(
      screen.getByText(/Ședința există, dar textul nu este servit aici/),
    ).toBeInTheDocument()
    // The sitting's own identity, from the ref the error carried.
    expect(
      screen.getByRole('heading', {
        name: 'Ședința Senatului din 13 mai 2026',
        level: 1,
      }),
    ).toBeInTheDocument()
    expect(screen.getByText('Senat')).toBeInTheDocument()
    expect(screen.getByText('Doar linkul oficial')).toBeInTheDocument()
    // A lossy Senate link is labelled as a sitting root, not an exact anchor.
    expect(
      screen.getByRole('link', {
        name: 'Deschide ședința la sursă (senat.ro)',
      }),
    ).toHaveAttribute('href', 'https://senat.ro/lista')
    // No reading column, no find-in-document, no retry for a permanent fact.
    expect(screen.queryByRole('searchbox')).toBeNull()
    expect(screen.queryByRole('button', { name: /Reîncearcă/ })).toBeNull()
  })

  it('distinguishes SOURCE_ONLY from NOT_FOUND — one names a sitting, one cannot', () => {
    useParliamentTranscript.mockReturnValue({
      ...idleQuery,
      isError: true,
      error: new ParliamentStenogramFailureError({
        kind: 'not_found',
        message: 'no such sitting',
        retryable: false,
      }),
    })
    renderReader()
    expect(screen.getByText(/Nu am găsit această ședință/)).toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 1 })).toBeNull()
  })

  it('a PARTIAL capture still reads, with its caveat stated', () => {
    mockTranscript({}, { availability: 'PARTIAL' })
    renderReader()
    expect(
      screen.getByText(/sursa nu a tipărit numele vorbitorilor/),
    ).toBeInTheDocument()
    expect(screen.getByText(/Susțin proiectul/)).toBeInTheDocument()
  })

  it('a NOT_FOUND is terminal and offers no retry', () => {
    useParliamentTranscript.mockReturnValue({
      ...idleQuery,
      isError: true,
      error: new GraphQLRequestError('gone', {
        graphQLErrors: [
          { message: 'no such sitting', extensions: { code: 'NOT_FOUND' } },
        ],
      }),
    })
    renderReader()
    expect(screen.getByText(/Nu am găsit această ședință/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Reîncearcă/ })).toBeNull()
  })

  it('a TRANSPORT failure is retryable and never claims the sitting is missing', () => {
    useParliamentTranscript.mockReturnValue({
      ...idleQuery,
      isError: true,
      error: new GraphQLRequestError('GraphQL request failed: fetch failed'),
    })
    renderReader()
    expect(screen.getByText(/Nu am putut contacta serverul/)).toBeInTheDocument()
    expect(screen.queryByText(/Nu am găsit această ședință/)).toBeNull()
    expect(screen.getByRole('button', { name: /Reîncearcă/ })).toBeInTheDocument()
  })

  it('a missing projection is retryable and blames the deployment', () => {
    useParliamentTranscript.mockReturnValue({
      ...idleQuery,
      isError: true,
      error: new GraphQLRequestError('unavailable', {
        graphQLErrors: [
          {
            message: 'projection missing',
            extensions: {
              code: 'TRANSCRIPT_UNAVAILABLE',
              reason: 'projection_unavailable',
            },
          },
        ],
      }),
    })
    renderReader()
    expect(
      screen.getByText(/Cititorul de stenograme nu este disponibil momentan/),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Reîncearcă/ })).toBeInTheDocument()
  })
})

describe('sitting navigation comes from the response, not a client scan', () => {
  const ref = (sessionKey: string, sessionDate: string) => ({
    sessionKey,
    chamber: 'camera_deputatilor',
    sessionDate,
    title: `Ședința din ${sessionDate}`,
    availability: 'COMPLETE' as const,
    sourceUrl: 'https://cdep.ro/x',
    sourceUrlKind: 'exact',
  })

  it('links the neighbours the API served', () => {
    mockTranscript({}, {}, SEGMENTS, {
      previous: ref('canon:s0', '2026-05-11'),
      next: ref('canon:s2', '2026-05-14'),
    })
    renderReader()

    expect(
      screen.getByRole('navigation', { name: 'Navigare între ședințe' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: /Ședința anterioară/ }),
    ).toHaveAttribute('href', '/parlament/stenograme/sedinte/canon:s0')
    expect(
      screen.getByRole('link', { name: /Ședința următoare/ }),
    ).toHaveAttribute('href', '/parlament/stenograme/sedinte/canon:s2')
  })

  it('renders only the side that exists', () => {
    mockTranscript({}, {}, SEGMENTS, { previous: ref('canon:s0', '2026-05-11') })
    renderReader()
    expect(
      screen.getByRole('link', { name: /Ședința anterioară/ }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Ședința următoare/ })).toBeNull()
  })

  it('renders NOTHING when the API reports no neighbours at all', () => {
    mockTranscript()
    renderReader()
    expect(
      screen.queryByRole('navigation', { name: 'Navigare între ședințe' }),
    ).toBeNull()
  })
})

describe('accessibility and landmarks', () => {
  it('offers a skip link past the agenda rail to the reading', async () => {
    // The rail precedes the document in source order and stacks above it on
    // mobile, so without this a keyboard reader tabs through every agenda item.
    mockTranscript()
    renderReader()

    const skip = screen.getByRole('link', { name: 'Sari la textul ședinței' })
    expect(skip).toHaveAttribute('href', '#stenogram-reading')
    expect(skip.className).toContain('sr-only')
    expect(skip.className).toContain('focus:not-sr-only')

    await userEvent.click(skip)
    expect(document.getElementById('stenogram-reading')).toHaveFocus()
  })

  it('labels the reading as its own region', () => {
    mockTranscript()
    renderReader()
    expect(
      screen.getByRole('region', { name: 'Textul ședinței' }),
    ).toBeInTheDocument()
  })

  it('omits the skip link when the capture printed no agenda to skip', () => {
    // A narration-only capture builds no agenda, so nothing precedes the
    // reading and the skip link would jump nowhere.
    mockTranscript({}, {}, [SEGMENTS[2]!])
    renderReader()
    expect(
      screen.queryByRole('link', { name: 'Sari la textul ședinței' }),
    ).toBeNull()
  })

  it('needs no skip link for the intervention rail, which FOLLOWS the reading', () => {
    // The rail used to sit between the agenda and the document, so a keyboard
    // reader tabbed through every tick to reach the text. It is now after the
    // reading column, and holds a single tab stop of its own.
    mockTranscript({}, {}, [SEGMENTS[1]!])
    renderReader()
    expect(
      screen.queryByRole('link', { name: 'Sari la textul ședinței' }),
    ).toBeNull()
    expect(
      screen.getByRole('navigation', {
        name: 'Harta intervențiilor din ședință',
      }),
    ).toBeInTheDocument()
  })

  it('names both navigation landmarks distinctly', () => {
    mockTranscript({}, {}, SEGMENTS, {
      previous: {
        sessionKey: 'canon:s0',
        chamber: 'camera_deputatilor',
        sessionDate: '2026-05-11',
        title: 'Anterioară',
        availability: 'COMPLETE' as const,
        sourceUrl: 'https://cdep.ro/x',
        sourceUrlKind: 'exact',
      },
    })
    renderReader({ interventie: 'canon:sp:1' })
    expect(
      screen.getByRole('navigation', { name: 'Navigare între intervenții' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('navigation', { name: 'Navigare între ședințe' }),
    ).toBeInTheDocument()
  })
})

describe('print form', () => {
  it('hides the controls and keeps the source URL readable on paper', () => {
    mockTranscript()
    const { container } = renderReader()

    // Search, actions and navigation are screen affordances, not document.
    expect(
      container.querySelector('.print\\:hidden'),
    ).toBeInTheDocument()
    // The outbound link is not clickable on paper, so the URL is printed.
    const printedUrl = container.querySelector('.hidden.print\\:block')
    expect(printedUrl?.textContent).toBe('https://cdep.ro/steno/1')
  })

  it('prints the reading column at document type sizes', () => {
    mockTranscript()
    const { container } = renderReader()
    const column = container.querySelector('[class*="print:text-[11pt]"]')
    expect(column).toBeInTheDocument()
  })
})

describe('the completeness invariant', () => {
  it('offers NO paging control — one response is the whole sitting', () => {
    mockTranscript()
    renderReader()
    // The old reader carried "Încărcate N din M" plus a "load the rest" button,
    // which left find-in-document and print running on a prefix.
    expect(
      screen.queryByRole('button', { name: /Încarcă restul stenogramei/ }),
    ).toBeNull()
    expect(screen.queryByText(/Încărcate \d+ din \d+ blocuri/)).toBeNull()
  })

  it('renders every block, so search and print see the whole document', () => {
    mockTranscript()
    const { container } = renderReader()
    expect(container.querySelectorAll('[id^="stenogram-block-"]')).toHaveLength(
      SEGMENTS.length,
    )
  })

  it('keeps long sittings cheap by skipping off-screen block rendering', () => {
    // `content-visibility:auto` rather than virtualisation — every block stays
    // in the DOM, so anchors, scrollIntoView, native Ctrl+F and print all work.
    mockTranscript()
    const { container } = renderReader()
    const block = container.querySelector('#stenogram-block-1') as HTMLElement
    expect(block.className).toContain('[content-visibility:auto]')
    expect(block.className).toContain('print:[content-visibility:visible]')
    // A size estimate keeps the scrollbar stable while blocks are realised.
    expect(block.style.containIntrinsicSize).toMatch(/^auto \d+px$/)
  })
})
