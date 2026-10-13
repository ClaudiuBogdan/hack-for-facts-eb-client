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
})
