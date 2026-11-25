import { describe, expect, it } from 'vitest'
import { parseProcurementBuyerSearch } from './procurement-buyer'

/** A buyer page's URL state: the contract awards' order and page (PROC-KB0Z step 1) beside the year and the band choices. */
describe('parseProcurementBuyerSearch', () => {
  it('returns a dropped key as undefined, so that merged over the URL it clears the unusable value', () => {
    const raw = { ordine: 'oricare', pagina: '501', year: 'x' }
    expect({ ...raw, ...parseProcurementBuyerSearch(raw) }).toMatchObject({ ordine: undefined, pagina: undefined, year: undefined })
  })

  it('keeps an order and a page, and leaves their defaults out', () => {
    expect(parseProcurementBuyerSearch({ year: '2024', ordine: 'valoare', pagina: '3' })).toEqual({ year: 2024, ordine: 'valoare', pagina: 3 })
    expect(parseProcurementBuyerSearch({ ordine: 'noi', pagina: '1' })).toEqual({})
  })

  it('drops an order or a page the page cannot use, rather than fail the route', () => {
    expect(parseProcurementBuyerSearch({ ordine: 'pret', pagina: '0' })).toEqual({})
    expect(parseProcurementBuyerSearch({ pagina: '501' })).toEqual({})
    expect(parseProcurementBuyerSearch({ pagina: '2.5', mari: 'contracte' })).toEqual({ mari: 'contracte' })
  })
})
