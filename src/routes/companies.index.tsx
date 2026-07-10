import { createFileRoute, redirect } from '@tanstack/react-router'
import {
  cleanPrivateCompanyDirectorySearch,
  parsePrivateCompanyDirectorySearch,
} from '@/schemas/private-company-search'

/**
 * `/companies` is the hub; the directory moved to `/companies/search`. Parse
 * leniently and redirect any old deep link that still carries a filter — the
 * `/procurement` → `/procurement/search` idiom.
 */
export const Route = createFileRoute('/companies/')({
  validateSearch: parsePrivateCompanyDirectorySearch,
  beforeLoad: ({ search }) => {
    const cleaned = cleanPrivateCompanyDirectorySearch(search)
    if (Object.keys(cleaned).length > 0) {
      throw redirect({ to: '/companies/search', search: cleaned, replace: true })
    }
  },
  head: () => ({
    meta: [
      { title: 'Firme — Transparenta.eu' },
      {
        name: 'description',
        content:
          'Explorează firmele românești: distribuția pe județe, stări ONRC și domenii CAEN, cu acces direct la profilul fiecărei firme. Date din ONRC și ANAF.',
      },
    ],
  }),
})
