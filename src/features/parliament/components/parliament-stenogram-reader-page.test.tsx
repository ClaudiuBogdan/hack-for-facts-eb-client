import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
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

function renderReader(search: { interventie?: string } = {}) {
  return render(
    <ParliamentStenogramReaderPage sessionKey="canon:s1" search={search} />,
  )
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

  it('stacks on mobile and becomes a sticky rail + column at lg', () => {
    mockTranscript()
    const { container } = renderReader()
    const grid = container.querySelector('.lg\\:flex-row')!
    expect(grid.className).toContain('flex-col')
    const rail = screen.getByRole('navigation', {
      name: 'Ordinea de zi a ședinței',
    })
    expect(rail.className).toContain('lg:sticky')
    expect(rail.className).toContain('lg:w-72')
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

describe('in-document search inside the reader', () => {
  it('finds diacritic-free typing and reports the hit count', async () => {
    mockTranscript()
    renderReader()

    await userEvent.type(
      screen.getByRole('searchbox', { name: /Caută în textul acestei ședințe/ }),
      'sanatat',
    )
    await waitFor(() => expect(screen.getByText(/1 din 2/)).toBeInTheDocument())
  })

  it('steps between matches and wraps around', async () => {
    mockTranscript()
    const { container } = renderReader()

    await userEvent.type(
      screen.getByRole('searchbox', { name: /Caută în textul/ }),
      'sanatat',
    )
    await waitFor(() => expect(screen.getByText(/1 din 2/)).toBeInTheDocument())

    await userEvent.click(
      screen.getByRole('button', { name: 'Rezultatul următor' }),
    )
    await waitFor(() => expect(screen.getByText(/2 din 2/)).toBeInTheDocument())
    expect(
      container.querySelector('mark[data-match-index="1"]')!.className,
    ).toContain('outline-2')

    await userEvent.click(
      screen.getByRole('button', { name: 'Rezultatul următor' }),
    )
    await waitFor(() => expect(screen.getByText(/1 din 2/)).toBeInTheDocument())
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

  it('omits the skip link when there is no agenda to skip', () => {
    mockTranscript({}, {}, [SEGMENTS[1]!])
    renderReader()
    expect(
      screen.queryByRole('link', { name: 'Sari la textul ședinței' }),
    ).toBeNull()
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
