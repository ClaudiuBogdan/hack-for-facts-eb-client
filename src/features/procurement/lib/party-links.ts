/**
 * Party display + profile-route helpers, shared by the detail page, rankings
 * and export (previously duplicated `partyLink` logic in card + detail).
 */
import { t } from '@lingui/core/macro'
import type { Party, ProcurementGrain } from '@/schemas/procurement'

export type PartyKind = 'authority' | 'supplier'

/** Matches the slice analysis grain toggle (`contract` | `direct_acquisition`). */
export type AnalysisFlowGrain = 'contract' | 'direct_acquisition'

/** Fixed party on a slice page — enables authority×supplier search drill-down. */
export type PartyPairScope = {
  readonly kind: PartyKind
  readonly cui: string
}

export type PartyPairSearchLink = {
  readonly to: '/procurement'
  readonly search: {
    readonly view: 'list'
    readonly authority_cui: string
    readonly supplier_cui: string
    readonly grain: 'contracts' | 'direct_acquisitions'
    readonly sort: 'value_desc'
  }
}

export function partyLabel(party: Party | null): string {
  return (
    party?.displayName ?? party?.name ?? party?.cui ?? t`Unknown party`
  )
}

/** Map slice analysis grain toggle → Search URL grain. */
export function analysisGrainToSearchGrain(
  grain: AnalysisFlowGrain,
): Extract<ProcurementGrain, 'contracts' | 'direct_acquisitions'> {
  return grain === 'contract' ? 'contracts' : 'direct_acquisitions'
}

/** Identity profiles: authorities under /entities, suppliers under /companies. */
export function partyRoute(
  kind: PartyKind,
): '/entities/$cui' | '/companies/$cui' {
  return kind === 'authority' ? '/entities/$cui' : '/companies/$cui'
}

/** Procurement spine pages for rankings and money-trail navigation. */
export function partyProcurementRoute(
  kind: PartyKind,
): '/procurement/institutions/$cui' | '/procurement/suppliers/$cui' {
  return kind === 'authority'
    ? '/procurement/institutions/$cui'
    : '/procurement/suppliers/$cui'
}

export type PartyProfileLink = {
  readonly to: '/entities/$cui' | '/companies/$cui'
  readonly params: { readonly cui: string }
}

export type PartyProcurementLink = {
  readonly to: '/procurement/institutions/$cui' | '/procurement/suppliers/$cui'
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

/** Dedicated procurement page link — null when there is no CUI. */
export function partyProcurementLink(
  party: Party | null,
  kind: PartyKind,
): PartyProcurementLink | null {
  const cui = party?.cui?.trim()
  if (!cui) return null
  return { to: partyProcurementRoute(kind), params: { cui } }
}

/**
 * Search deep link for records between a fixed slice party and a ranking
 * counterpart, sorted by value. Null when either CUI is missing or kinds do
 * not form an authority×supplier pair.
 */
export function partyPairSearchLink(options: {
  readonly pairScope: PartyPairScope
  readonly counterpart: Party | null
  readonly counterpartKind: PartyKind
  readonly grain: AnalysisFlowGrain
}): PartyPairSearchLink | null {
  const scopeCui = options.pairScope.cui.trim()
  const counterpartCui = options.counterpart?.cui?.trim()
  if (!scopeCui || !counterpartCui) return null
  if (options.pairScope.kind === options.counterpartKind) return null

  const authority_cui =
    options.pairScope.kind === 'authority' ? scopeCui : counterpartCui
  const supplier_cui =
    options.pairScope.kind === 'supplier' ? scopeCui : counterpartCui

  return {
    to: '/procurement',
    search: {
      view: 'list',
      authority_cui,
      supplier_cui,
      grain: analysisGrainToSearchGrain(options.grain),
      sort: 'value_desc',
    },
  }
}
