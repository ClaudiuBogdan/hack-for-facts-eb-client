import { createLazyFileRoute } from '@tanstack/react-router'
import { getSiteUrl } from '@/config/env'
import { getUserLocale } from '@/lib/utils'
import { CookiePolicyContentEn } from '@/components/legal/CookiePolicyContentEn'
import { CookiePolicyContentRo } from '@/components/legal/CookiePolicyContentRo'

export const Route = createLazyFileRoute('/cookie-policy')({
  component: CookiePolicyPage,
})

function CookiePolicyPage() {
  const locale = getUserLocale()
  return locale === 'en' ? <CookiePolicyContentEn /> : <CookiePolicyContentRo />
}

function buildCookiePolicyHead() {
  const site = getSiteUrl()
  const canonical = `${site}/cookie-policy`
  const title = 'Cookie Policy – Transparenta.eu'
  const description = 'Details on cookies and localStorage used by Transparenta.eu, with consent choices.'
  return {
    meta: [
      { title },
      { name: 'description', content: description },
      { name: 'og:title', content: title },
      { name: 'og:description', content: description },
      { name: 'og:url', content: canonical },
      { name: 'canonical', content: canonical },
    ],
  }
}

export function head() {
  return buildCookiePolicyHead()
}
