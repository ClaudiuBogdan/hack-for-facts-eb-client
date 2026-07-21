import { describe, expect, it } from 'vitest'
import { toElicitatieClientUrl } from './elicitatie-client-url'

describe('toElicitatieClientUrl', () => {
  it('maps direct-acquisition api-pub getView to the public portal view', () => {
    expect(
      toElicitatieClientUrl(
        'https://e-licitatie.ro/api-pub/PublicDirectAcquisition/getView/119138224',
      ),
    ).toBe('https://e-licitatie.ro/pub/direct-acquisition/view/119138224')
  })

  it('maps CA notice api-pub get to ca-notices/view-c', () => {
    expect(
      toElicitatieClientUrl(
        'https://e-licitatie.ro/api-pub/C_PUBLIC_CANotice/get/100245309',
      ),
    ).toBe('https://e-licitatie.ro/pub/notices/ca-notices/view-c/100245309')
  })

  it('normalizes www and http hosts onto the public https origin', () => {
    expect(
      toElicitatieClientUrl(
        'http://www.e-licitatie.ro/api-pub/PublicDirectAcquisition/getView/1',
      ),
    ).toBe('https://e-licitatie.ro/pub/direct-acquisition/view/1')
  })

  it('leaves already-public /pub/ URLs unchanged', () => {
    const client =
      'https://e-licitatie.ro/pub/direct-acquisition/view/119138224'
    expect(toElicitatieClientUrl(client)).toBe(client)
  })

  it('leaves TED and other hosts unchanged', () => {
    const ted = 'https://ted.europa.eu/en/notice/123-2024/xml'
    expect(toElicitatieClientUrl(ted)).toBe(ted)
  })

  it('returns null for null/empty input', () => {
    expect(toElicitatieClientUrl(null)).toBeNull()
    expect(toElicitatieClientUrl(undefined)).toBeNull()
    expect(toElicitatieClientUrl('')).toBeNull()
    expect(toElicitatieClientUrl('   ')).toBeNull()
  })

  it('does not rewrite unrecognized api-pub list endpoints', () => {
    const list =
      'https://e-licitatie.ro/api-pub/NoticeCommon/GetCANoticeList/'
    expect(toElicitatieClientUrl(list)).toBe(list)
  })
})
