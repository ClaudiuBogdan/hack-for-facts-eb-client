import { describe, expect, it } from 'vitest'
import { PROCUREMENT_DA_AROUND_QUERY, PROCUREMENT_DA_LOOKUP_QUERY, PROCUREMENT_DA_PURCHASES_QUERY, PROCUREMENT_DA_PURCHASE_QUERY, PROCUREMENT_DA_TOTALS_QUERY } from './procurement-da-release-queries'
import { PROCUREMENT_DA_DETAIL_QUERY, PROCUREMENT_DA_RECORD_QUERY, PROCUREMENT_DIRECT_ACQUISITIONS_QUERY, PROCUREMENT_SUPPLIER_RECORDS_QUERY } from './procurement-queries'
import { PROCUREMENT_HOME_DIRECT_QUERY } from './procurement-home-queries'
import { DIRECT_PURCHASE_AROUND_QUERY } from './procurement-direct-purchase-queries'

/**
 * D6 (API doc 10, live on Chronos dev 19 November 2026): every direct-purchase
 * read names the publication it was served under, so the transport can refuse
 * one older than the newest seen. Each root field of a direct-purchase read
 * selects `meta { disclosureKey }` — once per field, aliases included.
 */
const DA_QUERIES: Readonly<Record<string, string>> = {
  PROCUREMENT_DA_PURCHASE_QUERY,
  PROCUREMENT_DA_PURCHASES_QUERY,
  PROCUREMENT_DA_LOOKUP_QUERY,
  PROCUREMENT_DA_AROUND_QUERY,
  PROCUREMENT_DA_TOTALS_QUERY,
  PROCUREMENT_DIRECT_ACQUISITIONS_QUERY,
  PROCUREMENT_DA_DETAIL_QUERY,
  PROCUREMENT_DA_RECORD_QUERY,
  PROCUREMENT_SUPPLIER_RECORDS_QUERY,
  PROCUREMENT_HOME_DIRECT_QUERY,
  DIRECT_PURCHASE_AROUND_QUERY,
}

const ROOT_FIELD = /\b(procurementDaPurchases?|procurementDaTotals|procurementDirectAcquisitions?|procurementSupplierRecords)\s*\(/gu

describe('direct-purchase reads are dated (D6)', () => {
  it.each(Object.entries(DA_QUERIES))('%s selects meta { disclosureKey } on each root field', (_name, query) => {
    const roots = query.match(ROOT_FIELD) ?? []
    expect(roots.length).toBeGreaterThan(0)
    expect(query.match(/meta \{ disclosureKey \}/gu)?.length ?? 0).toBeGreaterThanOrEqual(roots.length)
  })
})
