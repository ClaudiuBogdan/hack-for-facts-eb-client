/**
 * Party display + profile-route helpers, shared by the detail page, rankings
 * and export (previously duplicated `partyLink` logic in card + detail).
 */
import { t } from '@lingui/core/macro'
import type { Party } from '@/schemas/procurement'

export type PartyKind = 'authority' | 'supplier'

export function partyLabel(party: Party | null): string {
  return (
    party?.displayName ?? party?.name ?? party?.cui ?? t`Unknown party`
  )
}

/** Authorities live under /entities, suppliers under /companies. */
export function partyRoute(
  kind: PartyKind,
): '/entities/$cui' | '/companies/$cui' {
  return kind === 'authority' ? '/entities/$cui' : '/companies/$cui'
}

export type PartyProfileLink = {
  readonly to: '/entities/$cui' | '/companies/$cui'
  readonly params: { readonly cui: string }
}

/** Profile link for a party — null when there is no CUI to link to. */
export function partyProfileLink(
  party: Party | null,
  kind: PartyKind,
): PartyProfileLink | null {
  const cui = party?.cui?.trim()
  if (!cui) return null
  return { to: partyRoute(kind), params: { cui } }
}
