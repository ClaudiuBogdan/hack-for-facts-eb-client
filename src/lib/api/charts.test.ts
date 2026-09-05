import { afterEach, expect, it, vi } from 'vitest'

vi.mock('@/config/env', () => ({ getApiBaseUrl: () => 'https://api.example.com' }))
vi.mock('@/lib/auth', () => ({ getAuthToken: vi.fn() }))
vi.mock('@/lib/logger', () => ({ createLogger: () => ({ info: vi.fn(), error: vi.fn() }) }))
vi.mock('@/lib/utils', () => ({ getUserLocale: () => 'ro' }))

import { getAuthToken } from '@/lib/auth'
import { AnalyticsInputSchema } from '@/schemas/charts'
import { prepareFilterForServer } from '@/lib/filterUtils'
import { getChartAnalytics, getStaticChartAnalytics } from './charts'

afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks() })

it('sends the complete execution input to the native endpoint, preserving explicit false', async () => {
  const input = AnalyticsInputSchema.parse({
    seriesId: 'test',
    filter: { report_type: 'Executie bugetara detaliata', account_category: 'ch',
      report_period: { type: 'YEAR', selection: { dates: ['2024'] } },
      entity_cuis: ['4267117'], is_territorial_executive: false,
      functional_prefixes: ['65'], exclude: { economic_prefixes: ['51'] },
    },
  })
  const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: { executionAnalytics: [] } })))
  vi.stubGlobal('fetch', fetchMock)
  const signal = new AbortController().signal
  await getChartAnalytics([input], signal)
  expect(fetchMock).toHaveBeenCalledWith('https://api.example.com/api/v1/graphql', expect.objectContaining({ signal }))
  const init = fetchMock.mock.calls[0]?.[1] as RequestInit
  expect(JSON.parse(String(init.body)).variables).toEqual({ inputs: [{ ...input, filter: prepareFilterForServer(input.filter) }] })
  expect(JSON.parse(String(init.body)).variables.inputs[0].filter.is_territorial_executive).toBe(false)
  expect(getAuthToken).not.toHaveBeenCalled()
})

it('keeps the not-yet-migrated static root on its separate transport', async () => {
  vi.mocked(getAuthToken).mockResolvedValue(null)
  const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: { staticChartAnalytics: [] } })))
  vi.stubGlobal('fetch', fetchMock)
  await getStaticChartAnalytics(['population'])
  expect(fetchMock).toHaveBeenCalledWith('https://api.example.com/graphql', expect.anything())
})
