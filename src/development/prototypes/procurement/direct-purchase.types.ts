import type { RawProcurementDirectAcquisition } from '@/features/procurement/api/graphql/procurement-queries'
import type { DpPeers } from '@/features/procurement/lib/direct-purchase-model'
import type { DaDetail, DaDetailAvailability } from '@/schemas/procurement'

/**
 * One record of the direct-purchase prototype: the raw record as the dev API
 * serves it today, what it answered for the detail and the CUI, and what the
 * fixed API must serve (§16.2) — the detail from prod, the CUI recovered from
 * the name, SEAP's own state, the per-line comparisons.
 */
export interface RawDaFixture {
  readonly id: string
  readonly label: string
  readonly record: RawProcurementDirectAcquisition
  readonly today: { readonly availability: DaDetailAvailability; readonly authorityCui: string | null; readonly status: string }
  readonly target: {
    readonly availability: DaDetailAvailability
    readonly authorityCui: string | null
    /** SEAP's state as it writes it („Oferta acceptata", „Conditii refuzate"). */
    readonly stateText: string | null
    /** The key the detail is read by: attrs.direct_acquisition_id = da_details.source_ref. */
    readonly detailJoin: { readonly sourceSystem: string; readonly sourceRef: string } | null
    readonly detail: DaDetail | null
    /** By line index: the same product from the same firm at other institutions, from three up. */
    readonly peers: Readonly<Record<string, DpPeers>>
    /** By line index: how many other times this institution bought it from the firm in the year. */
    readonly repeats: Readonly<Record<string, number>>
  }
}
