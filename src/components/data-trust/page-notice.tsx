import { useEffect, useId, useState } from 'react'
import { getRouteApi } from '@tanstack/react-router'
import { Trans } from '@lingui/react/macro'
import { Button } from '@/components/ui/button'
import { useSendFeedback } from '@/hooks/useSendFeedback'
import { readBrowserDismissedNotices, rememberDismissedNotice } from './page-notice-cookie'

type PageNoticeProps = {
  /**
   * Names this page's notice; dismissing it hides it on every page with the same
   * id until the browser closes. Lowercase words joined by hyphens.
   */
  readonly id: string
  /** The inner column; match the page's own width so the text lines up with it. */
  readonly contentClassName?: string
}

/**
 * A full-width band at the top of a page that is still being built: the data is
 * being verified and figures may change. „Am înțeles” hides it for the session;
 * „Trimite feedback” opens the feedback form. Place it first in the page, outside
 * the page's padded container. The page's HTML then depends on a cookie, so it must
 * not be cached shared or in the browser: keep it no-store, or `Vary: Cookie` with a
 * browser max-age of 0. Design: docs/design/shell/page-notice.md.
 */
export function PageNotice({ id, contentClassName = 'mx-auto max-w-5xl px-6' }: PageNoticeProps) {
  const dismissedNotices = getRouteApi('__root__').useRouteContext({ select: (context) => context.dismissedNotices })
  // The id, not a flag: a page that changes `id` without remounting shows the next notice.
  const [dismissedNow, setDismissedNow] = useState<string | null>(null)
  const sendFeedback = useSendFeedback()
  const titleId = useId()

  // A page the browser served from its cache can predate a dismissal; the cookie is the truth.
  useEffect(() => {
    if (readBrowserDismissedNotices().includes(id)) setDismissedNow(id)
  }, [id])

  if (dismissedNow === id || dismissedNotices.includes(id)) return null

  const acknowledge = () => {
    rememberDismissedNotice(id)
    setDismissedNow(id)
  }

  return (
    <section aria-labelledby={titleId} className="border-b border-primary/15 bg-primary/5 py-6 md:py-7 print:hidden">
      <div className={contentClassName}>
        <div className="max-w-2xl">
          <h2 id={titleId} className="text-lg font-semibold text-balance">
            <Trans>Lucrăm încă la această pagină</Trans>
          </h2>
          <div className="mt-2 space-y-2 text-base text-pretty text-foreground/90">
            <p>
              <Trans>Verificăm datele, așa că unele cifre se pot schimba până terminăm.</Trans>
            </p>
            <p>
              <Trans>Ai găsit ceva greșit? Spune-ne și ne ajuți să verificăm mai repede.</Trans>
            </p>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Button onClick={acknowledge} className="h-10 px-5">
              <Trans>Am înțeles</Trans>
            </Button>
            <Button variant="outline" onClick={sendFeedback} className="h-10 bg-background px-5">
              <Trans>Trimite feedback</Trans>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
