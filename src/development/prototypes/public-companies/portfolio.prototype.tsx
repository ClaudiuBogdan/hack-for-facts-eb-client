import type { PrototypeDefinition } from '@/development/harness/entry'
import { PortfolioSizeVariant, PortfolioStatusVariant, PortfolioTableVariant } from './portfolio.page'

/**
 * `/public-enterprises/authorities/$cui` (proposed): one controlling
 * authority's public enterprises (`?cui=`, picked above the page), on the
 * snapshot `scripts/generate-public-enterprise-hub-fixture.mjs` writes: the
 * API's list carries names only and a live company read per enterprise is
 * too slow for a large portfolio (design note §12.8). Three variants, one per
 * form of the list.
 */
export const prototype = {
  title: 'Întreprinderi publice — portofoliul unei autorități',
  spec: 'docs/design/public-companies/design.md',
  variants: {
    tabel: {
      title: 'Toate, într-un tabel',
      component: PortfolioTableVariant,
      note: 'Head: each source’s word on the enterprises, as bars. Band: one sortable table (list status, 2024 turnover, staff, net result), filtered by the list’s word; then the sources’ disagreements, activities and seats.',
    },
    stare: {
      title: 'Care mai funcționează',
      component: PortfolioStatusVariant,
      note: 'Head: the five largest by 2024 turnover. Band: groups by ANAF’s list (active, inactive, …), the active ones another source contradicts first; then disagreements, activities and seats.',
    },
    marime: {
      title: 'Cât de mari sunt',
      component: PortfolioSizeVariant,
      note: 'Head: each source’s word, as bars. Band: a ranking by 2024 turnover, staff or loss, then those with no figure and why; then disagreements, activities and seats.',
    },
  },
  compare: ['tabel', 'stare', 'marime'],
} satisfies PrototypeDefinition
