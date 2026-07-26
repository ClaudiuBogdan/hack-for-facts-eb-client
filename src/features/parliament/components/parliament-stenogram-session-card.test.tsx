import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import {
  ParliamentStenogramSessionSchema,
  type ParliamentStenogramSession,
} from '@/schemas/parliament'
import { ParliamentStenogramSessionCard } from './parliament-stenogram-session-card'

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
    segmentCount: 40,
    speechCount: 22,
    speakerCount: 9,
    ...overrides,
  })
}

describe('ParliamentStenogramSessionCard', () => {
  it('leads with the sitting and links into the reader', () => {
    render(<ParliamentStenogramSessionCard session={session()} />)
    expect(
      screen.getByRole('link', { name: /Ședința Camerei Deputaților/ }),
    ).toHaveAttribute('href', '/parlament/stenograme/sedinte/canon:s1')
    expect(
      screen.getByRole('link', { name: 'Citește stenograma' }),
    ).toBeInTheDocument()
  })

  it('states the availability in WORDS, not just a tint', () => {
    render(<ParliamentStenogramSessionCard session={session()} />)
    expect(screen.getByText('Transcriere completă')).toBeInTheDocument()
  })

  it('shows the honest absence when the source carries no date', () => {
    render(
      <ParliamentStenogramSessionCard
        session={session({ sessionDate: undefined, sessionDateSource: 'none' })}
      />,
    )
    expect(screen.getByText('Dată indisponibilă')).toBeInTheDocument()
  })

  it('a SOURCE_ONLY capture is LISTED but promises no reading', () => {
    // Suppressing it would quietly rewrite the record of which sittings happened.
    render(
      <ParliamentStenogramSessionCard
        session={session({ availability: 'SOURCE_ONLY', speechCount: 0 })}
      />,
    )
    expect(screen.getByText('Doar linkul oficial')).toBeInTheDocument()
    expect(
      screen.getByText(/nu conține textul dezbaterii/),
    ).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Citește stenograma' })).toBeNull()
    // The title stops being a link — there is nothing to read.
    expect(
      screen.queryByRole('link', { name: /Ședința Camerei Deputaților/ }),
    ).toBeNull()
  })

  it('always offers the official source, exact or not', () => {
    render(<ParliamentStenogramSessionCard session={session()} />)
    expect(
      screen.getByRole('link', { name: /Vezi în stenograma oficială \(cdep\.ro\)/ }),
    ).toHaveAttribute('href', 'https://cdep.ro/steno/1')
  })

  it('labels a lossy Senate link as a sitting root, not an exact deep link', () => {
    render(
      <ParliamentStenogramSessionCard
        session={session({
          chamber: 'senat',
          sourceSystem: 'senat_stenogram',
          sourceUrlKind: 'lossy_root',
          sourceUrl: 'https://senat.ro/lista',
        })}
      />,
    )
    expect(
      screen.getByRole('link', { name: /Deschide ședința la sursă \(senat\.ro\)/ }),
    ).toBeInTheDocument()
  })

  it('falls back to a derived title rather than showing the raw session key', () => {
    render(
      <ParliamentStenogramSessionCard session={session({ title: undefined })} />,
    )
    expect(screen.queryByText(/canon:s1/)).toBeNull()
    expect(
      screen.getByRole('link', { name: /Ședința Camera Deputaților din/ }),
    ).toBeInTheDocument()
  })
})
