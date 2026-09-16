import { useQuery } from '@tanstack/react-query'
import {
  COMPANY_GROUP_PROFILE_QUERY,
  companyGroupProfileResponseSchema,
} from '@/features/private-companies/api/graphql/company-queries'
import { fetchCompanyHubStatsLive } from '@/features/private-companies/api/private-company-api.live'
import { graphqlQuery } from '@/lib/graphql/graphql-client'
import type { CompanyGroupSlice, CompanyHubStats } from '@/schemas/private-company-search'

const GROUP_KEY_NONE = '(none)'

/**
 * What the hub prototypes draw from, and where each figure comes from.
 *
 * **Live** (the API on `VITE_API_URL`):
 * - `companyHubStats` — totals, status mix, top-10 counties, CAEN divisions,
 *   `computedAt`. Cached six hours server-side.
 * - `companyCountyProfile(status = 1048, groupBy: COUNTY)` — every county,
 *   measured at 2.7 s on 16 September 2026. The promoted hub should get this
 *   from `companyHubStats` itself (the server already computes it and trims to
 *   ten); the extra request is prototype-only.
 * - The entity search, scoped to `docTypes: ['company']`.
 *
 * **Not served, so stand-ins** — badged as mock wherever drawn:
 * - CAEN division names. The reference module carries four-character classes
 *   only; `CAEN_DIVISIONS` below is the Rev.2 division nomenclature typed in
 *   by hand. Production moves it to the server, keyed by revision.
 * - Source as-of dates (`MOCK_SOURCE_AS_OF`). The profile answers per company;
 *   nothing corpus-wide is served yet.
 */

/** Literal marker. `yarn build:validate` fails if this reaches `.output/`. */
export const PROTOTYPE_MARKER = 'TRANSPARENTA_PROTOTYPE_MUST_NOT_SHIP'

export const STATUS_ACTIVE = '1048'
export const STATUS_STRUCK_OFF = '1084'
export const STATUS_BANKRUPTCY = '1070'
export const STATUS_INSOLVENCY = '1107'

export function useHubStats() {
  return useQuery({
    queryKey: ['proto-companies-hub-stats'],
    queryFn: ({ signal }) => fetchCompanyHubStatsLive(signal),
    staleTime: 60 * 60_000,
    refetchOnWindowFocus: false,
  })
}

export type CountyCounts = {
  /** Every county the registry names, count-desc. The `(none)` bucket is not here. */
  readonly counties: readonly CompanyGroupSlice[]
  /** The population the groups were computed over: active companies, in this answer. */
  readonly denominator: number
  /**
   * Active companies with no county in the registry — the `(none)` bucket of
   * the same answer, so it is never a difference between two snapshots.
   */
  readonly unplaced: number
}

const ACTIVE_FILTER = { status: { eq: STATUS_ACTIVE } } as const

async function fetchCountyCounts(signal?: AbortSignal): Promise<CountyCounts> {
  const data = await graphqlQuery<unknown>(
    COMPANY_GROUP_PROFILE_QUERY,
    { filter: ACTIVE_FILTER, groupBy: 'COUNTY' },
    { operationName: 'CompanyGroupProfile', signal },
  )
  const profile = companyGroupProfileResponseSchema.parse(data).companyCountyProfile
  const none = profile.groups.find((group) => group.key === GROUP_KEY_NONE)
  return {
    counties: profile.groups.filter((group) => group.key !== GROUP_KEY_NONE),
    denominator: profile.denominator,
    unplaced: none?.count ?? 0,
  }
}

export function useCountyCounts() {
  return useQuery({
    queryKey: ['proto-companies-county-counts'],
    queryFn: ({ signal }) => fetchCountyCounts(signal),
    staleTime: 60 * 60_000,
    refetchOnWindowFocus: false,
  })
}

/** Corpus-wide dates the API does not serve yet. Mock. */
export const MOCK_SOURCE_AS_OF = {
  onrcCapture: '2026-07-08',
  anafSnapshot: '2026-07-07',
  financialsFrom: 2008,
  financialsTo: 2025,
} as const

export function formatCount(value: number): string {
  return new Intl.NumberFormat('ro-RO', { maximumFractionDigits: 0 }).format(value)
}

export function formatShare(part: number, whole: number): string {
  if (whole <= 0) return '–'
  return new Intl.NumberFormat('ro-RO', { style: 'percent', maximumFractionDigits: 0 }).format(
    part / whole,
  )
}

export function countFor(stats: CompanyHubStats, code: string): number {
  return stats.statusMix.find((slice) => slice.key === code)?.count ?? 0
}

/**
 * Folds both spellings of the Romanian diacritics — the registry writes the
 * cedilla forms (`Timiş`), the GeoJSON the comma-below forms (`Timiș`) — so a
 * county from the API finds its polygon. Verified 42 ↔ 42 on 16 September 2026.
 */
export function foldCountyName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[şș]/g, 's')
    .replace(/[ţț]/g, 't')
    .toLowerCase()
    .trim()
}

export type CaenDivision = {
  readonly code: string
  readonly label: string
  /** The bar label: the same thing said in fewer words. */
  readonly short: string
}

/**
 * CAEN Rev.2 divisions. NOMENCLATURE STAND-IN — typed in, not served. The
 * hub's `caenDivisions` keys are the first two characters of every recorded
 * code across revisions, so a key is looked up here and, when it has no
 * entry (`00`, `04`), shown as its code.
 */
export const CAEN_DIVISIONS: readonly CaenDivision[] = [
  { code: '01', label: 'Agricultură, vânătoare și servicii anexe', short: 'Agricultură' },
  { code: '02', label: 'Silvicultură și exploatare forestieră', short: 'Silvicultură' },
  { code: '03', label: 'Pescuit și acvacultură', short: 'Pescuit' },
  { code: '05', label: 'Extracția cărbunelui', short: 'Extracția cărbunelui' },
  { code: '06', label: 'Extracția petrolului brut și a gazelor naturale', short: 'Petrol și gaze' },
  { code: '07', label: 'Extracția minereurilor metalifere', short: 'Minereuri metalifere' },
  { code: '08', label: 'Alte activități extractive', short: 'Alte extractive' },
  { code: '09', label: 'Servicii anexe extracției', short: 'Servicii extracție' },
  { code: '10', label: 'Industria alimentară', short: 'Industria alimentară' },
  { code: '11', label: 'Fabricarea băuturilor', short: 'Băuturi' },
  { code: '12', label: 'Fabricarea produselor din tutun', short: 'Tutun' },
  { code: '13', label: 'Fabricarea produselor textile', short: 'Textile' },
  { code: '14', label: 'Fabricarea articolelor de îmbrăcăminte', short: 'Îmbrăcăminte' },
  { code: '15', label: 'Tăbăcirea pieilor; articole de voiaj și încălțăminte', short: 'Pielărie și încălțăminte' },
  { code: '16', label: 'Prelucrarea lemnului și produse din lemn și plută', short: 'Prelucrarea lemnului' },
  { code: '17', label: 'Fabricarea hârtiei și a produselor din hârtie', short: 'Hârtie' },
  { code: '18', label: 'Tipărire și reproducerea înregistrărilor', short: 'Tipărire' },
  { code: '19', label: 'Cocserie și prelucrarea țițeiului', short: 'Prelucrarea țițeiului' },
  { code: '20', label: 'Fabricarea substanțelor și produselor chimice', short: 'Chimice' },
  { code: '21', label: 'Fabricarea produselor farmaceutice', short: 'Farmaceutice' },
  { code: '22', label: 'Fabricarea produselor din cauciuc și mase plastice', short: 'Cauciuc și mase plastice' },
  { code: '23', label: 'Fabricarea altor produse din minerale nemetalice', short: 'Minerale nemetalice' },
  { code: '24', label: 'Industria metalurgică', short: 'Metalurgie' },
  { code: '25', label: 'Construcții metalice și produse din metal', short: 'Produse din metal' },
  { code: '26', label: 'Calculatoare și produse electronice și optice', short: 'Electronice și optice' },
  { code: '27', label: 'Fabricarea echipamentelor electrice', short: 'Echipamente electrice' },
  { code: '28', label: 'Fabricarea de mașini, utilaje și echipamente', short: 'Mașini și utilaje' },
  { code: '29', label: 'Fabricarea autovehiculelor, remorcilor și semiremorcilor', short: 'Autovehicule' },
  { code: '30', label: 'Fabricarea altor mijloace de transport', short: 'Alte mijloace de transport' },
  { code: '31', label: 'Fabricarea de mobilă', short: 'Mobilă' },
  { code: '32', label: 'Alte activități industriale', short: 'Alte industrii' },
  { code: '33', label: 'Repararea, întreținerea și instalarea mașinilor', short: 'Reparații de mașini' },
  { code: '35', label: 'Energie electrică și termică, gaze, aer condiționat', short: 'Energie și gaze' },
  { code: '36', label: 'Captarea, tratarea și distribuția apei', short: 'Distribuția apei' },
  { code: '37', label: 'Colectarea și epurarea apelor uzate', short: 'Ape uzate' },
  { code: '38', label: 'Colectarea, tratarea și eliminarea deșeurilor', short: 'Deșeuri și reciclare' },
  { code: '39', label: 'Activități și servicii de decontaminare', short: 'Decontaminare' },
  { code: '41', label: 'Construcții de clădiri', short: 'Construcții de clădiri' },
  { code: '42', label: 'Lucrări de geniu civil', short: 'Geniu civil' },
  { code: '43', label: 'Lucrări speciale de construcții', short: 'Lucrări speciale de construcții' },
  { code: '45', label: 'Comerț și reparații de autovehicule și motociclete', short: 'Comerț auto' },
  { code: '46', label: 'Comerț cu ridicata, cu excepția autovehiculelor', short: 'Comerț cu ridicata' },
  { code: '47', label: 'Comerț cu amănuntul, cu excepția autovehiculelor', short: 'Comerț cu amănuntul' },
  { code: '49', label: 'Transporturi terestre și prin conducte', short: 'Transport terestru' },
  { code: '50', label: 'Transporturi pe apă', short: 'Transport pe apă' },
  { code: '51', label: 'Transporturi aeriene', short: 'Transport aerian' },
  { code: '52', label: 'Depozitare și activități auxiliare transporturilor', short: 'Depozitare și logistică' },
  { code: '53', label: 'Activități de poștă și de curier', short: 'Poștă și curierat' },
  { code: '55', label: 'Hoteluri și alte facilități de cazare', short: 'Cazare' },
  { code: '56', label: 'Restaurante și servicii de alimentație', short: 'Restaurante' },
  { code: '58', label: 'Activități de editare', short: 'Editare' },
  { code: '59', label: 'Producție cinematografică, video și TV; înregistrări audio', short: 'Film, video și audio' },
  { code: '60', label: 'Difuzare și transmitere de programe', short: 'Difuzare de programe' },
  { code: '61', label: 'Telecomunicații', short: 'Telecomunicații' },
  { code: '62', label: 'Servicii în tehnologia informației', short: 'Servicii IT' },
  { code: '63', label: 'Servicii informatice', short: 'Servicii informatice' },
  { code: '64', label: 'Intermedieri financiare, fără asigurări și pensii', short: 'Intermedieri financiare' },
  { code: '65', label: 'Asigurări, reasigurări și fonduri de pensii', short: 'Asigurări și pensii' },
  { code: '66', label: 'Activități auxiliare intermedierilor financiare', short: 'Auxiliare financiare' },
  { code: '68', label: 'Tranzacții imobiliare', short: 'Tranzacții imobiliare' },
  { code: '69', label: 'Activități juridice și de contabilitate', short: 'Juridic și contabilitate' },
  { code: '70', label: 'Consultanță în management; sedii centrale', short: 'Consultanță în management' },
  { code: '71', label: 'Arhitectură și inginerie; testări și analize tehnice', short: 'Arhitectură și inginerie' },
  { code: '72', label: 'Cercetare-dezvoltare', short: 'Cercetare-dezvoltare' },
  { code: '73', label: 'Publicitate și studierea pieței', short: 'Publicitate' },
  { code: '74', label: 'Alte activități profesionale, științifice și tehnice', short: 'Alte servicii profesionale' },
  { code: '75', label: 'Activități veterinare', short: 'Veterinar' },
  { code: '77', label: 'Închiriere și leasing', short: 'Închiriere și leasing' },
  { code: '78', label: 'Servicii privind forța de muncă', short: 'Forță de muncă' },
  { code: '79', label: 'Agenții turistice și tur-operatori', short: 'Agenții de turism' },
  { code: '80', label: 'Investigații și protecție', short: 'Pază și protecție' },
  { code: '81', label: 'Peisagistică și servicii pentru clădiri', short: 'Servicii pentru clădiri' },
  { code: '82', label: 'Secretariat și servicii suport pentru întreprinderi', short: 'Servicii suport' },
  { code: '84', label: 'Administrație publică și apărare', short: 'Administrație publică' },
  { code: '85', label: 'Învățământ', short: 'Învățământ' },
  { code: '86', label: 'Sănătate umană', short: 'Sănătate' },
  { code: '87', label: 'Îngrijire medicală și asistență socială cu cazare', short: 'Asistență cu cazare' },
  { code: '88', label: 'Asistență socială fără cazare', short: 'Asistență socială' },
  { code: '90', label: 'Creație și interpretare artistică', short: 'Creație artistică' },
  { code: '91', label: 'Biblioteci, arhive, muzee și alte activități culturale', short: 'Cultură și patrimoniu' },
  { code: '92', label: 'Jocuri de noroc și pariuri', short: 'Jocuri de noroc' },
  { code: '93', label: 'Activități sportive, recreative și distractive', short: 'Sport și recreere' },
  { code: '94', label: 'Activități asociative', short: 'Asociații' },
  { code: '95', label: 'Reparații de calculatoare și articole personale', short: 'Reparații' },
  { code: '96', label: 'Alte activități de servicii', short: 'Alte servicii' },
  { code: '97', label: 'Gospodării private ca angajator de personal casnic', short: 'Personal casnic' },
  { code: '98', label: 'Gospodării private, producție pentru consum propriu', short: 'Consum propriu' },
  { code: '99', label: 'Organizații și organisme extrateritoriale', short: 'Extrateritoriale' },
]

const DIVISION_BY_CODE = new Map(CAEN_DIVISIONS.map((division) => [division.code, division]))

export function caenDivision(code: string): CaenDivision | undefined {
  return DIVISION_BY_CODE.get(code)
}

export type LabelledDivision = CompanyGroupSlice & {
  readonly short: string
  readonly long: string
  readonly named: boolean
}

/** Every served division with its nomenclature name, or its code when it has none. */
export function labelDivisions(divisions: readonly CompanyGroupSlice[]): readonly LabelledDivision[] {
  return divisions.map((division) => {
    const named = caenDivision(division.key)
    return {
      ...division,
      short: named?.short ?? `Cod ${division.key}`,
      long: named?.label ?? `Diviziune CAEN ${division.key} (fără nume în nomenclator)`,
      named: named !== undefined,
    }
  })
}
