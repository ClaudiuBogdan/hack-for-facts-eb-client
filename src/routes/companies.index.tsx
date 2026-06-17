import { createFileRoute } from '@tanstack/react-router'
import { parsePrivateCompanyDirectorySearch } from '@/schemas/private-company-search'

export const Route = createFileRoute('/companies/')({
  validateSearch: parsePrivateCompanyDirectorySearch,
  head: () => ({
    meta: [
      { title: 'Căutare firme — Transparenta.eu' },
      {
        name: 'description',
        content:
          'Caută firme românești după nume sau CUI, cu filtre pe județ, stare ONRC și cod CAEN. Date din ONRC și ANAF.',
      },
    ],
  }),
})
