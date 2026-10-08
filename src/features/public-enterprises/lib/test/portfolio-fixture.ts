import type { AuthorityPortfolio, PortfolioSnapshot } from '@/schemas/public-enterprise-portfolio'

/**
 * Three authorities of the portfolio snapshot as the generator wrote them on
 * 2026-10-07 (from the dev API), for the tests: Consiliul Local Sibiu
 * (4 in ANAF's list; the announcements name another authority for Tursib),
 * ADI Transport Metropolitan Sibiu (named only by the announcements, for
 * Tursib) and Consiliul Judetean Hunedoara (3 in the list, 2 more only in the
 * announcements, one with no statement since 2017).
 */
export const PORTFOLIO_FIXTURE: PortfolioSnapshot = {
  generatedAt: '2026-10-07T16:47:56.800Z',
  financialYear: 2024,
  seapSpan: {
    from: '2019-01',
    to: '2026-12',
  },
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
    {
      family: 'json_apt',
      laneStatus: 'partial',
      sourceUrl: 'https://amepip.gov.ro/anunturi-de-selectie/',
      observedAt: '2026-10-06T17:40:39.472000Z',
      sourceLastModifiedAt: null,
    },
  ],
  authorities: {
    '4270740': {
      cui: '4270740',
      name: 'CONSILIUL LOCAL SIBIU',
      nameSource: 's1001',
      spellings: {
        s1001: ['CONSILIUL LOCAL SIBIU'],
        json_apt: ['CONSILIUL LOCAL SIBIU'],
      },
      budgetName: 'MUNICIPIUL SIBIU',
      level: 'local',
      kind: 'municipality',
      county: 'SIBIU',
      hasBudget: true,
      s1001: ['2684932', '27249764', '3097146', '789401'],
      jsonApt: ['2684932', '27249764'],
    },
    '4374474': {
      cui: '4374474',
      name: 'CONSILIUL JUDETEAN HUNEDOARA',
      nameSource: 's1001',
      spellings: {
        s1001: ['CONSILIUL JUDETEAN HUNEDOARA'],
        json_apt: ['CONSILIUL JUDETEAN HUNEDOARA'],
      },
      budgetName: 'JUDETUL HUNEDOARA',
      level: 'local',
      kind: 'county',
      county: 'HUNEDOARA',
      hasBudget: true,
      s1001: ['2112140', '35332932', '43119855'],
      jsonApt: ['14071095', '7392416'],
    },
    '45699112': {
      cui: '45699112',
      name: 'ASOCIATIA DE DEZVOLTARE INTERCOMUNITARA TRANSPORT METROPOLITAN SIBIU',
      nameSource: 'json_apt',
      spellings: {
        s1001: [],
        json_apt: ['ASOCIATIA DE DEZVOLTARE INTERCOMUNITARA TRANSPORT METROPOLITAN SIBIU'],
      },
      budgetName: null,
      level: null,
      kind: 'unresolved',
      county: null,
      hasBudget: false,
      s1001: [],
      jsonApt: ['789401'],
    },
  },
  enterprises: {
    '789401': {
      cui: '789401',
      name: 'TURSIB SA',
      legalForm: 'SA',
      county: 'Sibiu',
      caen: '4931',
      s1001: {
        status: 'ACTIV',
      },
      amepip: {
        year: 2024,
        status: 'funcţiune',
      },
      registry: {
        code: '1048',
        label: 'funcțiune',
      },
      fiscallyInactive: false,
      edges: [
        {
          source: 'json_apt',
          cui: '45699112',
          name: 'ASOCIATIA DE DEZVOLTARE INTERCOMUNITARA TRANSPORT METROPOLITAN SIBIU',
        },
        {
          source: 's1001',
          cui: '4270740',
          name: 'CONSILIUL LOCAL SIBIU',
        },
      ],
      financials: {
        filed: true,
        turnover: '76661876',
        employees: '363',
        implausibleEmployees: null,
        net: '869872',
        newestYear: 2025,
        statuses: {
          turnover: 'reported',
          employees: 'reported',
          net: 'reported',
        },
      },
      seap: {
        buyerDirect: 12084,
        buyerAwards: 72,
        supplierDirect: 28,
      },
    },
    '2112140': {
      cui: '2112140',
      name: 'DRUMURI ŞI PODURI SA',
      legalForm: 'SA',
      county: 'Hunedoara',
      caen: '4211',
      s1001: {
        status: 'INACTIV',
      },
      amepip: null,
      registry: {
        code: null,
        label: null,
      },
      fiscallyInactive: true,
      edges: [
        {
          source: 's1001',
          cui: '4374474',
          name: 'CONSILIUL JUDETEAN HUNEDOARA',
        },
      ],
      financials: {
        filed: false,
        turnover: null,
        employees: null,
        implausibleEmployees: null,
        net: null,
        newestYear: 2017,
        statuses: {
          turnover: null,
          employees: null,
          net: null,
        },
      },
      seap: {
        buyerDirect: 0,
        buyerAwards: 0,
        supplierDirect: 0,
      },
    },
    '2684932': {
      cui: '2684932',
      name: 'URBANA SA',
      legalForm: 'SA',
      county: 'Sibiu',
      caen: '6820',
      s1001: {
        status: 'ACTIV',
      },
      amepip: {
        year: 2024,
        status: 'funcţiune',
      },
      registry: {
        code: null,
        label: null,
      },
      fiscallyInactive: false,
      edges: [
        {
          source: 'json_apt',
          cui: '4270740',
          name: 'CONSILIUL LOCAL SIBIU',
        },
        {
          source: 's1001',
          cui: '4270740',
          name: 'CONSILIUL LOCAL SIBIU',
        },
      ],
      financials: {
        filed: true,
        turnover: '6902979',
        employees: '21',
        implausibleEmployees: null,
        net: '348447',
        newestYear: 2025,
        statuses: {
          turnover: 'reported',
          employees: 'reported',
          net: 'reported',
        },
      },
      seap: {
        buyerDirect: 75,
        buyerAwards: 2,
        supplierDirect: 0,
      },
    },
    '3097146': {
      cui: '3097146',
      name: 'DRUMURI ŞI PRESTĂRI CONSTRUCŢII SA',
      legalForm: 'SA',
      county: 'Sibiu',
      caen: '4211',
      s1001: {
        status: 'INACTIV',
      },
      amepip: null,
      registry: {
        code: null,
        label: null,
      },
      fiscallyInactive: false,
      edges: [
        {
          source: 's1001',
          cui: '4270740',
          name: 'CONSILIUL LOCAL SIBIU',
        },
      ],
      financials: {
        filed: true,
        turnover: '120760',
        employees: '3',
        implausibleEmployees: null,
        net: '-234872',
        newestYear: 2025,
        statuses: {
          turnover: 'reported',
          employees: 'reported',
          net: 'reported',
        },
      },
      seap: {
        buyerDirect: 0,
        buyerAwards: 0,
        supplierDirect: 0,
      },
    },
    '7392416': {
      cui: '7392416',
      name: 'APA SERV VALEA JIULUI SA',
      legalForm: 'SA',
      county: 'Hunedoara',
      caen: '3600',
      s1001: {
        status: 'ACTIV',
      },
      amepip: {
        year: 2024,
        status: 'funcţiune',
      },
      registry: {
        code: '1048',
        label: 'funcțiune',
      },
      fiscallyInactive: false,
      edges: [
        {
          source: 'json_apt',
          cui: '4374474',
          name: 'CONSILIUL JUDETEAN HUNEDOARA',
        },
        {
          source: 's1001',
          cui: '24585158',
          name: 'ASOCIAŢIA DE DEZVOLTARE INTERCOMUNITARĂ "APA VALEA JIULUI"',
        },
      ],
      financials: {
        filed: true,
        turnover: '35401029',
        employees: '396',
        implausibleEmployees: null,
        net: '395308',
        newestYear: 2025,
        statuses: {
          turnover: 'reported',
          employees: 'reported',
          net: 'reported',
        },
      },
      seap: {
        buyerDirect: 6979,
        buyerAwards: 60,
        supplierDirect: 70,
      },
    },
    '14071095': {
      cui: '14071095',
      name: 'APA PROD SA',
      legalForm: 'SA',
      county: 'Hunedoara',
      caen: '3600',
      s1001: {
        status: 'ACTIV',
      },
      amepip: {
        year: 2024,
        status: 'funcţiune',
      },
      registry: {
        code: '1048',
        label: 'funcțiune',
      },
      fiscallyInactive: false,
      edges: [
        {
          source: 'json_apt',
          cui: '4374474',
          name: 'CONSILIUL JUDETEAN HUNEDOARA',
        },
        {
          source: 's1001',
          cui: '24669224',
          name: 'ASOCIAŢIA DE DEZVOLTARE INTERCOMUNITARĂ "AQUA PREST HUNEDOARA"',
        },
      ],
      financials: {
        filed: true,
        turnover: '114168027',
        employees: '826',
        implausibleEmployees: null,
        net: '17364019',
        newestYear: 2025,
        statuses: {
          turnover: 'reported',
          employees: 'reported',
          net: 'reported',
        },
      },
      seap: {
        buyerDirect: 43,
        buyerAwards: 22,
        supplierDirect: 115,
      },
    },
    '27249764': {
      cui: '27249764',
      name: 'PIEŢE SIBIU SA',
      legalForm: 'SA',
      county: 'Sibiu',
      caen: '6832',
      s1001: {
        status: 'ACTIV',
      },
      amepip: {
        year: 2024,
        status: 'funcţiune',
      },
      registry: {
        code: '1048',
        label: 'funcțiune',
      },
      fiscallyInactive: false,
      edges: [
        {
          source: 'json_apt',
          cui: '4270740',
          name: 'CONSILIUL LOCAL SIBIU',
        },
        {
          source: 's1001',
          cui: '4270740',
          name: 'CONSILIUL LOCAL SIBIU',
        },
      ],
      financials: {
        filed: true,
        turnover: '7779244',
        employees: '61',
        implausibleEmployees: null,
        net: '644805',
        newestYear: 2025,
        statuses: {
          turnover: 'reported',
          employees: 'reported',
          net: 'reported',
        },
      },
      seap: {
        buyerDirect: 1343,
        buyerAwards: 7,
        supplierDirect: 24,
      },
    },
    '35332932': {
      cui: '35332932',
      name: 'PARC INDUSTRIAL CĂLAN S.R.L.',
      legalForm: 'SRL',
      county: 'Hunedoara',
      caen: '6832',
      s1001: {
        status: 'ACTIV',
      },
      amepip: {
        year: 2024,
        status: 'funcţiune',
      },
      registry: {
        code: '1048',
        label: 'funcțiune',
      },
      fiscallyInactive: false,
      edges: [
        {
          source: 's1001',
          cui: '4374474',
          name: 'CONSILIUL JUDETEAN HUNEDOARA',
        },
      ],
      financials: {
        filed: true,
        turnover: '676392',
        employees: '5',
        implausibleEmployees: null,
        net: '189980',
        newestYear: 2025,
        statuses: {
          turnover: 'reported',
          employees: 'reported',
          net: 'reported',
        },
      },
      seap: {
        buyerDirect: 0,
        buyerAwards: 0,
        supplierDirect: 0,
      },
    },
    '43119855': {
      cui: '43119855',
      name: 'SOCIETATEA DE TRANSPORT PUBLIC ZONAL GREENLINE VALEA JIULUI S.R.L.',
      legalForm: 'SRL',
      county: 'Hunedoara',
      caen: '4931',
      s1001: {
        status: 'ACTIV',
      },
      amepip: {
        year: 2024,
        status: 'funcţiune',
      },
      registry: {
        code: '1048',
        label: 'funcțiune',
      },
      fiscallyInactive: false,
      edges: [
        {
          source: 'json_apt',
          cui: '39784566',
          name: 'ASOCIATIA DE DEZVOLTARE INTERCOMUNITARA PENTRU TRANSPORT PUBLIC ZONAL "GREEN LINE-VALEA JIULUI"',
        },
        {
          source: 's1001',
          cui: '4374474',
          name: 'CONSILIUL JUDETEAN HUNEDOARA',
        },
      ],
      financials: {
        filed: true,
        turnover: '0',
        employees: '0',
        implausibleEmployees: null,
        net: '-1004',
        newestYear: 2025,
        statuses: {
          turnover: 'reported',
          employees: 'reported',
          net: 'reported',
        },
      },
      seap: {
        buyerDirect: 58,
        buyerAwards: 0,
        supplierDirect: 0,
      },
    },
  },
}

export type FixtureAuthority = '4270740' | '45699112' | '4374474'

/** One authority's part, as the server read cuts it: ANAF's list's enterprises first, then those only the announcements name. */
export function portfolioFixture(cui: FixtureAuthority, overrides: Partial<AuthorityPortfolio> = {}): AuthorityPortfolio {
  const authority = PORTFOLIO_FIXTURE.authorities[cui]!
  const listed = new Set(authority.s1001)
  const order = [...authority.s1001, ...authority.jsonApt.filter((member) => !listed.has(member))]
  const { generatedAt, financialYear, seapSpan, sources } = PORTFOLIO_FIXTURE
  return { generatedAt, financialYear, seapSpan, sources, authority, enterprises: order.map((member) => PORTFOLIO_FIXTURE.enterprises[member]!), ...overrides }
}
