import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Analytics } from './analytics'

const posthogMock = vi.hoisted(() => ({
  init: vi.fn(),
  register: vi.fn(),
  capture: vi.fn(),
}))

vi.mock('posthog-js', () => ({
  default: posthogMock,
}))

vi.mock('@/config/env', () => ({
  env: {
    VITE_POSTHOG_ENABLED: true,
    VITE_POSTHOG_API_KEY: 'posthog-test-key',
    VITE_POSTHOG_HOST: 'https://posthog.test',
    VITE_APP_VERSION: 'test',
    VITE_APP_NAME: 'Transparenta.eu',
    VITE_APP_ENVIRONMENT: 'test',
  },
}))

vi.mock('@/lib/consent', () => ({
  hasAnalyticsConsent: () => true,
}))

describe('analytics privacy sanitization', () => {
  beforeEach(() => {
    posthogMock.init.mockClear()
    posthogMock.register.mockClear()
    posthogMock.capture.mockClear()
    window.history.pushState({}, '', '/')
  })

  it('scrubs justice case path and query identifiers from pageviews', () => {
    Analytics.capturePageview({
      pathname: '/justitie/dosare/portal-just-bucuresti-2024-001',
      search: '?caseNumber=1234/3/2024&partyKey=sc-secret&court=TB-BUCURESTI',
    })

    expect(posthogMock.capture).toHaveBeenCalledWith('$pageview', {
      $current_url: `${window.location.origin}/justitie/dosare/:caseId?court=TB-BUCURESTI`,
      $pathname: '/justitie/dosare/:caseId',
      $host: window.location.host,
    })
  })

  it('scrubs justice URLs and keyed identifiers from custom event properties', () => {
    Analytics.capture(Analytics.EVENTS.ErrorOccurred, {
      url: 'https://transparenta.eu/justitie/dosare/portal-just-bucuresti-2024-001?caseNumber=1234/3/2024',
      caseNumber: '1234/3/2024',
      context: {
        partyKey: 'sc-secret',
        companyUrl:
          '/companies/14399840?tab=summary&partyKey=sc-secret&caseNumber=1234/3/2024',
      },
      safeMetric: 2,
    })

    expect(posthogMock.capture).toHaveBeenCalledWith('error_occurred', {
      url: 'https://transparenta.eu/justitie/dosare/:caseId',
      caseNumber: '[scrubbed]',
      context: {
        partyKey: '[scrubbed]',
        companyUrl: '/companies/14399840?tab=summary',
      },
      safeMetric: 2,
    })
  })
})
