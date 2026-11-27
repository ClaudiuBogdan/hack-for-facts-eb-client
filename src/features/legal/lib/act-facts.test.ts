import { describe, expect, it } from 'vitest'
import { readMastheadPublication, webAddress } from './act-facts'

describe('readMastheadPublication — the Portal’s own publication line', () => {
  it('reads the issue and the day of the plain writing', () => {
    expect(readMastheadPublication('MONITORUL OFICIAL nr. 1020 din 21 decembrie 2006')).toEqual({ issueNumber: 1020, issueDate: '2006-12-21' })
    expect(readMastheadPublication('MONITORUL OFICIAL nr. 5 din 7 ianuarie 2020')).toEqual({ issueNumber: 5, issueDate: '2020-01-07' })
    // a thousands point is the number's, not a decimal
    expect(readMastheadPublication('MONITORUL OFICIAL nr. 1.129 din 30 noiembrie 2004')).toEqual({ issueNumber: 1129, issueDate: '2004-11-30' })
    // the same masthead in capitals (several thousand originals write „NR.", the legislation session's count)
    expect(readMastheadPublication('MONITORUL OFICIAL NR. 1020 din 21 DECEMBRIE 2006')).toEqual({ issueNumber: 1020, issueDate: '2006-12-21' })
    expect(readMastheadPublication('MONITORUL OFICIAL nr. 1 din 29 februarie 2024')).toEqual({ issueNumber: 1, issueDate: '2024-02-29' })
  })

  it('reads nothing else', () => {
    // „www.scj.ro" stands where some originals have no masthead: it is none
    for (const raw of [null, '', 'www.scj.ro', 'M.Of. 67/1996', 'MONITORUL OFICIAL nr. 67 din 3 aprilie', 'MONITORUL OFICIAL nr. 67 din 3 brumărel 1996', 'MONITORUL OFICIAL nr. 67 din 32 mai 1996', 'MONITORUL OFICIAL nr. 1 din 29 februarie 2023', 'MONITORUL OFICIAL nr. 1 din 31 aprilie 2023', 'MONITORUL OFICIAL nr. 67, Partea I, din 3 aprilie 1996']) {
      expect(readMastheadPublication(raw)).toBeNull()
    }
  })
})

describe('webAddress — only a whole web address is a link', () => {
  it('keeps http(s) addresses with a host', () => {
    expect(webAddress(' https://legislatie.just.ro/Public/DetaliiDocumentAfis/178667 ')).toBe('https://legislatie.just.ro/Public/DetaliiDocumentAfis/178667')
    expect(webAddress('http://monitoruloficial.ro/x.html')).toBe('http://monitoruloficial.ro/x.html')
  })

  it('refuses the rest', () => {
    for (const url of [null, '', 'javascript:alert(1)', '/legislation', 'https://', 'https:/monitoruloficial.ro/x.html', 'ftp://example.ro/x']) {
      expect(webAddress(url)).toBeNull()
    }
  })
})
