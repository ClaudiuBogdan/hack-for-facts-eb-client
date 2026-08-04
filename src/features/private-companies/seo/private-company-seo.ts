import type { PrivateCompanyProfile } from '@/schemas/private-company'

/**
 * Shared because the title is built twice: by the route `head` on the SSR path,
 * and by the page in the browser once its query resolves (client-side
 * navigation no longer blocks on the loader, so `head` has no profile there).
 * Two copies of the format would drift.
 */
export function buildPrivateCompanyDocumentTitle(
  profile: Pick<PrivateCompanyProfile, 'cui' | 'legalName'>,
): string {
  return profile.cui
    ? `${profile.legalName} (CUI ${profile.cui})`
    : profile.legalName
}

export function buildPrivateCompanyRouteHead(profile: PrivateCompanyProfile) {
  const title = buildPrivateCompanyDocumentTitle(profile)

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
