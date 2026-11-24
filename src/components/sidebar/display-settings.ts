/**
 * Which display settings the sidebar offers on a page. Currency and real
 * prices are global settings, but only these pages read them; elsewhere the
 * sidebar shows neither (owner, 24 November 2026: `docs/design/sidebar/design.md`).
 * A page that starts reading `useUserCurrency` or `useUserInflationAdjusted`
 * belongs here.
 */
export type DisplaySettings = {
  readonly currency: boolean
  readonly inflation: boolean
}

const BOTH = { currency: true, inflation: true } as const
const CURRENCY_ONLY = { currency: true, inflation: false } as const
const NONE = { currency: false, inflation: false } as const

const RULES: ReadonlyArray<readonly [path: RegExp, settings: DisplaySettings]> = [
  // An entity page and the town-hall pages under it (the budget challenge
  // among them); not the search pages, nor the campaign's map selector.
  [/^\/entities\/[^/]+/, BOTH],
  [/^\/primarie\/(?!harta(?:\/|$))[^/]+/, BOTH],
  // The map, the map analytics editor and its published maps.
  [/^\/maps?(?:\/|$)/, BOTH],
  [/^\/charts(?:\/|$)/, BOTH],
  [/^\/entity-analytics(?:\/|$)/, BOTH],
  [/^\/budget-explorer(?:\/|$)/, BOTH],
  // Only the PNRR overview converts amounts; its subpages show source currencies.
  [/^\/pnrr\/?$/, CURRENCY_ONLY],
]
// Not here: the alerts editor reads the settings once, to fill a new series,
// and has its own per-series controls.

export function displaySettingsFor(pathname: string): DisplaySettings {
  return RULES.find(([path]) => path.test(pathname))?.[1] ?? NONE
}
