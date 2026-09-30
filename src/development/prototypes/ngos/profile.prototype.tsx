import type { PrototypeDefinition } from '@/development/harness/entry'
import { ProfileBands } from './profile.variants'

/**
 * `/ngos/$cui` on `ngoOrganizationProfile`: the registry entry, ANAF and
 * the statements filed with the Ministry of Finance, for seven real NGOs
 * (`?cui=`, picked above the page). The owner chose `benzi` on 2026-09-30
 * and asked for the year-by-year matrix of the dropped `ani` variant under
 * the statement; `fisa` and `ani` were removed at their request.
 */
export const prototype = {
  title: 'ONG — profilul',
  spec: 'docs/design/ngos/design.md',
  variants: {
    benzi: { title: 'Benzi', component: ProfileBands, note: 'hero with the last years, pinned bar, figures, money, statement row by row, years matrix, ANAF and registry' },
  },
  compare: ['benzi'],
} satisfies PrototypeDefinition
