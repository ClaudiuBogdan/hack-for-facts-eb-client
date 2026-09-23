import { i18n, type MessageDescriptor } from '@lingui/core'
import { msg, t } from '@lingui/core/macro'

/**
 * The CAEN Rev.2 divisions, by the name a reader knows the sector by.
 *
 * The registry and ANAF serve codes, not names, and the reference module
 * publishes four-character classes only, so this table — the official Rev.2
 * division list, shortened for a bar label — is the one place a division's
 * name comes from. Names are `msg` descriptors, resolved when they are read,
 * so the English page names sectors in English.
 */

export type CaenDivision = {
  readonly code: string
  readonly name: MessageDescriptor
}

export const CAEN_DIVISIONS: readonly CaenDivision[] = [
  { code: '01', name: msg`Agricultură` },
  { code: '02', name: msg`Silvicultură` },
  { code: '03', name: msg`Pescuit și acvacultură` },
  { code: '05', name: msg`Extracția cărbunelui` },
  { code: '06', name: msg`Petrol și gaze naturale` },
  { code: '07', name: msg`Minereuri metalifere` },
  { code: '08', name: msg`Alte activități extractive` },
  { code: '09', name: msg`Servicii pentru extracție` },
  { code: '10', name: msg`Industria alimentară` },
  { code: '11', name: msg`Fabricarea băuturilor` },
  { code: '12', name: msg`Produse din tutun` },
  { code: '13', name: msg`Textile` },
  { code: '14', name: msg`Îmbrăcăminte` },
  { code: '15', name: msg`Pielărie și încălțăminte` },
  { code: '16', name: msg`Prelucrarea lemnului` },
  { code: '17', name: msg`Hârtie și carton` },
  { code: '18', name: msg`Tipărire` },
  { code: '19', name: msg`Prelucrarea țițeiului` },
  { code: '20', name: msg`Industria chimică` },
  { code: '21', name: msg`Industria farmaceutică` },
  { code: '22', name: msg`Cauciuc și mase plastice` },
  { code: '23', name: msg`Materiale de construcții` },
  { code: '24', name: msg`Metalurgie` },
  { code: '25', name: msg`Construcții metalice și produse din metal` },
  { code: '26', name: msg`Electronice și optice` },
  { code: '27', name: msg`Echipamente electrice` },
  { code: '28', name: msg`Mașini și utilaje` },
  { code: '29', name: msg`Industria auto` },
  { code: '30', name: msg`Alte mijloace de transport` },
  { code: '31', name: msg`Mobilă` },
  { code: '32', name: msg`Alte activități industriale` },
  { code: '33', name: msg`Repararea și instalarea mașinilor` },
  { code: '35', name: msg`Energie electrică, termică și gaze` },
  { code: '36', name: msg`Apă potabilă` },
  { code: '37', name: msg`Ape uzate` },
  { code: '38', name: msg`Deșeuri și reciclare` },
  { code: '39', name: msg`Decontaminare` },
  { code: '41', name: msg`Construcții de clădiri` },
  { code: '42', name: msg`Drumuri, căi ferate și rețele` },
  { code: '43', name: msg`Lucrări speciale de construcții` },
  { code: '45', name: msg`Comerț și service auto` },
  { code: '46', name: msg`Comerț cu ridicata` },
  { code: '47', name: msg`Comerț cu amănuntul` },
  { code: '49', name: msg`Transport rutier și feroviar` },
  { code: '50', name: msg`Transport pe apă` },
  { code: '51', name: msg`Transport aerian` },
  { code: '52', name: msg`Depozitare și logistică` },
  { code: '53', name: msg`Poștă și curierat` },
  { code: '55', name: msg`Hoteluri și cazare` },
  { code: '56', name: msg`Restaurante și baruri` },
  { code: '58', name: msg`Edituri` },
  { code: '59', name: msg`Film, video și muzică` },
  { code: '60', name: msg`Radio și televiziune` },
  { code: '61', name: msg`Telecomunicații` },
  { code: '62', name: msg`Software și servicii IT` },
  { code: '63', name: msg`Servicii informatice` },
  { code: '64', name: msg`Bănci și servicii financiare` },
  { code: '65', name: msg`Asigurări și pensii` },
  { code: '66', name: msg`Servicii auxiliare financiare` },
  { code: '68', name: msg`Imobiliare` },
  { code: '69', name: msg`Juridic și contabilitate` },
  { code: '70', name: msg`Consultanță în management` },
  { code: '71', name: msg`Arhitectură și inginerie` },
  { code: '72', name: msg`Cercetare-dezvoltare` },
  { code: '73', name: msg`Publicitate și studii de piață` },
  { code: '74', name: msg`Alte servicii profesionale` },
  { code: '75', name: msg`Servicii veterinare` },
  { code: '77', name: msg`Închiriere și leasing` },
  { code: '78', name: msg`Recrutare și forță de muncă` },
  { code: '79', name: msg`Agenții de turism` },
  { code: '80', name: msg`Pază și protecție` },
  { code: '81', name: msg`Curățenie și întreținerea clădirilor` },
  { code: '82', name: msg`Servicii suport pentru firme` },
  { code: '84', name: msg`Administrație publică` },
  { code: '85', name: msg`Învățământ` },
  { code: '86', name: msg`Sănătate` },
  { code: '87', name: msg`Îngrijire cu cazare` },
  { code: '88', name: msg`Asistență socială` },
  { code: '90', name: msg`Arte și spectacole` },
  { code: '91', name: msg`Biblioteci, muzee și patrimoniu` },
  { code: '92', name: msg`Jocuri de noroc` },
  { code: '93', name: msg`Sport și recreere` },
  { code: '94', name: msg`Asociații și organizații` },
  { code: '95', name: msg`Reparații de bunuri personale` },
  { code: '96', name: msg`Alte servicii personale` },
  { code: '97', name: msg`Personal casnic` },
  { code: '98', name: msg`Producție pentru consum propriu` },
  { code: '99', name: msg`Organizații extrateritoriale` },
]

const DIVISION_BY_CODE = new Map(CAEN_DIVISIONS.map((division) => [division.code, division]))

export function caenDivision(code: string): CaenDivision | undefined {
  return DIVISION_BY_CODE.get(code)
}

/** The division's name in the page's language; a code with no division stays a code, never a guessed name. */
export function divisionLabel(code: string): string {
  const division = DIVISION_BY_CODE.get(code)
  return division ? i18n._(division.name) : t`CAEN ${code}`
}
