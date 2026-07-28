/**
 * GraphQL documents + raw-response Zod schemas for the plenary agenda
 * (`parliamentAgendas` / `parliamentAgenda` / `parliamentBillScheduling`).
 *
 * Server contract notes:
 *  - An agenda is a PLAN. `parliamentBillScheduling` proves a bill was PLACED
 *    ON an order of business and nothing more — `relationshipKind` is
 *    `scheduled_on_agenda` on every row, and the two stronger kinds are
 *    reserved for edges anchored to a transcript or a division.
 *  - Only CURRENT points are served; the server filters the lane's superseded
 *    revisions (107,404 tombstones against 97,348 live rows).
 *  - `committeeRapporteurs` is VERBATIM source text, not resolved committees.
 *  - `parliamentAgenda` returns null for an unknown key; it is not an error.
 *  - The whole surface is the Chamber of Deputies. The Senate plenary agenda is
 *    not extracted, so absence here says nothing about the Senate.
 */
import { z } from 'zod'

const AGENDA_FIELDS = /* GraphQL */ `
  agendaKey
  chamber
  title
  approvedDate
  approvedDateText
  pdfUrl
  sourceUrl
  itemCount
  billCount
  namedBillCount
  sittings {
    sittingKey
    chamber
    date
    dateSource
    title
    stenogramSessionKey
    resolutionStatus
  }
`

export const PARLIAMENT_AGENDAS_QUERY = /* GraphQL */ `
  query ParliamentAgendas($filter: ParliamentAgendaFilter, $offset: Int, $limit: Int) {
    parliamentAgendas(filter: $filter, offset: $offset, limit: $limit) {
      total
      nodes {
        ${AGENDA_FIELDS}
      }
    }
  }
`

export const PARLIAMENT_AGENDA_QUERY = /* GraphQL */ `
  query ParliamentAgenda($agendaKey: ID!) {
    parliamentAgenda(agendaKey: $agendaKey) {
      agenda {
        ${AGENDA_FIELDS}
      }
      items {
        agendaItemKey
        rowIndex
        numberText
        itemKind
        billKey
        billLabel
        billFamily
        titleText
        descriptionText
        lawCategory
        senateDisposition
        senateDispositionDate
        committeeRapporteurs
        procedureUrgency
        decisionalChamber
        debateReservation
        resolutionStatus
        documents {
          url
          label
          date
          manifestSide
        }
      }
    }
  }
`

export const PARLIAMENT_BILL_SCHEDULING_QUERY = /* GraphQL */ `
  query ParliamentBillScheduling($billKey: ID!) {
    parliamentBillScheduling(billKey: $billKey) {
      agendaKey
      agendaItemKey
      agendaTitle
      sittingKey
      sittingDate
      sittingDateSource
      chamber
      relationshipKind
      resolutionStatus
      itemNumberText
      stenogramSessionKey
    }
  }
`

/**
 * Raw-response shapes. Nullable everywhere the server can legitimately return
 * null, and OPEN on every classification string — a new `itemKind` or
 * `resolutionStatus` must not blank the page.
 */
const rawSitting = z.object({
  sittingKey: z.string(),
  chamber: z.string(),
  date: z.string().nullish(),
  dateSource: z.string(),
  title: z.string().nullish(),
  stenogramSessionKey: z.string().nullish(),
  resolutionStatus: z.string().nullish(),
})

const rawAgenda = z.object({
  agendaKey: z.string(),
  chamber: z.string(),
  title: z.string().nullish(),
  approvedDate: z.string().nullish(),
  approvedDateText: z.string().nullish(),
  pdfUrl: z.string().nullish(),
  sourceUrl: z.string(),
  itemCount: z.number(),
  billCount: z.number(),
  // Absent on a payload cached before the field existed; the card falls back.
  namedBillCount: z.number().nullish(),
  sittings: z.array(rawSitting).nullish(),
})

const rawItem = z.object({
  agendaItemKey: z.string(),
  rowIndex: z.number(),
  numberText: z.string().nullish(),
  itemKind: z.string(),
  billKey: z.string().nullish(),
  billLabel: z.string().nullish(),
  billFamily: z.string().nullish(),
  titleText: z.string().nullish(),
  descriptionText: z.string().nullish(),
  lawCategory: z.string().nullish(),
  senateDisposition: z.string().nullish(),
  senateDispositionDate: z.string().nullish(),
  committeeRapporteurs: z.array(z.string()).nullish(),
  procedureUrgency: z.boolean(),
  decisionalChamber: z.boolean(),
  debateReservation: z.boolean(),
  resolutionStatus: z.string(),
  documents: z
    .array(
      z.object({
        url: z.string(),
        label: z.string().nullish(),
        date: z.string().nullish(),
        manifestSide: z.string(),
      }),
    )
    .nullish(),
})

export const parliamentAgendasResponseSchema = z.object({
  parliamentAgendas: z
    .object({ total: z.number(), nodes: z.array(rawAgenda).nullish() })
    .nullish(),
})

export const parliamentAgendaResponseSchema = z.object({
  parliamentAgenda: z
    .object({ agenda: rawAgenda, items: z.array(rawItem).nullish() })
    .nullish(),
})

export const parliamentBillSchedulingResponseSchema = z.object({
  parliamentBillScheduling: z
    .array(
      z.object({
        agendaKey: z.string(),
        agendaItemKey: z.string(),
        agendaTitle: z.string().nullish(),
        sittingKey: z.string(),
        sittingDate: z.string().nullish(),
        sittingDateSource: z.string(),
        chamber: z.string(),
        relationshipKind: z.string(),
        resolutionStatus: z.string(),
        itemNumberText: z.string().nullish(),
        stenogramSessionKey: z.string().nullish(),
      }),
    )
    .nullish(),
})

export type RawParliamentAgenda = z.infer<typeof rawAgenda>
export type RawParliamentAgendaItem = z.infer<typeof rawItem>
