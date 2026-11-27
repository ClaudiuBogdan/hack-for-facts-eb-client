import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import type { SearchMore } from '@/features/landing/components/search/landing-search'

/** The way on from the hub's search to the advanced search, with the words typed (and the address's language). */
export function hubSearchMore(lang: unknown): SearchMore {
  return {
    link: (term) => ({ to: '/legislation/search', search: { q: term, ...(lang === 'en' || lang === 'ro' ? { lang } : {}) } }),
    label: t`Căutare avansată`,
    row: (term) => (
      <Trans>
        Caută „{term}” în <span className="font-medium text-primary underline decoration-primary/30 underline-offset-4">căutarea avansată</span>
      </Trans>
    ),
    empty: (term) => (
      <Trans>
        Niciun act pentru <strong className="font-medium text-foreground">{term}</strong>.{' '}
        <span className="text-muted-foreground/70">Aici se caută după nume și număr.</span>
      </Trans>
    ),
  }
}
