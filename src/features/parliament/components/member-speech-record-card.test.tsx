import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import type { ParliamentMemberSpeech } from '@/schemas/parliament'
import { MemberSpeechRecordCard } from './member-speech-record-card'

// The card renders router Links only for the OPTIONAL global-page props
// (speaker / detailTo); a plain anchor stub keeps the tests router-free.
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

const base: ParliamentMemberSpeech = {
  speechKey: 'm:sp:0',
  spokenAt: '2026-03-20',
  title: undefined,
  summary: 'Susțin amendamentul privind investițiile locale.',
  chamber: 'comun',
  sourceUrl: 'https://www.cdep.ro/pls/steno/steno2015.stenograma?ids=9000',
  sourceUrlKind: 'exact',
  fullText: 'Domnul deputat:\nSusțin amendamentul depus de colegii mei.',
  // Legacy by default — the sitting link is an opt-in the canonical cases set.
  isCanonical: false,
}

function renderCard(overrides: Partial<ParliamentMemberSpeech> = {}) {
  render(<MemberSpeechRecordCard speech={{ ...base, ...overrides }} />)
}

describe('MemberSpeechRecordCard', () => {
  it('leads with the summary and the UTC-pinned date', () => {
    renderCard()
    expect(
      screen.getByText(/Susțin amendamentul privind investițiile locale\./),
    ).toBeInTheDocument()
    expect(screen.getByText('20 martie 2026')).toBeInTheDocument()
  })

  it('shows the joint-sitting badge for a comun speech', () => {
    renderCard()
    expect(screen.getByText('Ședință comună')).toBeInTheDocument()
  })

  it('does NOT lead with a speaker-line-only summary; uses the first substantive transcript line', () => {
    renderCard({
      summary: 'Domnul vorbitor:',
      title: undefined,
      fullText: 'Domnul vorbitor:\nContinuăm dezbaterea privind fondurile europene.',
    })
    expect(
      screen.getByText('Continuăm dezbaterea privind fondurile europene.'),
    ).toBeInTheDocument()
    // The bare speaker line must not appear as the lead paragraph.
    expect(screen.queryByText('Domnul vorbitor:')).not.toBeInTheDocument()
  })

  it('falls back to the title when summary is speaker-line-only and no transcript', () => {
    renderCard({
      summary: 'Doamna senator:',
      title: 'Titlu de ședință',
      fullText: undefined,
    })
    expect(screen.getByText('Titlu de ședință')).toBeInTheDocument()
  })

  it('falls back to the title, then to a placeholder, when nothing is substantive', () => {
    renderCard({ summary: undefined, title: 'Titlu de ședință', fullText: undefined })
    expect(screen.getByText('Titlu de ședință')).toBeInTheDocument()

    render(
      <MemberSpeechRecordCard
        speech={{
          ...base,
          summary: 'Domnul X:',
          title: undefined,
          fullText: undefined,
          speechKey: 'x',
        }}
      />,
    )
    expect(
      screen.getByText('(conținut indisponibil în rezumat)'),
    ).toBeInTheDocument()
  })

  it('renders the transcript inside the expander when present', () => {
    renderCard()
    expect(screen.getByText('Transcriere completă')).toBeInTheDocument()
    expect(
      screen.getByText(/Susțin amendamentul depus de colegii mei\./),
    ).toBeInTheDocument()
  })

  it('shows the "not yet available" note when fullText is null', () => {
    renderCard({ fullText: undefined })
    expect(
      screen.getByText('Transcrierea completă nu este încă disponibilă.'),
    ).toBeInTheDocument()
  })

  it('presents an exact CDEP source as a real deep-link', () => {
    renderCard()
    const link = screen.getByRole('link', { name: /Vezi în stenogramă \(cdep\.ro\)/ })
    expect(link).toHaveAttribute('href', base.sourceUrl)
  })

  it('labels a lossy_root Senate source honestly (not a deep-link) with a hint', () => {
    renderCard({
      chamber: 'senat',
      sourceUrl: 'https://www.senat.ro/Legis/lista.aspx',
      sourceUrlKind: 'lossy_root',
    })
    expect(
      screen.getByRole('link', { name: /Stenogramele Senatului \(senat\.ro\)/ }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/pagina exactă a acestei intervenții trebuie găsită după dată/),
    ).toBeInTheDocument()
    // It must NOT masquerade as a CDEP deep-link.
    expect(
      screen.queryByRole('link', { name: /Vezi în stenogramă/ }),
    ).not.toBeInTheDocument()
    // The "Cameră proprie · Senat" badge marks it as own-chamber.
    expect(screen.getByText('Cameră proprie · Senat')).toBeInTheDocument()
  })

  it('renders no speaker line or detail link without the optional props', () => {
    renderCard()
    // Only the source anchor exists — no member link, no date link.
    expect(screen.getAllByRole('link')).toHaveLength(1)
    expect(screen.getByText('20 martie 2026').closest('a')).toBeNull()
  })

  it('renders a linked speaker line (global list) with the group name', () => {
    render(
      <MemberSpeechRecordCard
        speech={base}
        speaker={{ name: 'Ion Popescu', memberId: 'dep-001', groupName: 'Grupul X' }}
      />,
    )
    const link = screen.getByRole('link', { name: 'Ion Popescu' })
    expect(link).toHaveAttribute('href', '/parlament/membri/dep-001/interventii')
    expect(screen.getByText(/· Grupul X/)).toBeInTheDocument()
  })

  it('renders an unmatched speaker as plain text (real data, no link)', () => {
    render(
      <MemberSpeechRecordCard
        speech={base}
        speaker={{ name: 'Domnul Prim-Ministru' }}
      />,
    )
    expect(screen.getByText('Domnul Prim-Ministru')).toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: 'Domnul Prim-Ministru' }),
    ).not.toBeInTheDocument()
  })

  it('links the date to the speech detail page when detailTo is set', () => {
    render(<MemberSpeechRecordCard speech={base} detailTo="m:sp:0" />)
    const link = screen.getByRole('link', { name: '20 martie 2026' })
    expect(link).toHaveAttribute('href', '/parlament/stenograme/m:sp:0')
  })
})
