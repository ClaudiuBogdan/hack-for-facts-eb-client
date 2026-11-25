import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Analytics, sanitizePostHogEvent } from './analytics'

const posthogMock = vi.hoisted(() => ({
  init: vi.fn(),
  register: vi.fn(),
  capture: vi.fn(),
  // The SDK's request layer, which TEL-001 wraps; without it PostHog is not started.
  _send_request: vi.fn(),
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

  it('scrubs what the SDK adds itself: the current and previous URLs, the referrer, the title, the person properties', async () => {
    Analytics.capturePageview({ pathname: '/justice' })
    // The SDK is imported on first use: init runs once it has resolved.
    await vi.waitFor(() => expect(posthogMock.init).toHaveBeenCalled())
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

  it('keeps the landing’s search text out of the pageview and of what the SDK adds', async () => {
    Analytics.capturePageview({ pathname: '/', search: '?harta=venituri&q=primaria%20cluj' })
    await vi.waitFor(() =>
      expect(posthogMock.capture).toHaveBeenCalledWith('$pageview', {
        $current_url: `${window.location.origin}/?harta=venituri&q=_`,
        $pathname: '/',
        $host: window.location.host,
      }),
    )
    expect(
      sanitizePostHogEvent({
        event: '$pageleave',
        properties: {
          $current_url: 'https://transparenta.eu/entities/1',
          $referrer: 'https://transparenta.eu/?q=primaria+cluj',
          $prev_pageview_pathname: '/',
        },
        $set_once: { $initial_current_url: 'https://transparenta.eu/?q=2816464', $initial_referrer: '$direct' },
      }),
    ).toEqual({
      event: '$pageleave',
      properties: {
        $current_url: 'https://transparenta.eu/entities/1',
        $referrer: 'https://transparenta.eu/?q=_',
        $prev_pageview_pathname: '/',
      },
      $set_once: { $initial_current_url: 'https://transparenta.eu/?q=_', $initial_referrer: '$direct' },
    })
  })

  it('scrubs justice case path and query identifiers from pageviews', async () => {
    Analytics.capturePageview({
      pathname: '/justitie/dosare/portal-just-bucuresti-2024-001',
      search: '?caseNumber=1234/3/2024&partyKey=sc-secret&court=TB-BUCURESTI',
    })

    await vi.waitFor(() =>
      expect(posthogMock.capture).toHaveBeenCalledWith('$pageview', {
        $current_url: `${window.location.origin}/justitie/dosare/:caseId?court=TB-BUCURESTI`,
        $pathname: '/justitie/dosare/:caseId',
        $host: window.location.host,
      }),
    )
  })

  it('scrubs justice URLs and keyed identifiers from custom event properties', async () => {
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

    await vi.waitFor(() =>
      expect(posthogMock.capture).toHaveBeenCalledWith('error_occurred', {
        url: 'https://transparenta.eu/justitie/dosare/:caseId',
        caseNumber: '[scrubbed]',
        context: {
          partyKey: '[scrubbed]',
          companyUrl: '/companies/_?tab=summary',
        },
        safeMetric: 2,
      }),
    )
  })
})

describe('the PostHog payload (D6, root)', () => {
  it('scrubs procurement party codes from every URL property the SDK adds, on any event', () => {
    const event = sanitizePostHogEvent({
      event: '$pageleave',
      properties: {
        $current_url: 'https://transparenta.eu/procurement/suppliers/14837428?year=2025',
        $pathname: '/procurement/suppliers/14837428',
        $prev_pageview_pathname: '/procurement/institutions/4267117',
        $referrer: 'https://transparenta.eu/procurement/analytics?tip=directe&furnizor=14837428',
        other: '/budget/4267117',
        $initial_current_url: 'https://transparenta.eu/Procurement/Analytics?tip=directe&furnizor=14837428',
        $title: 'Example SRL (CUI 14837428) — Transparenta.eu',
        title: 'The company with tax ID 4267117',
      },
    })
    expect(JSON.stringify(event)).not.toContain('14837428')
    expect(JSON.stringify(event)).not.toContain('4267117/')
    // After the party marker every number is masked, the year too (`procurement-party-codes.ts`: no spelling gets past).
    expect(event?.properties?.$current_url).toBe('https://transparenta.eu/procurement/suppliers/_?year=_')
    expect(event?.properties?.$prev_pageview_pathname).toBe('/procurement/institutions/_')
    expect(event?.properties?.other).toBe('/budget/4267117')
  })
})
