/**
 * Mock adapter for the plenary agenda.
 *
 * Three states are synthesized deliberately, because they are the ones the UI
 * must get right and would otherwise only ever be seen in production:
 *   - an agenda the source never date-stamped (391 of 1,296 are like this);
 *   - a sitting whose date came from the PLANNED week rather than a transcript;
 *   - a point whose bill reference did not resolve, and an administrative point
 *     that has no bill to resolve in the first place.
 */
import {
  ParliamentAgendaDetailSchema,
  ParliamentAgendaListSchema,
  ParliamentBillSchedulingSchema,
  type ParliamentAgenda,
  type ParliamentAgendaDetail,
  type ParliamentAgendaList,
  type ParliamentBillScheduling,
} from '@/schemas/parliament'
import { AGENDAS_PAGE_SIZE, type ParliamentAgendaFilterInput } from './parliament-agenda-api.live'

const agenda = (
  oid: number,
  approvedDate: string | undefined,
  sittingDate: string | undefined,
  dateSource: string,
): ParliamentAgenda => ({
  agendaKey: `cdep_agenda_ordinezi:oid:${String(oid)}`,
  chamber: 'camera_deputatilor',
  title: `Ordinea de zi pentru sedinţa Camerei Deputaţilor din ${sittingDate ?? 'dată neprecizată'}`,
  approvedDate,
  approvedDateText: approvedDate?.split('-').reverse().join('.'),
  pdfUrl: `https://www.cdep.ro/ords/pls/caseta/cdocs?F${String(oid)}/oz.pdf`,
  sourceUrl: `https://www.cdep.ro/ords/pls/caseta/ecaseta2015.OrdineZi?oid=${String(oid)}`,
  sittings: [
    {
      sittingKey: `cdep_stenogram:${String(9000 + oid)}`,
      chamber: 'camera_deputatilor',
      date: sittingDate,
      dateSource,
      title: `Şedinţa Camerei Deputaţilor din ${sittingDate ?? '—'}`,
      stenogramSessionKey: `cdep:${String(9000 + oid)}`,
      resolutionStatus: 'exact',
    },
  ],
  itemCount: 4,
  billCount: 2,
})

const MOCK_AGENDAS: readonly ParliamentAgenda[] = [
  agenda(2939, '2026-06-29', '2026-06-29', 'stenogram_session'),
  agenda(2933, '2026-06-22', '2026-06-24', 'stenogram_session'),
  // The planned week disagreed with the transcript on 4 of the 5 sittings it
  // dated; the UI must be able to say where a date came from.
  agenda(2921, '2026-06-15', '2026-06-17', 'weekly_agenda'),
  // The source printed no approval date. It must render as undated, never as
  // the oldest agenda in the list.
  agenda(2907, undefined, '2026-06-08', 'stenogram_session'),
]

export function fetchParliamentAgendasMock(
  page = 1,
  filter?: ParliamentAgendaFilterInput,
): Promise<ParliamentAgendaList> {
  const needle = (filter?.q ?? '').trim().toLowerCase()
  const filtered = MOCK_AGENDAS.filter((a) => {
    if (needle !== '' && !(a.title ?? '').toLowerCase().includes(needle)) return false
    if (filter?.dateFrom !== undefined && (a.approvedDate ?? '') < filter.dateFrom) return false
    if (filter?.dateTo !== undefined && (a.approvedDate ?? '') > filter.dateTo) return false
    return true
  })
  const start = Math.max(page - 1, 0) * AGENDAS_PAGE_SIZE
  return Promise.resolve(
    ParliamentAgendaListSchema.parse({
      agendas: filtered.slice(start, start + AGENDAS_PAGE_SIZE),
      total: filtered.length,
    }),
  )
}

export function fetchParliamentAgendaMock(
  agendaKey: string,
): Promise<ParliamentAgendaDetail | null> {
  const found = MOCK_AGENDAS.find((a) => a.agendaKey === agendaKey)
  if (found === undefined) return Promise.resolve(null)
  return Promise.resolve(
    ParliamentAgendaDetailSchema.parse({
      agenda: found,
      items: [
        {
          agendaItemKey: `${agendaKey}:row001`,
          rowIndex: 0,
          numberText: '1.',
          itemKind: 'debate',
          billKey: '12794',
          billLabel: 'Pl-x 283/2012',
          billFamily: 'PL-x',
          titleText: 'Proiectul de Lege privind aprobarea Ordonanţei de urgenţă nr.38/2012',
          lawCategory: 'lege organică',
          committeeRapporteurs: ['Comisia juridică (Adoptare) - distribuit - 18.04.2026'],
          procedureUrgency: true,
          decisionalChamber: true,
          debateReservation: false,
          resolutionStatus: 'linked',
          documents: [
            {
              url: 'https://www.cdep.ro/proiecte/2012/200/80/8/raport.pdf',
              label: 'Raport',
              date: '2026-04-18',
              manifestSide: 'project_file',
            },
          ],
        },
        {
          agendaItemKey: `${agendaKey}:row002`,
          rowIndex: 1,
          numberText: '2.',
          itemKind: 'debate',
          billKey: '12702',
          billLabel: 'Pl-x 134/2012',
          billFamily: 'PL-x',
          titleText: 'Reexaminarea Legii pentru modificarea art.27 din Legea nr.47/1992',
          lawCategory: 'lege organică',
          senateDisposition: 'Respinsă de Senat',
          senateDispositionDate: '2026-03-11',
          committeeRapporteurs: [
            'Comisia pentru muncă şi Comisia pentru sănătate (Respingere) - distribuit - 02.05.2026',
          ],
          procedureUrgency: false,
          decisionalChamber: false,
          debateReservation: true,
          resolutionStatus: 'linked',
          documents: [],
        },
        {
          // The point names a bill the matcher could not resolve. It must still
          // render — as source text, without a link.
          agendaItemKey: `${agendaKey}:row003`,
          rowIndex: 2,
          numberText: '3.',
          itemKind: 'debate',
          billLabel: 'Pl-x 999/1999',
          titleText: 'Proiect cu referinţă nerezolvată',
          committeeRapporteurs: [],
          procedureUrgency: false,
          decisionalChamber: false,
          debateReservation: false,
          resolutionStatus: 'unresolved',
          documents: [],
        },
        {
          agendaItemKey: `${agendaKey}:row004`,
          rowIndex: 3,
          numberText: '4.',
          itemKind: 'administrative',
          titleText: 'Aprobarea ordinii de zi şi a programului de lucru',
          committeeRapporteurs: [],
          procedureUrgency: false,
          decisionalChamber: false,
          debateReservation: false,
          resolutionStatus: 'not_applicable',
          documents: [],
        },
      ],
    }),
  )
}

export function fetchParliamentBillSchedulingMock(
  billKey: string,
): Promise<ParliamentBillScheduling[]> {
  return Promise.resolve(
    MOCK_AGENDAS.slice(0, 2).map((a, index) =>
      ParliamentBillSchedulingSchema.parse({
        agendaKey: a.agendaKey,
        agendaItemKey: `${a.agendaKey}:row00${String(index + 1)}`,
        agendaTitle: a.title,
        sittingKey: a.sittings[0]?.sittingKey ?? 'cdep_stenogram:0',
        sittingDate: a.sittings[0]?.date,
        sittingDateSource: a.sittings[0]?.dateSource ?? 'none',
        chamber: 'camera_deputatilor',
        relationshipKind: 'scheduled_on_agenda',
        resolutionStatus: index === 0 ? 'exact' : 'candidate',
        itemNumberText: `${String(index + 1)}.`,
        stenogramSessionKey: a.sittings[0]?.stenogramSessionKey,
        billKey,
      }),
    ),
  )
}
