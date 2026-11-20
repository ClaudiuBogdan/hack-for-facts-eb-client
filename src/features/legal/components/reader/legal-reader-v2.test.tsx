/**
 * The reader on legal_v2 (server LEGAL_SOURCE=v2): forms with opaque
 * `f<form_id>` ids, the consolidation banner LEG-X3AV requires wherever a
 * consolidation's text is shown, old numeric `?doc=` links still landing on
 * this act's form (and never on another act's), the version selector, and
 * "text not yet available" for a form with no text.
 *
 * The render transport is mocked here so the test controls which form the
 * server says a page id resolves to; the body is the server converter's own
 * output for a real unit.
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  render as renderShared,
  screen,
  fireEvent,
  waitFor,
  createTestQueryClient,
} from '@/test/test-utils'
import { LegalRenderFailureError } from '../../lib/legal-render-error'
import type { LegalRenderData } from '../../lib/tldf/schemas'
import {
  legalActDetailV2Fixture,
  legalActDetailV2UnbridgedFixture,
} from '../../mocks/fixtures/legal-act-detail'
import { ActReadingLayout } from './legal-reader-page'

const navigateMock = vi.fn()
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to }: { readonly children: ReactNode; readonly to: string }) => (
    <a href={to}>{children}</a>
  ),
  useNavigate: () => navigateMock,
}))

vi.mock('../../api/legal-outline-api', () => ({
  fetchLegalOutline: vi.fn(async () => []),
}))

const rows = JSON.parse(
  readFileSync(
    join(process.cwd(), 'src/features/legal/mocks/fixtures/tldf/render-rows-v2-f900012.json'),
    'utf8',
  ),
) as { tldf: Record<string, unknown> }[]

/** What the server's render route answers for a form id. */
const envelopeFor = (formId: string): LegalRenderData =>
  ({
    documentId: formId,
    kind: 'envelope',
    chunkIndex: 0,
    chunkCount: 1,
    tldf: { ...rows[0]?.tldf, document_id: formId },
  }) as unknown as LegalRenderData

/** Old page id → the form the server resolves it to (`page_targets`). */
const PAGE_TO_FORM: Record<string, string> = {
  '777': 'f900011', // a page of THIS act's original
  '54260': 'f555', // a page of some other act's form (I-17)
}

vi.mock('../../api/legal-render-api', () => ({
  fetchLegalRender: vi.fn(async (documentId: string) => {
    if (documentId === 'f900013') {
      throw new LegalRenderFailureError({
        kind: 'unavailable',
        documentId,
        renderStatus: 'not_loaded',
        message: 'document f900013 has no servable text (not_loaded)',
        retryable: false,
      })
    }
    return envelopeFor(PAGE_TO_FORM[documentId] ?? documentId)
  }),
}))

import { fetchLegalRender } from '../../api/legal-render-api'

const render = (ui: Parameters<typeof renderShared>[0]) =>
  renderShared(ui, { queryClient: createTestQueryClient() })

const readerText = (container: HTMLElement) =>
  container.querySelector('#reader-content')?.textContent ?? ''

const requestedIds = () => vi.mocked(fetchLegalRender).mock.calls.map(([id]) => id)

describe('ActReadingLayout on legal_v2', () => {
  beforeEach(() => {
    vi.mocked(fetchLegalRender).mockClear()
    navigateMock.mockClear()
  })

  it('labels the default consolidation with the LEG-X3AV banner, outside the text', async () => {
    const { container } = render(
      <ActReadingLayout act={legalActDetailV2Fixture} lead={null} fisa={null} />,
    )
    const banner = await screen.findByText(/Formă consolidată neoficială, cu caracter informativ\./)
    const note = banner.closest('[role="note"]')
    expect(note).not.toBeNull()
    expect(note).toHaveTextContent(/Portalul Legislativ indică „consolidarea din .*2024.*”\./)
    expect(note).toHaveTextContent(
      'Pentru a stabili dispozițiile aplicabile la o dată, consultați în Monitorul Oficial actul, republicările, actele modificatoare și dispozițiile tranzitorii relevante.',
    )
    expect(note).not.toHaveTextContent(/în vigoare la/)
    expect(
      screen.getByRole('link', { name: /Forma consolidată pe Portalul Legislativ/ }),
    ).toHaveAttribute('href', 'https://legislatie.just.ro/Public/DetaliiDocumentAfis/900012')
    // The label is never part of the law's text.
    await waitFor(() => expect(readerText(container).length).toBeGreaterThan(100))
    expect(readerText(container)).not.toMatch(/Formă consolidată neoficială/)
    expect(requestedIds()).toEqual(['f900012'])
  })

  it('shows no consolidation banner on the original form', async () => {
    const { container } = render(
      <ActReadingLayout act={legalActDetailV2Fixture} docOverride="f900011" lead={null} fisa={null} />,
    )
    await waitFor(() => expect(readerText(container).length).toBeGreaterThan(100))
    expect(screen.queryByText(/Formă consolidată neoficială/)).not.toBeInTheDocument()
    expect(screen.getByLabelText(/Versiunea textului/)).toHaveValue('f900011')
  })

  it("lands an old page id on this act's form by its Portal page, with no probe", async () => {
    render(
      <ActReadingLayout act={legalActDetailV2Fixture} docOverride="900012" lead={null} fisa={null} />,
    )
    await screen.findByText(/Formă consolidată neoficială, cu caracter informativ\./)
    expect(requestedIds()).toEqual(['f900012'])
    expect(screen.queryByText(/nu aparține acestui act/)).not.toBeInTheDocument()
  })

  it("keeps a probed page id when the server resolves it to one of this act's forms", async () => {
    const { container } = render(
      <ActReadingLayout act={legalActDetailV2Fixture} docOverride="777" lead={null} fisa={null} />,
    )
    await waitFor(() => expect(readerText(container).length).toBeGreaterThan(100))
    expect(requestedIds()).toEqual(['777'])
    expect(screen.queryByText(/nu aparține acestui act/)).not.toBeInTheDocument()
    // The answer names the original: no consolidation banner, selector on it.
    expect(screen.queryByText(/Formă consolidată neoficială/)).not.toBeInTheDocument()
    expect(screen.getByLabelText(/Versiunea textului/)).toHaveValue('f900011')
  })

  it("refuses a probed page id that resolves to another act's form, and reads the default (I-17)", async () => {
    render(
      <ActReadingLayout act={legalActDetailV2Fixture} docOverride="54260" lead={null} fisa={null} />,
    )
    expect(await screen.findByText(/nu aparține acestui act/)).toBeInTheDocument()
    await screen.findByText(/Formă consolidată neoficială, cu caracter informativ\./)
    expect(requestedIds()).toEqual(['54260', 'f900012'])
  })

  it('says "text not yet available" for a form whose text is not loaded, with no retry and no banner', async () => {
    render(
      <ActReadingLayout act={legalActDetailV2Fixture} docOverride="f900013" lead={null} fisa={null} />,
    )
    expect(await screen.findByText('Textul nu este încă disponibil')).toBeInTheDocument()
    expect(screen.getByText(/textul ei nu este încă încărcat aici/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Încearcă din nou/ })).not.toBeInTheDocument()
    expect(screen.queryByText(/Formă consolidată neoficială/)).not.toBeInTheDocument()
    // The escape hatch is the shown form's own Portal page.
    expect(screen.getByRole('link', { name: /legislatie\.just\.ro/ })).toHaveAttribute(
      'href',
      'https://legislatie.just.ro/Public/DetaliiDocumentAfis/900013',
    )
  })

  it('lists only readable versions in the selector, marks the default, and navigates by ?doc=', async () => {
    render(<ActReadingLayout act={legalActDetailV2Fixture} lead={null} fisa={null} />)
    const select = await screen.findByLabelText(/Versiunea textului/)
    const options = Array.from(select.querySelectorAll('option')).map((option) => ({
      value: option.getAttribute('value'),
      label: option.textContent,
    }))
    // Newest first; the not-loaded consolidation (f900013) is not a choice.
    expect(options.map((option) => option.value)).toEqual(['f900012', 'f900011'])
    expect(options[0]?.label).toMatch(/formă consolidată neoficială.*\(implicită\)/)

    fireEvent.change(select, { target: { value: 'f900011' } })
    expect(navigateMock).toHaveBeenCalledWith(
      expect.objectContaining({ search: { doc: 'f900011' }, hash: 'act-text' }),
    )
    fireEvent.change(select, { target: { value: 'f900012' } })
    expect(navigateMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ search: {}, hash: 'act-text' }),
    )
  })

  it('shows a static label, not a dropdown, when one version is readable', async () => {
    render(<ActReadingLayout act={legalActDetailV2UnbridgedFixture} lead={null} fisa={null} />)
    expect(await screen.findByText(/Versiunea afișată: forma publicată/)).toBeInTheDocument()
    expect(screen.queryByLabelText(/Versiunea textului/)).not.toBeInTheDocument()
  })
})
