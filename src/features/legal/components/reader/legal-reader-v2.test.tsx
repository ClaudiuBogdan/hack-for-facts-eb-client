/**
 * The reader on legal_v2 (server LEGAL_SOURCE=v2): forms with opaque
 * `f<form_id>` ids, the consolidation banner LEG-X3AV requires wherever a
 * consolidation's text is shown, old numeric `?doc=` links still landing on
 * this act's form (and never on another act's), the version selector, and
 * "text not yet available" for a form with no text.
 *
 * The render transport and the act-scoped `resolveDocument` lookup are
 * mocked here, so the test controls which form the server says a page id
 * resolves to; the body is the server converter's own output for a real unit.
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

/** Old page id → what `LegalAct.resolveDocument` answers for this act. */
const PAGE_TO_FORM: Record<string, string | null> = {
  '900012': 'f900012', // the page of this act's default consolidation
  '777': 'f900011', // a page of THIS act's original
  '54260': 'f555', // an answer naming no version of this act (I-17)
  '31337': null, // a page that names no form of this act
}

vi.mock('../../api/legal-resolve-document-api', () => ({
  resolveLegalDocument: vi.fn(async (_actId: string, documentId: string) =>
    PAGE_TO_FORM[documentId] ?? null,
  ),
}))

/** The servedForm a test lays on the next render answer (REST meta). */
let nextServedForm: LegalRenderData['servedForm'] = undefined

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
    const data = envelopeFor(documentId)
    return nextServedForm === undefined ? data : { ...data, servedForm: nextServedForm }
  }),
}))

import { fetchLegalRender } from '../../api/legal-render-api'
import { resolveLegalDocument } from '../../api/legal-resolve-document-api'

const render = (ui: Parameters<typeof renderShared>[0]) =>
  renderShared(ui, { queryClient: createTestQueryClient() })

const readerText = (container: HTMLElement) =>
  container.querySelector('#reader-content')?.textContent ?? ''

const requestedIds = () => vi.mocked(fetchLegalRender).mock.calls.map(([id]) => id)

describe('ActReadingLayout on legal_v2', () => {
  beforeEach(() => {
    vi.mocked(fetchLegalRender).mockClear()
    vi.mocked(resolveLegalDocument).mockClear()
    navigateMock.mockClear()
    nextServedForm = undefined
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

  it("asks the server's act-scoped lookup for an old page id, even one a form's sourceUrl names", async () => {
    render(
      <ActReadingLayout act={legalActDetailV2Fixture} docOverride="900012" lead={null} fisa={null} />,
    )
    await screen.findByText(/Formă consolidată neoficială, cu caracter informativ\./)
    expect(vi.mocked(resolveLegalDocument)).toHaveBeenCalledWith('900001', '900012', expect.anything())
    // The text is read by the form id the lookup answered — no render probe.
    expect(requestedIds()).toEqual(['f900012'])
    expect(screen.queryByText(/nu aparține acestui act/)).not.toBeInTheDocument()
  })

  it("reads the form the lookup names when it is one of this act's versions", async () => {
    const { container } = render(
      <ActReadingLayout act={legalActDetailV2Fixture} docOverride="777" lead={null} fisa={null} />,
    )
    await waitFor(() => expect(readerText(container).length).toBeGreaterThan(100))
    expect(requestedIds()).toEqual(['f900011'])
    expect(screen.queryByText(/nu aparține acestui act/)).not.toBeInTheDocument()
    // The answer names the original: no consolidation banner, selector on it.
    expect(screen.queryByText(/Formă consolidată neoficială/)).not.toBeInTheDocument()
    expect(screen.getByLabelText(/Versiunea textului/)).toHaveValue('f900011')
  })

  it.each([
    ['names no version of this act', '54260'],
    ['names no form at all', '31337'],
  ])('refuses a page id whose lookup %s, and reads the default (I-17)', async (_case, page) => {
    render(
      <ActReadingLayout act={legalActDetailV2Fixture} docOverride={page} lead={null} fisa={null} />,
    )
    expect(await screen.findByText(/nu aparține acestui act/)).toBeInTheDocument()
    await screen.findByText(/Formă consolidată neoficială, cu caracter informativ\./)
    // The other act's text is never fetched.
    expect(requestedIds()).toEqual(['f900012'])
  })

  it("labels the text by the render's servedForm, the authoritative account of what was served", async () => {
    // The version list calls f900011 the original; the server says the text
    // it served is a consolidation — the banner follows the server.
    nextServedForm = {
      documentId: 'f900011',
      versionKind: 'consolidare',
      caveat: 'unofficial_consolidation',
      portalLabelRaw: 'actualizat până la',
      portalLabelDate: '2023-01-05',
      sourceUrl: 'https://legislatie.just.ro/Public/DetaliiDocumentAfis/5551',
    }
    render(
      <ActReadingLayout act={legalActDetailV2Fixture} docOverride="f900011" lead={null} fisa={null} />,
    )
    const banner = await screen.findByText(/Formă consolidată neoficială, cu caracter informativ\./)
    expect(banner.closest('[role="note"]')).toHaveTextContent(/„actualizat până la .*2023.*”/)
    expect(
      screen.getByRole('link', { name: /Forma consolidată pe Portalul Legislativ/ }),
    ).toHaveAttribute('href', 'https://legislatie.just.ro/Public/DetaliiDocumentAfis/5551')
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
