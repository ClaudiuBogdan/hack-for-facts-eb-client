import { describe, expect, it } from 'vitest'
import type { Answer } from '../../hooks/use-procurement-analytics'
import { queryOf } from '../../lib/analytics-model'
import { shareUrl } from './analytics-view'

/**
 * The page's own share link: the question with its months frozen, and — on
 * the records — the list's order and page, so the link opens where the reader
 * is (PR-007).
 */

const answer = { period: { from: '2025-01', to: '2025-12' } } as unknown as Answer
const params = (url: string) => Object.fromEntries(new URL(url).searchParams)

describe('shareUrl', () => {
  it('keeps the records list’s order and page', () => {
    const query = queryOf({ tip: 'contracte', perioada: '2025', dupa: 'inregistrari' })
    expect(params(shareUrl(query, answer, { sort: 'date_desc', page: 3 }))).toEqual({ tip: 'contracte', perioada: '2025', dupa: 'inregistrari', ordine: 'data', pagina: '3' })
    // The list's defaults are left out, as the address leaves them.
    expect(params(shareUrl(query, answer, { sort: 'value_desc', page: 1 }))).toEqual({ tip: 'contracte', perioada: '2025', dupa: 'inregistrari' })
  })

  it('carries no list keys for an answer that is no list', () => {
    const query = queryOf({ tip: 'contracte', perioada: '2025', dupa: 'firma' })
    expect(params(shareUrl(query, answer, { sort: 'date_desc', page: 3 }))).toEqual({ tip: 'contracte', perioada: '2025', dupa: 'firma' })
  })

  it('a link the page makes never carries a direct-purchase supplier the API does not name as a company (D6, root)', () => {
    const query = queryOf({ tip: 'directe', perioada: '2025', furnizor: '14837428' })
    expect(params(shareUrl(query, answer))).not.toHaveProperty('furnizor')
    expect(params(shareUrl(query, answer, null, (cui) => cui === '14837428'))).toMatchObject({ furnizor: '14837428' })
    // A buyer given the same code goes with it: that code is the supplier's too.
    const sameCode = queryOf({ tip: 'directe', perioada: '2025', furnizor: '14837428', cumparator: '0014837428' })
    expect(params(shareUrl(sameCode, answer))).not.toHaveProperty('cumparator')
    // Contracts are not D6's.
    expect(params(shareUrl(queryOf({ tip: 'contracte', perioada: '2025', furnizor: '14837428' }), answer))).toMatchObject({ furnizor: '14837428' })
  })
})

describe('readoutNotes, unread party filters (D6 fails closed, root)', () => {
  it('a direct-purchase question names a refused party filter without echoing its code', async () => {
    const { readoutNotes } = await import('./analytics-view')
    const { unreadParams } = await import('../../lib/analytics-model')
    const search = { tip: 'directe', furnizor: 'abc14837428' } as never
    expect(unreadParams(search).length).toBeGreaterThan(0)
    const notes = readoutNotes(queryOf({ tip: 'directe' }), { period: null, figures: { data: null }, concentration: { data: null }, ranking: { data: null }, series: { data: null }, years: { data: null } } as never, search)
    expect(notes.unread).toContain('furnizor')
    expect(notes.unread).not.toContain('14837428')
  })
})

describe('the method panel\'s scope (D6 fails closed, root)', () => {
  it('prints no party code for direct purchases', async () => {
    const { shownScope } = await import('./analytics-view')
    const shown = JSON.stringify(shownScope({ grain: 'direct_acquisition', supplierCui: '14837428', authorityCui: '4267117', from: '2025-01' }))
    expect(shown).not.toContain('14837428')
    expect(shown).not.toContain('4267117')
    expect(shown).toContain('2025-01')
    expect(JSON.stringify(shownScope({ grain: 'contract', supplierCui: '14837428' }))).toContain('14837428')
  })
})
