import { describe, expect, it } from 'vitest'
import { resolveComparisonTerritories } from './comparison-territories'
import { statisticsComparisonsSearchSchema } from '@/schemas/statistics'
describe('comparison URL identity', () => {
  it.each([
    null,
    {},
    [],
    ['siruta:0'],
    ['siruta:01'],
    ['cod:B', 'cod:B'],
    ['bad', 'cod:B'],
    Array(7).fill('cod:B'),
  ])('preserves invalid territory intent %#', (raw) => {
    expect(
      statisticsComparisonsSearchSchema.parse({ teritorii: raw }).teritorii,
    ).toEqual(raw)
    expect(resolveComparisonTerritories(raw).valid).toBe(false)
  })
  it('normalizes legacy numeric SIRUTA only after retaining the raw URL', () => {
    expect(
      resolveComparisonTerritories([179132, 'cod:B', 'siruta:179141']),
    ).toMatchObject({
      valid: true,
      tokens: [
        { code: '179132', level: 'LAU' },
        { code: 'B', level: 'NUTS3' },
        { code: '179141', level: 'LAU' },
      ],
    })
  })
  it.each(['clasificari', 'unitate', 'frecventa', 'perioada', 'cod'])(
    'does not erase malformed %s',
    (field) => {
      expect(
        statisticsComparisonsSearchSchema.parse({ [field]: { bad: true } }),
      ).toEqual({ [field]: { bad: true } })
    },
  )
})
