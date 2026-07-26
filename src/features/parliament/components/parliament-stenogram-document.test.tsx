import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import {
  ParliamentStenogramSegmentSchema,
  type ParliamentStenogramSegment,
} from '@/schemas/parliament'
import { findDocumentMatches } from '../lib/stenogram-document-search'
import { segmentDomId } from '../lib/stenogram-toc'
import { ParliamentStenogramDocument } from './parliament-stenogram-document'

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    to,
    params,
  }: {
    children: ReactNode
    to: string
    params?: Record<string, string>
  }) => (
    <a
      href={Object.entries(params ?? {}).reduce(
        (path, [key, value]) => path.replace(`$${key}`, value),
        to,
      )}
    >
      {children}
    </a>
  ),
}))

function segment(
  position: number,
  kind: ParliamentStenogramSegment['kind'],
  text: string,
  extra: Partial<ParliamentStenogramSegment> = {},
): ParliamentStenogramSegment {
  return ParliamentStenogramSegmentSchema.parse({
    segmentKey: `canon:s#${String(position)}`,
    sessionKey: 'canon:s',
    position,
    kind,
    text,
    textChars: text.length,
    sourceUrl: 'https://cdep.ro/x',
    sourceUrlKind: 'exact',
    ...extra,
  })
}

const segments: ParliamentStenogramSegment[] = [
  segment(0, 'AGENDA_HEADING', 'Punctul 1 — bugetul sănătății'),
  segment(1, 'SPEECH', 'Susțin proiectul privind sănătatea.', {
    speakerName: 'Ion Popescu',
    mandateKey: 'm-1',
    speechKey: 'canon:sp:1',
  }),
  segment(2, 'CONTEXT', '(rumoare în sală)'),
  segment(3, 'SPEECH', 'Nu sunt de acord cu propunerea.', {
    speakerName: 'Maria Ionescu',
    speechKey: 'canon:sp:3',
  }),
]

function renderDocument(
  overrides: Partial<
    Parameters<typeof ParliamentStenogramDocument>[0]
  > = {},
) {
  return render(
    <ParliamentStenogramDocument
      segments={segments}
      selectedPosition={undefined}
      matches={[]}
      currentMatch={0}
      {...overrides}
    />,
  )
}

describe('ParliamentStenogramDocument', () => {
  it('renders every block in the printed order', () => {
    const { container } = renderDocument()
    const ids = [...container.querySelectorAll('[id^="stenogram-block-"]')].map(
      (node) => node.id,
    )
    expect(ids).toEqual([0, 1, 2, 3].map(segmentDomId))
  })

  it('HIGHLIGHTS the selected block WITHOUT removing its context', () => {
    // Filtering the document down to one turn is the tempting implementation
    // and the wrong one — a quote lifted out of the debate is the failure mode
    // this surface exists to prevent.
    const { container } = renderDocument({ selectedPosition: 1 })

    expect(container.querySelectorAll('[id^="stenogram-block-"]')).toHaveLength(
      4,
    )
    expect(screen.getByText(/Nu sunt de acord/)).toBeInTheDocument()
    expect(screen.getByText(/rumoare în sală/)).toBeInTheDocument()

    const selected = container.querySelector(`#${segmentDomId(1)}`)!
    expect(selected).toHaveAttribute('aria-current', 'true')
    expect(selected.className).toContain('border-l-[#1d70b8]')
  })

  it('marks the selected block only', () => {
    const { container } = renderDocument({ selectedPosition: 3 })
    expect(
      container.querySelector(`#${segmentDomId(1)}`),
    ).not.toHaveAttribute('aria-current')
    expect(container.querySelector(`#${segmentDomId(3)}`)).toHaveAttribute(
      'aria-current',
      'true',
    )
  })

  it('every block is focusable, so keyboard readers land where the eye does', () => {
    const { container } = renderDocument()
    for (const node of container.querySelectorAll('[id^="stenogram-block-"]')) {
      expect(node).toHaveAttribute('tabindex', '-1')
    }
  })

  it('links a roster-resolved speaker and leaves an unmatched one plain', () => {
    renderDocument()
    expect(screen.getByRole('link', { name: 'Ion Popescu' })).toHaveAttribute(
      'href',
      '/parlament/membri/m-1/interventii',
    )
    // A guest/minister the source printed no id for is NOT turned into a member.
    expect(
      screen.queryByRole('link', { name: 'Maria Ionescu' }),
    ).not.toBeInTheDocument()
    expect(screen.getByText('Maria Ionescu')).toBeInTheDocument()
  })

  it('marks in-document search hits and rings the CURRENT one', () => {
    const matches = findDocumentMatches(segments, 'sanatat')
    const { container } = renderDocument({ matches, currentMatch: 1 })

    const marks = container.querySelectorAll('mark')
    expect(marks.length).toBe(matches.length)
    // Diacritic-forgiving: "sanatat" matched "sănătăț"/"sănătat" in place.
    expect(marks[0]?.textContent).toMatch(/sănăt/)

    const current = container.querySelector('mark[data-match-index="1"]')!
    expect(current.className).toContain('outline-2')
    expect(
      container.querySelector('mark[data-match-index="0"]')!.className,
    ).not.toContain('outline-2')
  })

  it('renders an agenda heading as a real heading', () => {
    renderDocument()
    expect(
      screen.getByRole('heading', { name: /Punctul 1/ }),
    ).toBeInTheDocument()
  })

  it('carries print classes so Ctrl+P yields a filable document', () => {
    const { container } = renderDocument({ selectedPosition: 1 })
    const column = container.firstElementChild!
    expect(column.className).toContain('print:text-[11pt]')

    const block = container.querySelector(`#${segmentDomId(1)}`)!
    expect(block.className).toContain('print:break-inside-avoid')
    // The screen-only highlight tint is dropped on paper.
    expect(block.className).toContain('print:bg-transparent')
  })

  it('hides the screen-only "from the link" flag when printing', () => {
    renderDocument({ selectedPosition: 1 })
    expect(screen.getByText('Intervenția din link').className).toContain(
      'print:hidden',
    )
  })
})
