import { t } from '@lingui/core/macro'
import { createFileRoute } from '@tanstack/react-router'
import {
  hasPublicEnterpriseListingFilters,
  parsePublicEnterpriseSearch,
} from '@/schemas/public-enterprise'

export const Route = createFileRoute('/intreprinderi-publice/')({
  validateSearch: parsePublicEnterpriseSearch,
  head: ({ match }) => {
    const search = (match.search ?? {}) as Record<string, unknown>
    const listingMode = hasPublicEnterpriseListingFilters(search)
    return {
      meta: [
        {
          title: listingMode
            ? t`Listă întreprinderi publice — Transparenta.eu`
            : t`Întreprinderi publice de stat — Transparenta.eu`,
        },
        {
          name: 'description',
          content: t`Caută și analizează întreprinderile publice din România: indicatori AMEPIP, status, ticker și proveniența fiecărei cifre.`,
        },
      ],
    }
  },
})
