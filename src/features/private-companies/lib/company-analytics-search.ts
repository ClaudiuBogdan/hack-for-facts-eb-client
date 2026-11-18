/**
 * Keys the page reads only to say it does not answer them: a typed name
 * (`nume`) and an ONRC recorded-date range (`inregistrare`, `from~to`), which
 * an old directory link carried (`company-directory-redirect.ts`). The page
 * has no such filter; naming them keeps a wider answer from passing for the
 * question the link meant.
 */
export const UNANSWERED_KEYS = ['nume', 'inregistrare'] as const

/** Every key the page reads: the rest of an address (`lang`, the site's own) is left as it came. */
export const SEARCH_KEYS = [
  'an',
  'indicator',
  'mod',
  'vedere',
  'dupa',
  'clasare',
  'ordine',
  'sens',
  'cohorta',
  'editie',
  'cui',
  'judet',
  'uat',
  'forma',
  'stare',
  'tva',
  'inactiv',
  'caen',
  'caen_baza',
  // The derived activity selection (v3): exact `onrc:rev2:6201` / `anaf:6201`, and its basis.
  'activitate',
  'activitate_baza',
  // The ANAF-assumed main activity (v4): its exact ONRC key `rev3:4711`, and its status.
  'activitate_principala',
  'activitate_principala_stare',
  'depunere',
  'interval',
  'marime',
  // ONRC observations on one identifier (`scope.onrc`), apart from the consensus keys above.
  'onrc_stare',
  'onrc_judet',
  'onrc_caen',
  'onrc_caen_exact',
  'onrc_fara_stare',
  'onrc_fara_caen',
  'onrc_fara_judet',
  'onrc_fara_forma',
  // Never answered (no such filter here): a name and a recorded-date range the retired directory's links carried.
  ...UNANSWERED_KEYS,
] as const
export type SearchKey = (typeof SEARCH_KEYS)[number]

/** The address's values as text: the router hands a digits-only value over as a number. */
export type CompanyAnalyticsSearch = Readonly<Partial<Record<SearchKey, string>>>
/** The address the router writes: strings, and the numbers digits-only values travel as. */
export type CompanyAnalyticsUrlSearch = Readonly<Partial<Record<SearchKey, string | number>>>

/** An address in the page's words, as the router writes it: a digits-only value as a number. */
export function urlSearchOfText(search: CompanyAnalyticsSearch): CompanyAnalyticsUrlSearch {
  return Object.fromEntries(Object.entries(search).map(([key, value]) => [key, /^[1-9]\d{0,14}$/u.test(value) ? Number(value) : value])) as CompanyAnalyticsUrlSearch
}

/**
 * The keys the page reads, each a string or the number a digits-only value
 * travels as; the rest of an address (`lang`) is left to the site. A page key
 * the router parsed as something else stays as text, for the page to say it
 * could not read it.
 */
export function validateCompanyAnalyticsSearch(search: Record<string, unknown>): CompanyAnalyticsUrlSearch {
  const valid: Record<string, string | number> = {}
  for (const key of SEARCH_KEYS) {
    const value = search[key]
    if (typeof value === 'string' || (typeof value === 'number' && Number.isFinite(value))) valid[key] = value
    else if (value !== undefined && value !== null) valid[key] = typeof value === 'object' ? JSON.stringify(value) : String(value)
  }
  return valid
}
