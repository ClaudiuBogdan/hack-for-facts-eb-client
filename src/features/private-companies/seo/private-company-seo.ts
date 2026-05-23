import type { PrivateCompanyProfile } from '@/schemas/private-company'

export function buildPrivateCompanyRouteHead(profile: PrivateCompanyProfile) {
  const title = profile.cui
    ? `${profile.legalName} (CUI ${profile.cui})`
    : profile.legalName

  return {
    meta: [
      { title },
      {
        name: 'description',
        content: `Company profile for ${profile.legalName} — ONRC registry and ANAF public fiscal data on Transparenta.eu.`,
      },
    ],
  }
}
