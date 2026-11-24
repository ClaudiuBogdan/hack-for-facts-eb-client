import type { PrototypeDefinition } from '@/development/harness/entry'
import { AnalysisPage, FrontDoor, TopicPage } from './analytics.pages'

/**
 * The legislation analytics pages for the owner's review (design: the scrapper's
 * docs/domains/legislation/refactoring/analytics-page-design.md §4, §5): the front door, the analysis page and a
 * topic page, in the procurement and companies analytics pages' language. Real data from a generated snapshot of
 * the corpus served on 18 November 2026 (`analytics.fixture.ts`, never edited by hand); the topic map and the
 * topic page run on a clearly labelled synthetic grid until the whole-corpus fit lands, and only that data module
 * changes then. Each page is a variant: `?v=poarta`, `?v=analiza`, `?v=tema`.
 */
export const prototype = {
  title: 'Legislație — analize (prototip, 24 noiembrie)',
  spec: 'docs/domains/legislation/refactoring/analytics-page-design.md (scrapper)',
  variants: {
    poarta: {
      title: 'Poarta (/legislation)',
      component: FrontDoor,
      note: 'Search first (static), the figures band with the snapshot line, four bands: the topic map (test data), what was published per year, ordinances, laws and decrees, Monitorul Oficial.',
    },
    analiza: {
      title: 'Analiza (/legislation/analytics)',
      component: AnalysisPage,
      note: 'The question as the headline (filter phrases), Flux/Stoc, „Privește după" with six lenses, ranked bars, a series in time, a two-lens grid, the acts sample, the filter sheet. Every control writes the address.',
    },
    tema: {
      title: 'Pagina unei teme (date de test)',
      component: TopicPage,
      note: 'Name, keywords, size, stability, type and era profile, place on the map, neighbouring topics: all on the placeholder grid.',
    },
  },
  compare: ['poarta'],
} satisfies PrototypeDefinition
