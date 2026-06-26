import { fireEvent, render, screen, within } from '@/test/test-utils'
import { describe, expect, it } from 'vitest'
import { SourceProvenanceDrawer } from './source-provenance-drawer'

describe('SourceProvenanceDrawer', () => {
  it('opens and renders parser notes from the provenance payload', () => {
    render(
      <SourceProvenanceDrawer
        provenance={{
          sourceLabel: 'e-licitatie / SEAP (elicitatie)',
          sourceUrl: 'https://www.e-licitatie.ro/pub/notices/contract/contract-key-001',
          scraperRef: 'public-contracts-seap',
          retrievedAt: '2026-06-25T08:00:00Z',
          publishedAt: '2025-11-04T00:00:00Z',
          parserNotes: [
            'Valorile non-RON păstrează valoarea nativă; nu se însumează între monede.',
            'Numele pot conține prefixe proprii de CUI.',
          ],
        }}
        trigger={null}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /Proveniență/i }))

    const drawer = screen.getByRole('dialog')
    expect(within(drawer).getByText(/public-contracts-seap/i)).toBeInTheDocument()
    expect(
      within(drawer).getByText(/Valorile non-RON păstrează valoarea nativă/i),
    ).toBeInTheDocument()
    expect(
      within(drawer).getByText(/Numele pot conține prefixe proprii de CUI/i),
    ).toBeInTheDocument()
  })
})
