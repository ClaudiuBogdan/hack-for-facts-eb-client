import { createLazyFileRoute } from '@tanstack/react-router'
import { getSiteUrl } from '@/config/env'
import { getUserLocale } from '@/lib/utils'
import { TermsContentEn } from '@/components/legal/TermsContentEn'
import { TermsContentRo } from '@/components/legal/TermsContentRo'

export const Route = createLazyFileRoute('/terms')({
  component: TermsPage,
})

function TermsPage() {
  const locale = getUserLocale()
  return locale === 'en' ? <TermsContentEn /> : <TermsContentRo />
}

function buildTermsHead() {
  const site = getSiteUrl()
  const canonical = `${site}/terms`
  const title = 'Terms of Use – Transparenta.eu'
  const description = 'Terms for using the Transparenta.eu service and visualizations.'
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
  return buildTermsHead()
}
