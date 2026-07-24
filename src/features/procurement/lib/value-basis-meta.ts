/**
 * Value-logic (vbasis) display metadata — ONE place for the labels, the
 * is/is-not explanations and the dropped-filter names, shared by the filter
 * sheet, the chips, the notices and the overview so wording cannot drift.
 *
 * The rules themselves live in `resolveProcurementValueBasisPlan`
 * (@/schemas/procurement-hub); this module is presentation only.
 */
import { t } from '@lingui/core/macro'
import type {
  ProcurementHubState,
  ProcurementValueBasis,
} from '@/schemas/procurement-hub'

export function valueBasisLabel(vbasis: ProcurementValueBasis): string {
  switch (vbasis) {
    case 'awarded':
      return t`Awarded value`
    case 'estimated':
      return t`Estimated value`
    case 'ceiling':
      return t`Framework ceilings`
    case 'calloff':
      return t`Call-offs (subsequent contracts)`
    case 'mod_adjusted':
      return t`Modification-adjusted value`
  }
}

/** One-line "what question does this answer" for the selector. */
export function valueBasisQuestion(vbasis: ProcurementValueBasis): string {
  switch (vbasis) {
    case 'awarded':
      return t`What was signed — the accepted awarded value of contracts and purchases (default).`
    case 'estimated':
      return t`What was budgeted — the estimated value published before award; strongest on procedures.`
    case 'ceiling':
      return t`The maximum committed under framework agreements — an upper bound, NOT money spent.`
    case 'calloff':
      return t`Execution under framework agreements — reported subsequent contracts, a separate population.`
    case 'mod_adjusted':
      return t`The final contract value after verified amendments (additional acts).`
  }
}

/**
 * The load-bearing caveat for each logic — what this number must NEVER be
 * read as. Shown on the inline notice whenever the logic is active.
 */
export function valueBasisCaveat(vbasis: ProcurementValueBasis): string | null {
  switch (vbasis) {
    case 'awarded':
      return null
    case 'estimated':
      return t`Estimates are the buyer's published intent, not spending. Each record type has its own coverage verdict — where the data cannot support an honest total, the figure abstains instead of substituting awarded values.`
    case 'ceiling':
      return t`A ceiling is the maximum a framework allows, counted once per framework agreement. It is not spending and must never be added to awarded values. Rankings and territorial maps are withheld for ceilings — sliced totals are not yet reliable enough to rank by.`
    case 'calloff':
      return t`Call-offs are reported for only a fraction of frameworks, so totals are a lower bound. They are their own population and are never added to contract awards — that would double-count the same money.`
    case 'mod_adjusted':
      return t`Only contracts with a verified amendment chain are adjusted; contracts whose amendments cannot be ordered reliably are excluded rather than silently served as awarded. Rankings and maps remain on awarded value.`
  }
}

/** Tile/legend label for the money figure the logic serves. */
export function valueBasisMoneyLabel(vbasis: ProcurementValueBasis): string {
  switch (vbasis) {
    case 'awarded':
      return t`Awarded value`
    case 'estimated':
      return t`Estimated value`
    case 'ceiling':
      return t`Ceiling total (maximum committed)`
    case 'calloff':
      return t`Call-off value`
    case 'mod_adjusted':
      return t`Adjusted value`
  }
}

/** Human name for a hub filter dropped by the active population's scrub. */
export function droppedFilterLabel(key: keyof ProcurementHubState): string {
  switch (key) {
    case 'q':
      return t`Text search`
    case 'status':
      return t`Status`
    case 'supplier_cui':
      return t`Supplier`
    case 'supplierRegion':
    case 'supplierCounty':
    case 'supplierSiruta':
      return t`Supplier location`
    case 'record_kind':
      return t`Record kind`
    case 'cpv':
    case 'cpv_group':
    case 'cpv_class':
    case 'cpv_category':
      return t`CPV below division level`
    case 'valueMin':
    case 'valueMax':
      return t`Value bounds`
    default:
      return String(key)
  }
}

/** Deduplicated display labels for a scrubbed filter list. */
export function droppedFilterLabels(
  dropped: readonly (keyof ProcurementHubState)[],
): readonly string[] {
  return [...new Set(dropped.map(droppedFilterLabel))]
}
