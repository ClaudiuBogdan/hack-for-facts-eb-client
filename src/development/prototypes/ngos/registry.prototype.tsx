import type { PrototypeDefinition } from '@/development/harness/entry'
import { RegistryIntrebare, RegistryLista } from './registry.variants'

/**
 * `/ngos/registry` redesigned in the analytics page's language, live on the
 * dev API's `ngoRegistryRecords` (no count, no sort, six filters, 100 rows a
 * page). The address keeps the route's own keys (`q`, `county`, `category`,
 * `status`, `registryNumber`, `publicUtility`), so every link the hub makes
 * opens here unchanged. `?simuleaza=eroare|oprire|gol|lent` stands in for the
 * API's failure, a failure after the first page, an empty answer and a slow
 * one. See `registry.RATIONALE.md`.
 */
export const prototype = {
  title: 'ONG — registrul',
  spec: 'docs/design/ngos/design.md',
  variants: {
    intrebare: {
      title: 'Întrebare — the registry as the analytics page',
      component: RegistryIntrebare,
      note: 'The question as the headline, the statuses in the pinned bar, four figures true of the selection, the records or a complete read broken down on the open axes, the source at the foot.',
    },
    lista: {
      title: 'Listă — the plain searchable list',
      component: RegistryLista,
      note: 'The same head with the count under the question, the status as a quick row, the records, the source; no figures, no breakdowns.',
    },
  },
  compare: ['intrebare'],
} satisfies PrototypeDefinition
