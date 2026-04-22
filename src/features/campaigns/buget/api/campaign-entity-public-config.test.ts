import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/auth', () => ({
  getAuthToken: vi.fn(),
}))

vi.mock('@/config/env', () => ({
  getApiBaseUrl: vi.fn(() => 'https://api.example.com'),
}))

import { getAuthToken } from '@/lib/auth'
import { API_FETCH_REFERRER_POLICY } from '@/lib/api/fetch-options'
import {
  CampaignEntityPublicConfigApiError,
  getCampaignEntityPublicConfig,
} from './campaign-entity-public-config'

function createPublicConfigPayload() {
  return {
    ok: true,
    data: {
      campaignKey: 'funky',
      entityCui: '12345678',
      entityName: 'Oras Test',
      isConfigured: true,
      values: {
        budgetPublicationDate: '2026-03-20',
        officialBudgetUrl: 'https://primarie.ro/buget.pdf',
        public_debate: {
          date: '2026-03-27',
          time: '18:00',
          location: 'Sala de consiliu',
          announcement_link: 'https://primarie.ro/anunt',
          online_participation_link: 'https://meet.example.com/buget',
          description: 'Sedinta publica pentru proiectul de buget.',
        },
      },
    },
  }
}

describe('campaign-entity-public-config api client', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.clearAllMocks()
  })

  it('fetches the authenticated public config for one entity', async () => {
    vi.mocked(getAuthToken).mockResolvedValue('token-123')
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(createPublicConfigPayload()), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    const result = await getCampaignEntityPublicConfig({
      campaignKey: 'funky',
      entityCui: '12345678',
    })

    expect(result.entityCui).toBe('12345678')
    expect(result.values.public_debate?.announcement_link).toBe('https://primarie.ro/anunt')

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://api.example.com/api/v1/campaigns/funky/entities/12345678/config')
    expect(init.method).toBe('GET')
    expect(init.referrerPolicy).toBe(API_FETCH_REFERRER_POLICY)
    expect(init.headers).toEqual(
      expect.objectContaining({
        Accept: 'application/json',
        Authorization: 'Bearer token-123',
      }),
    )
  })

  it('fails with 401 before fetching when auth is missing', async () => {
    vi.mocked(getAuthToken).mockResolvedValue(null)

    await expect(
      getCampaignEntityPublicConfig({
        campaignKey: 'funky',
        entityCui: '12345678',
      }),
    ).rejects.toMatchObject({
      status: 401,
      message: 'Sign in required for city hall campaign details.',
    })
  })

  it('maps a safe 404 response to an API error', async () => {
    vi.mocked(getAuthToken).mockResolvedValue('token-123')
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ ok: false }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    await expect(
      getCampaignEntityPublicConfig({
        campaignKey: 'funky',
        entityCui: '12345678',
      }),
    ).rejects.toEqual(
      expect.objectContaining<Partial<CampaignEntityPublicConfigApiError>>({
        status: 404,
        message: 'Requested city hall campaign details were not found.',
      }),
    )
  })
})
