import { describe, expect, it } from 'vitest'
import {
  legalActDetailRichFixture,
  legalActDetailV2Fixture,
} from '../mocks/fixtures/legal-act-detail'
import {
  isConsolidationVersion,
  isSelectableVersion,
  portalConsolidationNote,
  portalPageIdOf,
  resolveDocOverride,
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

  it("maps an old page id on legal_v2 to the form whose Portal page it is", () => {
    expect(resolveDocOverride(legalActDetailV2Fixture, '900012')).toEqual({
      kind: 'own',
      documentId: 'f900012',
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

describe('portalPageIdOf', () => {
  it('reads the page id at the end of a Portal URL', () => {
    expect(portalPageIdOf('https://legislatie.just.ro/Public/DetaliiDocumentAfis/171282')).toBe(
      '171282',
    )
    expect(portalPageIdOf('https://legislatie.just.ro/Public/DetaliiDocument/8851/')).toBe('8851')
    expect(portalPageIdOf(null)).toBeNull()
    expect(portalPageIdOf('https://legislatie.just.ro/Public/Cautare')).toBeNull()
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
