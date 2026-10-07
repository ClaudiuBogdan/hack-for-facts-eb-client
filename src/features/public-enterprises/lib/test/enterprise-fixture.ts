import type {
  PublicEnterpriseAuthorityRead,
  PublicEnterpriseIndicator,
  PublicEnterpriseProfile,
  PublicEnterpriseRead,
} from '@/schemas/public-enterprise-profile'

/**
 * One enterprise's read for the tests, shaped on Tursib (789401) as the dev
 * API served it on 2026-10-07: ANAF's list and AMEPIP's announcements name
 * different authorities, AMEPIP has six years in business, a calculated
 * sheet for 2019–2024 and a form for 2023–2024 whose earlier years carry only
 * the three trap KPIs. Values are trimmed to what the tests read.
 */

const S1001_URL =
  'http://static.anaf.ro/static/10/Anaf/Declaratii_R/S1001/Lista%20finala%20a%20IP%20care%20aplica%20OMFP%202873%20si%202874%20%2026%20august%202026%20.pdf'

export function indicatorCell(overrides: Partial<PublicEnterpriseIndicator>): PublicEnterpriseIndicator {
  return {
    year: 2024,
    sourceSheet: 'Indicatori formular',
    version: '1',
    indicatorKey: 'key',
    kpiCode: 'GC_MEET',
    indicatorName: 'Numărul ședințelor consiliului de administrație',
    measureUnit: 'nr.',
    valueKind: 'number',
    rawValue: '15',
    numericValue: '15',
    booleanValue: null,
    ...overrides,
  }
}

const number = (sheet: 'Indicatori calculati' | 'Indicatori formular', code: string, name: string, unit: string, year: number, value: string) =>
  indicatorCell({ sourceSheet: sheet, version: sheet === 'Indicatori formular' ? '1' : '', indicatorKey: `${code}-${year}`, kpiCode: code, indicatorName: name, measureUnit: unit, year, rawValue: value, numericValue: value })

const empty = (code: string, name: string, unit: string, year: number) =>
  indicatorCell({ indicatorKey: `${code}-${year}`, kpiCode: code, indicatorName: name, measureUnit: unit, year, valueKind: 'empty', rawValue: null, numericValue: null })

export const TURSIB_INDICATORS: readonly PublicEnterpriseIndicator[] = [
  number('Indicatori calculati', 'FIN-MNP', 'Marja netă a profitului', '%', 2023, '0.0002'),
  number('Indicatori calculati', 'FIN-MNP', 'Marja netă a profitului', '%', 2024, '0.0113'),
  number('Indicatori calculati', 'FIN-ROE', 'Rentabilitatea capitalului propriu (ROE)', '%', 2024, '0.008'),
  number('Indicatori calculati', 'MS', 'Cota de piață', '%', 2024, '0.0142'),
  number('Indicatori calculati', 'FIN-RLC', 'Rata lichiditatii curente', 'nr.', 2024, '2.9858'),
  number('Indicatori formular', 'FIN-DP', 'Rata dividendelor platite', '%', 2021, '0'),
  number('Indicatori formular', 'FIN-RCC', 'Rata cheltuielilor de capital', '%', 2022, '0.03'),
  empty('GC_MEET', 'Numărul ședințelor consiliului de administrație', 'nr.', 2022),
  number('Indicatori formular', 'GC_MEET', 'Numărul ședințelor consiliului de administrație', 'nr.', 2023, '9'),
  number('Indicatori formular', 'GC_MEET', 'Numărul ședințelor consiliului de administrație', 'nr.', 2024, '15'),
  number('Indicatori formular', 'FIN-DP', 'Rata dividendelor platite', '%', 2023, '0.5'),
  number('Indicatori formular', 'FIN-DP', 'Rata dividendelor platite', '%', 2024, '50'),
  number('Indicatori formular', 'GC_BEN', 'Valoarea totală a pachetului de remunerare', 'LEI', 2024, '42196'),
  number('Indicatori formular', 'W_TE', 'Număr de angajați cu echivalent normă întreagă', 'nr.', 2024, '362'),
  empty('GC_IND', 'Rata membrilor independenți în consiliul de administrație', '%', 2024),
]

export const TURSIB_PROFILE: PublicEnterpriseProfile = {
  cui: '789401',
  isCurrentMember: true,
  currentFamilies: ['amepip_company_year', 'amepip_form_group', 'json_apt', 's1001'],
  organization: { name: 'TURSIB SA' },
  registryObservations: [
    ...[2019, 2020, 2021, 2022, 2023, 2024].map((year) => ({ sourceFamily: 'amepip_company_year', observedYear: year, statusRaw: 'funcţiune', sourceUrl: null })),
    { sourceFamily: 's1001', observedYear: null, statusRaw: 'ACTIV', sourceUrl: S1001_URL },
    { sourceFamily: 'json_apt', observedYear: null, statusRaw: null, sourceUrl: null },
  ],
  authorityEdges: [
    { sourceFamily: 'json_apt', authorityCui: '45699112', authorityName: 'ASOCIATIA DE DEZVOLTARE INTERCOMUNITARA TRANSPORT METROPOLITAN SIBIU', authorityLevel: 'unknown', enterpriseStatusRaw: null },
    { sourceFamily: 's1001', authorityCui: '4270740', authorityName: 'CONSILIUL LOCAL SIBIU', authorityLevel: 'local', enterpriseStatusRaw: 'ACTIV' },
  ],
  sources: [
    { family: 'amepip', laneStatus: 'available', observedAt: '2026-06-18T00:00:00Z', sourceLastModifiedAt: '2026-01-13T10:00:00Z', sourceUrl: null },
    { family: 's1001', laneStatus: 'partial', observedAt: '2026-10-06T00:00:00Z', sourceLastModifiedAt: null, sourceUrl: S1001_URL },
    { family: 'json_apt', laneStatus: 'partial', observedAt: '2026-10-06T00:00:00Z', sourceLastModifiedAt: null, sourceUrl: null },
  ],
}

export const TURSIB_AUTHORITIES: Readonly<Record<string, PublicEnterpriseAuthorityRead>> = {
  '4270740': {
    entity: { organization: { name: 'MUNICIPIUL SIBIU' }, territory: { kind: 'municipality' }, reference: { entityType: 'uat' }, budget: { presence: true } },
    peers: {
      total: 4,
      items: [
        { cui: '789401', organization: { name: 'TURSIB SA' } },
        { cui: '2684932', organization: { name: 'URBANA SA' } },
        { cui: '3097146', organization: { name: 'DRUMURI ŞI PRESTĂRI CONSTRUCŢII SA' } },
        { cui: '3097148', organization: { name: 'PIEŢE SIBIU SA' } },
      ],
    },
  },
  '45699112': {
    entity: { organization: { name: '45699112' }, territory: null, reference: null, budget: { presence: false } },
    peers: { total: 1, items: [{ cui: '789401', organization: { name: 'TURSIB SA' } }] },
  },
}

export function enterpriseReadFixture(overrides: Partial<PublicEnterpriseRead> = {}): PublicEnterpriseRead {
  return { cui: '789401', profile: TURSIB_PROFILE, indicators: TURSIB_INDICATORS, authorities: TURSIB_AUTHORITIES, partial: false, ...overrides }
}
