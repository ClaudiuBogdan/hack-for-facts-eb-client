import type { I18n } from '@lingui/core'
import { msg } from '@lingui/core/macro'
import { courtName } from './judicial-labels'

/**
 * Document titles for the justice pages, built twice: by the route `head` on
 * the server, and by the page in the browser once its read resolves (a
 * client-side navigation does not wait for the loader). One format, here —
 * and no snapshot: a route module loads with every page.
 */
const JUSTICE_TITLE_SUFFIX = 'Justiție — Transparenta.eu'

export function buildJusticeHubTitle(): string {
  return `Instanțele din România — ${JUSTICE_TITLE_SUFFIX}`
}

export function buildCourtDocumentTitle(code: string): string {
  return `${courtName(code)} — ${JUSTICE_TITLE_SUFFIX}`
}

/** The analysis page's own title, in a request's language: the route's head gives it to every question. */
export function buildAnalysisPageTitle(i18n: I18n): string {
  return `${i18n._(msg`Analize ale dosarelor`)} — ${i18n._(msg`Justiție`)} — Transparenta.eu`
}

export function buildAnalysisPageDescription(i18n: I18n): string {
  return i18n._(msg`Câte dosare au instanțele din România, pe instanțe, județe, materii, etape și ani: întreabă și compară, de pe portalul instanțelor. Persoanele nu sunt numite.`)
}

/** The ECHR page's own title, in a request's language: the route's head gives it to every year. */
export function buildEchrPageTitle(i18n: I18n): string {
  return `${i18n._(msg`Hotărârile CEDO în cauze cu România`)} — ${i18n._(msg`Justiție`)} — Transparenta.eu`
}

export function buildEchrPageDescription(i18n: I18n): string {
  return i18n._(
    msg`Hotărârile Curții Europene a Drepturilor Omului în cauze cu România, din 2009: câte pe an, câte cereri soluționează, cât au așteptat, cu legătura la textul de pe HUDOC. Reclamanții nu sunt numiți.`,
  )
}

export function buildCaseDocumentTitle(code: string, number: string): string {
  return `Dosarul ${number} — ${courtName(code)} — ${JUSTICE_TITLE_SUFFIX}`
}
