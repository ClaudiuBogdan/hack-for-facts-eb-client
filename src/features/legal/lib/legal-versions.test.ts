import { describe, expect, it } from 'vitest'
import {
  legalActDetailRichFixture,
  legalActDetailV2Fixture,
} from '../mocks/fixtures/legal-act-detail'
import type { LegalActDocumentVersion } from '@/schemas/legal'
import {
  isConsolidationVersion,
  isSelectableVersion,
  listedVersionDate,
  orderVersionsNewestFirst,
  portalConsolidationNote,
  resolveDocOverride,
  shownVersionDate,
} from './legal-versions'

const format = (iso: string) => `[${iso}]`

describe('resolveDocOverride', () => {
  it("accepts one of the act's own document ids, legacy or f<id>", () => {
    expect(resolveDocOverride(legalActDetailRichFixture, '171282')).toEqual({
      kind: 'own',
      documentId: '171282',
    })
    expect(resolveDocOverride(legalActDetailV2Fixture, 'f900011')).toEqual({
      kind: 'own',
      documentId: 'f900011',
    })
  })

  it('leaves every old page id on legal_v2 to the server, even one a form\'s sourceUrl names', () => {
    // The server's route preference and binding status decide which form a
    // page shows; a client guess from sourceUrl could pick another version.
    expect(resolveDocOverride(legalActDetailV2Fixture, '900012')).toEqual({
      kind: 'probe',
      documentId: '900012',
    })
  })

  it('probes an unmatched old page id on legal_v2, and refuses it on the legacy source (I-17)', () => {
    expect(resolveDocOverride(legalActDetailV2Fixture, '54260')).toEqual({
      kind: 'probe',
      documentId: '54260',
    })
    expect(resolveDocOverride(legalActDetailRichFixture, '54260')).toEqual({ kind: 'foreign' })
    // Not a page id: refused on either source.
    expect(resolveDocOverride(legalActDetailV2Fixture, 'f1')).toEqual({ kind: 'foreign' })
  })
})

describe('portalConsolidationNote', () => {
  const doc = { versionKind: 'consolidare', caveat: 'unofficial_consolidation' }

  it('falls back to "consolidarea din" with the label date', () => {
    expect(
      portalConsolidationNote({ ...doc, portalLabelRaw: null, portalLabelDate: '2024-03-12' }, format),
    ).toBe('consolidarea din [2024-03-12]')
  })

  it("quotes the Portal's label as written, adding its date only when the label lacks it", () => {
    expect(
      portalConsolidationNote(
        { ...doc, portalLabelRaw: 'actualizat până la', portalLabelDate: '2024-03-12' },
        format,
      ),
    ).toBe('actualizat până la [2024-03-12]')
    expect(
      portalConsolidationNote(
        { ...doc, portalLabelRaw: 'actualizat până la 12.03.2024', portalLabelDate: '2024-03-12' },
        format,
      ),
    ).toBe('actualizat până la 12.03.2024')
  })

  it('has no note when neither label nor date is filled', () => {
    expect(
      portalConsolidationNote({ ...doc, portalLabelRaw: null, portalLabelDate: null }, format),
    ).toBeNull()
  })
})

describe('version predicates', () => {
  it('treats the caveat or the kind as a consolidation', () => {
    expect(isConsolidationVersion({ versionKind: 'original', caveat: 'unofficial_consolidation', portalLabelRaw: null, portalLabelDate: null })).toBe(true)
    expect(isConsolidationVersion({ versionKind: 'consolidare', caveat: null, portalLabelRaw: null, portalLabelDate: null })).toBe(true)
    expect(isConsolidationVersion({ versionKind: 'original', caveat: null, portalLabelRaw: null, portalLabelDate: null })).toBe(false)
  })

  it('selects only readable, non-stub versions', () => {
    const [original, consolidation, notLoaded] = legalActDetailV2Fixture.documents
    expect(original && isSelectableVersion(original)).toBe(true)
    expect(consolidation && isSelectableVersion(consolidation)).toBe(true)
    expect(notLoaded && isSelectableVersion(notLoaded)).toBe(false)
    const stub = legalActDetailRichFixture.documents.find((doc) => doc.versionKind === 'stub-header')
    expect(stub && isSelectableVersion(stub)).toBe(false)
  })
})

describe('the date a version is named and ordered by (legislation session, 26 November 2026)', () => {
  const base = legalActDetailV2Fixture.documents[0]
  if (base === undefined) throw new Error('the legal_v2 fixture lost its versions')
  const form = (documentId: string, versionKind: string, versionDate: string | null, portalLabelDate: string | null): LegalActDocumentVersion => ({
    ...base,
    documentId,
    versionKind,
    versionDate,
    firstPublicationDate: null,
    portalLabelDate,
    caveat: null,
  })

  it("a consolidation goes by the Portal's note's date, any other version by its own", () => {
    expect(listedVersionDate(form('c', 'consolidare', '2024-03-01', '2023-11-17'))).toBe('2023-11-17')
    expect(listedVersionDate(form('o', 'original', '2016-05-23', '2099-01-01'))).toBe('2016-05-23')
  })

  it("a consolidation without the Portal's date falls back to its own date, for the name and for the order", () => {
    const bare = form('bare', 'consolidare', '2022-07-28', null)
    expect(listedVersionDate(bare)).toBe('2022-07-28')
    expect(shownVersionDate({ documents: [bare] }, bare)).toBe('2022-07-28')
    const ordered = orderVersionsNewestFirst([form('old', 'consolidare', '2099-01-01', '2020-02-12'), bare, form('new', 'consolidare', '2000-01-01', '2024-11-17')])
    expect(ordered.map((doc) => doc.documentId)).toEqual(['new', 'bare', 'old'])
  })

  it('orders a list by the dates its names show, undated rows last', () => {
    const ordered = orderVersionsNewestFirst([
      form('original', 'original', '2016-05-23', null),
      form('undated', 'republicare', null, null),
      // its own date would put it first; the Portal's note dates it between the other two
      form('middle', 'consolidare', '2025-01-01', '2020-02-12'),
      form('latest', 'consolidare', '2019-01-01', '2024-11-17'),
    ])
    expect(ordered.map((doc) => doc.documentId)).toEqual(['latest', 'middle', 'original', 'undated'])
    expect(ordered.map((doc) => listedVersionDate(doc))).toEqual(['2024-11-17', '2020-02-12', '2016-05-23', null])
  })
})
