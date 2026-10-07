import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Analytics, sanitizePostHogEvent } from './analytics'

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

  it('scrubs what the SDK adds itself: the current and previous URLs, the referrer, the title, the person properties', () => {
    Analytics.capturePageview({ pathname: '/justice' })
    const init = posthogMock.init.mock.calls[0]?.[1] as { before_send?: unknown } | undefined
    expect(init?.before_send).toBe(sanitizePostHogEvent)

    const event = sanitizePostHogEvent({
      event: '$pageleave',
      properties: {
        $current_url: 'https://transparenta.eu/justice/cases/TribunalulCLUJ/1234/117/2024*?an=2025',
        $pathname: '/justice/cases/TribunalulCLUJ/1234/117/2024*',
        $prev_pageview_pathname: '/justice/cases/TribunalulCLUJ/99/117/2023',
        $referrer: 'https://transparenta.eu/justice/cases/TribunalulCLUJ/5/117/2022',
        title: 'Dosarul 1234/117/2024* — Tribunalul Cluj — Justiție — Transparenta.eu',
        $session_entry_url: 'https://transparenta.eu/justice/cases/TribunalulCLUJ/1234/117/2024',
        $session_entry_pathname: '/justice/cases/TribunalulCLUJ/1234/117/2024',
        $browser: 'Chrome',
      },
      $set_once: { $initial_current_url: 'https://transparenta.eu/justice/cases/TribunalulCLUJ/1234/117/2024' },
    })
    expect(event).toEqual({
      event: '$pageleave',
      properties: {
        $current_url: 'https://transparenta.eu/justice/cases/TribunalulCLUJ/:caseNumber?an=2025',
        $pathname: '/justice/cases/TribunalulCLUJ/:caseNumber',
        $prev_pageview_pathname: '/justice/cases/TribunalulCLUJ/:caseNumber',
        $referrer: 'https://transparenta.eu/justice/cases/TribunalulCLUJ/:caseNumber',
        title: 'Dosarul :caseNumber — Tribunalul Cluj — Justiție — Transparenta.eu',
        $session_entry_url: 'https://transparenta.eu/justice/cases/TribunalulCLUJ/:caseNumber',
        $session_entry_pathname: '/justice/cases/TribunalulCLUJ/:caseNumber',
        $browser: 'Chrome',
      },
      $set_once: { $initial_current_url: 'https://transparenta.eu/justice/cases/TribunalulCLUJ/:caseNumber' },
    })
    expect(sanitizePostHogEvent(null)).toBeNull()
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
