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
  legalActDetailV2LatestNotAvailableFixture,
  legalActDetailV2NoKnownFormFixture,
  legalActDetailV2NoTextFixture,
  legalActDetailV2UndatedOriginalFixture,
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

  it('takes no ?nod= into the default text when the lookup refuses the page id (astra-client-11)', async () => {
    const nod = (rows[0]?.tldf.blocks as { id: string }[] | undefined)?.[3]?.id ?? ''
    const scrollIntoView = vi.fn()
    const original = Element.prototype.scrollIntoView
    Element.prototype.scrollIntoView = scrollIntoView
    try {
      const { container } = render(
        <ActReadingLayout act={legalActDetailV2Fixture} docOverride="54260" nod={nod} lead={null} fisa={null} />,
      )
      expect(await screen.findByText(/nu aparține acestui act/)).toBeInTheDocument()
      await waitFor(() => expect(readerText(container).length).toBeGreaterThan(100))
      expect(container.querySelector(`[id="tldf-${nod}"]`)).not.toBeNull()
      await new Promise((resolve) => setTimeout(resolve, 50))
      expect(scrollIntoView).not.toHaveBeenCalled()
      expect(screen.queryByText(/Nu am găsit fragmentul cerut/)).not.toBeInTheDocument()
    } finally {
      Element.prototype.scrollIntoView = original
    }
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

  it('marks a deep-linked note nested in a note, over the parent note\'s own ground', async () => {
    const nod = '0.1.1.12.3.1.2.1'
    const { container } = render(
      <ActReadingLayout act={legalActDetailV2Fixture} nod={nod} lead={null} fisa={null} />,
    )
    await waitFor(() => expect(container.querySelector(`[id="tldf-${nod}"]`)).not.toBeNull())
    const target = container.querySelector(`[id="tldf-${nod}"]`) as HTMLElement
    expect(target.parentElement?.closest('[data-kind="nota"]')).not.toBeNull()
    await waitFor(() => expect(target).toHaveClass('bg-foreground/10!'))
  })

  it('opens a folded note of the Portal that holds a deep-linked block', async () => {
    // The fixture's notes are short; the outer one is made long enough to fold (its span alone decides it).
    type Block = { id: string; span: [number, number]; children?: Block[] }
    const tldf = structuredClone(rows[0]?.tldf) as { blocks: Block[] }
    const lengthen = (blocks: Block[]) => {
      for (const block of blocks) {
        if (block.id === '0.1.1.12.3.1') block.span = [block.span[0], block.span[0] + 1200]
        lengthen(block.children ?? [])
      }
    }
    lengthen(tldf.blocks)
    vi.mocked(fetchLegalRender).mockImplementationOnce(async (documentId: string) => ({
      ...envelopeFor(documentId),
      tldf: { ...tldf, document_id: documentId },
    }) as unknown as LegalRenderData)
    const nod = '0.1.1.12.3.1.2.1'
    const { container } = render(
      <ActReadingLayout act={legalActDetailV2Fixture} nod={nod} lead={null} fisa={null} />,
    )
    await waitFor(() => expect(container.querySelector(`[id="tldf-${nod}"]`)).not.toBeNull())
    const target = container.querySelector(`[id="tldf-${nod}"]`) as HTMLElement
    const holder = target.closest('[data-note-fold]')
    expect(holder).not.toBeNull()
    // folded until the jump, open once the deep link has landed
    await waitFor(() => expect(holder).toHaveAttribute('data-note-fold', 'open'))
    expect(target).toHaveClass('bg-foreground/10!')
  })

  it('shows a static label, not a dropdown, when one version is readable', async () => {
    render(<ActReadingLayout act={legalActDetailV2UnbridgedFixture} lead={null} fisa={null} />)
    expect(await screen.findByText(/Versiunea afișată: forma publicată/)).toBeInTheDocument()
    expect(screen.queryByLabelText(/Versiunea textului/)).not.toBeInTheDocument()
  })

  describe('the default form under latest_any_kind (defaultBasis)', () => {
    it('current: reads the canonical with no "not current" notice and no tie note', async () => {
      render(<ActReadingLayout act={legalActDetailV2Fixture} lead={null} fisa={null} />)
      await screen.findByText(/Formă consolidată neoficială, cu caracter informativ\./)
      expect(requestedIds()).toEqual(['f900012'])
      expect(screen.queryByText(/nu este versiunea curentă/)).not.toBeInTheDocument()
      expect(screen.queryByText(/regulă fixă/)).not.toBeInTheDocument()
    })

    it('latest_not_available: reads the latest form with text and says plainly it is not current', async () => {
      const { container } = render(
        <ActReadingLayout act={legalActDetailV2LatestNotAvailableFixture} lead={null} fisa={null} />,
      )
      await waitFor(() => expect(readerText(container).length).toBeGreaterThan(100))
      expect(requestedIds()).toEqual(['f900012'])
      const notice = screen.getByText(/Cea mai recentă versiune a actului/).closest('[role="note"]')
      expect(notice).toHaveTextContent(
        /Cea mai recentă versiune a actului \(republicare, .*2025.*\) nu are încă text disponibil\./,
      )
      expect(notice).toHaveTextContent(
        /Afișăm versiunea din .*2024.* \(formă consolidată neoficială\), care nu este versiunea curentă\./,
      )
      // The shown text is a consolidation: its LEG-X3AV label stays.
      expect(
        screen.getByText(/Formă consolidată neoficială, cu caracter informativ\./),
      ).toBeInTheDocument()
      // No "not this act's document" notice: this is the default reading.
      expect(screen.queryByText(/nu aparține acestui act/)).not.toBeInTheDocument()
    })

    it('latest_not_available: the selector lists the latest form as "text indisponibil", never selectable', async () => {
      render(
        <ActReadingLayout act={legalActDetailV2LatestNotAvailableFixture} lead={null} fisa={null} />,
      )
      const select = await screen.findByLabelText(/Versiunea textului/)
      const options = Array.from(select.querySelectorAll('option'))
      const latest = options.find((option) => option.value === 'f900014')
      expect(latest).toBeDefined()
      expect(latest?.disabled).toBe(true)
      expect(latest?.textContent).toMatch(/republicare .* — text indisponibil/)
      const shown = options.find((option) => option.value === 'f900012')
      expect(shown?.textContent).toMatch(/\(afișată implicit, nu e curentă\)/)
      expect(select).toHaveValue('f900012')
      // Choosing the default reading clears ?doc=.
      fireEvent.change(select, { target: { value: 'f900011' } })
      fireEvent.change(select, { target: { value: 'f900012' } })
      expect(navigateMock).toHaveBeenLastCalledWith(expect.objectContaining({ search: {} }))
    })

    it("names the latest form the server picks (latestDocumentId), not the client's guess", async () => {
      // A same-day tie: the server's rule picked the consolidation f900013
      // (not loaded), not the republication the newest-first guess would name.
      const act = {
        ...legalActDetailV2LatestNotAvailableFixture,
        latestDocumentId: 'f900013',
      }
      render(<ActReadingLayout act={act} lead={null} fisa={null} />)
      const notice = (await screen.findByText(/Cea mai recentă versiune a actului/)).closest(
        '[role="note"]',
      )
      expect(notice).toHaveTextContent(/\(formă consolidată neoficială, .*2020.*\)/)
      const select = screen.getByLabelText(/Versiunea textului/)
      const disabled = Array.from(select.querySelectorAll('option')).filter((o) => o.disabled)
      expect(disabled.map((o) => o.value)).toEqual(['f900013'])
    })

    it('falls back to the newest unreadable version when the server does not name the latest', async () => {
      const act = { ...legalActDetailV2LatestNotAvailableFixture, latestDocumentId: null }
      render(<ActReadingLayout act={act} lead={null} fisa={null} />)
      const notice = (await screen.findByText(/Cea mai recentă versiune a actului/)).closest(
        '[role="note"]',
      )
      expect(notice).toHaveTextContent(/\(republicare, .*2025.*\)/)
    })

    it.each([
      ['latest_not_available with no form that has text', legalActDetailV2NoTextFixture],
      ['no_known_form', legalActDetailV2NoKnownFormFixture],
    ])('%s: keeps the no-text state and requests no text', async (_case, act) => {
      render(<ActReadingLayout act={act} lead={null} fisa={null} />)
      expect(await screen.findByText('Fără expresie canonică')).toBeInTheDocument()
      expect(requestedIds()).toEqual([])
      expect(screen.queryByText(/Afișăm versiunea/)).not.toBeInTheDocument()
    })

    it('no default named, but a readable undated original: shows its text with the date notice, never "no text"', async () => {
      const { container } = render(
        <ActReadingLayout act={legalActDetailV2UndatedOriginalFixture} lead={null} fisa={null} />,
      )
      await waitFor(() => expect(readerText(container).length).toBeGreaterThan(100))
      expect(requestedIds()).toEqual(['f900011'])
      expect(
        screen.getByText(
          /Data acestei versiuni nu este cunoscută, deci nu o putem ordona față de\s+celelalte versiuni\. Afișăm singurul text disponibil\./,
        ),
      ).toBeInTheDocument()
      expect(screen.queryByText('Fără expresie canonică')).not.toBeInTheDocument()
    })

    it('with several readable undated versions, shows the original first and lists the others', async () => {
      const act = {
        ...legalActDetailV2UndatedOriginalFixture,
        documents: [
          ...legalActDetailV2UndatedOriginalFixture.documents,
          {
            ...legalActDetailV2Fixture.documents[1]!,
            documentId: 'f900015',
            versionKind: 'republicare',
            versionDate: null,
            isCanonical: false,
            caveat: null,
          },
        ],
      }
      render(<ActReadingLayout act={act} lead={null} fisa={null} />)
      await screen.findByText(/Afișăm una dintre versiunile cu text/)
      expect(requestedIds()).toEqual(['f900011'])
      const select = screen.getByLabelText(/Versiunea textului/)
      const values = Array.from(select.querySelectorAll('option'))
        .filter((option) => !option.disabled)
        .map((option) => option.value)
      expect(values).toEqual(expect.arrayContaining(['f900011', 'f900015']))
      expect(select).toHaveValue('f900011')
    })

    it('says quietly when same-day versions were ordered by the fixed rule', async () => {
      render(
        <ActReadingLayout
          act={{ ...legalActDetailV2Fixture, defaultOrderReviewed: false }}
          lead={null}
          fisa={null}
        />,
      )
      expect(
        await screen.findByText(
          'Versiunile cu aceeași dată au fost ordonate după o regulă fixă, nu de un verificator.',
        ),
      ).toBeInTheDocument()
    })
  })
})
