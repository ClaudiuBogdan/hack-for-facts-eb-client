import { createLazyFileRoute } from '@tanstack/react-router'
import { getSiteUrl } from '@/config/env'
import { getUserLocale } from '@/lib/utils'
import { PrivacyContentEn } from '@/components/legal/PrivacyContentEn'
import { PrivacyContentRo } from '@/components/legal/PrivacyContentRo'

export const Route = createLazyFileRoute('/privacy')({
  component: PrivacyPage,
})

function PrivacyPage() {
  const locale = getUserLocale()
  return locale === 'en' ? <PrivacyContentEn /> : <PrivacyContentRo />
}

function buildPrivacyHead() {
  const site = getSiteUrl()
  const canonical = `${site}/privacy`
  const title = 'Privacy Policy – Transparenta.eu'
  const description = 'How Transparenta.eu handles data, analytics, and error reporting with consent.'
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

export function head() {
  return buildPrivacyHead()
}
