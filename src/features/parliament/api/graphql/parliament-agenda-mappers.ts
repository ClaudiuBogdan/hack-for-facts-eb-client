/**
 * Raw GraphQL rows → validated agenda view models.
 *
 * Nulls become `undefined` (the schemas use `.optional()`, so an explicit null
 * would fail validation), and every list defaults to empty rather than absent.
 */
import {
  ParliamentAgendaDetailSchema,
  ParliamentAgendaListSchema,
  ParliamentAgendaSchema,
  ParliamentBillSchedulingSchema,
  type ParliamentAgenda,
  type ParliamentAgendaDetail,
  type ParliamentAgendaList,
  type ParliamentBillScheduling,
} from '@/schemas/parliament'
import type {
  RawParliamentAgenda,
  RawParliamentAgendaItem,
} from './parliament-agenda-queries'

const opt = (value: string | null | undefined): string | undefined =>
  value === null || value === undefined || value === '' ? undefined : value

export const mapAgenda = (raw: RawParliamentAgenda): ParliamentAgenda =>
  ParliamentAgendaSchema.parse({
    agendaKey: raw.agendaKey,
    chamber: raw.chamber,
    title: opt(raw.title),
    approvedDate: opt(raw.approvedDate),
    approvedDateText: opt(raw.approvedDateText),
    pdfUrl: opt(raw.pdfUrl),
    sourceUrl: raw.sourceUrl,
    itemCount: raw.itemCount,
    billCount: raw.billCount,
    namedBillCount: raw.namedBillCount ?? raw.billCount,
    sittings: (raw.sittings ?? []).map((s) => ({
      sittingKey: s.sittingKey,
      chamber: s.chamber,
      date: opt(s.date),
      dateSource: s.dateSource,
      title: opt(s.title),
      stenogramSessionKey: opt(s.stenogramSessionKey),
      resolutionStatus: opt(s.resolutionStatus),
    })),
  })

const mapItem = (raw: RawParliamentAgendaItem) => ({
  agendaItemKey: raw.agendaItemKey,
  rowIndex: raw.rowIndex,
  numberText: opt(raw.numberText),
  itemKind: raw.itemKind,
  billKey: opt(raw.billKey),
  billLabel: opt(raw.billLabel),
  billFamily: opt(raw.billFamily),
  titleText: opt(raw.titleText),
  descriptionText: opt(raw.descriptionText),
  lawCategory: opt(raw.lawCategory),
  senateDisposition: opt(raw.senateDisposition),
  senateDispositionDate: opt(raw.senateDispositionDate),
  committeeRapporteurs: raw.committeeRapporteurs ?? [],
  procedureUrgency: raw.procedureUrgency,
  decisionalChamber: raw.decisionalChamber,
  debateReservation: raw.debateReservation,
  resolutionStatus: raw.resolutionStatus,
  documents: (raw.documents ?? []).map((d) => ({
    url: d.url,
    label: opt(d.label),
    date: opt(d.date),
    manifestSide: d.manifestSide,
  })),
})

export const mapAgendaList = (
  total: number,
  nodes: readonly RawParliamentAgenda[] | null | undefined,
): ParliamentAgendaList =>
  ParliamentAgendaListSchema.parse({
    agendas: (nodes ?? []).map(mapAgenda),
    total,
  })

export const mapAgendaDetail = (
  agenda: RawParliamentAgenda,
  items: readonly RawParliamentAgendaItem[] | null | undefined,
): ParliamentAgendaDetail =>
  ParliamentAgendaDetailSchema.parse({
    agenda: mapAgenda(agenda),
    items: (items ?? []).map(mapItem),
  })

export const mapBillScheduling = (
  rows:
    | readonly {
        agendaKey: string
        agendaItemKey: string
        agendaTitle?: string | null
        sittingKey: string
        sittingDate?: string | null
        sittingDateSource: string
        chamber: string
        relationshipKind: string
        resolutionStatus: string
        itemNumberText?: string | null
        stenogramSessionKey?: string | null
      }[]
    | null
    | undefined,
): ParliamentBillScheduling[] =>
  (rows ?? []).map((r) =>
    ParliamentBillSchedulingSchema.parse({
      agendaKey: r.agendaKey,
      agendaItemKey: r.agendaItemKey,
      agendaTitle: opt(r.agendaTitle),
      sittingKey: r.sittingKey,
      sittingDate: opt(r.sittingDate),
      sittingDateSource: r.sittingDateSource,
      chamber: r.chamber,
      relationshipKind: r.relationshipKind,
      resolutionStatus: r.resolutionStatus,
      itemNumberText: opt(r.itemNumberText),
      stenogramSessionKey: opt(r.stenogramSessionKey),
    }),
  )
