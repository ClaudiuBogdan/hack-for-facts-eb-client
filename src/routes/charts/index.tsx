import { createFileRoute } from '@tanstack/react-router'
import { msg } from '@lingui/core/macro'
import { getSiteUrl } from '@/config/env'
import { translatorFor } from '@/lib/i18n'
import { buildPageHead } from '@/lib/page-head'

/** `/charts`: the charts saved in this browser. The page itself is in `index.lazy.tsx`. */
export const Route = createFileRoute('/charts/')({
  // In the request's own language: the shared Lingui instance may hold another request's.
  head: ({ match }) => {
    const translator = translatorFor(match.context.locale)
    return buildPageHead({
      title: translator._(msg`Saved charts – Transparenta.eu`),
      description: translator._(msg`Manage and search your locally saved charts. Create, favorite, categorize, and share your visualizations.`),
      canonical: `${getSiteUrl()}/charts`,
    })
  },
})
