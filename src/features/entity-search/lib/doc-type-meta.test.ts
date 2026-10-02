import { describe, expect, it } from 'vitest'
import { ENTITY_SEARCH_DOC_TYPES } from '@/schemas/entity-search'
import {
  DOC_TYPE_META,
  getDocTypeMeta,
  isEntitySearchDocType,
} from './doc-type-meta'

describe('DOC_TYPE_META', () => {
  it('covers every server doc type', () => {
    expect(Object.keys(DOC_TYPE_META).sort()).toEqual(
      [...ENTITY_SEARCH_DOC_TYPES].sort(),
    )
  })

  it('keeps the expected Romanian labels for visible chips and badges', () => {
    expect(getDocTypeMeta('company').label).toBe('Firmă')
    expect(getDocTypeMeta('public_enterprise').label).toBe('Companie de stat')
    expect(getDocTypeMeta('committee').label).toBe('Comisie')
    expect(getDocTypeMeta('legal_act').label).toBe('Legislație')
    expect(getDocTypeMeta('member').label).toBe('Parlamentar')
  })

  it('groups related types into the intended color families', () => {
    expect(DOC_TYPE_META.company.color).toContain('blue')
    expect(DOC_TYPE_META.organization.color).toContain('--pnrr-green')
    expect(DOC_TYPE_META.legal_act.color).toContain('violet')
    expect(DOC_TYPE_META.pnrr_entity.color).toContain('teal')
    expect(DOC_TYPE_META.public_enterprise.color).toContain('--pnrr-green')
  })

  it('identifies known doc types and degrades unknown ones safely', () => {
    expect(isEntitySearchDocType('company')).toBe(true)
    expect(isEntitySearchDocType('new_doc_type')).toBe(false)
    expect(getDocTypeMeta('new_doc_type').label).toBe('Document')
  })
})
