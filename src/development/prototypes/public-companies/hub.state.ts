import { useCallback } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'

import type { CountyMeasure } from './hub.model'

/**
 * The hub's address: every toggle writes it, so a view is a link. Romanian
 * keys as the procurement pages write theirs; defaults stay out of the URL.
 */
export type HubState = {
  /** Who controls: the state, the county councils or the cities and communes. */
  readonly autoritati: 'stat' | 'judete' | 'local'
  /** The control band: by kind of authority, or the authorities themselves. */
  readonly control: 'tipuri' | 'autoritati'
  /** The largest enterprises: by turnover, headcount or loss. */
  readonly marime: 'cifra' | 'salariati' | 'pierdere'
  readonly judete: CountyMeasure
  /** What they do: all, the local ones or the state's. */
  readonly domenii: CountyMeasure
}

export const HUB_DEFAULTS: HubState = { autoritati: 'stat', control: 'tipuri', marime: 'cifra', judete: 'toate', domenii: 'toate' }

const oneOf = <T extends string>(value: unknown, allowed: readonly T[], fallback: T): T =>
  typeof value === 'string' && (allowed as readonly string[]).includes(value) ? (value as T) : fallback

export function useHubState(defaults: HubState = HUB_DEFAULTS): { readonly state: HubState; readonly set: (patch: Partial<HubState>) => void } {
  const search = useSearch({ strict: false }) as Record<string, unknown>
  const navigate = useNavigate()
  const state: HubState = {
    autoritati: oneOf(search.autoritati, ['stat', 'judete', 'local'], defaults.autoritati),
    control: oneOf(search.control, ['tipuri', 'autoritati'], defaults.control),
    marime: oneOf(search.marime, ['cifra', 'salariati', 'pierdere'], defaults.marime),
    judete: oneOf(search.judete, ['toate', 'locale', 'centrale'], defaults.judete),
    domenii: oneOf(search.domenii, ['toate', 'locale', 'centrale'], defaults.domenii),
  }
  const set = useCallback(
    (patch: Partial<HubState>) => {
      void navigate({
        to: '.',
        search: (previous: Record<string, unknown>) => {
          const next: Record<string, unknown> = { ...previous }
          for (const [key, value] of Object.entries(patch)) {
            if (value === defaults[key as keyof HubState]) delete next[key]
            else next[key] = value
          }
          return next
        },
        replace: true,
        resetScroll: false,
      })
    },
    [navigate, defaults],
  )
  return { state, set }
}
