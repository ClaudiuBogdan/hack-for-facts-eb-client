import { getApiBaseUrl } from '@/config/env'
import { graphqlRequest } from '@/lib/api/graphql'
import {
  CampaignUatDirectoryResponseSchema,
  SubscriptionStatsResponseSchema,
} from '../schemas/subscription-stats'
import { normalizeSirutaCode } from '../utils/normalize-siruta-code'

type ApiErrorEnvelope = {
  error?: string
  message?: string
}

export type CampaignSubscriptionStats = {
  readonly total: number
  readonly perUat: readonly {
    readonly sirutaCode: string
    readonly uatName: string
    readonly count: number
  }[]
}

export type CampaignUatDirectory = {
  readonly byCui: ReadonlyMap<
    string,
    {
      readonly uatId: string
      readonly natcode: string
      readonly uatName: string
      readonly countyName: string
    }
  >
  readonly byNatcode: ReadonlyMap<
    string,
    {
      readonly uatId: string
      readonly cui: string
      readonly uatName: string
      readonly countyName: string
    }
  >
  readonly byUatId: ReadonlyMap<
    string,
    {
      readonly cui: string
      readonly natcode: string
      readonly uatName: string
      readonly countyName: string
    }
  >
}

const CAMPAIGN_UAT_DIRECTORY_LIMIT = 4000

const CAMPAIGN_UAT_DIRECTORY_QUERY = `
  query CampaignUatDirectory($limit: Int!) {
    uats(filter: { is_county: false }, limit: $limit, offset: 0) {
      nodes {
        id
        uat_code
        siruta_code
        name
        county_name
      }
    }
  }
`

function getApiErrorMessage(
  payload: ApiErrorEnvelope | null | undefined,
  fallbackMessage: string,
): string {
  if (typeof payload?.message === 'string' && payload.message.trim()) {
    return payload.message
  }

  if (typeof payload?.error === 'string' && payload.error.trim()) {
    return payload.error
  }

  return fallbackMessage
}

export async function getSubscriptionStats(
  campaignId: string,
): Promise<CampaignSubscriptionStats> {
  const endpoint = `${getApiBaseUrl()}/api/v1/campaigns/${encodeURIComponent(campaignId)}/subscription-stats`
  const response = await fetch(endpoint, {
    headers: {
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as ApiErrorEnvelope | null
    throw new Error(
      getApiErrorMessage(payload, `Failed to fetch subscription stats: ${response.statusText}`),
    )
  }

  const payload = await response.json()
  const parsed = SubscriptionStatsResponseSchema.parse(payload)

  return {
    total: parsed.total,
    perUat: parsed.per_uat.map((entry) => ({
      sirutaCode: normalizeSirutaCode(entry.siruta_code),
      uatName: entry.uat_name,
      count: entry.count,
    })),
  }
}

export async function getCampaignUatDirectory(): Promise<CampaignUatDirectory> {
  const response = await graphqlRequest<unknown>(CAMPAIGN_UAT_DIRECTORY_QUERY, {
    limit: CAMPAIGN_UAT_DIRECTORY_LIMIT,
  })

  const parsed = CampaignUatDirectoryResponseSchema.parse(response)
  const byCui = new Map<string, { uatId: string; natcode: string; uatName: string; countyName: string }>()
  const byNatcode = new Map<string, { uatId: string; cui: string; uatName: string; countyName: string }>()
  const byUatId = new Map<string, { cui: string; natcode: string; uatName: string; countyName: string }>()

  for (const node of parsed.uats.nodes) {
    const sirutaCode = normalizeSirutaCode(node.siruta_code)
    const entry = {
      uatId: node.id,
      natcode: sirutaCode,
      uatName: node.name,
      countyName: node.county_name,
    }

    byCui.set(node.uat_code, entry)
    byNatcode.set(sirutaCode, {
      cui: node.uat_code,
      uatId: node.id,
      uatName: node.name,
      countyName: node.county_name,
    })
    byUatId.set(node.id, {
      cui: node.uat_code,
      natcode: sirutaCode,
      uatName: node.name,
      countyName: node.county_name,
    })
  }

  return {
    byCui,
    byNatcode,
    byUatId,
  }
}
