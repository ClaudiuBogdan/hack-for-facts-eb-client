import { describe, expect, it } from 'vitest'

import { resolveBillDetailActiveTab } from './bill-detail-nav'

describe('resolveBillDetailActiveTab', () => {
  it('reads the tab off the segment after the bill id', () => {
    expect(resolveBillDetailActiveTab('/parlament/proiecte/23135')).toBe(
      'detalii',
    )
    expect(resolveBillDetailActiveTab('/parlament/proiecte/23135/etape')).toBe(
      'etape',
    )
    expect(
      resolveBillDetailActiveTab('/parlament/proiecte/23135/documente'),
    ).toBe('documente')
    expect(resolveBillDetailActiveTab('/parlament/proiecte/23135/voturi')).toBe(
      'voturi',
    )
  })

  it('resolves the tab for a PERCENT-ENCODED bill id', () => {
    // Senate keys carry a colon (`senat:385-2018`), which the router encodes in
    // the path but hands back decoded as a param. Comparing against a base path
    // built from the param pinned every one of those bills to "Detalii".
    expect(
      resolveBillDetailActiveTab('/parlament/proiecte/senat%3A385-2018/etape'),
    ).toBe('etape')
    expect(
      resolveBillDetailActiveTab('/parlament/proiecte/senat%3A385-2018/voturi'),
    ).toBe('voturi')
    expect(
      resolveBillDetailActiveTab('/parlament/proiecte/senat%3A385-2018'),
    ).toBe('detalii')
  })

  it('tolerates a trailing slash and an unknown segment', () => {
    expect(resolveBillDetailActiveTab('/parlament/proiecte/23135/')).toBe(
      'detalii',
    )
    expect(resolveBillDetailActiveTab('/parlament/proiecte/23135/altceva')).toBe(
      'detalii',
    )
    expect(resolveBillDetailActiveTab('/parlament')).toBe('detalii')
  })
})
