import { useCallback, useEffect, useState, type ReactElement } from 'react'
import { useLocation, useSearch } from '@tanstack/react-router'
import { useIsMobile } from '@/hooks/use-mobile'
import { Analytics } from '@/lib/analytics'
import { hasStoredConsentDecision, onConsentChange } from '@/lib/consent'
import { ConsentCard, ConsentCardStyles } from './consent-card'

/**
 * How long after arriving the question is asked, so the card lands on a page
 * that is already there rather than arriving with it.
 */
const ASK_DELAY_MS = 500

/**
 * Decides when the consent card exists. The card decides everything else.
 *
 * The gates, all of them inherited from the banner this replaces:
 *
 * - **Client only.** The server has no storage to read, so it never renders
 *   the card; the question is asked in an effect after hydration.
 * - **Not on the settings page.** `/cookies` is the long form of the same
 *   question; asking twice on one screen is nagging.
 * - **Not over the notification sheet on a phone.** Two fixed surfaces on a
 *   small screen and the reader can reach neither.
 * - **Not once answered.** A stored decision is the answer; a foreign or
 *   unreadable blob is not, and `hasStoredConsentDecision` is the one place
 *   that distinction lives.
 *
 * Dismissing with × or Escape stores nothing, so the card returns on the next
 * navigation — which is what "not now" means. Deciding stores the answer, so
 * it does not.
 */
export function ConsentCardHost(): ReactElement | null {
  const [mounted, setMounted] = useState(false)
  const location = useLocation()
  const search = useSearch({ strict: false }) as Readonly<{ notificationModal?: string }>
  const isMobile = useIsMobile()

  const isCookiesPage = location.pathname.startsWith('/cookies')
  const isNotificationModalOpen = search.notificationModal === 'open'

  useEffect(() => {
    if (isCookiesPage || (isMobile && isNotificationModalOpen) || hasStoredConsentDecision()) {
      setMounted(false)
      return
    }
    const timer = setTimeout(() => setMounted(true), ASK_DELAY_MS)
    return () => clearTimeout(timer)
  }, [location.pathname, isCookiesPage, isMobile, isNotificationModalOpen])

  // Stable, so the card's leave timer is not restarted by a re-render of the
  // host — which happens on every navigation, i.e. possibly while it is leaving.
  const unmount = useCallback(() => setMounted(false), [])

  if (!mounted) return null

  return (
    <>
      <ConsentCardStyles />
      <ConsentCard onGone={unmount} />
    </>
  )
}

/**
 * Report consent changes, once per session. Module scope, client only: the
 * subscription outlives any one route, and the event carries the decision so
 * the analytics client can honour it from the next call on.
 */
if (typeof window !== 'undefined') {
  try {
    onConsentChange((prefs) => {
      Analytics.capture(Analytics.EVENTS.CookieConsentChanged, {
        analytics: prefs.analytics,
        sentry: prefs.sentry,
      })
    })
  } catch {
    // Storage or event APIs unavailable: nothing to report.
  }
}
