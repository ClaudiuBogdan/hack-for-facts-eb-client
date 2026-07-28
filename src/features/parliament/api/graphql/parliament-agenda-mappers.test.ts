import { describe, expect, it } from 'vitest'

import {
  mapAgendaDetail,
  mapAgendaList,
  mapBillScheduling,
} from './parliament-agenda-mappers'
import type { RawParliamentAgenda, RawParliamentAgendaItem } from './parliament-agenda-queries'

const rawAgenda: RawParliamentAgenda = {
  agendaKey: 'cdep_agenda_ordinezi:oid:2939',
  chamber: 'camera_deputatilor',
  title: 'Ordinea de zi pentru sedinţa din 29 - 30 iunie 2026',
  approvedDate: '2026-06-29',
  approvedDateText: '29.06.2026',
  pdfUrl: 'https://www.cdep.ro/x.pdf',
  sourceUrl: 'https://www.cdep.ro/ords/pls/caseta/ecaseta2015.OrdineZi?oid=2939',
  itemCount: 2,
  billCount: 1,
  sittings: [
    {
      sittingKey: 'cdep_stenogram:9040',
      chamber: 'camera_deputatilor',
      date: '2026-06-29',
      dateSource: 'stenogram_session',
      title: 'Şedinţa Camerei Deputaţilor din 29 iunie 2026',
      stenogramSessionKey: 'cdep:9040',
      resolutionStatus: 'exact',
    },
  ],
}

const rawItem: RawParliamentAgendaItem = {
  agendaItemKey: 'cdep_agenda_item:2939:row001:PCT1',
  rowIndex: 0,
  numberText: '1.',
  itemKind: 'debate',
  billKey: '12794',
  billLabel: 'Pl-x 283/2012',
  billFamily: 'PL-x',
  titleText: 'Proiectul de Lege …',
  descriptionText: null,
  lawCategory: 'lege organică',
  senateDisposition: null,
  senateDispositionDate: null,
  committeeRapporteurs: ['Comisia juridică (Adoptare) - distribuit - 18.04.2026'],
  procedureUrgency: true,
  decisionalChamber: false,
  debateReservation: false,
  resolutionStatus: 'linked',
  documents: [
    { url: 'https://www.cdep.ro/raport.pdf', label: 'Raport', date: null, manifestSide: 'project_file' },
  ],
}

describe('agenda mappers', () => {
  it('turns server nulls into absent fields, which is what the schema accepts', () => {
    const detail = mapAgendaDetail({ ...rawAgenda, approvedDate: null, pdfUrl: null }, [rawItem])
    expect(detail.agenda.approvedDate).toBeUndefined()
    expect(detail.agenda.pdfUrl).toBeUndefined()
    expect(detail.items[0]?.senateDisposition).toBeUndefined()
  })

  it('keeps the rapporteur strings verbatim, including the full distribution date', () => {
    // Prod held `- distribuit - 18` for rows captured before the parser fix;
    // the client must never re-truncate what the server now sends whole.
    const detail = mapAgendaDetail(rawAgenda, [rawItem])
    expect(detail.items[0]?.committeeRapporteurs).toEqual([
      'Comisia juridică (Adoptare) - distribuit - 18.04.2026',
    ])
  })

  it('defaults every absent collection to empty rather than undefined', () => {
    const detail = mapAgendaDetail({ ...rawAgenda, sittings: null }, null)
    expect(detail.agenda.sittings).toEqual([])
    expect(detail.items).toEqual([])

    const bare = mapAgendaDetail(rawAgenda, [
      { ...rawItem, committeeRapporteurs: null, documents: null },
    ])
    expect(bare.items[0]?.committeeRapporteurs).toEqual([])
    expect(bare.items[0]?.documents).toEqual([])
  })

  it('accepts an unresolved point without inventing a bill link', () => {
    const detail = mapAgendaDetail(rawAgenda, [
      { ...rawItem, billKey: null, resolutionStatus: 'unresolved' },
    ])
    expect(detail.items[0]?.billKey).toBeUndefined()
    expect(detail.items[0]?.billLabel).toBe('Pl-x 283/2012')
  })

  it('accepts a classification string it has never seen', () => {
    // itemKind / resolutionStatus are OPEN on purpose: the server contract is
    // additive, and a closed enum turns a new kind into a blank page.
    const detail = mapAgendaDetail(rawAgenda, [
      { ...rawItem, itemKind: 'brand_new', resolutionStatus: 'brand_new_status' },
    ])
    expect(detail.items[0]?.itemKind).toBe('brand_new')
  })

  it('carries the list total through unchanged', () => {
    expect(mapAgendaList(1296, [rawAgenda]).total).toBe(1296)
    expect(mapAgendaList(0, null).agendas).toEqual([])
  })

  it('maps scheduling rows and preserves the honest relationship kind', () => {
    const rows = mapBillScheduling([
      {
        agendaKey: 'cdep_agenda_ordinezi:oid:2939',
        agendaItemKey: 'cdep_agenda_item:2939:row001:PCT1',
        agendaTitle: null,
        sittingKey: 'cdep_stenogram:9040',
        sittingDate: '2026-06-29',
        sittingDateSource: 'stenogram_session',
        chamber: 'camera_deputatilor',
        relationshipKind: 'scheduled_on_agenda',
        resolutionStatus: 'candidate',
        itemNumberText: '1.',
        stenogramSessionKey: null,
      },
    ])
    expect(rows[0]?.relationshipKind).toBe('scheduled_on_agenda')
    expect(rows[0]?.resolutionStatus).toBe('candidate')
    expect(rows[0]?.stenogramSessionKey).toBeUndefined()
    expect(rows[0]?.agendaTitle).toBeUndefined()
  })

  it('maps an empty scheduling result without throwing', () => {
    expect(mapBillScheduling(null)).toEqual([])
  })
})
