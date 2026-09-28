/**
 * GraphQL documents + raw-response Zod schemas for a firm's page
 * (`/procurement/suppliers/$cui`) beyond the analysis reads it shares with the
 * buyer page (`procurement-buyer-queries.ts`): the firm's contract award rows
 * with a total per year and per month of the year in progress, each row's
 * co-winners, and the names.
 */
import { z } from 'zod'

const party = z.object({ cui: z.string().nullable(), name: z.string().nullable(), displayName: z.string().nullable() })

export const supplierRowSchema = z.object({
  id: z.string(),
  noticeNo: z.string().nullable(),
  contractNo: z.string().nullable(),
  contractDate: z.string().nullable(),
  title: z.string().nullable(),
  cpvCode: z.string().nullable(),
  authority: party,
  supplier: party,
  value: z.object({ valueAccepted: z.boolean(), valueRonComparable: z.string().nullable() }),
})

export type SupplierRow = z.infer<typeof supplierRowSchema>

/** `total` is null when the API could only bound the count (capped or timed out). */
export const supplierRowsListSchema = z.object({ total: z.number().nullable(), items: z.array(supplierRowSchema) })
export const supplierRowsTotalSchema = z.object({ total: z.number().nullable() })

/** An award row of a buyer's day: what ties it to an award, its value, its firm. */
export const supplierDayRowSchema = z.object({
  id: z.string(),
  noticeNo: z.string().nullable(),
  contractNo: z.string().nullable(),
  supplier: party,
  value: z.object({ valueRonComparable: z.string().nullable() }),
})
export type SupplierDayRow = z.infer<typeof supplierDayRowSchema>
export const supplierDaySchema = z.object({ total: z.number().nullable(), items: z.array(supplierDayRowSchema) })
export type SupplierDay = z.infer<typeof supplierDaySchema>

/**
 * The API caps one request at 50 aliases and 500 fields (measured
 * 2026-09-28: past either it answers only errors, in an HTTP 200). A day's
 * search is twelve fields, so forty of them fit with room.
 */
export const SUPPLIER_DAYS_PER_REQUEST = 40
/** A buyer's award rows read per day: more than a buyer signs in a day, bar a few; a fuller day says so (`total`). */
export const SUPPLIER_DAY_ROWS = 100

const ROW_FIELDS =
  'id noticeNo contractNo contractDate title cpvCode authority { cui name displayName } supplier { cui name displayName } value { valueAccepted valueRonComparable }'
const DAY_FIELDS = 'total items { id noticeNo contractNo supplier { cui name displayName } value { valueRonComparable } }'

/**
 * The year's award rows, largest first, and a bare total per alias (a year, a
 * month): one request, so the totals ride on the rows' round trip. Variables:
 * `rows` and one filter per alias.
 */
export function supplierRowsQuery(rows: number, totals: readonly string[]): string {
  const declarations = ['$rows: ProcurementContractsFilter', ...totals.map((alias) => `$${alias}: ProcurementContractsFilter`)]
  const body = [
    `rows: procurementContracts(filter: $rows, sort: value_desc, page: 1, pageSize: ${rows}) { total items { ${ROW_FIELDS} } }`,
    ...totals.map((alias) => `${alias}: procurementContracts(filter: $${alias}, page: 1, pageSize: 1) { total }`),
  ]
  return `query ProcurementSupplierRows(${declarations.join(', ')}) {\n  ${body.join('\n  ')}\n}`
}

/** One search per buyer and day (`d0`, `d1`, …, at most `SUPPLIER_DAYS_PER_REQUEST`): the day's award rows, every winner. */
export function supplierDaysQuery(count: number): string {
  const aliases = Array.from({ length: count }, (_, index) => `d${index}`)
  const declarations = aliases.map((alias) => `$${alias}: ProcurementContractsFilter`).join(', ')
  const body = aliases.map((alias) => `${alias}: procurementContracts(filter: $${alias}, page: 1, pageSize: ${SUPPLIER_DAY_ROWS}) { ${DAY_FIELDS} }`).join('\n  ')
  return `query ProcurementSupplierPartners(${declarations}) {\n  ${body}\n}`
}

/** One direct purchase per institution (`n0`, `n1`, …) by the firm: its record names the institution. */
export function supplierDirectNamesQuery(count: number): string {
  const aliases = Array.from({ length: count }, (_, index) => `n${index}`)
  const declarations = aliases.map((alias) => `$${alias}: ProcurementDirectAcquisitionsFilter`).join(', ')
  const body = aliases.map((alias) => `${alias}: procurementDirectAcquisitions(filter: $${alias}, page: 1, pageSize: 1) { items { authority { cui name displayName } } }`).join('\n  ')
  return `query ProcurementSupplierDirectNames(${declarations}) {\n  ${body}\n}`
}

export const supplierDirectNameSchema = z.object({ items: z.array(z.object({ authority: party })) })

/** The spine's labels for the page's institutions (and the firm), positional. Variables: `cuis`. */
export const SUPPLIER_NAMES_QUERY = `query ProcurementSupplierNames($cuis: [String!]!) {
  labels: organizationLabels(cuis: $cuis) { cui canonicalName status }
}`
