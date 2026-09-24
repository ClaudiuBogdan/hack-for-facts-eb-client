import type { PrivateCompanyProfile } from '@/schemas/private-company'

/**
 * Real companies, read from the dev Chronos API on 24 September 2026 through the app's own live
 * fetchers — `fetchPrivateCompanyProfileLive` and the procurement supplier slice — and frozen here,
 * so the prototype renders without the API. Chosen to disagree with each other, so that no layout
 * can lean on one company's shape:
 *
 * - `omv-petrom`: OMV PETROM SA (CUI 1590082), funcțiune
 * - `abc-con`: ABC-CON-INTERNAŢIONAL SRL (CUI 23617561), insolvență
 * - `profi`: PROFI ROM FOOD SRL (CUI 11607939), radiată
 * - `jack`: 66 JACK SRL (CUI 22202108), funcțiune
 * - `ideatica`: A & B IDEATICA S.R.L. (CUI 47387800), funcțiune
 *
 * The procurement read is trimmed to what the layouts draw (top institutions, categories, recent
 * records); the profile's `publicMoney` reaches further back than SEAP and agrees with it where
 * both cover a year.
 */

export interface ProcurementAuthorityRow {
  readonly cui: string
  /** Null when the source published the institution without a name. */
  readonly name: string | null
  readonly amountRon: number | null
  readonly count: number
  /** Records in the row with no published value. */
  readonly amountMissing: number
  readonly share: number | null
}

export interface ProcurementCategoryRow {
  readonly code: string | null
  readonly labelRo: string | null
  readonly labelEn: string | null
  readonly amountRon: number | null
  readonly count: number
  readonly share: number | null
}

export interface ProcurementGrainStats {
  readonly count: number
  readonly withValue: number
  readonly awardedRon: number | null
  readonly firstMonth: string | null
  readonly lastMonth: string | null
  /** `served`, or `degraded` when the published values cover too little of the records to sum. */
  readonly answerability: string | null
}

export interface ProcurementRecordRow {
  readonly id: string
  readonly grain: 'contract' | 'direct_acquisition'
  readonly title: string
  readonly authority: { readonly cui: string; readonly name: string | null }
  readonly valueRon: number | null
  readonly date: string | null
  readonly cpvDivision: string | null
}

export interface CompanyProcurementRead {
  readonly window: { readonly from: string | null; readonly to: string | null }
  readonly contracts: ProcurementGrainStats
  readonly directAcquisitions: ProcurementGrainStats
  readonly topAuthorities: { readonly contract: readonly ProcurementAuthorityRow[]; readonly directAcquisition: readonly ProcurementAuthorityRow[] }
  readonly topCategories: { readonly contract: readonly ProcurementCategoryRow[]; readonly directAcquisition: readonly ProcurementCategoryRow[] }
  readonly recent: readonly ProcurementRecordRow[]
}

export interface CompanyFixture {
  readonly profile: PrivateCompanyProfile
  readonly procurement: CompanyProcurementRead
}

export const COMPANY_FIXTURE_KEYS = ['omv-petrom', 'abc-con', 'profi', 'jack', 'ideatica'] as const
export type CompanyFixtureKey = (typeof COMPANY_FIXTURE_KEYS)[number]

export const COMPANY_FIXTURES: Record<CompanyFixtureKey, CompanyFixture> = {
  'omv-petrom': {
    profile: {
  "organizationId": "org:404874",
  "cui": "1590082",
  "codInmatriculare": "J1997008302407",
  "legalName": "OMV PETROM SA",
  "legalForm": "SA",
  "registrationDate": "1997-10-23",
  "status": {
    "code": "1048",
    "label": "funcțiune"
  },
  "address": {
    "display": "",
    "county": "Bucureşti",
    "locality": "Bucureşti Sectorul 1"
  },
  "geography": {
    "uatSirutaCode": "179141",
    "uatName": "Bucureşti Sectorul 1",
    "countyName": "Bucureşti",
    "matchConfidence": "safe"
  },
  "caenActivities": [
    {
      "code": "0161",
      "rev": "rev3",
      "label": "Activități auxiliare pentru producția vegetală",
      "source": "onrc"
    },
    {
      "code": "0610",
      "rev": "rev2",
      "label": "Extracția petrolului brut",
      "source": "onrc"
    },
    {
      "code": "0610",
      "rev": null,
      "label": null,
      "source": "anaf"
    },
    {
      "code": "0610",
      "rev": "rev3",
      "label": "Extracția petrolului brut",
      "source": "onrc"
    },
    {
      "code": "0620",
      "rev": "rev2",
      "label": "Extracția gazelor naturale",
      "source": "onrc"
    },
    {
      "code": "0620",
      "rev": "rev3",
      "label": "Extracția gazelor naturale",
      "source": "onrc"
    },
    {
      "code": "0899",
      "rev": "rev3",
      "label": "Alte activități extractive n.c.a.",
      "source": "onrc"
    },
    {
      "code": "0910",
      "rev": "rev3",
      "label": "Activități de servicii anexe extracției petrolului brut și gazelor naturale",
      "source": "onrc"
    },
    {
      "code": "0910",
      "rev": "rev2",
      "label": "Activități de servicii anexe extracției petrolului brut și gazelor naturale",
      "source": "onrc"
    },
    {
      "code": "0990",
      "rev": "rev3",
      "label": "Activități de servicii anexe pentru extracția mineralelor",
      "source": "onrc"
    },
    {
      "code": "1110",
      "rev": "rev1",
      "label": "Extracția hidrocarburilor",
      "source": "onrc"
    },
    {
      "code": "1120",
      "rev": "rev1",
      "label": "Activități de servicii anexe extracției petrolului și gazelor naturale, exclusiv prospecțiunile",
      "source": "onrc"
    },
    {
      "code": "1611",
      "rev": "rev3",
      "label": "Tăierea și rindeluirea lemnului",
      "source": "onrc"
    },
    {
      "code": "1612",
      "rev": "rev3",
      "label": "Prelucrarea și finisarea lemnului",
      "source": "onrc"
    },
    {
      "code": "1812",
      "rev": "rev3",
      "label": "Alte activități de tipărire n.c.a.",
      "source": "onrc"
    },
    {
      "code": "1812",
      "rev": "rev2",
      "label": "Alte activități de tipărire n.c.a.",
      "source": "onrc"
    },
    {
      "code": "1920",
      "rev": "rev3",
      "label": "Fabricarea produselor obținute din prelucrarea țițeiului",
      "source": "onrc"
    },
    {
      "code": "1920",
      "rev": "rev2",
      "label": "Fabricarea produselor obținute din prelucrarea țițeiului",
      "source": "onrc"
    },
    {
      "code": "2011",
      "rev": "rev2",
      "label": "Fabricarea gazelor industriale",
      "source": "onrc"
    },
    {
      "code": "2011",
      "rev": "rev3",
      "label": "Fabricarea gazelor industriale",
      "source": "onrc"
    },
    {
      "code": "2014",
      "rev": "rev3",
      "label": "Fabricarea altor produse chimice organice, de bază",
      "source": "onrc"
    },
    {
      "code": "2016",
      "rev": "rev3",
      "label": "Fabricarea materialelor plastice în forme primare",
      "source": "onrc"
    },
    {
      "code": "2059",
      "rev": "rev3",
      "label": "Fabricarea altor produse chimice n.c.a.",
      "source": "onrc"
    },
    {
      "code": "2320",
      "rev": "rev1",
      "label": "Fabricarea produselor obținute din prelucrarea țițeiului",
      "source": "onrc"
    },
    {
      "code": "2466",
      "rev": "rev1",
      "label": "Fabricarea altor produse chimice n.c.a.",
      "source": "onrc"
    },
    {
      "code": "2511",
      "rev": "rev3",
      "label": "Fabricarea de construcții metalice și părți componente ale structurilor metalice",
      "source": "onrc"
    },
    {
      "code": "2511",
      "rev": "rev2",
      "label": "Fabricarea de construcții metalice și părți componente ale structurilor metalice",
      "source": "onrc"
    },
    {
      "code": "2551",
      "rev": "rev3",
      "label": "Acoperirea metalelor",
      "source": "onrc"
    },
    {
      "code": "2552",
      "rev": "rev3",
      "label": "Tratamente termice ale metalelor",
      "source": "onrc"
    },
    {
      "code": "2553",
      "rev": "rev3",
      "label": "Operațiuni de mecanică generală",
      "source": "onrc"
    },
    {
      "code": "2562",
      "rev": "rev3",
      "label": "Fabricarea articolelor de feronerie",
      "source": "onrc"
    },
    {
      "code": "2562",
      "rev": "rev2",
      "label": "Operațiuni de mecanică generală",
      "source": "onrc"
    },
    {
      "code": "2591",
      "rev": "rev3",
      "label": "Fabricarea de recipienți, containere și alte produse similare din oțel",
      "source": "onrc"
    },
    {
      "code": "2594",
      "rev": "rev3",
      "label": "Fabricarea de șuruburi, buloane și alte articole filetate; fabricarea de nituri și șaibe",
      "source": "onrc"
    },
    {
      "code": "2594",
      "rev": "rev2",
      "label": "Fabricarea de șuruburi, buloane și alte articole filetate; fabricarea de nituri și șaibe",
      "source": "onrc"
    },
    {
      "code": "3311",
      "rev": "rev3",
      "label": "Repararea și întreținerea articolelor fabricate din metal",
      "source": "onrc"
    },
    {
      "code": "3311",
      "rev": "rev2",
      "label": "Repararea articolelor fabricate din metal",
      "source": "onrc"
    },
    {
      "code": "3312",
      "rev": "rev3",
      "label": "Repararea și întreținerea mașinilor",
      "source": "onrc"
    },
    {
      "code": "3312",
      "rev": "rev2",
      "label": "Repararea mașinilor",
      "source": "onrc"
    },
    {
      "code": "3313",
      "rev": "rev3",
      "label": "Repararea și întreținerea echipamentelor electronice și optice",
      "source": "onrc"
    },
    {
      "code": "3314",
      "rev": "rev2",
      "label": "Repararea echipamentelor electrice",
      "source": "onrc"
    },
    {
      "code": "3314",
      "rev": "rev3",
      "label": "Repararea și întreținerea echipamentelor electrice",
      "source": "onrc"
    },
    {
      "code": "3315",
      "rev": "rev3",
      "label": "Repararea și întreținerea navelor și bărcilor, civile",
      "source": "onrc"
    },
    {
      "code": "3317",
      "rev": "rev3",
      "label": "Repararea și întreținerea altor echipamente civile de transport n.c.a.",
      "source": "onrc"
    },
    {
      "code": "3319",
      "rev": "rev3",
      "label": "Repararea și întreținerea altor echipamente",
      "source": "onrc"
    },
    {
      "code": "3320",
      "rev": "rev3",
      "label": "Instalarea mașinilor și echipamentelor industriale",
      "source": "onrc"
    },
    {
      "code": "3511",
      "rev": "rev3",
      "label": "Producția de energie electrică din resurse neregenerabile",
      "source": "onrc"
    },
    {
      "code": "3511",
      "rev": "rev2",
      "label": "Producția de energie electrică",
      "source": "onrc"
    },
    {
      "code": "3512",
      "rev": "rev3",
      "label": "Producția de energie electrică din resurse regenerabile",
      "source": "onrc"
    },
    {
      "code": "3512",
      "rev": "rev2",
      "label": "Transportul energiei electrice",
      "source": "onrc"
    },
    {
      "code": "3513",
      "rev": "rev2",
      "label": "Distribuția energiei electrice",
      "source": "onrc"
    },
    {
      "code": "3513",
      "rev": "rev3",
      "label": "Transportul energiei electrice",
      "source": "onrc"
    },
    {
      "code": "3514",
      "rev": "rev3",
      "label": "Distribuția energiei electrice",
      "source": "onrc"
    },
    {
      "code": "3514",
      "rev": "rev2",
      "label": "Comercializarea energiei electrice",
      "source": "onrc"
    },
    {
      "code": "3515",
      "rev": "rev3",
      "label": "Comercializarea energiei electrice",
      "source": "onrc"
    },
    {
      "code": "3516",
      "rev": "rev3",
      "label": "Depozitarea energiei electrice",
      "source": "onrc"
    },
    {
      "code": "3521",
      "rev": "rev3",
      "label": "Producția gazelor",
      "source": "onrc"
    },
    {
      "code": "3522",
      "rev": "rev2",
      "label": "Distribuția combustibililor gazoși, prin conducte",
      "source": "onrc"
    },
    {
      "code": "3522",
      "rev": "rev3",
      "label": "Distribuția combustibililor gazoși, prin conducte",
      "source": "onrc"
    },
    {
      "code": "3523",
      "rev": "rev3",
      "label": "Comercializarea combustibililor gazoși, prin conducte",
      "source": "onrc"
    },
    {
      "code": "3523",
      "rev": "rev2",
      "label": "Comercializarea combustibililor gazoși, prin conducte",
      "source": "onrc"
    },
    {
      "code": "3530",
      "rev": "rev2",
      "label": "Furnizarea de abur și aer condiționat",
      "source": "onrc"
    },
    {
      "code": "3530",
      "rev": "rev3",
      "label": "Furnizarea de abur și aer condiționat",
      "source": "onrc"
    },
    {
      "code": "3540",
      "rev": "rev3",
      "label": "Activități ale agenților și brokerilor din domeniul energiei electrice și a gazelor naturale",
      "source": "onrc"
    },
    {
      "code": "3600",
      "rev": "rev3",
      "label": "Captarea, tratarea și distribuția apei",
      "source": "onrc"
    },
    {
      "code": "3600",
      "rev": "rev2",
      "label": "Captarea, tratarea și distribuția apei",
      "source": "onrc"
    },
    {
      "code": "3700",
      "rev": "rev2",
      "label": "Colectarea și epurarea apelor uzate",
      "source": "onrc"
    },
    {
      "code": "3700",
      "rev": "rev3",
      "label": "Colectarea și epurarea apelor uzate",
      "source": "onrc"
    },
    {
      "code": "3811",
      "rev": "rev2",
      "label": "Colectarea deșeurilor nepericuloase",
      "source": "onrc"
    },
    {
      "code": "3811",
      "rev": "rev3",
      "label": "Colectarea deșeurilor nepericuloase",
      "source": "onrc"
    },
    {
      "code": "3812",
      "rev": "rev2",
      "label": "Colectarea deșeurilor periculoase",
      "source": "onrc"
    },
    {
      "code": "3812",
      "rev": "rev3",
      "label": "Colectarea deșeurilor periculoase",
      "source": "onrc"
    },
    {
      "code": "3821",
      "rev": "rev2",
      "label": "Tratarea și eliminarea deșeurilor nepericuloase",
      "source": "onrc"
    },
    {
      "code": "3821",
      "rev": "rev3",
      "label": "Recuperarea materialelor reciclabile",
      "source": "onrc"
    },
    {
      "code": "3822",
      "rev": "rev2",
      "label": "Tratarea și eliminarea deșeurilor periculoase",
      "source": "onrc"
    },
    {
      "code": "3823",
      "rev": "rev3",
      "label": "Alte activități de tratare a deșeurilor",
      "source": "onrc"
    },
    {
      "code": "3832",
      "rev": "rev2",
      "label": "Recuperarea materialelor reciclabile sortate",
      "source": "onrc"
    },
    {
      "code": "3832",
      "rev": "rev3",
      "label": "Activități ale gropilor de gunoi sau a depozitelor permanente de deșeuri",
      "source": "onrc"
    },
    {
      "code": "3833",
      "rev": "rev3",
      "label": "Alte activități de eliminare a deșeurilor",
      "source": "onrc"
    },
    {
      "code": "3900",
      "rev": "rev2",
      "label": "Activități și servicii de decontaminare",
      "source": "onrc"
    },
    {
      "code": "3900",
      "rev": "rev3",
      "label": "Activități și servicii de decontaminare",
      "source": "onrc"
    },
    {
      "code": "4021",
      "rev": "rev1",
      "label": "Producția gazelor",
      "source": "onrc"
    },
    {
      "code": "4022",
      "rev": "rev1",
      "label": "Distribuția și comercializarea combustibililor gazoși, prin conducte",
      "source": "onrc"
    },
    {
      "code": "4100",
      "rev": "rev3",
      "label": "Lucrări de construcții ale clădirilor rezidențiale și nerezidențiale",
      "source": "onrc"
    },
    {
      "code": "4221",
      "rev": "rev2",
      "label": "Lucrări de construcții a proiectelor utilitare pentru fluide",
      "source": "onrc"
    },
    {
      "code": "4221",
      "rev": "rev3",
      "label": "Lucrări de construcții ale proiectelor utilitare pentru fluide",
      "source": "onrc"
    },
    {
      "code": "4222",
      "rev": "rev3",
      "label": "Lucrări de construcții ale proiectelor utilitare pentru electricitate și telecomunicații",
      "source": "onrc"
    },
    {
      "code": "4299",
      "rev": "rev3",
      "label": "Lucrări de construcții ale altor proiecte inginerești n.c.a",
      "source": "onrc"
    },
    {
      "code": "4311",
      "rev": "rev3",
      "label": "Lucrări de demolare a construcțiilor",
      "source": "onrc"
    },
    {
      "code": "4312",
      "rev": "rev3",
      "label": "Lucrări de pregătire a terenului",
      "source": "onrc"
    },
    {
      "code": "4313",
      "rev": "rev3",
      "label": "Lucrări de foraj și sondaj pentru construcții",
      "source": "onrc"
    },
    {
      "code": "4321",
      "rev": "rev2",
      "label": "Lucrări de instalații electrice",
      "source": "onrc"
    },
    {
      "code": "4321",
      "rev": "rev3",
      "label": "Lucrări de instalații electrice",
      "source": "onrc"
    },
    {
      "code": "4322",
      "rev": "rev3",
      "label": "Lucrări de instalații sanitare, de încălzire și de aer condiționat",
      "source": "onrc"
    },
    {
      "code": "4323",
      "rev": "rev3",
      "label": "Lucrări de izolații",
      "source": "onrc"
    },
    {
      "code": "4324",
      "rev": "rev3",
      "label": "Alte lucrări de instalații pentru construcții",
      "source": "onrc"
    },
    {
      "code": "4332",
      "rev": "rev3",
      "label": "Lucrări de tâmplărie și dulgherie",
      "source": "onrc"
    },
    {
      "code": "4335",
      "rev": "rev3",
      "label": "Alte lucrări de finisare",
      "source": "onrc"
    },
    {
      "code": "4341",
      "rev": "rev3",
      "label": "Lucrări de învelitori, șarpante și terase la construcții",
      "source": "onrc"
    },
    {
      "code": "4342",
      "rev": "rev3",
      "label": "Alte lucrări speciale de construcții pentru clădiri",
      "source": "onrc"
    },
    {
      "code": "4350",
      "rev": "rev3",
      "label": "Lucrări speciale de construcții pentru proiecte de geniu civil",
      "source": "onrc"
    },
    {
      "code": "4360",
      "rev": "rev3",
      "label": "Servicii de intermediere pentru lucrări speciale de construcții",
      "source": "onrc"
    },
    {
      "code": "4391",
      "rev": "rev3",
      "label": "Activități de zidărie",
      "source": "onrc"
    },
    {
      "code": "4399",
      "rev": "rev3",
      "label": "Alte lucrări speciale de construcții n.c.a.",
      "source": "onrc"
    },
    {
      "code": "4520",
      "rev": "rev2",
      "label": "Întreținerea și repararea autovehiculelor",
      "source": "onrc"
    },
    {
      "code": "4612",
      "rev": "rev3",
      "label": "Intermedieri în comerțul cu combustibili, minereuri, metale și produse chimice pentru industrie",
      "source": "onrc"
    },
    {
      "code": "4612",
      "rev": "rev2",
      "label": "Intermedieri în comerțul cu combustibili, minereuri, metale și produse chimice pentru industrie",
      "source": "onrc"
    },
    {
      "code": "4619",
      "rev": "rev3",
      "label": "Intermedieri în comerțul cu produse diverse",
      "source": "onrc"
    },
    {
      "code": "4619",
      "rev": "rev2",
      "label": "Intermedieri în comerțul cu produse diverse",
      "source": "onrc"
    },
    {
      "code": "4671",
      "rev": "rev2",
      "label": "Comerț cu ridicata al combustibililor solizi, lichizi și gazoși și al produselor derivate",
      "source": "onrc"
    },
    {
      "code": "4677",
      "rev": "rev2",
      "label": "Comerț cu ridicata al deșeurilor și resturilor",
      "source": "onrc"
    },
    {
      "code": "4681",
      "rev": "rev3",
      "label": "Comerț cu ridicata al combustibililor solizi, lichizi și gazoși și al produselor derivate",
      "source": "onrc"
    },
    {
      "code": "4682",
      "rev": "rev3",
      "label": "Comerț cu ridicata al metalelor și minereurilor metalice",
      "source": "onrc"
    },
    {
      "code": "4685",
      "rev": "rev3",
      "label": "Comerț cu ridicata al produselor chimice",
      "source": "onrc"
    },
    {
      "code": "4687",
      "rev": "rev3",
      "label": "Comerț cu ridicata al deșeurilor și resturilor",
      "source": "onrc"
    },
    {
      "code": "4711",
      "rev": "rev3",
      "label": "Comerț cu amănuntul nespecializat, cu vânzare predominantă de produse alimentare, băuturi și tutun",
      "source": "onrc"
    },
    {
      "code": "4712",
      "rev": "rev3",
      "label": "Comerț cu amănuntul nespecializat, cu vânzare predominantă de produse nealimentare",
      "source": "onrc"
    },
    {
      "code": "4730",
      "rev": "rev3",
      "label": "Comerț cu amănuntul al carburanților pentru autovehicule",
      "source": "onrc"
    },
    {
      "code": "4762",
      "rev": "rev3",
      "label": "Comerț cu amănuntul al ziarelor și articolelor de papetărie",
      "source": "onrc"
    },
    {
      "code": "4777",
      "rev": "rev3",
      "label": "Comerț cu amănuntul al ceasurilor și bijuteriilor",
      "source": "onrc"
    },
    {
      "code": "4778",
      "rev": "rev3",
      "label": "Comerț cu amănuntul al altor bunuri noi",
      "source": "onrc"
    },
    {
      "code": "4782",
      "rev": "rev3",
      "label": "Comerț cu amănuntul al pieselor și accesoriilor pentru autovehicule",
      "source": "onrc"
    },
    {
      "code": "4791",
      "rev": "rev3",
      "label": "Intermedieri în comerțul cu amănuntul nespecializat",
      "source": "onrc"
    },
    {
      "code": "4792",
      "rev": "rev3",
      "label": "Intermedieri în comerțul cu amănuntul specializat",
      "source": "onrc"
    },
    {
      "code": "4931",
      "rev": "rev2",
      "label": "Transporturi urbane, suburbane și metropolitane de călători",
      "source": "onrc"
    },
    {
      "code": "4939",
      "rev": "rev2",
      "label": "Alte transporturi terestre de călători n.c.a",
      "source": "onrc"
    },
    {
      "code": "4939",
      "rev": "rev3",
      "label": "Alte transporturi terestre de călători n.c.a.",
      "source": "onrc"
    },
    {
      "code": "4941",
      "rev": "rev2",
      "label": "Transporturi rutiere de mărfuri",
      "source": "onrc"
    },
    {
      "code": "4941",
      "rev": "rev3",
      "label": "Transporturi rutiere de mărfuri",
      "source": "onrc"
    },
    {
      "code": "4950",
      "rev": "rev3",
      "label": "Transporturi prin conducte",
      "source": "onrc"
    },
    {
      "code": "4950",
      "rev": "rev2",
      "label": "Transporturi prin conducte",
      "source": "onrc"
    },
    {
      "code": "5020",
      "rev": "rev3",
      "label": "Transporturi maritime și costiere de marfă",
      "source": "onrc"
    },
    {
      "code": "5040",
      "rev": "rev3",
      "label": "Transportul de marfă pe căi navigabile interioare",
      "source": "onrc"
    },
    {
      "code": "5050",
      "rev": "rev1",
      "label": "Comerț cu amanuntul al carburanților pentru autovehicule",
      "source": "onrc"
    },
    {
      "code": "5110",
      "rev": "rev3",
      "label": "Transporturi aeriene de pasageri",
      "source": "onrc"
    },
    {
      "code": "5121",
      "rev": "rev3",
      "label": "Transporturi aeriene de marfă",
      "source": "onrc"
    },
    {
      "code": "5151",
      "rev": "rev1",
      "label": "Comerț cu ridicata al combustibililor solizi, lichizi și gazoși și al produselor derivate",
      "source": "onrc"
    },
    {
      "code": "5155",
      "rev": "rev1",
      "label": "Comerț cu ridicata al produselor chimice",
      "source": "onrc"
    },
    {
      "code": "5210",
      "rev": "rev2",
      "label": "Depozitări",
      "source": "onrc"
    },
    {
      "code": "5210",
      "rev": "rev3",
      "label": "Depozitări",
      "source": "onrc"
    },
    {
      "code": "5221",
      "rev": "rev2",
      "label": "Activități de servicii anexe pentru transporturi terestre",
      "source": "onrc"
    },
    {
      "code": "5221",
      "rev": "rev3",
      "label": "Activități de servicii anexe pentru transporturi terestre",
      "source": "onrc"
    },
    {
      "code": "5222",
      "rev": "rev3",
      "label": "Activități de servicii anexe transporturilor pe apă",
      "source": "onrc"
    },
    {
      "code": "5223",
      "rev": "rev3",
      "label": "Activități de servicii anexe transporturilor aeriene",
      "source": "onrc"
    },
    {
      "code": "5224",
      "rev": "rev3",
      "label": "Manipulări",
      "source": "onrc"
    },
    {
      "code": "5224",
      "rev": "rev2",
      "label": "Manipulări",
      "source": "onrc"
    },
    {
      "code": "5225",
      "rev": "rev3",
      "label": "Activități de servicii logistice pentru transporturi",
      "source": "onrc"
    },
    {
      "code": "5226",
      "rev": "rev3",
      "label": "Alte activități anexe transporturilor",
      "source": "onrc"
    },
    {
      "code": "5229",
      "rev": "rev2",
      "label": "Alte activități anexe transporturilor",
      "source": "onrc"
    },
    {
      "code": "5590",
      "rev": "rev3",
      "label": "Alte servicii de cazare",
      "source": "onrc"
    },
    {
      "code": "5610",
      "rev": "rev2",
      "label": "Restaurante",
      "source": "onrc"
    },
    {
      "code": "5611",
      "rev": "rev3",
      "label": "Restaurante",
      "source": "onrc"
    },
    {
      "code": "5622",
      "rev": "rev3",
      "label": "Alte servicii de alimentație n.c.a.",
      "source": "onrc"
    },
    {
      "code": "5629",
      "rev": "rev2",
      "label": "Alte servicii de alimentație n.c.a.",
      "source": "onrc"
    },
    {
      "code": "6024",
      "rev": "rev1",
      "label": "Transporturi rutiere de mărfuri",
      "source": "onrc"
    },
    {
      "code": "6110",
      "rev": "rev2",
      "label": "Activități de telecomunicații prin rețele cu cablu",
      "source": "onrc"
    },
    {
      "code": "6110",
      "rev": "rev3",
      "label": "Activități de telecomunicații prin rețele cu cablu, prin rețele fără cablu și prin satelit",
      "source": "onrc"
    },
    {
      "code": "6190",
      "rev": "rev2",
      "label": "Alte activități de telecomunicații",
      "source": "onrc"
    },
    {
      "code": "6190",
      "rev": "rev3",
      "label": "Alte activități de telecomunicații",
      "source": "onrc"
    },
    {
      "code": "6210",
      "rev": "rev3",
      "label": "Activități de realizare a soft-ului la comandă (software orientat client)",
      "source": "onrc"
    },
    {
      "code": "6220",
      "rev": "rev3",
      "label": "Activități de consultanță în tehnologia informației și de management (gestiune și exploatare) a mijloacelor de calcul",
      "source": "onrc"
    },
    {
      "code": "6290",
      "rev": "rev3",
      "label": "Alte activități de servicii privind tehnologia informației",
      "source": "onrc"
    },
    {
      "code": "6310",
      "rev": "rev3",
      "label": "Prelucrarea datelor, administrarea paginilor web și activități conexe",
      "source": "onrc"
    },
    {
      "code": "6311",
      "rev": "rev2",
      "label": "Prelucrarea datelor, administrarea paginilor web și activități conexe",
      "source": "onrc"
    },
    {
      "code": "6312",
      "rev": "rev1",
      "label": "Depozitări",
      "source": "onrc"
    },
    {
      "code": "6391",
      "rev": "rev3",
      "label": "Activități ale portalurilor web",
      "source": "onrc"
    },
    {
      "code": "6392",
      "rev": "rev3",
      "label": "Alte activități de servicii informaționale n.c. a",
      "source": "onrc"
    },
    {
      "code": "6399",
      "rev": "rev2",
      "label": "Alte activități de servicii informaționale n.c.a.",
      "source": "onrc"
    },
    {
      "code": "6492",
      "rev": "rev2",
      "label": "Alte activități de creditare",
      "source": "onrc"
    },
    {
      "code": "6492",
      "rev": "rev3",
      "label": "Alte activități de creditare",
      "source": "onrc"
    },
    {
      "code": "6499",
      "rev": "rev2",
      "label": "Alte intermedieri financiare n.c.a.",
      "source": "onrc"
    },
    {
      "code": "6499",
      "rev": "rev3",
      "label": "Alte intermedieri financiare n.c.a., exceptând activități de asigurări și fonduri de pensii",
      "source": "onrc"
    },
    {
      "code": "6811",
      "rev": "rev3",
      "label": "Cumpărarea și vânzarea de bunuri imobiliare proprii",
      "source": "onrc"
    },
    {
      "code": "6820",
      "rev": "rev2",
      "label": "Închirierea și subînchirierea bunurilor imobiliare proprii sau închiriate",
      "source": "onrc"
    },
    {
      "code": "6820",
      "rev": "rev3",
      "label": "închirierea și subînchirierea bunurilor imobiliare proprii sau închiriate",
      "source": "onrc"
    },
    {
      "code": "6920",
      "rev": "rev2",
      "label": "Activități de contabilitate și audit financiar; consultanță în domeniul fiscal",
      "source": "onrc"
    },
    {
      "code": "6920",
      "rev": "rev3",
      "label": "Activități de contabilitate și audit financiar; consultanță în domeniul fiscal",
      "source": "onrc"
    },
    {
      "code": "7020",
      "rev": "rev3",
      "label": "Activități de consultanță în afaceri și management",
      "source": "onrc"
    },
    {
      "code": "7020",
      "rev": "rev1",
      "label": "Închirierea și subînchirierea bunurilor imobiliare proprii sau închiriate",
      "source": "onrc"
    },
    {
      "code": "7110",
      "rev": "rev1",
      "label": "Închirierea autoturismelor și utilitarelor de capacitate mică",
      "source": "onrc"
    },
    {
      "code": "7112",
      "rev": "rev2",
      "label": "Activități de inginerie și consultanță tehnică legate de acestea",
      "source": "onrc"
    },
    {
      "code": "7112",
      "rev": "rev3",
      "label": "Activități de inginerie și consultanță tehnică legate de acestea",
      "source": "onrc"
    },
    {
      "code": "7120",
      "rev": "rev3",
      "label": "Activități de testări și analize tehnice",
      "source": "onrc"
    },
    {
      "code": "7120",
      "rev": "rev2",
      "label": "Activități de testări și analize tehnice",
      "source": "onrc"
    },
    {
      "code": "7121",
      "rev": "rev1",
      "label": "Închirierea altor mijloace de transport terestru",
      "source": "onrc"
    },
    {
      "code": "7210",
      "rev": "rev3",
      "label": "Cercetare-dezvoltare în științe naturale și inginerie",
      "source": "onrc"
    },
    {
      "code": "7219",
      "rev": "rev2",
      "label": "Cercetare- dezvoltare în alte științe naturale și inginerie",
      "source": "onrc"
    },
    {
      "code": "7310",
      "rev": "rev1",
      "label": "Cercetare-dezvoltare în științe fizice și naturale",
      "source": "onrc"
    },
    {
      "code": "7311",
      "rev": "rev3",
      "label": "Activități ale agențiilor de publicitate",
      "source": "onrc"
    },
    {
      "code": "7414",
      "rev": "rev3",
      "label": "Alte activități de design specializat",
      "source": "onrc"
    },
    {
      "code": "7420",
      "rev": "rev1",
      "label": "Activități de arhitectură, inginerie și servicii de consultanță tehnică legate de acestea",
      "source": "onrc"
    },
    {
      "code": "7430",
      "rev": "rev1",
      "label": "Activități de testări și analize tehnice",
      "source": "onrc"
    },
    {
      "code": "7430",
      "rev": "rev3",
      "label": "Activități de traducere scrisă și orală (interpreți)",
      "source": "onrc"
    },
    {
      "code": "7490",
      "rev": "rev2",
      "label": "Alte activități profesionale, științifice și tehnice n.c.a.",
      "source": "onrc"
    },
    {
      "code": "7499",
      "rev": "rev3",
      "label": "Alte activități profesionale, stiințifice și tehnice n.c.a.",
      "source": "onrc"
    },
    {
      "code": "7990",
      "rev": "rev3",
      "label": "Alte servicii de rezervare și asistență turistică",
      "source": "onrc"
    },
    {
      "code": "8009",
      "rev": "rev3",
      "label": "Alte activități de protecție n.c.a.",
      "source": "onrc"
    },
    {
      "code": "8122",
      "rev": "rev3",
      "label": "Activități specializate de curățenie",
      "source": "onrc"
    },
    {
      "code": "8123",
      "rev": "rev3",
      "label": "Alte activități de curățenie",
      "source": "onrc"
    },
    {
      "code": "8130",
      "rev": "rev3",
      "label": "Activități de întreținere peisagistică",
      "source": "onrc"
    },
    {
      "code": "8210",
      "rev": "rev3",
      "label": "Activități de secretariat și servicii suport",
      "source": "onrc"
    },
    {
      "code": "8211",
      "rev": "rev2",
      "label": "Activități combinate de secretariat",
      "source": "onrc"
    },
    {
      "code": "8219",
      "rev": "rev2",
      "label": "Activități de fotocopiere, de pregătire a documentelor și alte activități specializate de secretariat",
      "source": "onrc"
    },
    {
      "code": "8230",
      "rev": "rev3",
      "label": "Activități de organizare a expozițiilor, târgurilor și congreselor",
      "source": "onrc"
    },
    {
      "code": "8299",
      "rev": "rev2",
      "label": "Alte activități de servicii suport pentru întreprinderi n.c.a.",
      "source": "onrc"
    },
    {
      "code": "8532",
      "rev": "rev3",
      "label": "Învățământ secundar, tehnic sau profesional",
      "source": "onrc"
    },
    {
      "code": "8532",
      "rev": "rev2",
      "label": "Învățământ secundar, tehnic sau profesional",
      "source": "onrc"
    },
    {
      "code": "8559",
      "rev": "rev2",
      "label": "Alte forme de învățământ n.c.a.",
      "source": "onrc"
    },
    {
      "code": "8559",
      "rev": "rev3",
      "label": "Alte forme de învățământ n.c.a.",
      "source": "onrc"
    },
    {
      "code": "9102",
      "rev": "rev2",
      "label": "Activități ale muzeelor",
      "source": "onrc"
    },
    {
      "code": "9121",
      "rev": "rev3",
      "label": "Activități ale muzeelor și colecțiilor",
      "source": "onrc"
    },
    {
      "code": "9122",
      "rev": "rev3",
      "label": "Activități ale siturilor și monumentelor istorice",
      "source": "onrc"
    },
    {
      "code": "9311",
      "rev": "rev3",
      "label": "Activități ale bazelor sportive",
      "source": "onrc"
    },
    {
      "code": "9319",
      "rev": "rev3",
      "label": "Alte activități sportive n.c.a",
      "source": "onrc"
    },
    {
      "code": "9329",
      "rev": "rev3",
      "label": "Alte activități recreative și distractive n.c.a.",
      "source": "onrc"
    },
    {
      "code": "9510",
      "rev": "rev3",
      "label": "Repararea și întreținerea calculatoarelor și a echipamentelor de comunicații",
      "source": "onrc"
    },
    {
      "code": "9531",
      "rev": "rev3",
      "label": "Repararea și întreținerea autovehiculelor",
      "source": "onrc"
    }
  ],
  "representatives": [],
  "euBranches": [
    {
      "name": "OMV PETROM SA Sucursală",
      "country": "Italia",
      "type": null
    }
  ],
  "fiscal": {
    "vatPayer": true,
    "inactive": false,
    "anafFound": true,
    "asOfDate": "2026-07-02",
    "fiscalCaen": {
      "code": "0610",
      "rev": null
    }
  },
  "financials": [
    {
      "fiscalYear": 2025,
      "turnover": 30828147506,
      "netProfit": 3067559914,
      "netLoss": null,
      "employees": 6701,
      "currency": "RON",
      "summary": {
        "totalRevenue": 35975251054,
        "totalExpenses": 32563925235,
        "grossProfit": 3411325819,
        "grossLoss": 0,
        "receivables": 8696789136,
        "currentAssets": 18059350583,
        "fixedAssets": 39969730380,
        "cashAndBank": 6726144149,
        "prepaidExpenses": 1085732153,
        "deferredIncome": 288388726,
        "subscribedCapital": 6231166706,
        "inventories": 2636417298,
        "debts": 10502278253,
        "provisions": 11655071159,
        "totalEquity": 36669074978,
        "patrimonyRegie": 0
      }
    },
    {
      "fiscalYear": 2024,
      "turnover": 29692697896,
      "netProfit": 4143914310,
      "netLoss": null,
      "employees": 7207,
      "currency": "RON",
      "summary": {
        "totalRevenue": 33435310514,
        "totalExpenses": 28656904834,
        "grossProfit": 4778405680,
        "grossLoss": 0,
        "receivables": 7168842949,
        "currentAssets": 18898605129,
        "fixedAssets": 36337358077,
        "cashAndBank": 8919405021,
        "prepaidExpenses": 1093688165,
        "deferredIncome": 258283053,
        "subscribedCapital": 6231166706,
        "inventories": 2582741714,
        "debts": 8682417713,
        "provisions": 9767875180,
        "totalEquity": 37621075425,
        "patrimonyRegie": 0
      }
    },
    {
      "fiscalYear": 2023,
      "turnover": 33828196866,
      "netProfit": 3944059894,
      "netLoss": null,
      "employees": 7228,
      "currency": "RON",
      "summary": {
        "totalRevenue": 38504569627,
        "totalExpenses": 30893122924,
        "grossProfit": 7611446703,
        "grossLoss": 0,
        "receivables": 5798371640,
        "currentAssets": 22485843279,
        "fixedAssets": 33155377909,
        "cashAndBank": 12950154597,
        "prepaidExpenses": 1031607640,
        "deferredIncome": 303823109,
        "subscribedCapital": 6231166706,
        "inventories": 2556982665,
        "debts": 8403525127,
        "provisions": 10035077860,
        "totalEquity": 37930402732,
        "patrimonyRegie": 0
      }
    },
    {
      "fiscalYear": 2022,
      "turnover": 55939915254,
      "netProfit": 10287553182,
      "netLoss": null,
      "employees": 7372,
      "currency": "RON",
      "summary": {
        "totalRevenue": 66230603370,
        "totalExpenses": 54303171417,
        "grossProfit": 11927431953,
        "grossLoss": 0,
        "receivables": 9874907526,
        "currentAssets": 26873153394,
        "fixedAssets": 29404727639,
        "cashAndBank": 13771925761,
        "prepaidExpenses": 1049723349,
        "deferredIncome": 151296337,
        "subscribedCapital": 6231166706,
        "inventories": 3226320107,
        "debts": 9187909952,
        "provisions": 8844821440,
        "totalEquity": 39143576653,
        "patrimonyRegie": 0
      }
    },
    {
      "fiscalYear": 2021,
      "turnover": 23586087255,
      "netProfit": 2688416594,
      "netLoss": null,
      "employees": 8271,
      "currency": "RON",
      "summary": {
        "totalRevenue": 29738633465,
        "totalExpenses": 26631440342,
        "grossProfit": 3107193123,
        "grossLoss": 0,
        "receivables": 6297731812,
        "currentAssets": 18119121826,
        "fixedAssets": 30622801653,
        "cashAndBank": 10037525260,
        "prepaidExpenses": 562659170,
        "deferredIncome": 101316029,
        "subscribedCapital": 5664410834,
        "inventories": 1783864754,
        "debts": 9089515020,
        "provisions": 7244044122,
        "totalEquity": 32869707478,
        "patrimonyRegie": 0
      }
    },
    {
      "fiscalYear": 2020,
      "turnover": 14795525494,
      "netProfit": 1381578837,
      "netLoss": null,
      "employees": 10949,
      "currency": "RON",
      "summary": {
        "totalRevenue": 18544842429,
        "totalExpenses": 17040942513,
        "grossProfit": 1503899916,
        "grossLoss": 0,
        "receivables": 4334010503,
        "currentAssets": 13671678105,
        "fixedAssets": 32708400192,
        "cashAndBank": 7297788515,
        "prepaidExpenses": 478052910,
        "deferredIncome": 126750518,
        "subscribedCapital": 5664410834,
        "inventories": 2039879087,
        "debts": 6104710219,
        "provisions": 8613730354,
        "totalEquity": 32012940116,
        "patrimonyRegie": 0
      }
    },
    {
      "fiscalYear": 2019,
      "turnover": 19793585306,
      "netProfit": 3563589092,
      "netLoss": null,
      "employees": 11814,
      "currency": "RON",
      "summary": {
        "totalRevenue": 22224269257,
        "totalExpenses": 18139627737,
        "grossProfit": 4084641520,
        "grossLoss": 0,
        "receivables": 4097678147,
        "currentAssets": 12800213656,
        "fixedAssets": 33107865194,
        "cashAndBank": 6795364119,
        "prepaidExpenses": 352144166,
        "deferredIncome": 75340623,
        "subscribedCapital": 5664410834,
        "inventories": 1907171390,
        "debts": 6044818154,
        "provisions": 7789113616,
        "totalEquity": 32350950623,
        "patrimonyRegie": 0
      }
    },
    {
      "fiscalYear": 2011,
      "turnover": 16565465973,
      "netProfit": 3685607226,
      "netLoss": null,
      "employees": 22052,
      "currency": "RON",
      "summary": {
        "totalRevenue": 17717609335,
        "totalExpenses": 13238970097,
        "grossProfit": 4478639238,
        "grossLoss": 0,
        "receivables": 2873110847,
        "currentAssets": 5135942846,
        "fixedAssets": 28568337614,
        "cashAndBank": 567026496,
        "prepaidExpenses": 115273240,
        "deferredIncome": 32807642,
        "subscribedCapital": 5664410834,
        "inventories": 1695805503,
        "debts": 6933171332,
        "provisions": 7962682564,
        "totalEquity": 18890892162,
        "patrimonyRegie": null
      }
    },
    {
      "fiscalYear": 2010,
      "turnover": 13953092655,
      "netProfit": 1799154602,
      "netLoss": null,
      "employees": 25176,
      "currency": "RON",
      "summary": {
        "totalRevenue": 15539741666,
        "totalExpenses": 13324102647,
        "grossProfit": 2215639019,
        "grossLoss": null,
        "receivables": 2159418564,
        "currentAssets": 5404207035,
        "fixedAssets": 26623660873,
        "cashAndBank": 1416091506,
        "prepaidExpenses": 74208255,
        "deferredIncome": 33054812,
        "subscribedCapital": 5664410834,
        "inventories": 1828696965,
        "debts": 8371549948,
        "provisions": 7502395876,
        "totalEquity": 16195075527,
        "patrimonyRegie": null
      }
    },
    {
      "fiscalYear": 2009,
      "turnover": 12842384017,
      "netProfit": 1368127631,
      "netLoss": null,
      "employees": 30398,
      "currency": "RON",
      "summary": {
        "totalRevenue": 14325562300,
        "totalExpenses": 12628042555,
        "grossProfit": 1697519745,
        "grossLoss": null,
        "receivables": 2035806491,
        "currentAssets": 4413732144,
        "fixedAssets": 22243002582,
        "cashAndBank": 280035791,
        "prepaidExpenses": 56803658,
        "deferredIncome": 97208977,
        "subscribedCapital": 5664410834,
        "inventories": 2097889862,
        "debts": 6383652890,
        "provisions": 6176529278,
        "totalEquity": 14056147239,
        "patrimonyRegie": null
      }
    },
    {
      "fiscalYear": 2008,
      "turnover": 16750726457,
      "netProfit": 1022387463,
      "netLoss": null,
      "employees": 29861,
      "currency": "RON",
      "summary": {
        "totalRevenue": 19331386617,
        "totalExpenses": 17725823277,
        "grossProfit": 1605563340,
        "grossLoss": null,
        "receivables": 1704211989,
        "currentAssets": 5084109292,
        "fixedAssets": 19806471218,
        "cashAndBank": 261438312,
        "prepaidExpenses": 36865667,
        "deferredIncome": 146258559,
        "subscribedCapital": 5664410834,
        "inventories": 2394434361,
        "debts": 4950122772,
        "provisions": 6262466399,
        "totalEquity": 13568598447,
        "patrimonyRegie": null
      }
    }
  ],
  "financialTrajectory": {
    "fromYear": 2024,
    "toYear": 2025,
    "turnoverDelta": 1135449610,
    "netResultDelta": -1076354396,
    "employeesDelta": -506
  },
  "publicMoney": {
    "totalRon": 2622203160.9,
    "flowCount": 5050,
    "byFlowType": [
      {
        "flowType": "procurement_contract",
        "totalRon": 1734199844.96,
        "count": 1522
      },
      {
        "flowType": "pnrr_commitment",
        "totalRon": 822525171.83,
        "count": 3
      },
      {
        "flowType": "direct_acquisition",
        "totalRon": 65478144.11,
        "count": 3525
      }
    ],
    "byYear": [
      {
        "year": 2026,
        "flowType": "procurement_contract",
        "totalRon": 2523923.59,
        "count": 7
      },
      {
        "year": 2026,
        "flowType": "direct_acquisition",
        "totalRon": 1382476.7,
        "count": 43
      },
      {
        "year": 2025,
        "flowType": "procurement_contract",
        "totalRon": 38604916.89,
        "count": 28
      },
      {
        "year": 2025,
        "flowType": "direct_acquisition",
        "totalRon": 5882392.73,
        "count": 192
      },
      {
        "year": 2024,
        "flowType": "pnrr_commitment",
        "totalRon": 17459392.72,
        "count": 1
      },
      {
        "year": 2024,
        "flowType": "procurement_contract",
        "totalRon": 13758035.26,
        "count": 20
      },
      {
        "year": 2024,
        "flowType": "direct_acquisition",
        "totalRon": 5312976.37,
        "count": 158
      },
      {
        "year": 2023,
        "flowType": "pnrr_commitment",
        "totalRon": 805065779.11,
        "count": 2
      },
      {
        "year": 2023,
        "flowType": "procurement_contract",
        "totalRon": 16768716.89,
        "count": 23
      },
      {
        "year": 2023,
        "flowType": "direct_acquisition",
        "totalRon": 7140110.29,
        "count": 203
      },
      {
        "year": 2022,
        "flowType": "procurement_contract",
        "totalRon": 68404082.79,
        "count": 31
      },
      {
        "year": 2022,
        "flowType": "direct_acquisition",
        "totalRon": 5815144.22,
        "count": 130
      },
      {
        "year": 2021,
        "flowType": "procurement_contract",
        "totalRon": 159246311.33,
        "count": 25
      },
      {
        "year": 2021,
        "flowType": "direct_acquisition",
        "totalRon": 7087469.22,
        "count": 129
      },
      {
        "year": 2020,
        "flowType": "direct_acquisition",
        "totalRon": 3003387.42,
        "count": 116
      },
      {
        "year": 2020,
        "flowType": "procurement_contract",
        "totalRon": 1257548.9,
        "count": 24
      },
      {
        "year": 2019,
        "flowType": "procurement_contract",
        "totalRon": 45567427.87,
        "count": 27
      },
      {
        "year": 2019,
        "flowType": "direct_acquisition",
        "totalRon": 4466337.17,
        "count": 132
      },
      {
        "year": 2018,
        "flowType": "procurement_contract",
        "totalRon": 4572852.65,
        "count": 24
      },
      {
        "year": 2018,
        "flowType": "direct_acquisition",
        "totalRon": 3266469.48,
        "count": 118
      },
      {
        "year": 2017,
        "flowType": "procurement_contract",
        "totalRon": 22908678.08,
        "count": 30
      },
      {
        "year": 2017,
        "flowType": "direct_acquisition",
        "totalRon": 3125179.2,
        "count": 116
      },
      {
        "year": 2016,
        "flowType": "procurement_contract",
        "totalRon": 3979016.37,
        "count": 33
      },
      {
        "year": 2016,
        "flowType": "direct_acquisition",
        "totalRon": 1852491.21,
        "count": 83
      },
      {
        "year": 2015,
        "flowType": "procurement_contract",
        "totalRon": 13257518.77,
        "count": 28
      },
      {
        "year": 2015,
        "flowType": "direct_acquisition",
        "totalRon": 1418300.68,
        "count": 59
      },
      {
        "year": 2014,
        "flowType": "procurement_contract",
        "totalRon": 18605771.86,
        "count": 36
      },
      {
        "year": 2014,
        "flowType": "direct_acquisition",
        "totalRon": 885117,
        "count": 31
      },
      {
        "year": 2013,
        "flowType": "procurement_contract",
        "totalRon": 12018559.84,
        "count": 31
      },
      {
        "year": 2013,
        "flowType": "direct_acquisition",
        "totalRon": 757727.28,
        "count": 22
      },
      {
        "year": 2012,
        "flowType": "procurement_contract",
        "totalRon": 14942010.47,
        "count": 52
      },
      {
        "year": 2012,
        "flowType": "direct_acquisition",
        "totalRon": 472783,
        "count": 14
      },
      {
        "year": 2011,
        "flowType": "procurement_contract",
        "totalRon": 62968025.76,
        "count": 40
      },
      {
        "year": 2011,
        "flowType": "direct_acquisition",
        "totalRon": 684297.7,
        "count": 20
      },
      {
        "year": 2010,
        "flowType": "procurement_contract",
        "totalRon": 148128239.75,
        "count": 283
      },
      {
        "year": 2010,
        "flowType": "direct_acquisition",
        "totalRon": 6896811.96,
        "count": 1151
      },
      {
        "year": 2009,
        "flowType": "procurement_contract",
        "totalRon": 174328394.17,
        "count": 279
      },
      {
        "year": 2009,
        "flowType": "direct_acquisition",
        "totalRon": 4481365.41,
        "count": 698
      },
      {
        "year": 2008,
        "flowType": "procurement_contract",
        "totalRon": 389975858.79,
        "count": 294
      },
      {
        "year": 2007,
        "flowType": "procurement_contract",
        "totalRon": 522383954.93,
        "count": 173
      },
      {
        "year": null,
        "flowType": "direct_acquisition",
        "totalRon": 1547307.07,
        "count": 110
      },
      {
        "year": null,
        "flowType": "procurement_contract",
        "totalRon": 0,
        "count": 34
      }
    ]
  },
  "sources": [
    {
      "id": "onrc",
      "snapshotDate": "2026-07-18"
    },
    {
      "id": "anaf",
      "snapshotDate": "2026-07-02"
    }
  ]
},
    procurement: {
  "window": {
    "from": "2016-01",
    "to": "2026-06"
  },
  "contracts": {
    "count": 301,
    "withValue": 144,
    "awardedRon": 377961227.01,
    "firstMonth": "2016-01",
    "lastMonth": "2026-04",
    "answerability": "degraded"
  },
  "directAcquisitions": {
    "count": 1530,
    "withValue": 1529,
    "awardedRon": 49881741.08,
    "firstMonth": "2016-01",
    "lastMonth": "2026-06",
    "answerability": "served"
  },
  "topAuthorities": {
    "contract": [
      {
        "cui": "14810074",
        "name": "UNITATEA MILITARA 02022",
        "amountRon": 102871414.96,
        "count": 15,
        "amountMissing": 10,
        "share": 0.2722
      },
      {
        "cui": "13068733",
        "name": "SOCIETATEA NAŢIONALĂ DE TRANSPORT GAZE NATURALE TRANSGAZ SA",
        "amountRon": 76509840.0,
        "count": 1,
        "amountMissing": 0,
        "share": 0.2024
      },
      {
        "cui": "26288978",
        "name": "ADMINISTRATIA NATIONALA A REZERVELOR DE STAT SI PROBLEME SPECIALE",
        "amountRon": 63971035.13,
        "count": 21,
        "amountMissing": 4,
        "share": 0.1693
      },
      {
        "cui": "4193222",
        "name": "INSPECTORATUL GENERAL AL PLITIE DE FRONTIERA",
        "amountRon": 43139170.01,
        "count": 6,
        "amountMissing": 0,
        "share": 0.1141
      },
      {
        "cui": "24367374",
        "name": "INSPECTORATUL GENERAL DE AVIATIE AL MINISTERULUI INTERNELOR SI REFORMEI ADMINISTRATIVE",
        "amountRon": 32074609.2,
        "count": 127,
        "amountMissing": 83,
        "share": 0.0849
      },
      {
        "cui": "1644670",
        "name": "REGIA AUTONOMĂ ”ADMINISTRAȚIA FLUVIALĂ A DUNĂRII DE JOS” GALAȚI",
        "amountRon": 21244996.44,
        "count": 11,
        "amountMissing": 5,
        "share": 0.0562
      },
      {
        "cui": "27036839",
        "name": "UNITATEA MILITARA 01836",
        "amountRon": 21142220.0,
        "count": 1,
        "amountMissing": 0,
        "share": 0.0559
      },
      {
        "cui": "29521430",
        "name": "GARDA DE COASTA",
        "amountRon": 3460376.78,
        "count": 14,
        "amountMissing": 11,
        "share": 0.0092
      },
      {
        "cui": "16330145",
        "name": "AGENTIA ROMANA DE SALVARE A VIETII OMENESTI PE MARE",
        "amountRon": 3449250.0,
        "count": 5,
        "amountMissing": 4,
        "share": 0.0091
      },
      {
        "cui": "1869096",
        "name": "INSTITUTUL NAȚIONAL DE CERCETARE-DEZVOLTARE MARINĂ GRIGORE ANTIPA-I.N.C.D.M. CONSTANȚA",
        "amountRon": 1012659.65,
        "count": 4,
        "amountMissing": 1,
        "share": 0.0027
      }
    ],
    "directAcquisition": [
      {
        "cui": "4568438",
        "name": "SPITALUL DE PSIHIATRIE POROSCHIA",
        "amountRon": 2226125.0,
        "count": 44,
        "amountMissing": 0,
        "share": 0.0446
      },
      {
        "cui": "17670528",
        "name": "EUROBAC SRL",
        "amountRon": 1461219.0,
        "count": 36,
        "amountMissing": 0,
        "share": 0.0293
      },
      {
        "cui": "2614082",
        "name": "COMPLEXUL REZIDENTIAL DE SERVICII SOCIALE RAZBOIENI",
        "amountRon": 1458790.0,
        "count": 23,
        "amountMissing": 1,
        "share": 0.0292
      },
      {
        "cui": "4855001",
        "name": "LICEUL TEHNOLOGIC STEFAN CEL MARE SI SFANT VORONA",
        "amountRon": 1405780.0,
        "count": 16,
        "amountMissing": 0,
        "share": 0.0282
      },
      {
        "cui": "3861927",
        "name": "SPITALUL DE RECUPERARE NEUROMOTORIE DR.C.BARSAN",
        "amountRon": 1351566.0,
        "count": 70,
        "amountMissing": 0,
        "share": 0.0271
      },
      {
        "cui": "4666231",
        "name": "COLEGIUL NATIONAL SPIRU HARET",
        "amountRon": 1266248.84,
        "count": 3,
        "amountMissing": 0,
        "share": 0.0254
      },
      {
        "cui": "3518954",
        "name": "LICEUL TEORETIC SEBIS",
        "amountRon": 1138400.0,
        "count": 22,
        "amountMissing": 0,
        "share": 0.0228
      },
      {
        "cui": "4404770",
        "name": "CAMINUL PENTRU PERSOANE VARSTNICE HAGHIG-HIDVEGI IDOSEK OTTHONA",
        "amountRon": 1121107.0,
        "count": 21,
        "amountMissing": 0,
        "share": 0.0225
      },
      {
        "cui": "3607644",
        "name": "Primăria Orașului Pogoanele - Direcția de Asistență Socială",
        "amountRon": 1088055.16,
        "count": 31,
        "amountMissing": 0,
        "share": 0.0218
      },
      {
        "cui": "2843787",
        "name": "LICEUL TEHNOLOGIC CAROL I",
        "amountRon": 1040588.0,
        "count": 35,
        "amountMissing": 0,
        "share": 0.0209
      }
    ]
  },
  "topCategories": {
    "contract": [
      {
        "code": "09",
        "labelRo": "Produse petroliere, combustibil, electricitate şi alte surse de energie",
        "labelEn": "Petroleum products, fuel, electricity and other energy sources",
        "amountRon": 331041227.01,
        "count": 299,
        "share": 0.8759
      },
      {
        "code": null,
        "labelRo": null,
        "labelEn": null,
        "amountRon": 46920000.0,
        "count": 2,
        "share": 0.1241
      }
    ],
    "directAcquisition": [
      {
        "code": "09",
        "labelRo": "Produse petroliere, combustibil, electricitate şi alte surse de energie",
        "labelEn": "Petroleum products, fuel, electricity and other energy sources",
        "amountRon": 49348602.35,
        "count": 1445,
        "share": 0.9893
      },
      {
        "code": "65",
        "labelRo": "Utilităţi publice",
        "labelEn": "Public utilities",
        "amountRon": 429382.0,
        "count": 16,
        "share": 0.0086
      },
      {
        "code": "22",
        "labelRo": "Imprimate şi produse conexe",
        "labelEn": "Printed matter and related products",
        "amountRon": 60304.55,
        "count": 44,
        "share": 0.0012
      },
      {
        "code": "71",
        "labelRo": "Servicii de arhitectură, de construcţii, de inginerie şi de inspecţie",
        "labelEn": "Architectural, construction, engineering and inspection services",
        "amountRon": 38280.0,
        "count": 2,
        "share": 0.0008
      },
      {
        "code": "79",
        "labelRo": "Servicii pentru întreprinderi: drept, marketing, consultanţă, recrutare, tipărire şi securitate",
        "labelEn": "Business services: law, marketing, consulting, recruitment, printing",
        "amountRon": 2210.74,
        "count": 8,
        "share": 0.0
      },
      {
        "code": "24",
        "labelRo": "Produse chimice",
        "labelEn": "Chemical products",
        "amountRon": 701.9,
        "count": 2,
        "share": 0.0
      },
      {
        "code": "44",
        "labelRo": "Structuri şi materiale de construcţii; produse auxiliare pentru construcţii (cu excepţia aparatelor electrice)",
        "labelEn": "Construction structures and materials; auxiliary products",
        "amountRon": 603.0,
        "count": 4,
        "share": 0.0
      },
      {
        "code": "98",
        "labelRo": "Alte servicii comunitare, sociale şi personale",
        "labelEn": "Other community, social and personal services",
        "amountRon": 474.7,
        "count": 2,
        "share": 0.0
      },
      {
        "code": "50",
        "labelRo": "Servicii de reparare şi întreţinere",
        "labelEn": "Repair and maintenance services",
        "amountRon": 466.35,
        "count": 3,
        "share": 0.0
      },
      {
        "code": "60",
        "labelRo": "Servicii de transport (cu excepţia transportului de deşeuri)",
        "labelEn": "Transport services",
        "amountRon": 382.0,
        "count": 1,
        "share": 0.0
      }
    ]
  },
  "recent": [
    {
      "id": "17045781",
      "grain": "direct_acquisition",
      "title": "benzina",
      "authority": {
        "cui": "10755066",
        "name": "SC \"LOCATIV\"SA"
      },
      "valueRon": 300.14,
      "date": "2026-09-03",
      "cpvDivision": "09"
    },
    {
      "id": "2683112",
      "grain": "contract",
      "title": "ACORD CADRU -Petrol si produse petroliere CTL",
      "authority": {
        "cui": "17090636",
        "name": "Directia Generala de Asistenta Sociala si Protectia Copilului Timis"
      },
      "valueRon": 2079978.0,
      "date": "2026-09-02",
      "cpvDivision": "09"
    },
    {
      "id": "16997859",
      "grain": "direct_acquisition",
      "title": "Jet A1",
      "authority": {
        "cui": "73452",
        "name": "R.A. AEROPORTUL ORADEA"
      },
      "valueRon": 1917.88,
      "date": "2026-09-01",
      "cpvDivision": "09"
    },
    {
      "id": "10869936",
      "grain": "direct_acquisition",
      "title": "BENZINA EXTRA 99 - Carburanţi pentru aeronave cu aripa fixa, VRAC- din depozite Petrom",
      "authority": {
        "cui": "11534322",
        "name": "SCOALA SUPERIOARA DE AVIATIE CIVILA"
      },
      "valueRon": 42160.0,
      "date": "2026-06-08",
      "cpvDivision": "09"
    },
    {
      "id": "17044368",
      "grain": "direct_acquisition",
      "title": "Bonuri valorice combustibil -BVC",
      "authority": {
        "cui": "3897122",
        "name": "ORASUL TASNAD"
      },
      "valueRon": 7600.0,
      "date": "2026-06-03",
      "cpvDivision": "09"
    },
    {
      "id": "17023982",
      "grain": "direct_acquisition",
      "title": "Viniete de automobile si ITP",
      "authority": {
        "cui": "40060176",
        "name": "COMPLEXUL SPORTIV NATIONAL \"LASCAR PANA\""
      },
      "valueRon": 923.53,
      "date": "2026-06-02",
      "cpvDivision": "22"
    },
    {
      "id": "10525410",
      "grain": "direct_acquisition",
      "title": "Motorina Standard, vrac, din depozite Petrom",
      "authority": {
        "cui": "3861927",
        "name": "SPITALUL DE RECUPERARE NEUROMOTORIE \"DR.CORNELIU BARSAN' DEZNA"
      },
      "valueRon": 35490.0,
      "date": "2026-05-14",
      "cpvDivision": "09"
    },
    {
      "id": "10509980",
      "grain": "direct_acquisition",
      "title": "Motorina",
      "authority": {
        "cui": "12877736",
        "name": "SCOALA GIMNAZIALA CIMPENI"
      },
      "valueRon": 18690.0,
      "date": "2026-05-11",
      "cpvDivision": "09"
    },
    {
      "id": "10469047",
      "grain": "direct_acquisition",
      "title": "Motorina Standard, vrac",
      "authority": {
        "cui": "17670528",
        "name": "EUROBAC S.R.L."
      },
      "valueRon": 70335.0,
      "date": "2026-04-30",
      "cpvDivision": "09"
    },
    {
      "id": "48745000",
      "grain": "contract",
      "title": "Contract subsecvent de furnizare combustibil tip Jet A1",
      "authority": {
        "cui": "13624359",
        "name": "UM 0929 Bucuresti"
      },
      "valueRon": 74589.91,
      "date": "2026-04-27",
      "cpvDivision": "09"
    },
    {
      "id": "17022010",
      "grain": "direct_acquisition",
      "title": "ROVINIETA CJ36SPS",
      "authority": {
        "cui": "15729580",
        "name": "Serviciul Public Judetean Salvamont - Salvaspeo Cluj"
      },
      "valueRon": 210.59,
      "date": "2026-04-02",
      "cpvDivision": "22"
    },
    {
      "id": "10376640",
      "grain": "direct_acquisition",
      "title": "Motorina Standard",
      "authority": {
        "cui": "16385442",
        "name": "Centrul de Asistenta Medico-Sociala Bacesti"
      },
      "valueRon": 81000.0,
      "date": "2026-04-02",
      "cpvDivision": "09"
    },
    {
      "id": "51739177",
      "grain": "contract",
      "title": "Contracte subsecvente 2026 Iași",
      "authority": {
        "cui": "24367374",
        "name": "Inspectoratul General de Aviatie al M.A.I."
      },
      "valueRon": 160935.6,
      "date": "2026-03-30",
      "cpvDivision": "09"
    },
    {
      "id": "51733135",
      "grain": "contract",
      "title": "Contracte subsecvente 2026 - TRIM 1",
      "authority": {
        "cui": "24367374",
        "name": "Inspectoratul General de Aviatie al M.A.I."
      },
      "valueRon": 1951770.38,
      "date": "2026-03-30",
      "cpvDivision": "09"
    },
    {
      "id": "51353985",
      "grain": "contract",
      "title": "Contracte subsecvente 2026 Timisoara",
      "authority": {
        "cui": "24367374",
        "name": "Inspectoratul General de Aviatie al M.A.I."
      },
      "valueRon": 169907.6,
      "date": "2026-03-30",
      "cpvDivision": "09"
    },
    {
      "id": "51353984",
      "grain": "contract",
      "title": "Contracte subsecvente 2026 Cluj",
      "authority": {
        "cui": "24367374",
        "name": "Inspectoratul General de Aviatie al M.A.I."
      },
      "valueRon": 157984.0,
      "date": "2026-03-30",
      "cpvDivision": "09"
    },
    {
      "id": "10341185",
      "grain": "direct_acquisition",
      "title": "combustibil centrale termice",
      "authority": {
        "cui": "28020784",
        "name": "SCOALA GIMNAZIALA NR 1 TUZLA"
      },
      "valueRon": 19425.0,
      "date": "2026-03-26",
      "cpvDivision": "09"
    },
    {
      "id": "48744999",
      "grain": "contract",
      "title": "Contract subsecvent pentru turboreactoare de aviatia tip JET A1",
      "authority": {
        "cui": "13624359",
        "name": "UM 0929 Bucuresti"
      },
      "valueRon": 8736.1,
      "date": "2026-03-25",
      "cpvDivision": "09"
    },
    {
      "id": "38721309",
      "grain": "direct_acquisition",
      "title": "Motorina Standard, vrac, din depozite Petrom",
      "authority": {
        "cui": "4568438",
        "name": "SPITALUL DE PSIHIATRIE POROSCHIA"
      },
      "valueRon": 77430.0,
      "date": "2026-03-25",
      "cpvDivision": "09"
    },
    {
      "id": "18705562",
      "grain": "direct_acquisition",
      "title": "Combustibil Termic Lichid",
      "authority": {
        "cui": "4352620",
        "name": "Spitalul Judetean de Urgenta Giurgiu"
      },
      "valueRon": 47600.0,
      "date": "2026-03-17",
      "cpvDivision": "09"
    }
  ]
},
  },
  'abc-con': {
    profile: {
  "organizationId": "org:1088776",
  "cui": "23617561",
  "codInmatriculare": "J07/226/2008",
  "legalName": "ABC-CON-INTERNAŢIONAL SRL",
  "legalForm": "SRL",
  "registrationDate": "2008-03-31",
  "status": {
    "code": "1107",
    "label": "insolvență"
  },
  "address": {
    "display": "",
    "county": "Botoşani",
    "locality": "Municipiul Botoşani"
  },
  "geography": {
    "uatSirutaCode": "35731",
    "uatName": "Municipiul Botoşani",
    "countyName": "Botoşani",
    "matchConfidence": "safe"
  },
  "caenActivities": [
    {
      "code": "1623",
      "rev": "rev2",
      "label": "Fabricarea altor elemente de dulgherie și tâmplărie, pentru construcții",
      "source": "onrc"
    },
    {
      "code": "2511",
      "rev": "rev2",
      "label": "Fabricarea de construcții metalice și părți componente ale structurilor metalice",
      "source": "onrc"
    },
    {
      "code": "4110",
      "rev": "rev2",
      "label": "Dezvoltare (promovare) imobiliară",
      "source": "onrc"
    },
    {
      "code": "4120",
      "rev": null,
      "label": null,
      "source": "anaf"
    },
    {
      "code": "4120",
      "rev": "rev2",
      "label": "Lucrări de construcții a clădirilor rezidențiale și nerezidențiale",
      "source": "onrc"
    },
    {
      "code": "4211",
      "rev": "rev2",
      "label": "Lucrări de construcții a drumurilor și autostrăzilor",
      "source": "onrc"
    },
    {
      "code": "4212",
      "rev": "rev2",
      "label": "Lucrări de construcții a căilor ferate de suprafață  și subterane",
      "source": "onrc"
    },
    {
      "code": "4213",
      "rev": "rev2",
      "label": "Construcția de poduri și tuneluri",
      "source": "onrc"
    },
    {
      "code": "4221",
      "rev": "rev2",
      "label": "Lucrări de construcții a proiectelor utilitare pentru fluide",
      "source": "onrc"
    },
    {
      "code": "4222",
      "rev": "rev2",
      "label": "Lucrări de construcții a proiectelor utilitare pentru electricitate și telecomunicații",
      "source": "onrc"
    },
    {
      "code": "4291",
      "rev": "rev2",
      "label": "Construcții hidrotehnice",
      "source": "onrc"
    },
    {
      "code": "4299",
      "rev": "rev2",
      "label": "Lucrări de construcții a altor proiecte inginerești n.c.a",
      "source": "onrc"
    },
    {
      "code": "4311",
      "rev": "rev2",
      "label": "Lucrări de demolare a construcțiilor",
      "source": "onrc"
    },
    {
      "code": "4312",
      "rev": "rev2",
      "label": "Lucrări de pregătire a terenului",
      "source": "onrc"
    },
    {
      "code": "4313",
      "rev": "rev2",
      "label": "Lucrări de foraj și sondaj pentru construcții",
      "source": "onrc"
    },
    {
      "code": "4321",
      "rev": "rev2",
      "label": "Lucrări de instalații electrice",
      "source": "onrc"
    },
    {
      "code": "4322",
      "rev": "rev2",
      "label": "Lucrări de instalații sanitare, de încălzire și de aer condiționat",
      "source": "onrc"
    },
    {
      "code": "4329",
      "rev": "rev2",
      "label": "Alte lucrări de instalații pentru construcții",
      "source": "onrc"
    },
    {
      "code": "4331",
      "rev": "rev2",
      "label": "Lucrări de ipsoserie",
      "source": "onrc"
    },
    {
      "code": "4333",
      "rev": "rev2",
      "label": "Lucrări de pardosire și placare a pereților",
      "source": "onrc"
    },
    {
      "code": "4334",
      "rev": "rev2",
      "label": "Lucrări de vopsitorie, zugrăveli și montări de geamuri",
      "source": "onrc"
    },
    {
      "code": "4339",
      "rev": "rev2",
      "label": "Alte lucrări de finisare",
      "source": "onrc"
    },
    {
      "code": "4391",
      "rev": "rev2",
      "label": "Lucrări de învelitori, șarpante și terase la construcții",
      "source": "onrc"
    },
    {
      "code": "4399",
      "rev": "rev2",
      "label": "Alte lucrări speciale de construcții n.c.a.",
      "source": "onrc"
    },
    {
      "code": "4647",
      "rev": "rev2",
      "label": "Comerț cu ridicata al mobilei, covoarelor și a articolelor de iluminat",
      "source": "onrc"
    },
    {
      "code": "4669",
      "rev": "rev2",
      "label": "Comerț cu ridicata al altor mașini și echipamente",
      "source": "onrc"
    },
    {
      "code": "4690",
      "rev": "rev2",
      "label": "Comerț cu ridicata nespecializat",
      "source": "onrc"
    },
    {
      "code": "5210",
      "rev": "rev2",
      "label": "Depozitări",
      "source": "onrc"
    },
    {
      "code": "5224",
      "rev": "rev2",
      "label": "Manipulări",
      "source": "onrc"
    },
    {
      "code": "7022",
      "rev": "rev2",
      "label": "Activități de consultanță pentru afaceri și management",
      "source": "onrc"
    },
    {
      "code": "7112",
      "rev": "rev2",
      "label": "Activități de inginerie și consultanță tehnică legate de acestea",
      "source": "onrc"
    },
    {
      "code": "7120",
      "rev": "rev2",
      "label": "Activități de testări și analize tehnice",
      "source": "onrc"
    },
    {
      "code": "7490",
      "rev": "rev2",
      "label": "Alte activități profesionale, științifice și tehnice n.c.a.",
      "source": "onrc"
    },
    {
      "code": "7820",
      "rev": "rev2",
      "label": "Activități de contractare, pe baze temporare, a personalului",
      "source": "onrc"
    },
    {
      "code": "7830",
      "rev": "rev2",
      "label": "Servicii de furnizare și management a forței de muncă",
      "source": "onrc"
    },
    {
      "code": "8219",
      "rev": "rev2",
      "label": "Activități de fotocopiere, de pregătire a documentelor și alte activități specializate de secretariat",
      "source": "onrc"
    },
    {
      "code": "8559",
      "rev": "rev2",
      "label": "Alte forme de învățământ n.c.a.",
      "source": "onrc"
    }
  ],
  "representatives": [],
  "euBranches": [],
  "fiscal": {
    "vatPayer": true,
    "inactive": false,
    "anafFound": true,
    "asOfDate": "2026-07-04",
    "fiscalCaen": {
      "code": "4120",
      "rev": null
    }
  },
  "financials": [
    {
      "fiscalYear": 2025,
      "turnover": 21735594,
      "netProfit": null,
      "netLoss": 27758430,
      "employees": 27,
      "currency": "RON",
      "summary": {
        "totalRevenue": 4364457,
        "totalExpenses": 32122887,
        "grossProfit": 0,
        "grossLoss": 27758430,
        "receivables": 5656286,
        "currentAssets": 10646431,
        "fixedAssets": 8549069,
        "cashAndBank": 2851885,
        "prepaidExpenses": 126895,
        "deferredIncome": 2960170,
        "subscribedCapital": 1500000,
        "inventories": 2138260,
        "debts": 38925042,
        "provisions": 0,
        "totalEquity": -22562817,
        "patrimonyRegie": 0
      }
    },
    {
      "fiscalYear": 2024,
      "turnover": 47252195,
      "netProfit": 217879,
      "netLoss": null,
      "employees": 117,
      "currency": "RON",
      "summary": {
        "totalRevenue": 50184010,
        "totalExpenses": 49891085,
        "grossProfit": 292925,
        "grossLoss": 0,
        "receivables": 7775842,
        "currentAssets": 36580067,
        "fixedAssets": 10339601,
        "cashAndBank": 694860,
        "prepaidExpenses": 380684,
        "deferredIncome": 3582164,
        "subscribedCapital": 1500000,
        "inventories": 28109365,
        "debts": 37285581,
        "provisions": 0,
        "totalEquity": 6432607,
        "patrimonyRegie": 0
      }
    },
    {
      "fiscalYear": 2023,
      "turnover": 54913794,
      "netProfit": 3110283,
      "netLoss": null,
      "employees": 152,
      "currency": "RON",
      "summary": {
        "totalRevenue": 58979322,
        "totalExpenses": 55535368,
        "grossProfit": 3443954,
        "grossLoss": 0,
        "receivables": 10424874,
        "currentAssets": 31509747,
        "fixedAssets": 12324030,
        "cashAndBank": 807106,
        "prepaidExpenses": 634474,
        "deferredIncome": 4204158,
        "subscribedCapital": 1500000,
        "inventories": 20277767,
        "debts": 34267175,
        "provisions": 0,
        "totalEquity": 5996918,
        "patrimonyRegie": 0
      }
    },
    {
      "fiscalYear": 2022,
      "turnover": 42602634,
      "netProfit": 1699761,
      "netLoss": null,
      "employees": 147,
      "currency": "RON",
      "summary": {
        "totalRevenue": 52515641,
        "totalExpenses": 50573555,
        "grossProfit": 1942086,
        "grossLoss": 0,
        "receivables": 20477182,
        "currentAssets": 40122951,
        "fixedAssets": 3627748,
        "cashAndBank": 2311497,
        "prepaidExpenses": 987788,
        "deferredIncome": 4568494,
        "subscribedCapital": 1000000,
        "inventories": 17334272,
        "debts": 35565966,
        "provisions": 0,
        "totalEquity": 4604027,
        "patrimonyRegie": 0
      }
    },
    {
      "fiscalYear": 2021,
      "turnover": 19378018,
      "netProfit": 1050059,
      "netLoss": null,
      "employees": 109,
      "currency": "RON",
      "summary": {
        "totalRevenue": 22824741,
        "totalExpenses": 21774405,
        "grossProfit": 1050336,
        "grossLoss": 0,
        "receivables": 9663671,
        "currentAssets": 17651225,
        "fixedAssets": 4096480,
        "cashAndBank": -204128,
        "prepaidExpenses": 1440627,
        "deferredIncome": 4724374,
        "subscribedCapital": 1000000,
        "inventories": 8191682,
        "debts": 15679493,
        "provisions": 0,
        "totalEquity": 2784465,
        "patrimonyRegie": 0
      }
    },
    {
      "fiscalYear": 2020,
      "turnover": 26418461,
      "netProfit": 1615459,
      "netLoss": null,
      "employees": 84,
      "currency": "RON",
      "summary": {
        "totalRevenue": 28299765,
        "totalExpenses": 26464922,
        "grossProfit": 1834843,
        "grossLoss": 0,
        "receivables": 9653705,
        "currentAssets": 11724506,
        "fixedAssets": 3506954,
        "cashAndBank": -852420,
        "prepaidExpenses": 0,
        "deferredIncome": 0,
        "subscribedCapital": 1000000,
        "inventories": 2923221,
        "debts": 12096832,
        "provisions": 0,
        "totalEquity": 3134628,
        "patrimonyRegie": 0
      }
    },
    {
      "fiscalYear": 2019,
      "turnover": 22664975,
      "netProfit": 694232,
      "netLoss": null,
      "employees": 74,
      "currency": "RON",
      "summary": {
        "totalRevenue": 21319938,
        "totalExpenses": 20496740,
        "grossProfit": 823198,
        "grossLoss": 0,
        "receivables": 4106804,
        "currentAssets": 11228590,
        "fixedAssets": 2045311,
        "cashAndBank": 5187509,
        "prepaidExpenses": 0,
        "deferredIncome": 0,
        "subscribedCapital": 1000000,
        "inventories": 1934277,
        "debts": 11026864,
        "provisions": 0,
        "totalEquity": 2247037,
        "patrimonyRegie": 0
      }
    },
    {
      "fiscalYear": 2018,
      "turnover": 14611113,
      "netProfit": 548594,
      "netLoss": null,
      "employees": 44,
      "currency": "RON",
      "summary": {
        "totalRevenue": 13325604,
        "totalExpenses": 12681357,
        "grossProfit": 644247,
        "grossLoss": 0,
        "receivables": 1780936,
        "currentAssets": 6643487,
        "fixedAssets": 1604046,
        "cashAndBank": 1760761,
        "prepaidExpenses": null,
        "deferredIncome": null,
        "subscribedCapital": 1000000,
        "inventories": 3101790,
        "debts": 6152943,
        "provisions": null,
        "totalEquity": 2094590,
        "patrimonyRegie": null
      }
    },
    {
      "fiscalYear": 2017,
      "turnover": 12710969,
      "netProfit": 324782,
      "netLoss": null,
      "employees": 82,
      "currency": "RON",
      "summary": {
        "totalRevenue": 14013236,
        "totalExpenses": 13633301,
        "grossProfit": 379935,
        "grossLoss": 0,
        "receivables": 1465573,
        "currentAssets": 5713971,
        "fixedAssets": 1378803,
        "cashAndBank": -128485,
        "prepaidExpenses": null,
        "deferredIncome": null,
        "subscribedCapital": 1000000,
        "inventories": 4376883,
        "debts": 5528362,
        "provisions": null,
        "totalEquity": 1564412,
        "patrimonyRegie": null
      }
    },
    {
      "fiscalYear": 2016,
      "turnover": 11870088,
      "netProfit": 70582,
      "netLoss": null,
      "employees": 102,
      "currency": "RON",
      "summary": {
        "totalRevenue": 14426323,
        "totalExpenses": 14334245,
        "grossProfit": 92078,
        "grossLoss": 0,
        "receivables": 1926181,
        "currentAssets": 4987197,
        "fixedAssets": 1672281,
        "cashAndBank": 296374,
        "prepaidExpenses": null,
        "deferredIncome": null,
        "subscribedCapital": 1000000,
        "inventories": 2764642,
        "debts": 5234592,
        "provisions": null,
        "totalEquity": 1424886,
        "patrimonyRegie": null
      }
    },
    {
      "fiscalYear": 2015,
      "turnover": 6856440,
      "netProfit": 2994,
      "netLoss": null,
      "employees": 105,
      "currency": "RON",
      "summary": {
        "totalRevenue": 11213969,
        "totalExpenses": 11209597,
        "grossProfit": 4372,
        "grossLoss": 0,
        "receivables": 2053397,
        "currentAssets": 4100351,
        "fixedAssets": 1504160,
        "cashAndBank": 1737992,
        "prepaidExpenses": null,
        "deferredIncome": null,
        "subscribedCapital": 1000,
        "inventories": 308962,
        "debts": 4570993,
        "provisions": null,
        "totalEquity": 1033518,
        "patrimonyRegie": null
      }
    },
    {
      "fiscalYear": 2014,
      "turnover": 8985962,
      "netProfit": 18717,
      "netLoss": null,
      "employees": 94,
      "currency": "RON",
      "summary": {
        "totalRevenue": 9230644,
        "totalExpenses": 9206806,
        "grossProfit": 23838,
        "grossLoss": 0,
        "receivables": 1292649,
        "currentAssets": 2605642,
        "fixedAssets": 1544141,
        "cashAndBank": 91280,
        "prepaidExpenses": null,
        "deferredIncome": null,
        "subscribedCapital": 1000,
        "inventories": 1221713,
        "debts": 3119259,
        "provisions": null,
        "totalEquity": 1030524,
        "patrimonyRegie": null
      }
    },
    {
      "fiscalYear": 2013,
      "turnover": 5348411,
      "netProfit": 109400,
      "netLoss": null,
      "employees": 75,
      "currency": "RON",
      "summary": {
        "totalRevenue": 5661979,
        "totalExpenses": 5532498,
        "grossProfit": 129481,
        "grossLoss": 0,
        "receivables": 1453368,
        "currentAssets": 3424117,
        "fixedAssets": 1326363,
        "cashAndBank": 34509,
        "prepaidExpenses": null,
        "deferredIncome": null,
        "subscribedCapital": 1000,
        "inventories": 1936240,
        "debts": 3971589,
        "provisions": null,
        "totalEquity": 778891,
        "patrimonyRegie": null
      }
    },
    {
      "fiscalYear": 2012,
      "turnover": 10746591,
      "netProfit": 128515,
      "netLoss": null,
      "employees": 103,
      "currency": "RON",
      "summary": {
        "totalRevenue": 10819468,
        "totalExpenses": 10670030,
        "grossProfit": 149438,
        "grossLoss": 0,
        "receivables": 2227772,
        "currentAssets": 4351612,
        "fixedAssets": 1440354,
        "cashAndBank": 11682,
        "prepaidExpenses": null,
        "deferredIncome": null,
        "subscribedCapital": 1000,
        "inventories": 2112158,
        "debts": 5122475,
        "provisions": null,
        "totalEquity": 669491,
        "patrimonyRegie": null
      }
    },
    {
      "fiscalYear": 2011,
      "turnover": 8653374,
      "netProfit": 106519,
      "netLoss": null,
      "employees": 63,
      "currency": "RON",
      "summary": {
        "totalRevenue": 8761057,
        "totalExpenses": 8633132,
        "grossProfit": 127925,
        "grossLoss": 0,
        "receivables": 1027880,
        "currentAssets": 2275270,
        "fixedAssets": 1646311,
        "cashAndBank": 12613,
        "prepaidExpenses": null,
        "deferredIncome": null,
        "subscribedCapital": 1000,
        "inventories": 1234777,
        "debts": 3380605,
        "provisions": null,
        "totalEquity": 540976,
        "patrimonyRegie": null
      }
    },
    {
      "fiscalYear": 2010,
      "turnover": 3246457,
      "netProfit": 51261,
      "netLoss": null,
      "employees": 50,
      "currency": "RON",
      "summary": {
        "totalRevenue": 3268891,
        "totalExpenses": 3197153,
        "grossProfit": 71738,
        "grossLoss": null,
        "receivables": 1077630,
        "currentAssets": 2138032,
        "fixedAssets": 550924,
        "cashAndBank": 54924,
        "prepaidExpenses": 14986,
        "deferredIncome": null,
        "subscribedCapital": 1000,
        "inventories": 1005478,
        "debts": 2269485,
        "provisions": null,
        "totalEquity": 434457,
        "patrimonyRegie": null
      }
    },
    {
      "fiscalYear": 2009,
      "turnover": 5233798,
      "netProfit": 53164,
      "netLoss": null,
      "employees": 64,
      "currency": "RON",
      "summary": {
        "totalRevenue": 5107613,
        "totalExpenses": 5021503,
        "grossProfit": 86110,
        "grossLoss": null,
        "receivables": 604728,
        "currentAssets": 1378062,
        "fixedAssets": 463511,
        "cashAndBank": 21381,
        "prepaidExpenses": 338,
        "deferredIncome": null,
        "subscribedCapital": 1000,
        "inventories": 751953,
        "debts": 1477883,
        "provisions": null,
        "totalEquity": 364028,
        "patrimonyRegie": null
      }
    },
    {
      "fiscalYear": 2008,
      "turnover": 2434837,
      "netProfit": 309864,
      "netLoss": null,
      "employees": 50,
      "currency": "RON",
      "summary": {
        "totalRevenue": 2660108,
        "totalExpenses": 2294665,
        "grossProfit": 365443,
        "grossLoss": null,
        "receivables": 259672,
        "currentAssets": 799571,
        "fixedAssets": 507578,
        "cashAndBank": 38322,
        "prepaidExpenses": null,
        "deferredIncome": null,
        "subscribedCapital": 1000,
        "inventories": 501577,
        "debts": 996285,
        "provisions": null,
        "totalEquity": 310864,
        "patrimonyRegie": null
      }
    }
  ],
  "financialTrajectory": {
    "fromYear": 2024,
    "toYear": 2025,
    "turnoverDelta": -25516601,
    "netResultDelta": -27976309,
    "employeesDelta": -90
  },
  "publicMoney": {
    "totalRon": 517828448.99,
    "flowCount": 99,
    "byFlowType": [
      {
        "flowType": "procurement_contract",
        "totalRon": 514455024.39,
        "count": 70
      },
      {
        "flowType": "direct_acquisition",
        "totalRon": 3373424.6,
        "count": 29
      }
    ],
    "byYear": [
      {
        "year": 2025,
        "flowType": "procurement_contract",
        "totalRon": 36413180,
        "count": 2
      },
      {
        "year": 2025,
        "flowType": "direct_acquisition",
        "totalRon": 262349.42,
        "count": 1
      },
      {
        "year": 2024,
        "flowType": "procurement_contract",
        "totalRon": 11003021.65,
        "count": 6
      },
      {
        "year": 2024,
        "flowType": "direct_acquisition",
        "totalRon": 1139107.67,
        "count": 3
      },
      {
        "year": 2023,
        "flowType": "procurement_contract",
        "totalRon": 265219868.14,
        "count": 15
      },
      {
        "year": 2023,
        "flowType": "direct_acquisition",
        "totalRon": 765875.29,
        "count": 4
      },
      {
        "year": 2022,
        "flowType": "procurement_contract",
        "totalRon": 492056,
        "count": 6
      },
      {
        "year": 2022,
        "flowType": "direct_acquisition",
        "totalRon": 145019.76,
        "count": 2
      },
      {
        "year": 2021,
        "flowType": "procurement_contract",
        "totalRon": 156262222.14,
        "count": 13
      },
      {
        "year": 2021,
        "flowType": "direct_acquisition",
        "totalRon": 165333.87,
        "count": 9
      },
      {
        "year": 2020,
        "flowType": "direct_acquisition",
        "totalRon": 9151.55,
        "count": 1
      },
      {
        "year": 2020,
        "flowType": "procurement_contract",
        "totalRon": 0,
        "count": 2
      },
      {
        "year": 2019,
        "flowType": "procurement_contract",
        "totalRon": 4782261.89,
        "count": 5
      },
      {
        "year": 2019,
        "flowType": "direct_acquisition",
        "totalRon": 594816.26,
        "count": 5
      },
      {
        "year": 2018,
        "flowType": "procurement_contract",
        "totalRon": 2089145.58,
        "count": 1
      },
      {
        "year": 2018,
        "flowType": "direct_acquisition",
        "totalRon": 11320,
        "count": 1
      },
      {
        "year": 2017,
        "flowType": "procurement_contract",
        "totalRon": 4244038.92,
        "count": 3
      },
      {
        "year": 2017,
        "flowType": "direct_acquisition",
        "totalRon": 225342.9,
        "count": 2
      },
      {
        "year": 2016,
        "flowType": "procurement_contract",
        "totalRon": 4727942.47,
        "count": 3
      },
      {
        "year": 2016,
        "flowType": "direct_acquisition",
        "totalRon": 55107.88,
        "count": 1
      },
      {
        "year": 2015,
        "flowType": "procurement_contract",
        "totalRon": 5356304.79,
        "count": 2
      },
      {
        "year": 2014,
        "flowType": "procurement_contract",
        "totalRon": 4621331,
        "count": 2
      },
      {
        "year": 2011,
        "flowType": "procurement_contract",
        "totalRon": 422670.81,
        "count": 2
      },
      {
        "year": 2010,
        "flowType": "procurement_contract",
        "totalRon": 609200,
        "count": 1
      },
      {
        "year": 2009,
        "flowType": "procurement_contract",
        "totalRon": 1021260,
        "count": 1
      },
      {
        "year": null,
        "flowType": "procurement_contract",
        "totalRon": 17190521,
        "count": 6
      }
    ]
  },
  "sources": [
    {
      "id": "onrc",
      "snapshotDate": "2026-07-18"
    },
    {
      "id": "anaf",
      "snapshotDate": "2026-07-04"
    }
  ]
},
    procurement: {
  "window": {
    "from": "2016-07",
    "to": "2025-09"
  },
  "contracts": {
    "count": 62,
    "withValue": 24,
    "awardedRon": 157532943.19,
    "firstMonth": "2016-07",
    "lastMonth": "2025-09",
    "answerability": "degraded"
  },
  "directAcquisitions": {
    "count": 29,
    "withValue": 29,
    "awardedRon": 3373424.6,
    "firstMonth": "2016-12",
    "lastMonth": "2025-04",
    "answerability": "served"
  },
  "topAuthorities": {
    "contract": [
      {
        "cui": "4112945",
        "name": "MUNICIPIUL DOROHOI",
        "amountRon": 21177745.08,
        "count": 1,
        "amountMissing": 0,
        "share": 0.1344
      },
      {
        "cui": "3372173",
        "name": "Direcţia de Asistenţă Socială",
        "amountRon": 19875039.06,
        "count": 1,
        "amountMissing": 0,
        "share": 0.1262
      },
      {
        "cui": "4716763",
        "name": "COMUNA BREBENI",
        "amountRon": 16829837.0,
        "count": 1,
        "amountMissing": 0,
        "share": 0.1068
      },
      {
        "cui": "4353269",
        "name": "Primăria Orașului Comănești - Direcția de Asistență Socială",
        "amountRon": 16123277.0,
        "count": 1,
        "amountMissing": 0,
        "share": 0.1023
      },
      {
        "cui": "2612936",
        "name": "COMUNA COSTISA",
        "amountRon": 13596909.0,
        "count": 1,
        "amountMissing": 0,
        "share": 0.0863
      },
      {
        "cui": "4326833",
        "name": "COMUNA HORODNICENI",
        "amountRon": 12538982.0,
        "count": 1,
        "amountMissing": 0,
        "share": 0.0796
      },
      {
        "cui": "4327510",
        "name": "COMUNA UDESTI",
        "amountRon": 10708145.08,
        "count": 1,
        "amountMissing": 0,
        "share": 0.068
      },
      {
        "cui": "4244180",
        "name": "ORASUL SALCEA",
        "amountRon": 6718086.66,
        "count": 1,
        "amountMissing": 0,
        "share": 0.0426
      },
      {
        "cui": "3373403",
        "name": "Primăria Orașului Ștefănești - Direcția Asistență Socială",
        "amountRon": 5716001.65,
        "count": 1,
        "amountMissing": 0,
        "share": 0.0363
      },
      {
        "cui": "4326922",
        "name": "COMUNA TODIRESTI",
        "amountRon": 5002298.14,
        "count": 1,
        "amountMissing": 0,
        "share": 0.0318
      }
    ],
    "directAcquisition": [
      {
        "cui": "13727320",
        "name": "SPITALUL MUNICIPAL ACADEMICIAN LEON DANAILA DOROHOI",
        "amountRon": 982864.84,
        "count": 4,
        "amountMissing": 0,
        "share": 0.2914
      },
      {
        "cui": "4244180",
        "name": "ORASUL SALCEA",
        "amountRon": 694946.24,
        "count": 3,
        "amountMissing": 0,
        "share": 0.206
      },
      {
        "cui": "3503686",
        "name": "Primăria Comunei Văculești - Compartiment Asistenţă Socială și Autoritate Tutelară",
        "amountRon": 629292.32,
        "count": 2,
        "amountMissing": 0,
        "share": 0.1865
      },
      {
        "cui": "3433890",
        "name": "Primăria Comunei Bălușeni - Serviciul Public de Asistență Socială",
        "amountRon": 584827.86,
        "count": 8,
        "amountMissing": 0,
        "share": 0.1734
      },
      {
        "cui": "4541068",
        "name": "Primăria Orașului Târgu Frumos - Direcția de Asistenţă Socială",
        "amountRon": 221104.65,
        "count": 1,
        "amountMissing": 0,
        "share": 0.0655
      },
      {
        "cui": "3337613",
        "name": "Primăria Comunei Codăeşti  - Compartiment Asistenţă Socială",
        "amountRon": 83014.27,
        "count": 1,
        "amountMissing": 0,
        "share": 0.0246
      },
      {
        "cui": "25110165",
        "name": "SCOALA GIMNAZIALA NR. 1 GORBANESTI",
        "amountRon": 80472.6,
        "count": 1,
        "amountMissing": 0,
        "share": 0.0239
      },
      {
        "cui": "26161230",
        "name": "NOVA APASERV SA",
        "amountRon": 68452.12,
        "count": 4,
        "amountMissing": 0,
        "share": 0.0203
      },
      {
        "cui": "25254683",
        "name": "SCOALA GIMNAZIALA NR. 1 RACHITI",
        "amountRon": 13389.8,
        "count": 2,
        "amountMissing": 0,
        "share": 0.004
      },
      {
        "cui": "3373527",
        "name": "Primăria Comunei Gorbănești - Compartiment Asistență Socială",
        "amountRon": 11320.0,
        "count": 1,
        "amountMissing": 0,
        "share": 0.0034
      }
    ]
  },
  "topCategories": {
    "contract": [
      {
        "code": "45",
        "labelRo": "Lucrări de construcţii",
        "labelEn": "Construction work",
        "amountRon": 157532943.19,
        "count": 62,
        "share": 1.0
      }
    ],
    "directAcquisition": [
      {
        "code": "45",
        "labelRo": "Lucrări de construcţii",
        "labelEn": "Construction work",
        "amountRon": 2241616.87,
        "count": 15,
        "share": 0.6645
      },
      {
        "code": "44",
        "labelRo": "Structuri şi materiale de construcţii; produse auxiliare pentru construcţii (cu excepţia aparatelor electrice)",
        "labelEn": "Construction structures and materials; auxiliary products",
        "amountRon": 720796.24,
        "count": 6,
        "share": 0.2137
      },
      {
        "code": "71",
        "labelRo": "Servicii de arhitectură, de construcţii, de inginerie şi de inspecţie",
        "labelEn": "Architectural, construction, engineering and inspection services",
        "amountRon": 262349.42,
        "count": 1,
        "share": 0.0778
      },
      {
        "code": "39",
        "labelRo": "Mobilă (inclusiv mobilă de birou), accesorii de mobilier, aparate de uz casnic (exclusiv dispozitive de iluminat) şi produse de curăţat",
        "labelEn": "Furniture, furnishings, domestic appliances and cleaning products",
        "amountRon": 83019.37,
        "count": 2,
        "share": 0.0246
      },
      {
        "code": "37",
        "labelRo": "Instrumente muzicale, articole sportive, jocuri, jucării, obiecte de artizanat, obiecte de artă şi accesorii",
        "labelEn": "Musical instruments, sport goods, games and toys",
        "amountRon": 36344.0,
        "count": 1,
        "share": 0.0108
      },
      {
        "code": "30",
        "labelRo": "Echipament informatic şi accesorii de birou, cu excepţia mobilierului şi a pachetelor software",
        "labelEn": "Office and computing machinery, equipment and supplies",
        "amountRon": 21300.0,
        "count": 1,
        "share": 0.0063
      },
      {
        "code": "50",
        "labelRo": "Servicii de reparare şi întreţinere",
        "labelEn": "Repair and maintenance services",
        "amountRon": 3213.8,
        "count": 1,
        "share": 0.001
      },
      {
        "code": "34",
        "labelRo": "Echipament de transport şi produse auxiliare pentru transport",
        "labelEn": "Transport equipment and auxiliary products to transportation",
        "amountRon": 2739.9,
        "count": 1,
        "share": 0.0008
      },
      {
        "code": "35",
        "labelRo": "Echipament de securitate, de luptă împotriva incendiilor, de poliţie şi de apărare",
        "labelEn": "Security, fire-fighting, police and defence equipment",
        "amountRon": 2045.0,
        "count": 1,
        "share": 0.0006
      }
    ]
  },
  "recent": [
    {
      "id": "2311757",
      "grain": "contract",
      "title": "Executie lucrări pentru obiectivul „Extindere retea de canalizare in comuna Brebeni, judetul Olt”",
      "authority": {
        "cui": "4716763",
        "name": "COMUNA BREBENI"
      },
      "valueRon": 16829837.0,
      "date": "2025-09-07",
      "cpvDivision": "45"
    },
    {
      "id": "2201487",
      "grain": "contract",
      "title": "MODERNIZARE SI EXTINDERE RETELE HIRDROEDILITARE, COMUNA SEICA MARE, JUDETUL SIBIU",
      "authority": {
        "cui": "4241052",
        "name": "COMUNA SEICA MARE (CONSILIUL LOCAL SEICA MARE)"
      },
      "valueRon": 19583343.0,
      "date": "2025-05-26",
      "cpvDivision": "45"
    },
    {
      "id": "14547799",
      "grain": "direct_acquisition",
      "title": "Bransamente energie instalatii si canalizare spalatorie",
      "authority": {
        "cui": "13727320",
        "name": "SPITALUL MUNICIPAL DOROHOI"
      },
      "valueRon": 262349.42,
      "date": "2025-04-03",
      "cpvDivision": "71"
    },
    {
      "id": "1911033",
      "grain": "contract",
      "title": "Executie lucrări de modernizare clădire la sediul CNCIR SA - Sucursala Regionala MOLDOVA- Punct de lucru Bacău",
      "authority": {
        "cui": "27787860",
        "name": "CNCIR - COMPANIA NATIONALA PENTRU CONTROLUL CAZANELOR, INSTALATIILOR DE RIDICAT SI RECIPIENTELOR SUB PRESIUNE S.A."
      },
      "valueRon": 3312419.0,
      "date": "2024-12-16",
      "cpvDivision": "45"
    },
    {
      "id": "1951939",
      "grain": "contract",
      "title": "Executie lucrari \"Reabilitare camin cultiral in comuna Odoreu\"",
      "authority": {
        "cui": "3897424",
        "name": "Comuna Odoreu (Consiliul Local al comunei Odoreu)"
      },
      "valueRon": 1974601.0,
      "date": "2024-11-19",
      "cpvDivision": "45"
    },
    {
      "id": "8834493",
      "grain": "direct_acquisition",
      "title": "Bransament instalatii termice - Pavilion Chirurgie si Pavilion Interne",
      "authority": {
        "cui": "13727320",
        "name": "SPITALUL MUNICIPAL ACADEMICIAN LEON DANAILA DOROHOI"
      },
      "valueRon": 485294.41,
      "date": "2024-08-28",
      "cpvDivision": "45"
    },
    {
      "id": "1938967",
      "grain": "contract",
      "title": "Servicii de proiectare faza Proiect Tehnic, asistență tehnică din partea proiectantului și execuție lucrări pentru proiectul de investiții ”INFIINTARE RETEA INTELIGENTA DE DISTRIBUTIE GAZE NATURALE IN COMUNA RACHITI, JUDETUL BOTOSANI”.",
      "authority": {
        "cui": "3372106",
        "name": "COMUNA RACHITI (PRIMARIA RACHITI)"
      },
      "valueRon": 37446215.0,
      "date": "2024-08-02",
      "cpvDivision": "45"
    },
    {
      "id": "8554722",
      "grain": "direct_acquisition",
      "title": "Lucrări de amenajare exterioară sală de sport Văculești",
      "authority": {
        "cui": "3503686",
        "name": "COMUNA VACULESTI"
      },
      "valueRon": 451292.25,
      "date": "2024-05-23",
      "cpvDivision": "45"
    },
    {
      "id": "2096726",
      "grain": "contract",
      "title": "Servicii de proiectare (PTh + DE și Asistență Tehnică din partea proiectantului), Execuție lucrări și Furnizare Dotări, pentru obiectivul de investiții: “Locuințe pentru tineri care provin din grupuri/comunități vulnerabile la nivelul Municipiului Botoșani“ PNRR/2022/I2, Runda 1",
      "authority": {
        "cui": "3372882",
        "name": "MUNICIPIUL BOTOSANI"
      },
      "valueRon": 31615314.0,
      "date": "2024-04-10",
      "cpvDivision": "45"
    },
    {
      "id": "1792879",
      "grain": "contract",
      "title": "Servicii de proiectare (PTh + DE și Asistență Tehnică din partea proiectantului), Execuție lucrări și Furnizare Dotări, pentru obiectivul de investiții: “Locuințe pentru tineri care provin din grupuri/comunități vulnerabile la nivelul Municipiului Botoșani“ PNRR/2022/I2, Runda 1",
      "authority": {
        "cui": "3372882",
        "name": "MUNICIPIUL BOTOSANI"
      },
      "valueRon": 28826716.0,
      "date": "2024-04-10",
      "cpvDivision": "45"
    },
    {
      "id": "51552779",
      "grain": "contract",
      "title": "Eficienta energetica a cladirilor Liceului Stefan D. Luchian pentru reducerea consumului de resurse, orasul Stefanesti, judetul Botosani",
      "authority": {
        "cui": "3373403",
        "name": "Orasul Stefanesti"
      },
      "valueRon": 5716001.65,
      "date": "2024-03-13",
      "cpvDivision": "45"
    },
    {
      "id": "17553136",
      "grain": "direct_acquisition",
      "title": "Reabilitare canalizare principala",
      "authority": {
        "cui": "13727320",
        "name": "SPITALUL MUNICIPAL ACADEMICIAN LEON DANAILA DOROHOI"
      },
      "valueRon": 202521.01,
      "date": "2024-03-06",
      "cpvDivision": "45"
    },
    {
      "id": "1705189",
      "grain": "contract",
      "title": "Execuție lucrări pentru obiectivul de investiții, ”Eficientizarea energetică a blocurilor de locuințe din orașul Comănești, Asociația de Proprietari ”Azur” nr. 6: Str. Republicii Bl. A (sc A+B), A1 (sc A+B), bl. B1, B2, B3, B4, B5, B6, B7, B8”, C5- A 3.1-9",
      "authority": {
        "cui": "4353269",
        "name": "ORASUL COMANESTI"
      },
      "valueRon": 16123277.0,
      "date": "2023-12-15",
      "cpvDivision": "45"
    },
    {
      "id": "51078962",
      "grain": "contract",
      "title": "Continuare lucrari pentru finalizarea obiectivului \"Alimentare cu apa sat Todiresti, Comuna Todiresti, judetul Suceava\"",
      "authority": {
        "cui": "4326922",
        "name": "COMUNA TODIRESTI"
      },
      "valueRon": 5002298.14,
      "date": "2023-12-10",
      "cpvDivision": "45"
    },
    {
      "id": "1686523",
      "grain": "contract",
      "title": "RETELE HIDROEDILITARE, COMUNA CAINENI, JUDETUL VALCEA",
      "authority": {
        "cui": "2541681",
        "name": "Comuna Caineni"
      },
      "valueRon": 21356880.0,
      "date": "2023-11-29",
      "cpvDivision": "45"
    },
    {
      "id": "1693815",
      "grain": "contract",
      "title": "Contract de achiziție publică - lucrări aferente obiectivului de investiții “Complex Corecțional Penitenciarul Botoșani,”",
      "authority": {
        "cui": "3503538",
        "name": "PENITENCIARUL BOTOSANI"
      },
      "valueRon": 30801738.0,
      "date": "2023-11-27",
      "cpvDivision": "45"
    },
    {
      "id": "1619520",
      "grain": "contract",
      "title": "Extindere retea de canalizare in comuna Costisa, judetul Neamt",
      "authority": {
        "cui": "2612936",
        "name": "COMUNA COSTISA"
      },
      "valueRon": 13596909.0,
      "date": "2023-11-01",
      "cpvDivision": "45"
    },
    {
      "id": "7917263",
      "grain": "direct_acquisition",
      "title": "Platforma Stocator Oxigen",
      "authority": {
        "cui": "13727320",
        "name": "SPITALUL MUNICIPAL ACADEMICIAN LEON DANAILA DOROHOI"
      },
      "valueRon": 32700.0,
      "date": "2023-10-27",
      "cpvDivision": "45"
    },
    {
      "id": "1563664",
      "grain": "contract",
      "title": "Executie lucrari aferente obiectivului de investitii: \" Rețele de alimentare cu apă și canalizare în comuna Horodniceni, județul Suceava \"",
      "authority": {
        "cui": "4326833",
        "name": "COMUNA HORODNICENI"
      },
      "valueRon": 12538982.0,
      "date": "2023-10-10",
      "cpvDivision": "45"
    },
    {
      "id": "1561101",
      "grain": "contract",
      "title": "Servicii de proiectare, asistenta tehnica din partea proiectantului, executie lucrari și dotarea cu echipamente și mobilier specific în vederea realizarii proiectului „CREȘTEREA EFICIENTEI ENERGETICE ȘI GESTIONAREA INTELIGENTĂ A ENERGIEI LA ȘCOALA GIMNAZIALĂ HĂLCENI, COMUNA ȘIPOTE, JUDEȚUL IAȘI”",
      "authority": {
        "cui": "4540291",
        "name": "Comuna Sipote"
      },
      "valueRon": 4581974.0,
      "date": "2023-10-06",
      "cpvDivision": "45"
    }
  ]
},
  },
  'profi': {
    profile: {
  "organizationId": "org:99129",
  "cui": "11607939",
  "codInmatriculare": "J1999000239354",
  "legalName": "PROFI ROM FOOD SRL",
  "legalForm": "SRL",
  "registrationDate": "1999-03-11",
  "status": {
    "code": "1084",
    "label": "radiată"
  },
  "address": {
    "display": "",
    "county": "Timiş",
    "locality": "Municipiul Timişoara"
  },
  "geography": {
    "uatSirutaCode": "155243",
    "uatName": "Municipiul Timişoara",
    "countyName": "Timiş",
    "matchConfidence": "safe"
  },
  "caenActivities": [
    {
      "code": "1011",
      "rev": "rev3",
      "label": "Prelucrarea și conservarea cărnii",
      "source": "onrc"
    },
    {
      "code": "1071",
      "rev": "rev3",
      "label": "Fabricarea pâinii; fabricarea prăjiturilor și a produselor proaspete de patiserie",
      "source": "onrc"
    },
    {
      "code": "3811",
      "rev": "rev3",
      "label": "Colectarea deșeurilor nepericuloase",
      "source": "onrc"
    },
    {
      "code": "3821",
      "rev": "rev3",
      "label": "Recuperarea materialelor reciclabile",
      "source": "onrc"
    },
    {
      "code": "4617",
      "rev": "rev3",
      "label": "Intermedieri în comerțul cu produse alimentare, băuturi și tutun",
      "source": "onrc"
    },
    {
      "code": "4619",
      "rev": "rev3",
      "label": "Intermedieri în comerțul cu produse diverse",
      "source": "onrc"
    },
    {
      "code": "4621",
      "rev": "rev3",
      "label": "Comerț cu ridicata al cerealelor, semințelor, furajelor și tutunului neprelucrat",
      "source": "onrc"
    },
    {
      "code": "4631",
      "rev": "rev3",
      "label": "Comerț cu ridicata al fructelor și legumelor",
      "source": "onrc"
    },
    {
      "code": "4632",
      "rev": "rev3",
      "label": "Comerț cu ridicata al cărnii și produselor din carne, pește și produse din pește, crustacee și moluște",
      "source": "onrc"
    },
    {
      "code": "4633",
      "rev": "rev3",
      "label": "Comerț cu ridicata al produselor lactate, ouălor, uleiurilor și grăsimilor comestibile",
      "source": "onrc"
    },
    {
      "code": "4634",
      "rev": "rev3",
      "label": "Comerț cu ridicata al băuturilor",
      "source": "onrc"
    },
    {
      "code": "4635",
      "rev": "rev3",
      "label": "Comerț cu ridicata al produselor din tutun",
      "source": "onrc"
    },
    {
      "code": "4636",
      "rev": "rev3",
      "label": "Comerț cu ridicata al zahărului, ciocolatei și produselor zaharoase",
      "source": "onrc"
    },
    {
      "code": "4637",
      "rev": "rev3",
      "label": "Comerț cu ridicata cu cafea, ceai, cacao și condimente",
      "source": "onrc"
    },
    {
      "code": "4638",
      "rev": "rev3",
      "label": "Comerț cu ridicata specializat al altor alimente",
      "source": "onrc"
    },
    {
      "code": "4639",
      "rev": "rev3",
      "label": "Comerț cu ridicata nespecializat de produse alimentare, băuturi și tutun",
      "source": "onrc"
    },
    {
      "code": "4641",
      "rev": "rev3",
      "label": "Comerț cu ridicata al produselor textile",
      "source": "onrc"
    },
    {
      "code": "4642",
      "rev": "rev3",
      "label": "Comerț cu ridicata al îmbrăcămintei și încălțămintei",
      "source": "onrc"
    },
    {
      "code": "4643",
      "rev": "rev3",
      "label": "Comerț cu ridicata al aparatelor electrice de uz gospodăresc, al aparatelor de radio și televizoarelor",
      "source": "onrc"
    },
    {
      "code": "4644",
      "rev": "rev3",
      "label": "Comerț cu ridicata al produselor din ceramică, sticlărie, și produse de întreținere",
      "source": "onrc"
    },
    {
      "code": "4645",
      "rev": "rev3",
      "label": "Comerț cu ridicata al produselor cosmetice și de parfumerie",
      "source": "onrc"
    },
    {
      "code": "4646",
      "rev": "rev3",
      "label": "Comerț cu ridicata al produselor farmaceutice și medicale",
      "source": "onrc"
    },
    {
      "code": "4647",
      "rev": "rev3",
      "label": "Comerț cu ridicata al mobilei (inclusiv de birou și pentru magazine), covoarelor și a articolelor de iluminat",
      "source": "onrc"
    },
    {
      "code": "4690",
      "rev": "rev3",
      "label": "Comerț cu ridicata nespecializat",
      "source": "onrc"
    },
    {
      "code": "4711",
      "rev": "rev3",
      "label": "Comerț cu amănuntul nespecializat, cu vânzare predominantă de produse alimentare, băuturi și tutun",
      "source": "onrc"
    },
    {
      "code": "4711",
      "rev": null,
      "label": null,
      "source": "anaf"
    },
    {
      "code": "4712",
      "rev": "rev3",
      "label": "Comerț cu amănuntul nespecializat, cu vânzare predominantă de produse nealimentare",
      "source": "onrc"
    },
    {
      "code": "4721",
      "rev": "rev3",
      "label": "Comerț cu amănuntul al fructelor și legumelor proaspete",
      "source": "onrc"
    },
    {
      "code": "4722",
      "rev": "rev3",
      "label": "Comerț cu amănuntul al cărnii și al produselor din carne",
      "source": "onrc"
    },
    {
      "code": "4723",
      "rev": "rev3",
      "label": "Comerț cu amănuntul al peștelui, crustaceelor și moluștelor",
      "source": "onrc"
    },
    {
      "code": "4724",
      "rev": "rev3",
      "label": "Comerț cu amănuntul al pâinii, produselor de patiserie și produselor zaharoase",
      "source": "onrc"
    },
    {
      "code": "4725",
      "rev": "rev3",
      "label": "Comerț cu amănuntul al băuturilor",
      "source": "onrc"
    },
    {
      "code": "4726",
      "rev": "rev3",
      "label": "Comerț cu amănuntul al produselor din tutun",
      "source": "onrc"
    },
    {
      "code": "4727",
      "rev": "rev3",
      "label": "Comerț cu amănuntul al altor produse alimentare",
      "source": "onrc"
    },
    {
      "code": "4740",
      "rev": "rev3",
      "label": "Comerț cu amănuntul al echipamentului informatic și de telecomunicații",
      "source": "onrc"
    },
    {
      "code": "4751",
      "rev": "rev3",
      "label": "Comerț cu amănuntul al textilelor",
      "source": "onrc"
    },
    {
      "code": "4752",
      "rev": "rev3",
      "label": "Comerț cu amănuntul al articolelor de fierărie, al materialelor de construcții, al articolelor din sticlă și a celor pentru vopsit",
      "source": "onrc"
    },
    {
      "code": "4754",
      "rev": "rev3",
      "label": "Comerț cu amănuntul al articolelor și aparatelor electrocasnice",
      "source": "onrc"
    },
    {
      "code": "4755",
      "rev": "rev3",
      "label": "Comerț cu amănuntul al mobilei, al articolelor de iluminat și al altor articole de uz casnic n.c.a.",
      "source": "onrc"
    },
    {
      "code": "4761",
      "rev": "rev3",
      "label": "Comerț cu amănuntul al cărților",
      "source": "onrc"
    },
    {
      "code": "4762",
      "rev": "rev3",
      "label": "Comerț cu amănuntul al ziarelor și articolelor de papetărie",
      "source": "onrc"
    },
    {
      "code": "4763",
      "rev": "rev3",
      "label": "Comerț cu amănuntul al echipamentelor sportive",
      "source": "onrc"
    },
    {
      "code": "4764",
      "rev": "rev3",
      "label": "Comerț cu amănuntul al jocurilor și jucăriilor",
      "source": "onrc"
    },
    {
      "code": "4769",
      "rev": "rev3",
      "label": "Comerț cu amănuntul de bunuri culturale și recreative n.c.a.",
      "source": "onrc"
    },
    {
      "code": "4771",
      "rev": "rev3",
      "label": "Comerț cu amănuntul al îmbrăcămintei",
      "source": "onrc"
    },
    {
      "code": "4772",
      "rev": "rev3",
      "label": "Comerț cu amănuntul al încălțămintei și articolelor din piele",
      "source": "onrc"
    },
    {
      "code": "4773",
      "rev": "rev3",
      "label": "Comerț cu amănuntul al produselor farmaceutice",
      "source": "onrc"
    },
    {
      "code": "4774",
      "rev": "rev3",
      "label": "Comerț cu amănuntul al articolelor medicale și ortopedice",
      "source": "onrc"
    },
    {
      "code": "4775",
      "rev": "rev3",
      "label": "Comerț cu amănuntul al produselor cosmetice și de parfumerie",
      "source": "onrc"
    },
    {
      "code": "4776",
      "rev": "rev3",
      "label": "Comerț cu amănuntul al florilor, plantelor și semințelor; comerț cu amănuntul al animalelor de companie și a hranei pentru acestea",
      "source": "onrc"
    },
    {
      "code": "4777",
      "rev": "rev3",
      "label": "Comerț cu amănuntul al ceasurilor și bijuteriilor",
      "source": "onrc"
    },
    {
      "code": "4778",
      "rev": "rev3",
      "label": "Comerț cu amănuntul al altor bunuri noi",
      "source": "onrc"
    },
    {
      "code": "4779",
      "rev": "rev3",
      "label": "Comerț cu amănuntul al bunurilor de ocazie",
      "source": "onrc"
    },
    {
      "code": "4781",
      "rev": "rev2",
      "label": "Comerț cu amănuntul al produselor alimentare, băuturilor și produselor din tutun efectuat prin standuri, chioșcuri și piețe",
      "source": "onrc"
    },
    {
      "code": "4782",
      "rev": "rev3",
      "label": "Comerț cu amănuntul al pieselor și accesoriilor pentru autovehicule",
      "source": "onrc"
    },
    {
      "code": "4789",
      "rev": "rev2",
      "label": "Comerț cu amănuntul prin standuri, chioșcuri și piețe al altor produse",
      "source": "onrc"
    },
    {
      "code": "4799",
      "rev": "rev2",
      "label": "Comerț cu amănuntul efectuat în afara  magazinelor, standurilor, chioșcurilor și piețelor",
      "source": "onrc"
    },
    {
      "code": "5210",
      "rev": "rev3",
      "label": "Depozitări",
      "source": "onrc"
    },
    {
      "code": "5224",
      "rev": "rev3",
      "label": "Manipulări",
      "source": "onrc"
    },
    {
      "code": "5610",
      "rev": "rev2",
      "label": "Restaurante",
      "source": "onrc"
    },
    {
      "code": "5611",
      "rev": "rev3",
      "label": "Restaurante",
      "source": "onrc"
    },
    {
      "code": "6820",
      "rev": "rev2",
      "label": "Închirierea și subînchirierea bunurilor imobiliare proprii sau închiriate",
      "source": "onrc"
    },
    {
      "code": "6820",
      "rev": "rev3",
      "label": "închirierea și subînchirierea bunurilor imobiliare proprii sau închiriate",
      "source": "onrc"
    },
    {
      "code": "7010",
      "rev": "rev3",
      "label": "Activități ale direcțiilor(centralelor), birourilor administrative centralizate",
      "source": "onrc"
    },
    {
      "code": "7311",
      "rev": "rev3",
      "label": "Activități ale agențiilor de publicitate",
      "source": "onrc"
    },
    {
      "code": "7320",
      "rev": "rev3",
      "label": "Activități de studiere a pieței și de sondare a opiniei publice",
      "source": "onrc"
    },
    {
      "code": "7734",
      "rev": "rev3",
      "label": "Activități de închiriere și leasing cu echipamente de transport pe apă",
      "source": "onrc"
    },
    {
      "code": "8240",
      "rev": "rev3",
      "label": "Activități de intermediere pentru servicii suport pentru întreprinderi n.c.a.",
      "source": "onrc"
    },
    {
      "code": "8291",
      "rev": "rev3",
      "label": "Activități ale agențiilor de colectare și ale birourilor (oficiilor) de raportare a creditului",
      "source": "onrc"
    },
    {
      "code": "8299",
      "rev": "rev3",
      "label": "Alte activități de servicii suport pentru întreprinderi n.c.a.",
      "source": "onrc"
    },
    {
      "code": "8559",
      "rev": "rev3",
      "label": "Alte forme de învățământ n.c.a.",
      "source": "onrc"
    },
    {
      "code": "8561",
      "rev": "rev3",
      "label": "Activități de intermediere pentru cursuri și tutori (îndrumători, profesori)",
      "source": "onrc"
    },
    {
      "code": "9200",
      "rev": "rev3",
      "label": "Activități de jocuri de noroc și pariuri",
      "source": "onrc"
    },
    {
      "code": "9699",
      "rev": "rev3",
      "label": "Alte servicii personale n.c.a.",
      "source": "onrc"
    }
  ],
  "representatives": [],
  "euBranches": [],
  "fiscal": {
    "vatPayer": false,
    "inactive": false,
    "anafFound": true,
    "asOfDate": "2026-07-03",
    "fiscalCaen": {
      "code": "4711",
      "rev": null
    }
  },
  "financials": [
    {
      "fiscalYear": 2025,
      "turnover": 14479515071,
      "netProfit": null,
      "netLoss": 537236094,
      "employees": 4337,
      "currency": "RON",
      "summary": {
        "totalRevenue": 15384886846,
        "totalExpenses": 15768666653,
        "grossProfit": 0,
        "grossLoss": 383779807,
        "receivables": 385412171,
        "currentAssets": 2116957611,
        "fixedAssets": 2185872281,
        "cashAndBank": 283334465,
        "prepaidExpenses": 21325075,
        "deferredIncome": 6142125,
        "subscribedCapital": 898633700,
        "inventories": 1448210975,
        "debts": 3566493066,
        "provisions": 78239055,
        "totalEquity": 673280721,
        "patrimonyRegie": 0
      }
    },
    {
      "fiscalYear": 2024,
      "turnover": 14125165995,
      "netProfit": null,
      "netLoss": 209984537,
      "employees": 6072,
      "currency": "RON",
      "summary": {
        "totalRevenue": 14937894815,
        "totalExpenses": 15005624220,
        "grossProfit": 0,
        "grossLoss": 67729405,
        "receivables": 183499113,
        "currentAssets": 1984188333,
        "fixedAssets": 2587356338,
        "cashAndBank": 201605522,
        "prepaidExpenses": 13057358,
        "deferredIncome": 4416876,
        "subscribedCapital": 898633600,
        "inventories": 1599083698,
        "debts": 4411605170,
        "provisions": 48744458,
        "totalEquity": 119835525,
        "patrimonyRegie": 0
      }
    },
    {
      "fiscalYear": 2023,
      "turnover": 12925985296,
      "netProfit": null,
      "netLoss": 213027662,
      "employees": 9944,
      "currency": "RON",
      "summary": {
        "totalRevenue": 13721257567,
        "totalExpenses": 13920784938,
        "grossProfit": 0,
        "grossLoss": 199527371,
        "receivables": 212292800,
        "currentAssets": 2115638573,
        "fixedAssets": 2737211766,
        "cashAndBank": 276179172,
        "prepaidExpenses": 18336545,
        "deferredIncome": 6853469,
        "subscribedCapital": 898633600,
        "inventories": 1627166601,
        "debts": 4451857597,
        "provisions": 82655757,
        "totalEquity": 329820061,
        "patrimonyRegie": 0
      }
    },
    {
      "fiscalYear": 2022,
      "turnover": 11660657559,
      "netProfit": null,
      "netLoss": 285968097,
      "employees": 13714,
      "currency": "RON",
      "summary": {
        "totalRevenue": 12351354370,
        "totalExpenses": 12609129877,
        "grossProfit": 0,
        "grossLoss": 257775507,
        "receivables": 244991482,
        "currentAssets": 2055372354,
        "fixedAssets": 2952007175,
        "cashAndBank": 292329015,
        "prepaidExpenses": 15132037,
        "deferredIncome": 4393551,
        "subscribedCapital": 898633600,
        "inventories": 1518051857,
        "debts": 4270590545,
        "provisions": 204679747,
        "totalEquity": 542847723,
        "patrimonyRegie": 0
      }
    },
    {
      "fiscalYear": 2021,
      "turnover": 9523454500,
      "netProfit": null,
      "netLoss": 130770307,
      "employees": 15980,
      "currency": "RON",
      "summary": {
        "totalRevenue": 10191575038,
        "totalExpenses": 10278938146,
        "grossProfit": 0,
        "grossLoss": 87363108,
        "receivables": 228538893,
        "currentAssets": 1761883523,
        "fixedAssets": 2902717127,
        "cashAndBank": 176904759,
        "prepaidExpenses": 23842109,
        "deferredIncome": 8542955,
        "subscribedCapital": 898633600,
        "inventories": 1356439871,
        "debts": 3696183980,
        "provisions": 154900004,
        "totalEquity": 828815820,
        "patrimonyRegie": 0
      }
    },
    {
      "fiscalYear": 2020,
      "turnover": 8837068812,
      "netProfit": null,
      "netLoss": 124327406,
      "employees": 17979,
      "currency": "RON",
      "summary": {
        "totalRevenue": 9265509233,
        "totalExpenses": 9361465637,
        "grossProfit": 0,
        "grossLoss": 95956404,
        "receivables": 202526333,
        "currentAssets": 1415536384,
        "fixedAssets": 2946584705,
        "cashAndBank": 144255509,
        "prepaidExpenses": 27364483,
        "deferredIncome": 11033797,
        "subscribedCapital": 898633600,
        "inventories": 1068754542,
        "debts": 3302623547,
        "provisions": 116242101,
        "totalEquity": 959586127,
        "patrimonyRegie": 0
      }
    },
    {
      "fiscalYear": 2019,
      "turnover": 7264762866,
      "netProfit": null,
      "netLoss": 35652181,
      "employees": 16277,
      "currency": "RON",
      "summary": {
        "totalRevenue": 7529528836,
        "totalExpenses": 7509229022,
        "grossProfit": 20299814,
        "grossLoss": 0,
        "receivables": 112963058,
        "currentAssets": 1172819911,
        "fixedAssets": 2951007821,
        "cashAndBank": 149055200,
        "prepaidExpenses": 31166867,
        "deferredIncome": 4870268,
        "subscribedCapital": 898633600,
        "inventories": 910801653,
        "debts": 2978389070,
        "provisions": 84741618,
        "totalEquity": 1086993643,
        "patrimonyRegie": 0
      }
    },
    {
      "fiscalYear": 2018,
      "turnover": 5921486806,
      "netProfit": null,
      "netLoss": 90586945,
      "employees": 13578,
      "currency": "RON",
      "summary": {
        "totalRevenue": 6138843840,
        "totalExpenses": 6175944077,
        "grossProfit": 0,
        "grossLoss": 37100237,
        "receivables": 51481128,
        "currentAssets": 837433514,
        "fixedAssets": 3316384105,
        "cashAndBank": 174245090,
        "prepaidExpenses": 39084314,
        "deferredIncome": 5439339,
        "subscribedCapital": 1294297600,
        "inventories": 611707296,
        "debts": 2620312922,
        "provisions": 48839848,
        "totalEquity": 1518309824,
        "patrimonyRegie": null
      }
    },
    {
      "fiscalYear": 2017,
      "turnover": 4730021461,
      "netProfit": 130862984,
      "netLoss": null,
      "employees": 11662,
      "currency": "RON",
      "summary": {
        "totalRevenue": 4873668644,
        "totalExpenses": 4709826072,
        "grossProfit": 163842572,
        "grossLoss": 0,
        "receivables": 25695189,
        "currentAssets": 705687027,
        "fixedAssets": 2913736767,
        "cashAndBank": 273012862,
        "prepaidExpenses": 42137222,
        "deferredIncome": 1576763,
        "subscribedCapital": 27075200,
        "inventories": 406978976,
        "debts": 2008541129,
        "provisions": 42546354,
        "totalEquity": 1608896770,
        "patrimonyRegie": null
      }
    },
    {
      "fiscalYear": 2016,
      "turnover": 3549852949,
      "netProfit": 126848756,
      "netLoss": null,
      "employees": 9469,
      "currency": "RON",
      "summary": {
        "totalRevenue": 3911006139,
        "totalExpenses": 3762739161,
        "grossProfit": 148266978,
        "grossLoss": 0,
        "receivables": 21416691,
        "currentAssets": 590260827,
        "fixedAssets": 545532097,
        "cashAndBank": 194991118,
        "prepaidExpenses": 5902152,
        "deferredIncome": 1212321,
        "subscribedCapital": 43772000,
        "inventories": 373853018,
        "debts": 882652153,
        "provisions": 30322471,
        "totalEquity": 227508131,
        "patrimonyRegie": null
      }
    },
    {
      "fiscalYear": 2015,
      "turnover": 2547961743,
      "netProfit": 52569277,
      "netLoss": null,
      "employees": 7354,
      "currency": "RON",
      "summary": {
        "totalRevenue": 2960489333,
        "totalExpenses": 2898159814,
        "grossProfit": 62329519,
        "grossLoss": 0,
        "receivables": 86452046,
        "currentAssets": 426486260,
        "fixedAssets": 429580182,
        "cashAndBank": 89763319,
        "prepaidExpenses": 5286826,
        "deferredIncome": 3711234,
        "subscribedCapital": 87060000,
        "inventories": 250270895,
        "debts": 615450211,
        "provisions": 23403454,
        "totalEquity": 218788369,
        "patrimonyRegie": null
      }
    },
    {
      "fiscalYear": 2014,
      "turnover": 1844510142,
      "netProfit": 27329239,
      "netLoss": null,
      "employees": 5672,
      "currency": "RON",
      "summary": {
        "totalRevenue": 2135253130,
        "totalExpenses": 2102648862,
        "grossProfit": 32604268,
        "grossLoss": 0,
        "receivables": 77354407,
        "currentAssets": 345832189,
        "fixedAssets": 331514629,
        "cashAndBank": 63328148,
        "prepaidExpenses": 2976767,
        "deferredIncome": 5961826,
        "subscribedCapital": 87060000,
        "inventories": 205149634,
        "debts": 487883799,
        "provisions": 2244460,
        "totalEquity": 184233500,
        "patrimonyRegie": null
      }
    },
    {
      "fiscalYear": 2013,
      "turnover": 1456261116,
      "netProfit": 26873037,
      "netLoss": null,
      "employees": 4440,
      "currency": "RON",
      "summary": {
        "totalRevenue": 1698265236,
        "totalExpenses": 1667464244,
        "grossProfit": 30800992,
        "grossLoss": 0,
        "receivables": 45180758,
        "currentAssets": 256638507,
        "fixedAssets": 258917678,
        "cashAndBank": 48175817,
        "prepaidExpenses": 2745251,
        "deferredIncome": 1177,
        "subscribedCapital": 87060000,
        "inventories": 163281932,
        "debts": 360461355,
        "provisions": 934643,
        "totalEquity": 156904261,
        "patrimonyRegie": null
      }
    },
    {
      "fiscalYear": 2012,
      "turnover": 1155745855,
      "netProfit": 13138974,
      "netLoss": null,
      "employees": 3313,
      "currency": "RON",
      "summary": {
        "totalRevenue": 1320316774,
        "totalExpenses": 1301526482,
        "grossProfit": 18790292,
        "grossLoss": 0,
        "receivables": 41687409,
        "currentAssets": 226547174,
        "fixedAssets": 177294094,
        "cashAndBank": 52213489,
        "prepaidExpenses": 2779713,
        "deferredIncome": 1188,
        "subscribedCapital": 87060000,
        "inventories": 132646276,
        "debts": 274743074,
        "provisions": 1845495,
        "totalEquity": 130031224,
        "patrimonyRegie": null
      }
    },
    {
      "fiscalYear": 2011,
      "turnover": 934039541,
      "netProfit": 13222420,
      "netLoss": null,
      "employees": 2476,
      "currency": "RON",
      "summary": {
        "totalRevenue": 1066168391,
        "totalExpenses": 1048013831,
        "grossProfit": 18154560,
        "grossLoss": 0,
        "receivables": 38900126,
        "currentAssets": 214167053,
        "fixedAssets": 117050103,
        "cashAndBank": 77371690,
        "prepaidExpenses": 2069526,
        "deferredIncome": 5415,
        "subscribedCapital": 87060000,
        "inventories": 97895237,
        "debts": 212778781,
        "provisions": 3610236,
        "totalEquity": 116892250,
        "patrimonyRegie": null
      }
    },
    {
      "fiscalYear": 2010,
      "turnover": 616510105,
      "netProfit": 3626717,
      "netLoss": null,
      "employees": 1492,
      "currency": "RON",
      "summary": {
        "totalRevenue": 707601647,
        "totalExpenses": 698433796,
        "grossProfit": 9167851,
        "grossLoss": null,
        "receivables": 20587503,
        "currentAssets": 121158246,
        "fixedAssets": 93947333,
        "cashAndBank": 35471293,
        "prepaidExpenses": 1374260,
        "deferredIncome": 7522,
        "subscribedCapital": 41025700,
        "inventories": 65099450,
        "debts": 138874209,
        "provisions": 15656834,
        "totalEquity": 61941274,
        "patrimonyRegie": null
      }
    },
    {
      "fiscalYear": 2009,
      "turnover": 489535643,
      "netProfit": 22401863,
      "netLoss": null,
      "employees": 1117,
      "currency": "RON",
      "summary": {
        "totalRevenue": 582960529,
        "totalExpenses": 554873441,
        "grossProfit": 28087088,
        "grossLoss": null,
        "receivables": 12341281,
        "currentAssets": 66290101,
        "fixedAssets": 72301414,
        "cashAndBank": 12185359,
        "prepaidExpenses": 1830060,
        "deferredIncome": 10549,
        "subscribedCapital": 41025710,
        "inventories": 41763461,
        "debts": 79984118,
        "provisions": 65723,
        "totalEquity": 60361185,
        "patrimonyRegie": null
      }
    },
    {
      "fiscalYear": 2008,
      "turnover": 348061394,
      "netProfit": 724441,
      "netLoss": null,
      "employees": 755,
      "currency": "RON",
      "summary": {
        "totalRevenue": 386512278,
        "totalExpenses": 384600729,
        "grossProfit": 1911549,
        "grossLoss": null,
        "receivables": 17965331,
        "currentAssets": 59813297,
        "fixedAssets": 71306578,
        "cashAndBank": 13278459,
        "prepaidExpenses": 1642653,
        "deferredIncome": 24829,
        "subscribedCapital": 41025710,
        "inventories": 28569507,
        "debts": 95121504,
        "provisions": 65724,
        "totalEquity": 37550471,
        "patrimonyRegie": null
      }
    }
  ],
  "financialTrajectory": {
    "fromYear": 2024,
    "toYear": 2025,
    "turnoverDelta": 354349076,
    "netResultDelta": -327251557,
    "employeesDelta": -1735
  },
  "publicMoney": {
    "totalRon": 168067.55,
    "flowCount": 547,
    "byFlowType": [
      {
        "flowType": "direct_acquisition",
        "totalRon": 168067.55,
        "count": 547
      }
    ],
    "byYear": [
      {
        "year": 2026,
        "flowType": "direct_acquisition",
        "totalRon": 362.08,
        "count": 6
      },
      {
        "year": 2025,
        "flowType": "direct_acquisition",
        "totalRon": 14255.01,
        "count": 104
      },
      {
        "year": 2024,
        "flowType": "direct_acquisition",
        "totalRon": 94913,
        "count": 195
      },
      {
        "year": 2023,
        "flowType": "direct_acquisition",
        "totalRon": 43663,
        "count": 132
      },
      {
        "year": null,
        "flowType": "direct_acquisition",
        "totalRon": 14874.46,
        "count": 110
      }
    ]
  },
  "sources": [
    {
      "id": "onrc",
      "snapshotDate": "2026-07-18"
    },
    {
      "id": "anaf",
      "snapshotDate": "2026-07-03"
    }
  ]
},
    procurement: {
  "window": {
    "from": "2023-03",
    "to": "2026-04"
  },
  "contracts": {
    "count": 0,
    "withValue": 0,
    "awardedRon": null,
    "firstMonth": null,
    "lastMonth": null,
    "answerability": "degraded"
  },
  "directAcquisitions": {
    "count": 547,
    "withValue": 547,
    "awardedRon": 168067.55,
    "firstMonth": "2023-03",
    "lastMonth": "2026-04",
    "answerability": "served"
  },
  "topAuthorities": {
    "contract": [],
    "directAcquisition": [
      {
        "cui": "29469839",
        "name": null,
        "amountRon": 93688.0,
        "count": 13,
        "amountMissing": 0,
        "share": 0.5574
      },
      {
        "cui": "29249639",
        "name": "LICEUL TEHNOLOGIC BUSTUCHIN",
        "amountRon": 15847.02,
        "count": 92,
        "amountMissing": 0,
        "share": 0.0943
      },
      {
        "cui": "4367612",
        "name": "Primăria Oraș Bălan - Direcția de Asistență Socială",
        "amountRon": 4725.03,
        "count": 4,
        "amountMissing": 0,
        "share": 0.0281
      },
      {
        "cui": "21307548",
        "name": "COMPANIA DE APĂ OLT SA",
        "amountRon": 4385.0,
        "count": 15,
        "amountMissing": 0,
        "share": 0.0261
      },
      {
        "cui": "9640615",
        "name": "COMUNA UIVAR",
        "amountRon": 4295.8,
        "count": 9,
        "amountMissing": 0,
        "share": 0.0256
      },
      {
        "cui": "2664676",
        "name": "INSTITUTUL NAŢIONAL DE CERCETARE - DEZVOLTARE PENTRU SECURITATE MINIERĂ ŞI PROTECŢIE ANTIEXPLOZIVĂ - INSEMEX PETROŞANI",
        "amountRon": 2809.47,
        "count": 10,
        "amountMissing": 0,
        "share": 0.0167
      },
      {
        "cui": "5722747",
        "name": "Primăria Comunei Cherechiu - Compartiment Asistență Socială",
        "amountRon": 2784.0,
        "count": 6,
        "amountMissing": 0,
        "share": 0.0166
      },
      {
        "cui": "4326671",
        "name": "Primăria Comunei Moldovița - Compartiment Asistență Socială și Asistență Comunitară",
        "amountRon": 2080.0,
        "count": 1,
        "amountMissing": 0,
        "share": 0.0124
      },
      {
        "cui": "15586731",
        "name": "COMPANIA NAȚIONALĂ DE CĂI FERATE CFR S.A. BUCUREȘTI SUCURSALA REGIONALA DE CĂI FERATE CLUJ",
        "amountRon": 2015.0,
        "count": 2,
        "amountMissing": 0,
        "share": 0.012
      },
      {
        "cui": "11054545",
        "name": "SOCIETATEA NATIONALA DE TRANSPORT FEROVIAR DE CALATORI - CFR - CALATORI SA",
        "amountRon": 1968.03,
        "count": 18,
        "amountMissing": 0,
        "share": 0.0117
      }
    ]
  },
  "topCategories": {
    "contract": [],
    "directAcquisition": [
      {
        "code": "15",
        "labelRo": "Alimente, băuturi, tutun şi produse conexe",
        "labelEn": "Food, beverages, tobacco and related products",
        "amountRon": 129630.45,
        "count": 432,
        "share": 0.7713
      },
      {
        "code": "33",
        "labelRo": "Echipamente medicale, produse farmaceutice şi produse de îngrijire personală",
        "labelEn": "Medical equipments, pharmaceuticals and personal care products",
        "amountRon": 23733.67,
        "count": 14,
        "share": 0.1412
      },
      {
        "code": "39",
        "labelRo": "Mobilă (inclusiv mobilă de birou), accesorii de mobilier, aparate de uz casnic (exclusiv dispozitive de iluminat) şi produse de curăţat",
        "labelEn": "Furniture, furnishings, domestic appliances and cleaning products",
        "amountRon": 5782.18,
        "count": 19,
        "share": 0.0344
      },
      {
        "code": "44",
        "labelRo": "Structuri şi materiale de construcţii; produse auxiliare pentru construcţii (cu excepţia aparatelor electrice)",
        "labelEn": "Construction structures and materials; auxiliary products",
        "amountRon": 3953.55,
        "count": 19,
        "share": 0.0235
      },
      {
        "code": "55",
        "labelRo": "Servicii hoteliere, de restaurant şi de vânzare cu amănuntul",
        "labelEn": "Hotel, restaurant and retail trade services",
        "amountRon": 1315.0,
        "count": 7,
        "share": 0.0078
      },
      {
        "code": "41",
        "labelRo": "Apă captată şi epurată",
        "labelEn": "Collected and purified water",
        "amountRon": 883.0,
        "count": 3,
        "share": 0.0053
      },
      {
        "code": "03",
        "labelRo": "Produse agricole, de fermă, de pescuit, de silvicultură şi produse conexe",
        "labelEn": "Agricultural, farming, fishing, forestry and related products",
        "amountRon": 560.08,
        "count": 5,
        "share": 0.0033
      },
      {
        "code": "09",
        "labelRo": "Produse petroliere, combustibil, electricitate şi alte surse de energie",
        "labelEn": "Petroleum products, fuel, electricity and other energy sources",
        "amountRon": 407.0,
        "count": 3,
        "share": 0.0024
      },
      {
        "code": "19",
        "labelRo": "Produse din piele, materiale textile, din plastic şi din cauciuc",
        "labelEn": "Leather and textile fabrics, plastic and rubber materials",
        "amountRon": 386.47,
        "count": 3,
        "share": 0.0023
      },
      {
        "code": "18",
        "labelRo": "Îmbrăcăminte, încălţăminte, articole de voiaj şi accesorii",
        "labelEn": "Clothing, footwear, luggage and accessories",
        "amountRon": 374.82,
        "count": 5,
        "share": 0.0022
      }
    ]
  },
  "recent": [
    {
      "id": "17024864",
      "grain": "direct_acquisition",
      "title": "Achizitie accesorii de birou - O",
      "authority": {
        "cui": "16730672",
        "name": "ECOAQUA SA"
      },
      "valueRon": 41.31,
      "date": "2026-09-02",
      "cpvDivision": "30"
    },
    {
      "id": "16996528",
      "grain": "direct_acquisition",
      "title": "PRODUSE ALIMENTARE",
      "authority": {
        "cui": "29249639",
        "name": "Liceul Tehnologic Bustuchin"
      },
      "valueRon": 213.67,
      "date": "2026-09-01",
      "cpvDivision": "15"
    },
    {
      "id": "17022051",
      "grain": "direct_acquisition",
      "title": "ALIMENTE UABS ORADEA",
      "authority": {
        "cui": "27442985",
        "name": "DIRECTIA JUDETEANA PENTRU SPORT SI TINERET BIHOR"
      },
      "valueRon": 3.97,
      "date": "2026-04-02",
      "cpvDivision": "15"
    },
    {
      "id": "17040972",
      "grain": "direct_acquisition",
      "title": "hrana animale",
      "authority": {
        "cui": "4350670",
        "name": "MUZEUL VRANCEI"
      },
      "valueRon": 38.56,
      "date": "2026-03-03",
      "cpvDivision": "15"
    },
    {
      "id": "17040967",
      "grain": "direct_acquisition",
      "title": "hrana animale",
      "authority": {
        "cui": "4350670",
        "name": "MUZEUL VRANCEI"
      },
      "valueRon": 22.95,
      "date": "2026-03-03",
      "cpvDivision": "15"
    },
    {
      "id": "17021014",
      "grain": "direct_acquisition",
      "title": "hrana animale",
      "authority": {
        "cui": "4350670",
        "name": "MUZEUL VRANCEI"
      },
      "valueRon": 41.62,
      "date": "2026-03-02",
      "cpvDivision": "15"
    },
    {
      "id": "16991466",
      "grain": "direct_acquisition",
      "title": "DIVERSE PRODUSE ALIMENTARE",
      "authority": {
        "cui": "4554424",
        "name": "Municipiul Calafat"
      },
      "valueRon": 1121.0,
      "date": "2025-12-30",
      "cpvDivision": "15"
    },
    {
      "id": "16991424",
      "grain": "direct_acquisition",
      "title": "FRUCTE-1 DECEMBRIE",
      "authority": {
        "cui": "4554424",
        "name": "Municipiul Calafat"
      },
      "valueRon": 337.42,
      "date": "2025-12-30",
      "cpvDivision": "03"
    },
    {
      "id": "16991380",
      "grain": "direct_acquisition",
      "title": "Diverse produse alimentare",
      "authority": {
        "cui": "4554424",
        "name": "Municipiul Calafat"
      },
      "valueRon": 392.38,
      "date": "2025-12-30",
      "cpvDivision": "15"
    },
    {
      "id": "16986156",
      "grain": "direct_acquisition",
      "title": "Cheltuieli privind stocurile ( baterii )",
      "authority": {
        "cui": "5796752",
        "name": "RA Administratia Zonei Libere Galati"
      },
      "valueRon": 39.16,
      "date": "2025-12-23",
      "cpvDivision": "31"
    },
    {
      "id": "16986130",
      "grain": "direct_acquisition",
      "title": "Cheltuieli privind stocurile ( odorizant camera )",
      "authority": {
        "cui": "5796752",
        "name": "RA Administratia Zonei Libere Galati"
      },
      "valueRon": 49.57,
      "date": "2025-12-23",
      "cpvDivision": "39"
    },
    {
      "id": "16981369",
      "grain": "direct_acquisition",
      "title": "hrana verde animale",
      "authority": {
        "cui": "4350670",
        "name": "MUZEUL VRANCEI"
      },
      "valueRon": 21.0,
      "date": "2025-12-18",
      "cpvDivision": "15"
    },
    {
      "id": "16894381",
      "grain": "direct_acquisition",
      "title": "CAFEA - CF BF 00481/13.08.2025",
      "authority": {
        "cui": "4515328",
        "name": "COMUNA MIHAIL KOGALNICEANU"
      },
      "valueRon": 114.41,
      "date": "2025-12-09",
      "cpvDivision": "15"
    },
    {
      "id": "16966082",
      "grain": "direct_acquisition",
      "title": "hrana animale",
      "authority": {
        "cui": "4350670",
        "name": "MUZEUL VRANCEI"
      },
      "valueRon": 39.29,
      "date": "2025-12-04",
      "cpvDivision": "15"
    },
    {
      "id": "16965324",
      "grain": "direct_acquisition",
      "title": "Diverse produse alimentare",
      "authority": {
        "cui": "33093065",
        "name": "DOMENII PREST SERV S.R.L."
      },
      "valueRon": 47.38,
      "date": "2025-12-03",
      "cpvDivision": "15"
    },
    {
      "id": "16750612",
      "grain": "direct_acquisition",
      "title": "Ciorapi",
      "authority": {
        "cui": "35143372",
        "name": "TEATRUL MUNICIPAL “MATEI VISNIEC” SUCEAVA"
      },
      "valueRon": 39.82,
      "date": "2025-12-03",
      "cpvDivision": "18"
    },
    {
      "id": "16750520",
      "grain": "direct_acquisition",
      "title": "Cutie cafea",
      "authority": {
        "cui": "4468943",
        "name": "MUNICIPIUL PETROSANI"
      },
      "valueRon": 287.63,
      "date": "2025-12-03",
      "cpvDivision": "15"
    },
    {
      "id": "16962247",
      "grain": "direct_acquisition",
      "title": "Produse necesare desfășurării activității culinare “ Breakfast around the globe “, organizată pentru persoanele vârstnice care frecventează centrele sociale multifuncționale",
      "authority": {
        "cui": "14371033",
        "name": "DIRECTIA DE ASISTENTA SOCIALA ORADEA"
      },
      "valueRon": 206.41,
      "date": "2025-11-28",
      "cpvDivision": "15"
    },
    {
      "id": "16961250",
      "grain": "direct_acquisition",
      "title": "BATERII",
      "authority": {
        "cui": "4283511",
        "name": "AGENTIA NATIONALA PENTRU ZOOTEHNIE \"PROF. DR. G.K. CONSTANTINESCU\""
      },
      "valueRon": 19.17,
      "date": "2025-11-28",
      "cpvDivision": "31"
    },
    {
      "id": "16957016",
      "grain": "direct_acquisition",
      "title": "hrana animale",
      "authority": {
        "cui": "4350670",
        "name": "MUZEUL VRANCEI"
      },
      "valueRon": 20.19,
      "date": "2025-11-24",
      "cpvDivision": "15"
    }
  ]
},
  },
  'jack': {
    profile: {
  "organizationId": "org:978831",
  "cui": "22202108",
  "codInmatriculare": "J12/3413/2007",
  "legalName": "66 JACK SRL",
  "legalForm": "SRL",
  "registrationDate": "2007-08-02",
  "status": {
    "code": "1048",
    "label": "funcțiune"
  },
  "address": {
    "display": "",
    "county": "Cluj",
    "locality": "Municipiul Gherla"
  },
  "geography": {
    "uatSirutaCode": "55384",
    "uatName": "Municipiul Gherla",
    "countyName": "Cluj",
    "matchConfidence": "safe"
  },
  "caenActivities": [
    {
      "code": "0312",
      "rev": "rev2",
      "label": "Pescuitul în ape dulci",
      "source": "onrc"
    },
    {
      "code": "0312",
      "rev": null,
      "label": null,
      "source": "anaf"
    },
    {
      "code": "0322",
      "rev": "rev2",
      "label": "Acvacultura în ape dulci",
      "source": "onrc"
    },
    {
      "code": "3511",
      "rev": "rev2",
      "label": "Producția de energie electrică",
      "source": "onrc"
    },
    {
      "code": "3512",
      "rev": "rev2",
      "label": "Transportul energiei electrice",
      "source": "onrc"
    },
    {
      "code": "3513",
      "rev": "rev2",
      "label": "Distribuția energiei electrice",
      "source": "onrc"
    },
    {
      "code": "3514",
      "rev": "rev2",
      "label": "Comercializarea energiei electrice",
      "source": "onrc"
    },
    {
      "code": "4120",
      "rev": "rev2",
      "label": "Lucrări de construcții a clădirilor rezidențiale și nerezidențiale",
      "source": "onrc"
    },
    {
      "code": "4334",
      "rev": "rev2",
      "label": "Lucrări de vopsitorie, zugrăveli și montări de geamuri",
      "source": "onrc"
    },
    {
      "code": "4339",
      "rev": "rev2",
      "label": "Alte lucrări de finisare",
      "source": "onrc"
    },
    {
      "code": "4399",
      "rev": "rev2",
      "label": "Alte lucrări speciale de construcții n.c.a.",
      "source": "onrc"
    },
    {
      "code": "4619",
      "rev": "rev2",
      "label": "Intermedieri în comerțul cu produse diverse",
      "source": "onrc"
    },
    {
      "code": "4711",
      "rev": "rev2",
      "label": "Comerț cu amănuntul în magazine nespecializate, cu vânzare predominantă de produse alimentare, băuturi și tutun",
      "source": "onrc"
    },
    {
      "code": "4791",
      "rev": "rev2",
      "label": "Comerț cu amănuntul prin intermediul caselor de comenzi sau prin Internet",
      "source": "onrc"
    },
    {
      "code": "4799",
      "rev": "rev2",
      "label": "Comerț cu amănuntul efectuat în afara  magazinelor, standurilor, chioșcurilor și piețelor",
      "source": "onrc"
    },
    {
      "code": "5510",
      "rev": "rev2",
      "label": "Hoteluri și alte facilități de cazare similare",
      "source": "onrc"
    },
    {
      "code": "5520",
      "rev": "rev2",
      "label": "Facilități de cazare pentru vacanțe și perioade de scurtă durată",
      "source": "onrc"
    },
    {
      "code": "5530",
      "rev": "rev2",
      "label": "Parcuri pentru rulote, campinguri și tabere",
      "source": "onrc"
    },
    {
      "code": "5590",
      "rev": "rev2",
      "label": "Alte servicii de cazare",
      "source": "onrc"
    },
    {
      "code": "5610",
      "rev": "rev2",
      "label": "Restaurante",
      "source": "onrc"
    },
    {
      "code": "5621",
      "rev": "rev2",
      "label": "Activități de alimentație (catering) pentru evenimente",
      "source": "onrc"
    },
    {
      "code": "5629",
      "rev": "rev2",
      "label": "Alte servicii de alimentație n.c.a.",
      "source": "onrc"
    },
    {
      "code": "5630",
      "rev": "rev2",
      "label": "Baruri și alte activități de servire a băuturilor",
      "source": "onrc"
    },
    {
      "code": "6820",
      "rev": "rev2",
      "label": "Închirierea și subînchirierea bunurilor imobiliare proprii sau închiriate",
      "source": "onrc"
    },
    {
      "code": "6831",
      "rev": "rev2",
      "label": "Agenții imobiliare",
      "source": "onrc"
    },
    {
      "code": "6832",
      "rev": "rev2",
      "label": "Administrarea imobilelor pe bază de comision sau contract",
      "source": "onrc"
    },
    {
      "code": "7020",
      "rev": "rev1",
      "label": "Închirierea și subînchirierea bunurilor imobiliare proprii sau închiriate",
      "source": "onrc"
    },
    {
      "code": "7721",
      "rev": "rev2",
      "label": "Activități de închiriere și leasing cu bunuri recreaționale și echipament sportiv",
      "source": "onrc"
    },
    {
      "code": "7990",
      "rev": "rev2",
      "label": "Alte servicii de rezervare și asistență turistică",
      "source": "onrc"
    },
    {
      "code": "9319",
      "rev": "rev2",
      "label": "Alte activități sportive",
      "source": "onrc"
    },
    {
      "code": "9329",
      "rev": "rev2",
      "label": "Alte activități recreative și distractive n.c.a.",
      "source": "onrc"
    },
    {
      "code": "9609",
      "rev": "rev2",
      "label": "Alte activități de servicii n.c.a.",
      "source": "onrc"
    }
  ],
  "representatives": [],
  "euBranches": [],
  "fiscal": {
    "vatPayer": false,
    "inactive": false,
    "anafFound": true,
    "asOfDate": "2026-07-04",
    "fiscalCaen": {
      "code": "0312",
      "rev": null
    }
  },
  "financials": [
    {
      "fiscalYear": 2025,
      "turnover": 48100,
      "netProfit": 12045,
      "netLoss": null,
      "employees": 0,
      "currency": "RON",
      "summary": {
        "totalRevenue": 48100,
        "totalExpenses": 33761,
        "grossProfit": 14339,
        "grossLoss": 0,
        "receivables": 4105,
        "currentAssets": 12654,
        "fixedAssets": 590670,
        "cashAndBank": 4267,
        "prepaidExpenses": 0,
        "deferredIncome": 0,
        "subscribedCapital": 200,
        "inventories": 4282,
        "debts": 1261285,
        "provisions": 0,
        "totalEquity": -657961,
        "patrimonyRegie": 0
      }
    },
    {
      "fiscalYear": 2024,
      "turnover": 78807,
      "netProfit": 33894,
      "netLoss": null,
      "employees": 0,
      "currency": "RON",
      "summary": {
        "totalRevenue": 78807,
        "totalExpenses": 40216,
        "grossProfit": 38591,
        "grossLoss": 0,
        "receivables": 1466,
        "currentAssets": 50842,
        "fixedAssets": 597240,
        "cashAndBank": 47207,
        "prepaidExpenses": 0,
        "deferredIncome": 0,
        "subscribedCapital": 200,
        "inventories": 2169,
        "debts": 1318088,
        "provisions": 0,
        "totalEquity": -670006,
        "patrimonyRegie": 0
      }
    },
    {
      "fiscalYear": 2023,
      "turnover": 20246,
      "netProfit": null,
      "netLoss": 56867,
      "employees": 2,
      "currency": "RON",
      "summary": {
        "totalRevenue": 20246,
        "totalExpenses": 76925,
        "grossProfit": 0,
        "grossLoss": 56679,
        "receivables": 1400,
        "currentAssets": 2773,
        "fixedAssets": 607927,
        "cashAndBank": 1373,
        "prepaidExpenses": 0,
        "deferredIncome": 0,
        "subscribedCapital": 200,
        "inventories": 0,
        "debts": 1314600,
        "provisions": 0,
        "totalEquity": -703900,
        "patrimonyRegie": 0
      }
    },
    {
      "fiscalYear": 2022,
      "turnover": 29060,
      "netProfit": null,
      "netLoss": 36978,
      "employees": 2,
      "currency": "RON",
      "summary": {
        "totalRevenue": 29060,
        "totalExpenses": 65747,
        "grossProfit": 0,
        "grossLoss": 36687,
        "receivables": 1400,
        "currentAssets": 2010,
        "fixedAssets": 618614,
        "cashAndBank": 610,
        "prepaidExpenses": 0,
        "deferredIncome": 0,
        "subscribedCapital": 200,
        "inventories": 0,
        "debts": 1267658,
        "provisions": 0,
        "totalEquity": -647034,
        "patrimonyRegie": 0
      }
    },
    {
      "fiscalYear": 2021,
      "turnover": 18940,
      "netProfit": null,
      "netLoss": 44077,
      "employees": 1,
      "currency": "RON",
      "summary": {
        "totalRevenue": 18940,
        "totalExpenses": 62837,
        "grossProfit": 0,
        "grossLoss": 43897,
        "receivables": 0,
        "currentAssets": 2354,
        "fixedAssets": 629300,
        "cashAndBank": 2354,
        "prepaidExpenses": 0,
        "deferredIncome": 0,
        "subscribedCapital": 200,
        "inventories": 0,
        "debts": 1241709,
        "provisions": 0,
        "totalEquity": -610055,
        "patrimonyRegie": 0
      }
    },
    {
      "fiscalYear": 2020,
      "turnover": 6915,
      "netProfit": null,
      "netLoss": 47411,
      "employees": 1,
      "currency": "RON",
      "summary": {
        "totalRevenue": 6915,
        "totalExpenses": 54264,
        "grossProfit": 0,
        "grossLoss": 47349,
        "receivables": 0,
        "currentAssets": 1010,
        "fixedAssets": 639987,
        "cashAndBank": 1010,
        "prepaidExpenses": 0,
        "deferredIncome": 0,
        "subscribedCapital": 200,
        "inventories": 0,
        "debts": 1206976,
        "provisions": 0,
        "totalEquity": -565979,
        "patrimonyRegie": 0
      }
    },
    {
      "fiscalYear": 2019,
      "turnover": 1350,
      "netProfit": null,
      "netLoss": 57842,
      "employees": 1,
      "currency": "RON",
      "summary": {
        "totalRevenue": 1350,
        "totalExpenses": 59178,
        "grossProfit": 0,
        "grossLoss": 57828,
        "receivables": 0,
        "currentAssets": 1986,
        "fixedAssets": 650673,
        "cashAndBank": 1986,
        "prepaidExpenses": 0,
        "deferredIncome": 0,
        "subscribedCapital": 200,
        "inventories": 0,
        "debts": 1171227,
        "provisions": 0,
        "totalEquity": -518568,
        "patrimonyRegie": 0
      }
    },
    {
      "fiscalYear": 2018,
      "turnover": null,
      "netProfit": null,
      "netLoss": 50673,
      "employees": 1,
      "currency": "RON",
      "summary": {
        "totalRevenue": 0,
        "totalExpenses": 50673,
        "grossProfit": 0,
        "grossLoss": 50673,
        "receivables": null,
        "currentAssets": 424,
        "fixedAssets": 661360,
        "cashAndBank": 424,
        "prepaidExpenses": null,
        "deferredIncome": null,
        "subscribedCapital": 200,
        "inventories": null,
        "debts": 1122510,
        "provisions": null,
        "totalEquity": -460726,
        "patrimonyRegie": null
      }
    },
    {
      "fiscalYear": 2017,
      "turnover": 16078,
      "netProfit": null,
      "netLoss": 40369,
      "employees": 1,
      "currency": "RON",
      "summary": {
        "totalRevenue": 16836,
        "totalExpenses": 56804,
        "grossProfit": 0,
        "grossLoss": 39968,
        "receivables": null,
        "currentAssets": 5911,
        "fixedAssets": 672046,
        "cashAndBank": 5911,
        "prepaidExpenses": null,
        "deferredIncome": null,
        "subscribedCapital": 200,
        "inventories": null,
        "debts": 1088011,
        "provisions": null,
        "totalEquity": -410054,
        "patrimonyRegie": null
      }
    },
    {
      "fiscalYear": 2016,
      "turnover": 11689,
      "netProfit": null,
      "netLoss": 48389,
      "employees": 2,
      "currency": "RON",
      "summary": {
        "totalRevenue": 15614,
        "totalExpenses": 63758,
        "grossProfit": 0,
        "grossLoss": 48144,
        "receivables": null,
        "currentAssets": 200,
        "fixedAssets": 682733,
        "cashAndBank": 200,
        "prepaidExpenses": null,
        "deferredIncome": null,
        "subscribedCapital": 200,
        "inventories": null,
        "debts": 1052618,
        "provisions": null,
        "totalEquity": -369685,
        "patrimonyRegie": null
      }
    },
    {
      "fiscalYear": 2015,
      "turnover": 8874,
      "netProfit": null,
      "netLoss": 48618,
      "employees": 1,
      "currency": "RON",
      "summary": {
        "totalRevenue": 13726,
        "totalExpenses": 62077,
        "grossProfit": 0,
        "grossLoss": 48351,
        "receivables": null,
        "currentAssets": 386,
        "fixedAssets": 693420,
        "cashAndBank": 386,
        "prepaidExpenses": null,
        "deferredIncome": null,
        "subscribedCapital": null,
        "inventories": null,
        "debts": 1015102,
        "provisions": null,
        "totalEquity": -321296,
        "patrimonyRegie": null
      }
    },
    {
      "fiscalYear": 2014,
      "turnover": 10656,
      "netProfit": null,
      "netLoss": 37883,
      "employees": 1,
      "currency": "RON",
      "summary": {
        "totalRevenue": 10656,
        "totalExpenses": 48219,
        "grossProfit": 0,
        "grossLoss": 37563,
        "receivables": null,
        "currentAssets": 453,
        "fixedAssets": 704106,
        "cashAndBank": 453,
        "prepaidExpenses": null,
        "deferredIncome": null,
        "subscribedCapital": 200,
        "inventories": null,
        "debts": 977238,
        "provisions": null,
        "totalEquity": -272679,
        "patrimonyRegie": null
      }
    },
    {
      "fiscalYear": 2013,
      "turnover": 16016,
      "netProfit": null,
      "netLoss": 39279,
      "employees": 2,
      "currency": "RON",
      "summary": {
        "totalRevenue": 16016,
        "totalExpenses": 54814,
        "grossProfit": 0,
        "grossLoss": 38798,
        "receivables": null,
        "currentAssets": 1124,
        "fixedAssets": 691722,
        "cashAndBank": 1124,
        "prepaidExpenses": null,
        "deferredIncome": null,
        "subscribedCapital": 200,
        "inventories": null,
        "debts": 950044,
        "provisions": null,
        "totalEquity": -257198,
        "patrimonyRegie": null
      }
    },
    {
      "fiscalYear": 2012,
      "turnover": 14326,
      "netProfit": null,
      "netLoss": 42164,
      "employees": 2,
      "currency": "RON",
      "summary": {
        "totalRevenue": 14326,
        "totalExpenses": 56061,
        "grossProfit": 0,
        "grossLoss": 41735,
        "receivables": null,
        "currentAssets": 3665,
        "fixedAssets": 672283,
        "cashAndBank": 3667,
        "prepaidExpenses": null,
        "deferredIncome": null,
        "subscribedCapital": 200,
        "inventories": -2,
        "debts": 923315,
        "provisions": null,
        "totalEquity": -247367,
        "patrimonyRegie": null
      }
    },
    {
      "fiscalYear": 2011,
      "turnover": 10166,
      "netProfit": null,
      "netLoss": 4515,
      "employees": 1,
      "currency": "RON",
      "summary": {
        "totalRevenue": 310067,
        "totalExpenses": 305280,
        "grossProfit": 4787,
        "grossLoss": 0,
        "receivables": null,
        "currentAssets": 1492,
        "fixedAssets": 666878,
        "cashAndBank": 1492,
        "prepaidExpenses": null,
        "deferredIncome": null,
        "subscribedCapital": 200,
        "inventories": null,
        "debts": 873573,
        "provisions": null,
        "totalEquity": -205203,
        "patrimonyRegie": null
      }
    },
    {
      "fiscalYear": 2010,
      "turnover": 17568,
      "netProfit": null,
      "netLoss": 5166,
      "employees": 1,
      "currency": "RON",
      "summary": {
        "totalRevenue": 17568,
        "totalExpenses": 21084,
        "grossProfit": null,
        "grossLoss": 3516,
        "receivables": 4,
        "currentAssets": 4080,
        "fixedAssets": 677604,
        "cashAndBank": 4076,
        "prepaidExpenses": null,
        "deferredIncome": null,
        "subscribedCapital": 200,
        "inventories": null,
        "debts": 882372,
        "provisions": null,
        "totalEquity": -200688,
        "patrimonyRegie": null
      }
    },
    {
      "fiscalYear": 2009,
      "turnover": null,
      "netProfit": null,
      "netLoss": 31318,
      "employees": 1,
      "currency": "RON",
      "summary": {
        "totalRevenue": null,
        "totalExpenses": 29851,
        "grossProfit": null,
        "grossLoss": 29851,
        "receivables": 4,
        "currentAssets": 204,
        "fixedAssets": 810156,
        "cashAndBank": 200,
        "prepaidExpenses": null,
        "deferredIncome": null,
        "subscribedCapital": 200,
        "inventories": null,
        "debts": 881332,
        "provisions": null,
        "totalEquity": -70972,
        "patrimonyRegie": null
      }
    },
    {
      "fiscalYear": 2008,
      "turnover": null,
      "netProfit": null,
      "netLoss": 39568,
      "employees": 1,
      "currency": "RON",
      "summary": {
        "totalRevenue": null,
        "totalExpenses": 39568,
        "grossProfit": null,
        "grossLoss": 39568,
        "receivables": 4,
        "currentAssets": 1275,
        "fixedAssets": 836719,
        "cashAndBank": 1271,
        "prepaidExpenses": null,
        "deferredIncome": null,
        "subscribedCapital": 200,
        "inventories": null,
        "debts": 877647,
        "provisions": null,
        "totalEquity": -39653,
        "patrimonyRegie": null
      }
    }
  ],
  "financialTrajectory": {
    "fromYear": 2024,
    "toYear": 2025,
    "turnoverDelta": -30707,
    "netResultDelta": -21849,
    "employeesDelta": 0
  },
  "publicMoney": null,
  "sources": [
    {
      "id": "onrc",
      "snapshotDate": "2026-07-18"
    },
    {
      "id": "anaf",
      "snapshotDate": "2026-07-04"
    }
  ]
},
    procurement: {
  "window": {
    "from": null,
    "to": null
  },
  "contracts": {
    "count": 0,
    "withValue": 0,
    "awardedRon": null,
    "firstMonth": null,
    "lastMonth": null,
    "answerability": "degraded"
  },
  "directAcquisitions": {
    "count": 0,
    "withValue": 0,
    "awardedRon": null,
    "firstMonth": null,
    "lastMonth": null,
    "answerability": "served"
  },
  "topAuthorities": {
    "contract": [],
    "directAcquisition": []
  },
  "topCategories": {
    "contract": [],
    "directAcquisition": []
  },
  "recent": []
},
  },
  'ideatica': {
    profile: {
  "organizationId": "org:3167065",
  "cui": "47387800",
  "codInmatriculare": "J12/7541/2022",
  "legalName": "A & B IDEATICA S.R.L.",
  "legalForm": "SRL",
  "registrationDate": "2022-12-29",
  "status": {
    "code": "1048",
    "label": "funcțiune"
  },
  "address": {
    "display": "",
    "county": "Cluj",
    "locality": "Municipiul Cluj-Napoca"
  },
  "geography": {
    "uatSirutaCode": "54975",
    "uatName": "Municipiul Cluj-Napoca",
    "countyName": "Cluj",
    "matchConfidence": "safe"
  },
  "caenActivities": [
    {
      "code": "1399",
      "rev": "rev2",
      "label": "Fabricarea altor articole textile n.c.a.",
      "source": "onrc"
    },
    {
      "code": "1812",
      "rev": "rev2",
      "label": "Alte activități de tipărire n.c.a.",
      "source": "onrc"
    },
    {
      "code": "1813",
      "rev": "rev2",
      "label": "Servicii pregătitoare pentru pretipărire",
      "source": "onrc"
    },
    {
      "code": "1814",
      "rev": "rev2",
      "label": "Legătorie și servicii conexe",
      "source": "onrc"
    },
    {
      "code": "3299",
      "rev": "rev2",
      "label": "Fabricarea altor produse manufacturiere n.c.a.",
      "source": "onrc"
    },
    {
      "code": "4311",
      "rev": "rev2",
      "label": "Lucrări de demolare a construcțiilor",
      "source": "onrc"
    },
    {
      "code": "4312",
      "rev": "rev2",
      "label": "Lucrări de pregătire a terenului",
      "source": "onrc"
    },
    {
      "code": "4322",
      "rev": "rev2",
      "label": "Lucrări de instalații sanitare, de încălzire și de aer condiționat",
      "source": "onrc"
    },
    {
      "code": "4329",
      "rev": "rev2",
      "label": "Alte lucrări de instalații pentru construcții",
      "source": "onrc"
    },
    {
      "code": "4331",
      "rev": "rev2",
      "label": "Lucrări de ipsoserie",
      "source": "onrc"
    },
    {
      "code": "4332",
      "rev": "rev2",
      "label": "Lucrări de tâmplărie și dulgherie",
      "source": "onrc"
    },
    {
      "code": "4333",
      "rev": "rev2",
      "label": "Lucrări de pardosire și placare a pereților",
      "source": "onrc"
    },
    {
      "code": "4334",
      "rev": "rev2",
      "label": "Lucrări de vopsitorie, zugrăveli și montări de geamuri",
      "source": "onrc"
    },
    {
      "code": "4339",
      "rev": "rev2",
      "label": "Alte lucrări de finisare",
      "source": "onrc"
    },
    {
      "code": "4399",
      "rev": "rev2",
      "label": "Alte lucrări speciale de construcții n.c.a.",
      "source": "onrc"
    },
    {
      "code": "4520",
      "rev": "rev2",
      "label": "Întreținerea și repararea autovehiculelor",
      "source": "onrc"
    },
    {
      "code": "4690",
      "rev": "rev2",
      "label": "Comerț cu ridicata nespecializat",
      "source": "onrc"
    },
    {
      "code": "4781",
      "rev": "rev2",
      "label": "Comerț cu amănuntul al produselor alimentare, băuturilor și produselor din tutun efectuat prin standuri, chioșcuri și piețe",
      "source": "onrc"
    },
    {
      "code": "4782",
      "rev": "rev2",
      "label": "Comerț cu amănuntul al textilelor, îmbrăcămintei și încălțămintei efectuat prin standuri, chioșcuri și piețe",
      "source": "onrc"
    },
    {
      "code": "4791",
      "rev": "rev2",
      "label": "Comerț cu amănuntul prin intermediul caselor de comenzi sau prin Internet",
      "source": "onrc"
    },
    {
      "code": "4799",
      "rev": "rev2",
      "label": "Comerț cu amănuntul efectuat în afara  magazinelor, standurilor, chioșcurilor și piețelor",
      "source": "onrc"
    },
    {
      "code": "4932",
      "rev": "rev2",
      "label": "Transporturi cu taxiuri",
      "source": "onrc"
    },
    {
      "code": "4939",
      "rev": "rev2",
      "label": "Alte transporturi terestre de călători n.c.a",
      "source": "onrc"
    },
    {
      "code": "4941",
      "rev": "rev2",
      "label": "Transporturi rutiere de mărfuri",
      "source": "onrc"
    },
    {
      "code": "4942",
      "rev": "rev2",
      "label": "Servicii de mutare",
      "source": "onrc"
    },
    {
      "code": "5221",
      "rev": "rev2",
      "label": "Activități de servicii anexe pentru transporturi terestre",
      "source": "onrc"
    },
    {
      "code": "5320",
      "rev": "rev2",
      "label": "Alte activități poștale și de curier",
      "source": "onrc"
    },
    {
      "code": "5610",
      "rev": "rev2",
      "label": "Restaurante",
      "source": "onrc"
    },
    {
      "code": "5819",
      "rev": "rev2",
      "label": "Alte activități de editare",
      "source": "onrc"
    },
    {
      "code": "6201",
      "rev": "rev2",
      "label": "Activități de realizare a soft-ului la comandă (software orientat client)",
      "source": "onrc"
    },
    {
      "code": "6202",
      "rev": "rev2",
      "label": "Activități de consultanță în tehnologia informației",
      "source": "onrc"
    },
    {
      "code": "6311",
      "rev": "rev2",
      "label": "Prelucrarea datelor, administrarea paginilor web și activități conexe",
      "source": "onrc"
    },
    {
      "code": "6312",
      "rev": "rev2",
      "label": "Activități ale portalurilor web",
      "source": "onrc"
    },
    {
      "code": "6399",
      "rev": "rev2",
      "label": "Alte activități de servicii informaționale n.c.a.",
      "source": "onrc"
    },
    {
      "code": "6810",
      "rev": "rev2",
      "label": "Cumpărarea și vânzarea de bunuri imobiliare proprii",
      "source": "onrc"
    },
    {
      "code": "6820",
      "rev": "rev2",
      "label": "Închirierea și subînchirierea bunurilor imobiliare proprii sau închiriate",
      "source": "onrc"
    },
    {
      "code": "6831",
      "rev": "rev2",
      "label": "Agenții imobiliare",
      "source": "onrc"
    },
    {
      "code": "6832",
      "rev": "rev2",
      "label": "Administrarea imobilelor pe bază de comision sau contract",
      "source": "onrc"
    },
    {
      "code": "7022",
      "rev": "rev2",
      "label": "Activități de consultanță pentru afaceri și management",
      "source": "onrc"
    },
    {
      "code": "7120",
      "rev": "rev2",
      "label": "Activități de testări și analize tehnice",
      "source": "onrc"
    },
    {
      "code": "7311",
      "rev": null,
      "label": null,
      "source": "anaf"
    },
    {
      "code": "7311",
      "rev": "rev2",
      "label": "Activități ale agențiilor de publicitate",
      "source": "onrc"
    },
    {
      "code": "7320",
      "rev": "rev2",
      "label": "Activități de studiere a pieței și de sondare a opiniei publice",
      "source": "onrc"
    },
    {
      "code": "7410",
      "rev": "rev2",
      "label": "Activități de design specializat",
      "source": "onrc"
    },
    {
      "code": "7420",
      "rev": "rev2",
      "label": "Activități fotografice",
      "source": "onrc"
    },
    {
      "code": "7490",
      "rev": "rev2",
      "label": "Alte activități profesionale, științifice și tehnice n.c.a.",
      "source": "onrc"
    },
    {
      "code": "7711",
      "rev": "rev2",
      "label": "Activități de închiriere și leasing cu autoturisme și autovehicule rutiere ușoare",
      "source": "onrc"
    },
    {
      "code": "7830",
      "rev": "rev2",
      "label": "Servicii de furnizare și management a forței de muncă",
      "source": "onrc"
    },
    {
      "code": "7911",
      "rev": "rev2",
      "label": "Activități ale agențiilor turistice",
      "source": "onrc"
    },
    {
      "code": "7990",
      "rev": "rev2",
      "label": "Alte servicii de rezervare și asistență turistică",
      "source": "onrc"
    },
    {
      "code": "8121",
      "rev": "rev2",
      "label": "Activități generale de curățenie a clădirilor",
      "source": "onrc"
    },
    {
      "code": "8122",
      "rev": "rev2",
      "label": "Activități specializate de curățenie",
      "source": "onrc"
    },
    {
      "code": "8129",
      "rev": "rev2",
      "label": "Alte activități de curățenie",
      "source": "onrc"
    },
    {
      "code": "8130",
      "rev": "rev2",
      "label": "Activități de întreținere peisagistică",
      "source": "onrc"
    },
    {
      "code": "8211",
      "rev": "rev2",
      "label": "Activități combinate de secretariat",
      "source": "onrc"
    },
    {
      "code": "8219",
      "rev": "rev2",
      "label": "Activități de fotocopiere, de pregătire a documentelor și alte activități specializate de secretariat",
      "source": "onrc"
    },
    {
      "code": "8292",
      "rev": "rev2",
      "label": "Activități de ambalare",
      "source": "onrc"
    },
    {
      "code": "8299",
      "rev": "rev2",
      "label": "Alte activități de servicii suport pentru întreprinderi n.c.a.",
      "source": "onrc"
    },
    {
      "code": "8551",
      "rev": "rev2",
      "label": "Învățământ în domeniul sportiv și recreațional",
      "source": "onrc"
    },
    {
      "code": "8559",
      "rev": "rev2",
      "label": "Alte forme de învățământ n.c.a.",
      "source": "onrc"
    },
    {
      "code": "9602",
      "rev": "rev2",
      "label": "Coafură și alte activități de înfrumusețare",
      "source": "onrc"
    },
    {
      "code": "9604",
      "rev": "rev2",
      "label": "Activități de întreținere corporală",
      "source": "onrc"
    },
    {
      "code": "9609",
      "rev": "rev2",
      "label": "Alte activități de servicii n.c.a.",
      "source": "onrc"
    }
  ],
  "representatives": [],
  "euBranches": [],
  "fiscal": {
    "vatPayer": false,
    "inactive": false,
    "anafFound": true,
    "asOfDate": "2026-07-08",
    "fiscalCaen": {
      "code": "7311",
      "rev": null
    }
  },
  "financials": [],
  "financialTrajectory": null,
  "publicMoney": null,
  "sources": [
    {
      "id": "onrc",
      "snapshotDate": "2026-07-18"
    },
    {
      "id": "anaf",
      "snapshotDate": "2026-07-08"
    }
  ]
},
    procurement: {
  "window": {
    "from": null,
    "to": null
  },
  "contracts": {
    "count": 0,
    "withValue": 0,
    "awardedRon": null,
    "firstMonth": null,
    "lastMonth": null,
    "answerability": "degraded"
  },
  "directAcquisitions": {
    "count": 0,
    "withValue": 0,
    "awardedRon": null,
    "firstMonth": null,
    "lastMonth": null,
    "answerability": "served"
  },
  "topAuthorities": {
    "contract": [],
    "directAcquisition": []
  },
  "topCategories": {
    "contract": [],
    "directAcquisition": []
  },
  "recent": []
},
  },
}
