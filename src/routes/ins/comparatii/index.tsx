import { createFileRoute } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { insPageMeta } from '@/features/statistics/lib/ins-head'
import { parseStatisticsComparisonsSearch } from '@/schemas/statistics'

export const Route = createFileRoute('/ins/comparatii/')({
  validateSearch: parseStatisticsComparisonsSearch,
  head: () => ({
    meta: insPageMeta({
      title: `${t`Compară teritorii`} · ${t`Statistici INS`} — Transparenta.eu`,
      description: t`Un indicator INS pentru până la șase locuri — localități, județe sau toată țara: cum stau acum, cum s-au schimbat și unde se află printre județe.`,
    }),
  }),
})
