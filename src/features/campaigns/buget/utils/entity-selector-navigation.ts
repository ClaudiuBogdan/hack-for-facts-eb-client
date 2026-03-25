import { buildCampaignProvocariPath } from '@/features/challenges/constants'
import type { CampaignLocale, CampaignRouteSearch } from '../types'

const CAMPAIGN_PATH_PREFIX = '/primarie'
const ENTITY_CUI_PLACEHOLDER = '$cui'

type SelectorSearchState = Pick<CampaignRouteSearch, 'lang' | 'redirectUri'>

export function buildSelectorSearchState(params: {
  readonly languageQuery?: CampaignLocale
  readonly redirectUri?: string
}): SelectorSearchState {
  return {
    ...(params.languageQuery === 'en' ? { lang: 'en' as const } : {}),
    ...(params.redirectUri ? { redirectUri: params.redirectUri } : {}),
  }
}

export function buildEntitySwitchRedirectUri(params: {
  readonly pathname: string
  readonly searchStr?: string
}): string | undefined {
  if (!params.pathname.startsWith(`${CAMPAIGN_PATH_PREFIX}/`)) {
    return undefined
  }

  const redirectPath = params.pathname.replace(
    /^\/primarie\/[^/]+/,
    `${CAMPAIGN_PATH_PREFIX}/${ENTITY_CUI_PLACEHOLDER}`,
  )

  if (!redirectPath.includes(`${CAMPAIGN_PATH_PREFIX}/${ENTITY_CUI_PLACEHOLDER}`)) {
    return undefined
  }

  const serializedSearch = params.searchStr?.replace(/^\?/, '') ?? ''
  return serializedSearch ? `${redirectPath}?${serializedSearch}` : redirectPath
}

export function resolveEntitySelectionNavigationTarget(params: {
  readonly entityCui: string
  readonly languageQuery?: CampaignLocale
  readonly redirectUri?: string
}): {
  readonly to: string
  readonly search: Record<string, string> | SelectorSearchState
} {
  const redirectTarget = parseRedirectTarget({
    entityCui: params.entityCui,
    redirectUri: params.redirectUri,
  })

  if (redirectTarget) {
    return redirectTarget
  }

  return {
    to: buildCampaignProvocariPath(params.entityCui),
    search: buildSelectorSearchState({
      languageQuery: params.languageQuery,
    }),
  }
}

function parseRedirectTarget(params: {
  readonly entityCui: string
  readonly redirectUri?: string
}): {
  readonly to: string
  readonly search: Record<string, string>
} | null {
  if (!params.redirectUri) {
    return null
  }

  const redirectTarget = parseAppRelativeRedirectUri(params.redirectUri)

  if (!redirectTarget) {
    return null
  }

  if (!redirectTarget.pathname.startsWith(CAMPAIGN_PATH_PREFIX)) {
    return null
  }

  if (!redirectTarget.pathname.includes(ENTITY_CUI_PLACEHOLDER)) {
    return null
  }

  if (!isSupportedRedirectPath(redirectTarget.pathname)) {
    return null
  }

  const search: Record<string, string> = {}

  for (const [key, value] of redirectTarget.searchParams.entries()) {
    search[key] = value
  }

  return {
    to: redirectTarget.pathname
      .split(ENTITY_CUI_PLACEHOLDER)
      .join(encodeURIComponent(params.entityCui.trim())),
    search,
  }
}

function parseAppRelativeRedirectUri(redirectUri: string): {
  readonly pathname: string
  readonly searchParams: URLSearchParams
} | null {
  if (!redirectUri.startsWith('/') || redirectUri.startsWith('//')) {
    return null
  }

  const hashlessRedirectUri = redirectUri.split('#', 1)[0] ?? redirectUri
  const queryIndex = hashlessRedirectUri.indexOf('?')
  const pathname =
    queryIndex >= 0
      ? hashlessRedirectUri.slice(0, queryIndex)
      : hashlessRedirectUri
  const search =
    queryIndex >= 0
      ? hashlessRedirectUri.slice(queryIndex + 1)
      : ''

  if (!pathname.startsWith('/')) {
    return null
  }

  return {
    pathname,
    searchParams: new URLSearchParams(search),
  }
}

function isSupportedRedirectPath(pathname: string): boolean {
  const segments = pathname.split('/').filter(Boolean)

  if (segments[0] !== 'primarie' || segments[1] !== ENTITY_CUI_PLACEHOLDER) {
    return false
  }

  if (segments.length === 2) {
    return true
  }

  if (segments[2] !== 'buget') {
    return false
  }

  if (segments.length === 3) {
    return true
  }

  if (segments.length === 4) {
    return segments[3] === 'calendar' || segments[3] === 'provocari'
  }

  if (segments[3] !== 'provocari') {
    return false
  }

  if (segments.length === 5) {
    return true
  }

  return segments.length === 7
}
