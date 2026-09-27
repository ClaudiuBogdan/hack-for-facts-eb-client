import { z } from 'zod'
import { procurementHubSearchSchema } from './procurement-hub'

// ---------------------------------------------------------------------------
// Front door — /procurement
// ---------------------------------------------------------------------------

/**
 * The front door's choices, each in the URL so a view can be shared: whose
 * buyers lead the hero, whose money the categories show, what "who sells"
 * lists, what the county map is coloured by, which records are newest. A value
 * the page does not know is dropped, and the default is never written.
 */
export const PROCUREMENT_HOME_BUYERS = ['directe', 'contracte'] as const
export type ProcurementHomeBuyers = (typeof PROCUREMENT_HOME_BUYERS)[number]

export const PROCUREMENT_HOME_MONEY = ['contracte', 'directe'] as const
export type ProcurementHomeMoney = (typeof PROCUREMENT_HOME_MONEY)[number]

export const PROCUREMENT_HOME_SELLERS = ['contracte', 'directe'] as const
export type ProcurementHomeSellers = (typeof PROCUREMENT_HOME_SELLERS)[number]

export const PROCUREMENT_HOME_MAP = ['lei', 'contracte'] as const
export type ProcurementHomeMap = (typeof PROCUREMENT_HOME_MAP)[number]

export const PROCUREMENT_HOME_RECENT = ['contracte', 'directe'] as const
export type ProcurementHomeRecent = (typeof PROCUREMENT_HOME_RECENT)[number]

export const PROCUREMENT_HOME_DEFAULTS = {
  cumparatori: 'directe',
  bani: 'contracte',
  firme: 'contracte',
  indicator: 'lei',
  recente: 'contracte',
} as const satisfies Required<ProcurementHomeSearch>

export const procurementHomeSearchSchema = z
  .object({
    cumparatori: z.enum(PROCUREMENT_HOME_BUYERS).optional().catch(undefined),
    bani: z.enum(PROCUREMENT_HOME_MONEY).optional().catch(undefined),
    firme: z.enum(PROCUREMENT_HOME_SELLERS).optional().catch(undefined),
    indicator: z.enum(PROCUREMENT_HOME_MAP).optional().catch(undefined),
    recente: z.enum(PROCUREMENT_HOME_RECENT).optional().catch(undefined),
  })
  .catch({})

export type ProcurementHomeSearch = z.infer<typeof procurementHomeSearchSchema>

/** The page's own keys: everything else an old link carries is the explorer's or the site's. */
export const PROCUREMENT_HOME_KEYS: ReadonlySet<string> = new Set(Object.keys(PROCUREMENT_HOME_DEFAULTS))

/** The explorer's keys (`/procurement/search`), and its legacy `tab`. */
const EXPLORER_KEYS: ReadonlySet<string> = new Set([...Object.keys(procurementHubSearchSchema.shape), 'tab'])

/**
 * What an old `/procurement` link carried for the explorer, when it carried
 * anything: the whole search less the front door's own choices (the language
 * and the currency travel with it), or null for a front-door link. Read off
 * the keys, not the parsed values — the explorer fills a default period, so a
 * bare link would parse as a choice.
 */
export function explorerSearchOf(raw: Record<string, unknown>): Record<string, unknown> | null {
  if (!Object.keys(raw).some((key) => EXPLORER_KEYS.has(key))) return null
  return Object.fromEntries(Object.entries(raw).filter(([key]) => !PROCUREMENT_HOME_KEYS.has(key)))
}

/** Parsed, with every default left out of the address. */
export function parseProcurementHomeSearch(search: Record<string, unknown>): ProcurementHomeSearch {
  const parsed = procurementHomeSearchSchema.parse(search)
  return Object.fromEntries(
    Object.entries(parsed).filter(
      ([key, value]) => value !== undefined && PROCUREMENT_HOME_DEFAULTS[key as keyof ProcurementHomeSearch] !== value,
    ),
  ) as ProcurementHomeSearch
}
