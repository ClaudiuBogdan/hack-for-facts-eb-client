import type { PublicEnterpriseHubSnapshot } from '../hub-snapshot-types'

/**
 * A small public-enterprise hub snapshot for tests: real names, CUIs and
 * source addresses from the dev API's reads of 7 October 2026, the counts cut
 * down and kept consistent with each other (every member in one level, the
 * counties and divisions adding up to the members).
 */
export function hubSnapshotFixture(overrides: Partial<PublicEnterpriseHubSnapshot> = {}): PublicEnterpriseHubSnapshot {
  return {
    generatedAt: '2026-10-07T16:47:37.718Z',
    sources: [
      {
        family: 'amepip',
        laneStatus: 'available',
        sourceUrl: 'https://data.gov.ro/dataset/5a4d4fdb-1e06-4ea6-a3b5-aef01ebba168/resource/8865d8b1-e5db-4a14-8721-9048af14cafe/download/datecompanii_ind-finnefin.xlsx',
        observedAt: '2026-06-18T19:46:38.921000Z',
        sourceLastModifiedAt: '2026-01-13T14:23:50.041841Z',
      },
      {
        family: 's1001',
        laneStatus: 'partial',
        sourceUrl: 'http://static.anaf.ro/static/10/Anaf/Declaratii_R/S1001/Lista%20finala%20a%20IP%20care%20aplica%20OMFP%202873%20si%202874%20%2026%20august%202026%20.pdf',
        observedAt: '2026-10-06T17:29:46.914000Z',
        sourceLastModifiedAt: null,
      },
      { family: 'json_apt', laneStatus: 'partial', sourceUrl: 'https://amepip.gov.ro/anunturi-de-selectie/', observedAt: '2026-10-06T17:40:39.472000Z', sourceLastModifiedAt: null },
    ],
    members: { anchors: 32, current: 30, historical: 2 },
    control: {
      central: 10,
      local: 18,
      noS1001: 2,
      s1001Authorities: 8,
      s1001AuthoritiesWithBudget: 7,
      disagreements: 1,
      kinds: [
        { kind: 'commune', level: 'local', enterprises: 8 },
        { kind: 'public_entity', level: 'central', enterprises: 6 },
        { kind: 'municipality', level: 'local', enterprises: 6 },
        { kind: 'central_authority', level: 'central', enterprises: 4 },
        { kind: 'county', level: 'local', enterprises: 3 },
        { kind: 'unresolved', level: 'local', enterprises: 1 },
      ],
      ranking: {
        central: [
          { cui: '11795573', name: 'AUTORITATEA PENTRU ADMINISTRAREA ACTIVELOR STATULUI', nameSource: 's1001', level: 'central', county: 'MUNICIPIUL BUCUREȘTI', hasBudget: true, enterprises: 6, inactive: 5 },
          { cui: '43507695', name: 'MINISTERUL ENERGIEI', nameSource: 's1001', level: 'central', county: 'MUNICIPIUL BUCUREȘTI', hasBudget: true, enterprises: 4, inactive: 0 },
        ],
        county: [
          { cui: '4288110', name: 'CONSILIUL JUDETEAN CLUJ', nameSource: 's1001', level: 'local', county: 'CLUJ', hasBudget: true, enterprises: 2, inactive: 0 },
          { cui: '2540929', name: 'CONSILIUL JUDETEAN VALCEA', nameSource: 's1001', level: 'local', county: 'VÂLCEA', hasBudget: true, enterprises: 1, inactive: 1 },
        ],
        local: [
          { cui: '4267117', name: 'CONSILIUL GENERAL AL MUNICIPIULUI BUCURESTI', nameSource: 's1001', level: 'local', county: 'MUNICIPIUL BUCUREȘTI', hasBudget: true, enterprises: 6, inactive: 0 },
          { cui: '4283481', name: 'CONSILIUL LOCAL VOLUNTARI', nameSource: 's1001', level: 'local', county: 'ILFOV', hasBudget: true, enterprises: 4, inactive: 0 },
          { cui: '15591479', name: null, nameSource: null, level: 'local', county: null, hasBudget: false, enterprises: 1, inactive: 0 },
        ],
      },
    },
    status: {
      s1001: [
        { status: 'ACTIV', enterprises: 24 },
        { status: 'INACTIV', enterprises: 4 },
      ],
      s1001NotListed: 2,
      onrc: [
        { status: 'funcțiune', enterprises: 17 },
        { status: null, enterprises: 6 },
        { status: 'radiată', enterprises: 2 },
        { status: 'dizolvare', enterprises: 1 },
        { status: 'lichidare', enterprises: 1 },
        { status: 'faliment', enterprises: 1 },
        { status: '1083', enterprises: 1 },
      ],
      onrcMissing: 1,
      anafInactive: 5,
      crossings: { radiatedButS1001Active: 1, fiscallyInactiveButS1001Active: 3 },
      amepip: [
        { status: 'funcţiune', enterprises: 16 },
        { status: 'este sub incidenţa Legii nr. 85/2014, insolvenţă', enterprises: 2 },
      ],
      amepipMissing: 12,
    },
    counties: [
      { county: 'București', total: 12, central: 8, local: 4, none: 0 },
      { county: 'Cluj', total: 7, central: 1, local: 5, none: 1 },
      { county: 'Timiş', total: 6, central: 0, local: 6, none: 0 },
      { county: 'Ilfov', total: 4, central: 1, local: 3, none: 0 },
      { county: null, total: 1, central: 0, local: 0, none: 1 },
    ],
    sectors: [
      { division: '36', total: 9, central: 0, local: 9, none: 0 },
      { division: '35', total: 7, central: 5, local: 2, none: 0 },
      { division: '81', total: 6, central: 0, local: 5, none: 1 },
      { division: '49', total: 5, central: 3, local: 2, none: 0 },
      { division: '02', total: 2, central: 2, local: 0, none: 0 },
      { division: null, total: 1, central: 0, local: 0, none: 1 },
    ],
    financials: {
      year: 2024,
      filed: 26,
      publishers: ['anaf'],
      nextYearFiled: 21,
      netReported: 25,
      loss: 8,
      implausibleEmployees: [{ cui: '25252500', name: 'COMPANIA DE ASIGURARI-REASIGURARI EXIM ROMANIA (CARE-ROMANIA) SA', employees: '92149177' }],
      largest: {
        turnover: [
          { cui: '13267213', name: 'SOCIETATEA DE PRODUCERE A ENERGIEI ELECTRICE IN HIDROCENTRALE  HIDROELECTRICA S.A.', value: '9659879145', authority: 'MINISTERUL ENERGIEI', authorityNameSource: 's1001' },
          { cui: '14056826', name: 'SOCIETATEA NATIONALA DE GAZE NATURALE  ROMGAZ  SA', value: '7531970469', authority: 'MINISTERUL ENERGIEI', authorityNameSource: 's1001' },
        ],
        employees: [
          { cui: '11054529', name: 'COMPANIA NATIONALA DE CAI FERATE CFR SA', value: '24493', authority: 'MINISTERUL TRANSPORTURILOR SI INFRASTRUCTURII', authorityNameSource: 's1001' },
          { cui: '199230', name: 'COMPANIA DE APA SOMES SA', value: '1866', authority: 'ASOCIATIA REGIONALA PENTRU DEZVOLTAREA INFRASTRUCTURII DIN BAZINUL HIDROGRAFIC SOMES-TISA', authorityNameSource: 'json_apt' },
        ],
        loss: [{ cui: '11653560', name: 'COMPANIA NATIONALA UNIFARM SA', value: '354232258', authority: null, authorityNameSource: null }],
      },
    },
    procurement: { from: '2019-01', to: '2026-12', buyers: 14, buyerDirect: 13, buyerAwards: 9, sellers: 15, unknown: 0 },
    ...overrides,
  }
}
