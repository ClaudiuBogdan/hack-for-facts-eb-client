import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { ParliamentMemberSpeech } from '@/schemas/parliament'
import { MemberSpeechRecordCard } from './member-speech-record-card'

const base: ParliamentMemberSpeech = {
  speechKey: 'm:sp:0',
  spokenAt: '2026-03-20',
  title: undefined,
  summary: 'Susțin amendamentul privind investițiile locale.',
  chamber: 'comun',
  sourceUrl: 'https://www.cdep.ro/pls/steno/steno2015.stenograma?ids=9000',
  sourceUrlKind: 'exact',
  fullText: 'Domnul deputat:\nSusțin amendamentul depus de colegii mei.',
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
})
