import { createFileRoute } from '@tanstack/react-router'
import {
  cleanPrivateCompanyDirectorySearch,
  parsePrivateCompanyDirectorySearch,
} from '@/schemas/private-company-search'

export const Route = createFileRoute('/companies/search')({
  validateSearch: (search: Record<string, unknown>) =>
    cleanPrivateCompanyDirectorySearch(parsePrivateCompanyDirectorySearch(search)),
  head: () => ({
    meta: [
      { title: 'Căutare firme — Transparenta.eu' },
      {
        name: 'description',
        content:
          'Caută firme românești după nume sau CUI, cu filtre pe județ, stare ONRC, cod CAEN, formă juridică și dată de înregistrare. Date din ONRC și ANAF.',
      },
    ],
  }),
})
