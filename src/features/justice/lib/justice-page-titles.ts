import type { I18n } from '@lingui/core'
import { msg } from '@lingui/core/macro'
import { courtName } from './judicial-labels'

/**
 * Document titles for the justice pages, built twice: by the route `head` on
 * the server, and by the page in the browser once its read resolves (a
 * client-side navigation does not wait for the loader). One format, here —
 * and no snapshot: a route module loads with every page. Each is in the
 * language of the translator it is given (the request's, on the server); a
 * court's name stays as the court is called.
 */
function justiceSuffix(i18n: I18n): string {
  return `${i18n._(msg`Justiție`)} — Transparenta.eu`
}

export function buildJusticeHubTitle(i18n: I18n): string {
  return `${i18n._(msg`Instanțele din România`)} — ${justiceSuffix(i18n)}`
}

export function buildCourtDocumentTitle(i18n: I18n, code: string): string {
  return `${courtName(code)} — ${justiceSuffix(i18n)}`
}

/** The analysis page's own title, in a request's language: the route's head gives it to every question. */
export function buildAnalysisPageTitle(i18n: I18n): string {
  return `${i18n._(msg`Analize ale dosarelor`)} — ${justiceSuffix(i18n)}`
}

export function buildAnalysisPageDescription(i18n: I18n): string {
  return i18n._(msg`Câte dosare au instanțele din România, pe instanțe, județe, materii, etape și ani: întreabă și compară, de pe portalul instanțelor. Persoanele nu sunt numite.`)
}

/** The ECHR page's own title, in a request's language: the route's head gives it to every year. */
export function buildEchrPageTitle(i18n: I18n): string {
  return `${i18n._(msg`Hotărârile CEDO în cauze cu România`)} — ${justiceSuffix(i18n)}`
}

export function buildEchrPageDescription(i18n: I18n): string {
  return i18n._(
    msg`Hotărârile Curții Europene a Drepturilor Omului în cauze cu România, din 2009: câte pe an, câte cereri soluționează, cât au așteptat, cu legătura la textul de pe HUDOC. Reclamanții nu sunt numiți.`,
  )
}

export function buildCaseDocumentTitle(i18n: I18n, code: string, number: string): string {
  return `${i18n._(msg`Dosarul ${number}`)} — ${courtName(code)} — ${justiceSuffix(i18n)}`
}
