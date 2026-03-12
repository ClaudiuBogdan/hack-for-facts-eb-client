import { createFileRoute } from '@tanstack/react-router'
import { getSiteUrl } from '@/config/env'
import { createPublicPageCacheHeaders } from '@/lib/http-cache'

export const Route = createFileRoute('/bugete-locale-2026/termeni-si-conditii')({
  ssr: true,
  headers: () =>
    createPublicPageCacheHeaders({
      browserMaxAgeSeconds: 0,
      sharedMaxAgeSeconds: 600,
      staleWhileRevalidateSeconds: 3600,
    }),
  head: () => buildBudgetChallengeTermsHead(),
})

function buildBudgetChallengeTermsHead() {
  const site = getSiteUrl()
  const canonical = `${site}/bugete-locale-2026/termeni-si-conditii`
  const title = 'Termeni și condiții provocare Bugete Locale 2026 – Transparenta.eu'
  const description =
    'Termenii și condițiile specifice provocării Bugete Locale 2026 organizate de Funky Citizens prin transparenta.eu.'

  return {
    meta: [
      { title },
      { name: 'description', content: description },
      { name: 'og:title', content: title },
      { name: 'og:description', content: description },
      { name: 'og:url', content: canonical },
      { name: 'canonical', content: canonical },
      { name: 'robots', content: 'index,follow' },
    ],
  }
}
