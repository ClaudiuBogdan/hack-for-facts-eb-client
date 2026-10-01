import type { I18n } from '@lingui/core'
import { msg } from '@lingui/core/macro'
import { cpvDivisionLabelEn, cpvDivisionLabelRo } from './cpv-labels'
import { cpvKey, queryOf, repaired, searchOf, unreadParams, type AnalyticsSearch, type PopulationId, type Query } from './analytics-model'
import { headline, type Namer } from './analytics-text'

/**
 * What the analytics page tells search engines (design.md §19). A category
 * is a question readers search for — „achiziții medicamente" — and the
 * page answers it once the old category page is gone: one category, in any
 * population, at the page's own view, is a landing with its own title and
 * its own canonical address. Any other question is a reader's own:
 * answered and shared, not indexed.
 */

export interface CategoryLanding {
  /** The CPV prefix, as the address keeps it („33", „336", „90620000"). */
  readonly code: string
  readonly tip: PopulationId
  /** Its address as the page writes it, the one canonical form („cpv=336", „tip=contracte&cpv=336"). */
  readonly search: string
}

/** The question a search engine may land on, or null: a category alone (and its population), every other key the page's default. */
export function categoryLandingOf(search: AnalyticsSearch): CategoryLanding | null {
  const keys = Object.keys(search)
  if (!keys.includes('cpv') || keys.some((key) => key !== 'cpv' && key !== 'tip')) return null
  if (unreadParams(search).length > 0) return null
  const query = repaired(queryOf(search))
  const code = query.filters.cpv?.values[0]
  if (!code) return null
  const own = Object.entries(searchOf(query)).flatMap(([key, value]) => (value === undefined ? [] : [[key, value] as [string, string]]))
  return { code, tip: query.tip, search: new URLSearchParams(own).toString() }
}

/** A category's name in a locale: a division's own short name, else the API's, else null while it is not known. */
export function landingName(code: string, locale: string, read: { readonly ro: string | null; readonly en: string | null } | null | undefined): string | null {
  if (code.length === 2 && cpvDivisionLabelRo(code) !== null) return locale === 'en' ? cpvDivisionLabelEn(code) : cpvDivisionLabelRo(code)
  if (!read) return null
  return locale === 'en' ? (read.en ?? read.ro) : (read.ro ?? read.en)
}

const POPULATION_WORDS = {
  directe: msg`achiziții directe`,
  contracte: msg`contracte atribuite`,
  acorduri: msg`acorduri-cadru`,
} as const

/** „Produse farmaceutice (CPV 336): achiziții directe — Transparenta.eu". */
export function landingTitle(i18n: I18n, landing: CategoryLanding, name: string | null): string {
  const code = landing.code
  const kind = i18n._(POPULATION_WORDS[landing.tip])
  const category = name ?? i18n._(msg`Categoria CPV ${code}`)
  return `${i18n._(msg`${category} (CPV ${code}): ${kind}`)} — Transparenta.eu`
}

export function landingDescription(i18n: I18n, landing: CategoryLanding, name: string | null): string {
  const code = landing.code
  const category = name ?? i18n._(msg`Categoria CPV ${code}`)
  return i18n._(msg`${category}: cât cumpără instituțiile publice, de la ce firme și unde — achiziții directe, contracte și acorduri-cadru, pe ani, din SEAP.`)
}

/** The page's own title, for the bare page and any question that is no landing. */
export function pageTitle(i18n: I18n): string {
  return `${i18n._(msg`Analize ale achizițiilor publice`)} — Transparenta.eu`
}

/**
 * The browser tab's title for a question, as the route's head would give it
 * with every name read: a named landing by its category, the bare page by
 * the page, any other question by its headline; null while a landing's name
 * is not read yet (the head's title stands meanwhile).
 */
export function documentTitleOf(i18n: I18n, search: AnalyticsSearch, query: Query, namer: Namer): string | null {
  const landing = categoryLandingOf(search)
  if (landing) {
    const name = landingName(landing.code, i18n.locale, namer.names?.cpv.get(cpvKey(landing.code)))
    return name ? landingTitle(i18n, landing, name) : null
  }
  if (Object.keys(search).length === 0) return pageTitle(i18n)
  return `${headline(query, namer)} — Transparenta.eu`
}

