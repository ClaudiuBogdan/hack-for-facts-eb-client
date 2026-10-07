import { courtName } from './judicial-labels'

/**
 * Document titles for the justice pages, built twice: by the route `head` on
 * the server, and by the page in the browser once its read resolves (a
 * client-side navigation does not wait for the loader). One format, here.
 */
const JUSTICE_TITLE_SUFFIX = 'Justiție — Transparenta.eu'

export function buildJusticeHubTitle(): string {
  return `Instanțele din România — ${JUSTICE_TITLE_SUFFIX}`
}

export function buildCourtDocumentTitle(code: string): string {
  return `${courtName(code)} — ${JUSTICE_TITLE_SUFFIX}`
}

export function buildCaseDocumentTitle(code: string, number: string): string {
  return `Dosarul ${number} — ${courtName(code)} — ${JUSTICE_TITLE_SUFFIX}`
}
