import { t } from '@lingui/core/macro'
import type { LegalDomainSlug } from '@/schemas/legal'

/**
 * The 16-value controlled domain vocabulary from
 * `legal.document_summaries.domains`. These are AI-derived subject labels, not
 * law — every surface that renders them says so.
 *
 * Order matches the server's `DOMAIN_VALUES` declaration so the grid reads the
 * same as the filter spec.
 */
export const LEGAL_DOMAIN_SLUGS: readonly LegalDomainSlug[] = [
  'administratie',
  'fiscal-si-bugetar',
  'justitie',
  'economie-si-comert',
  'munca-si-protectie-sociala',
  'proprietate-si-urbanism',
  'sanatate',
  'aparare-si-securitate',
  'transport',
  'educatie',
  'mediu',
  'agricultura',
  'energie',
  'cultura',
  'telecomunicatii-si-digital',
  'altele',
]

/** Human label for a domain slug. Called during render so the active locale wins. */
export function legalDomainLabel(slug: LegalDomainSlug): string {
  switch (slug) {
    case 'administratie':
      return t`Administrație`
    case 'fiscal-si-bugetar':
      return t`Fiscal și bugetar`
    case 'justitie':
      return t`Justiție`
    case 'economie-si-comert':
      return t`Economie și comerț`
    case 'munca-si-protectie-sociala':
      return t`Muncă și protecție socială`
    case 'proprietate-si-urbanism':
      return t`Proprietate și urbanism`
    case 'sanatate':
      return t`Sănătate`
    case 'aparare-si-securitate':
      return t`Apărare și securitate`
    case 'transport':
      return t`Transport`
    case 'educatie':
      return t`Educație`
    case 'mediu':
      return t`Mediu`
    case 'agricultura':
      return t`Agricultură`
    case 'energie':
      return t`Energie`
    case 'cultura':
      return t`Cultură`
    case 'telecomunicatii-si-digital':
      return t`Telecomunicații și digital`
    case 'altele':
      return t`Altele`
  }
}

const DOMAIN_SLUG_SET: ReadonlySet<string> = new Set<string>(LEGAL_DOMAIN_SLUGS)

/**
 * Label for a domain slug that arrived over the wire.
 *
 * `document_summaries.domains` is a controlled 16-value vocabulary, but nothing
 * at the GraphQL boundary enforces that — a value added on the pipeline side
 * would otherwise fall through `legalDomainLabel`'s exhaustive switch and render
 * as `undefined`. Unknown slugs render prettified instead of breaking the page.
 */
export function legalDomainLabelLoose(slug: string): string {
  return DOMAIN_SLUG_SET.has(slug)
    ? legalDomainLabel(slug as LegalDomainSlug)
    : slug.replace(/-/g, ' ')
}
