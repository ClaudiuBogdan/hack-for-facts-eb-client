import type { I18n } from '@lingui/core'
import { describe, expect, it } from 'vitest'
import {
  buildContractDocumentTitle,
  buildDirectPurchaseDocumentTitle,
  buildInstitutionDocumentTitle,
  buildProcedureDocumentTitle,
  buildSupplierDocumentTitle,
} from './procurement-page-titles'

/**
 * The record pages' titles: the record's own names as SEAP writes them, and
 * every word of the page's own — the suffix and each fallback — through the
 * request's translator, so a page in English is named in English. The test
 * setup's `msg` is the message itself; this translator brackets what it
 * translates.
 */

const translator = { _: (message: unknown) => `[${String(message)}]` } as unknown as I18n

describe('procurement page titles', () => {
  it('translates the suffix and keeps the record’s names', () => {
    expect(buildContractDocumentTitle(translator, { id: '1', title: 'Pod peste Olt', authorityName: 'CNAIR' })).toBe('Pod peste Olt — CNAIR — [Achiziții publice] — Transparenta.eu')
    expect(buildSupplierDocumentTitle(translator, { cui: '9813902', supplierName: 'Costalex Construct SRL' })).toBe('Costalex Construct SRL — [Achiziții publice] — Transparenta.eu')
  })

  it('translates every fallback a nameless record takes', () => {
    expect(buildSupplierDocumentTitle(translator, { cui: '103029862' })).toBe('[Furnizor CUI 103029862] — [Achiziții publice] — Transparenta.eu')
    expect(buildInstitutionDocumentTitle(translator, { cui: '4364446', authorityName: ' ' })).toBe('[Instituție CUI 4364446] — [Achiziții publice] — Transparenta.eu')
    expect(buildContractDocumentTitle(translator, { id: '2089288' })).toBe('[Contract 2089288] — [Achiziții publice] — Transparenta.eu')
    expect(buildDirectPurchaseDocumentTitle(translator, { id: '200611736' })).toBe('[Achiziție directă 200611736] — [Achiziții publice] — Transparenta.eu')
    expect(buildProcedureDocumentTitle(translator, { id: '412114', noticeNo: 'CN1044934', authorityName: 'ANIF' })).toBe('[Anunțul CN1044934] — ANIF — [Achiziții publice] — Transparenta.eu')
    expect(buildProcedureDocumentTitle(translator, { id: '412114' })).toBe('[Procedură 412114] — [Achiziții publice] — Transparenta.eu')
  })
})
