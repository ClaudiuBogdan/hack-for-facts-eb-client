import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { getSiteUrl } from '@/config/env'

export const campaignNotificationsSearchSchema = z.object({
  from: z.string().min(1).optional(),
  lang: z.enum(['ro', 'en']).optional(),
})

export const Route = createFileRoute('/provocare_/notificari')({
  ssr: false,
  validateSearch: campaignNotificationsSearchSchema,
  head: () => buildCampaignNotificationsHead(),
})

function buildCampaignNotificationsHead() {
  const site = getSiteUrl()
  const canonical = `${site}/provocare/notificari`
  const title = 'Notificari campanie - Transparenta.eu'
  const description =
    'Gestioneaza notificarile pentru entitatile urmarite in campania Cu ochii pe bugetele locale.'

  return {
    meta: [
      { title },
      { name: 'description', content: description },
      { name: 'og:title', content: title },
      { name: 'og:description', content: description },
      { name: 'og:url', content: canonical },
      { name: 'canonical', content: canonical },
      { name: 'robots', content: 'noindex,follow' },
    ],
  }
}
