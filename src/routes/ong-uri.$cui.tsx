import { createFileRoute, notFound } from '@tanstack/react-router'
import {
  fetchNgoProfile,
  fetchPublicFunding,
} from '@/features/ngos/api/ngo-api'
import { normalizeNgoCui } from '@/features/ngos/lib/normalize-ngo-cui'
import {
  parseNgoProfileSearch,
  type NgoProfile,
  type PublicFunding,
} from '@/schemas/ngos'

export type NgoProfileRouteLoaderData = {
  readonly cui: string
  readonly profile: NgoProfile
  readonly funding: PublicFunding | null
}

export const Route = createFileRoute('/ong-uri/$cui')({
  validateSearch: parseNgoProfileSearch,
  loader: async ({ params }) => {
    const cui = normalizeNgoCui(params.cui)
    if (!cui) throw notFound()

    const [profile, funding] = await Promise.all([
      fetchNgoProfile(cui),
      fetchPublicFunding(cui),
    ])

    if (!profile) throw notFound()

    return { cui, profile, funding } satisfies NgoProfileRouteLoaderData
  },
  head: ({ loaderData }) => {
    const data = loaderData as NgoProfileRouteLoaderData | undefined
    const name = data?.profile.header.name ?? 'ONG'

    return {
      meta: [
        {
          title: `${name} | Profil ONG | Transparenta.eu`,
        },
        {
          name: 'description',
          content:
            'Profil mock-first pentru ONG, cu identitate CUI, surse, servicii sociale si dovezi.',
        },
      ],
    }
  },
})
