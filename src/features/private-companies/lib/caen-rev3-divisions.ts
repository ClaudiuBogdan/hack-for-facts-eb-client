import { msg } from '@lingui/core/macro'
import type { MessageDescriptor } from '@lingui/core'

/**
 * The CAEN Rev.3 divisions, with the names ONRC publishes — reference data,
 * not a served fact: the API's catalog holds four-digit classes only.
 *
 * Source: ONRC, „CAEN Rev.3 — structura completă" (the INS classification,
 * NACE Rev. 2.1), https://www.onrc.ro/documente/anunturi/CAEN-Rev.3_structura-completa.pdf
 * — 30 pages, SHA-256 df0adb1dd6cf22645082e87154b91e4114ca9d3d3f921f610ef83a436741656e,
 * read 2026-10-13. Its structure parses to 22 sections, 87 divisions, 287
 * groups and 651 classes (the reference catalog's caen_rev3 count), every
 * class under its group and division. Each name is the PDF's text verbatim,
 * cedillas and the source's own spelling included (60 „activitoți", 73
 * „relatii", 74 „stiinţifice", 93 „spotive"); the page writes the cedillas as
 * comma-below letters when it shows them (`caenDivisionLabel`).
 *
 * The English names are Eurostat's NACE Rev. 2.1 division titles (manual
 * KS-GQ-24-007-EN-N, SHA-256 40c69a62305dff21442368fabd0af32b17ef03278b6828ab7bec4eb1497a7235),
 * the same 87 codes, in the English catalog.
 *
 * Rev.3 abolished division 45 (motor vehicle trade and repair, now in 46, 47
 * and 95): a Rev.2 code is never looked up here, nor a Rev.3 one in the Rev.2
 * table (`caen-divisions.ts`).
 */

export type CaenRev3Division = {
  readonly code: string
  /** The NACE Rev. 2.1 section letter, A–V. */
  readonly section: string
  readonly name: MessageDescriptor
}

export const CAEN_REV3_SOURCE = {
  publisher: 'ONRC',
  url: 'https://www.onrc.ro/documente/anunturi/CAEN-Rev.3_structura-completa.pdf',
  sha256: 'df0adb1dd6cf22645082e87154b91e4114ca9d3d3f921f610ef83a436741656e',
  readOn: '2026-10-13',
  counts: { sections: 22, divisions: 87, groups: 287, classes: 651 },
  english: {
    publisher: 'Eurostat',
    url: 'https://ec.europa.eu/eurostat/documents/3859598/21633320/KS-GQ-24-007-EN-N.pdf',
    sha256: '40c69a62305dff21442368fabd0af32b17ef03278b6828ab7bec4eb1497a7235',
  },
} as const

export const CAEN_REV3_DIVISIONS: readonly CaenRev3Division[] = [
  { code: '01', section: 'A', name: msg({ message: 'Agricultură, vânătoare şi servicii anexe', context: 'CAEN Rev.3 division' }) },
  { code: '02', section: 'A', name: msg({ message: 'Silvicultură şi exploatare forestieră', context: 'CAEN Rev.3 division' }) },
  { code: '03', section: 'A', name: msg({ message: 'Pescuitul şi acvacultura', context: 'CAEN Rev.3 division' }) },
  { code: '05', section: 'B', name: msg({ message: 'Extracţia cărbunelui superior şi inferior', context: 'CAEN Rev.3 division' }) },
  { code: '06', section: 'B', name: msg({ message: 'Extracţia petrolului brut şi a gazelor naturale', context: 'CAEN Rev.3 division' }) },
  { code: '07', section: 'B', name: msg({ message: 'Extracţia minereurilor metalifere', context: 'CAEN Rev.3 division' }) },
  { code: '08', section: 'B', name: msg({ message: 'Alte activităţi extractive', context: 'CAEN Rev.3 division' }) },
  { code: '09', section: 'B', name: msg({ message: 'Activităţi de servicii anexe extracţiei', context: 'CAEN Rev.3 division' }) },
  { code: '10', section: 'C', name: msg({ message: 'Industria alimentară', context: 'CAEN Rev.3 division' }) },
  { code: '11', section: 'C', name: msg({ message: 'Fabricarea băuturilor', context: 'CAEN Rev.3 division' }) },
  { code: '12', section: 'C', name: msg({ message: 'Fabricarea produselor din tutun', context: 'CAEN Rev.3 division' }) },
  { code: '13', section: 'C', name: msg({ message: 'Fabricarea produselor textile', context: 'CAEN Rev.3 division' }) },
  { code: '14', section: 'C', name: msg({ message: 'Fabricarea articolelor de îmbrăcăminte', context: 'CAEN Rev.3 division' }) },
  { code: '15', section: 'C', name: msg({ message: 'Tăbăcirea şi finisarea pieilor; fabricarea articolelor de voiaj şi marochinărie, harnaşamentelor şi încălţămintei; prepararea şi vopsirea blănurilor', context: 'CAEN Rev.3 division' }) },
  { code: '16', section: 'C', name: msg({ message: 'Prelucrarea lemnului, fabricarea produselor din lemn şi plută, cu excepţia mobilei; fabricarea articolelor din paie şi din alte materiale vegetale împletite', context: 'CAEN Rev.3 division' }) },
  { code: '17', section: 'C', name: msg({ message: 'Fabricarea hârtiei şi a produselor din hârtie', context: 'CAEN Rev.3 division' }) },
  { code: '18', section: 'C', name: msg({ message: 'Tipărire şi reproducerea pe suporţi a înregistrărilor', context: 'CAEN Rev.3 division' }) },
  { code: '19', section: 'C', name: msg({ message: 'Fabricarea produselor de cocserie şi a produselor obţinute din prelucrarea ţiţeiului', context: 'CAEN Rev.3 division' }) },
  { code: '20', section: 'C', name: msg({ message: 'Fabricarea substanţelor şi a produselor chimice', context: 'CAEN Rev.3 division' }) },
  { code: '21', section: 'C', name: msg({ message: 'Fabricarea produselor farmaceutice de bază şi a preparatelor farmaceutice', context: 'CAEN Rev.3 division' }) },
  { code: '22', section: 'C', name: msg({ message: 'Fabricarea produselor din cauciuc şi mase plastice', context: 'CAEN Rev.3 division' }) },
  { code: '23', section: 'C', name: msg({ message: 'Fabricarea altor produse din minerale nemetalice', context: 'CAEN Rev.3 division' }) },
  { code: '24', section: 'C', name: msg({ message: 'Industria metalurgică', context: 'CAEN Rev.3 division' }) },
  { code: '25', section: 'C', name: msg({ message: 'Industria construcţiilor metalice şi a produselor din metal, exclusiv maşini, utilaje şi instalaţii', context: 'CAEN Rev.3 division' }) },
  { code: '26', section: 'C', name: msg({ message: 'Fabricarea calculatoarelor şi a produselor electronice şi optice', context: 'CAEN Rev.3 division' }) },
  { code: '27', section: 'C', name: msg({ message: 'Fabricarea echipamentelor electrice', context: 'CAEN Rev.3 division' }) },
  { code: '28', section: 'C', name: msg({ message: 'Fabricarea de maşini, utilaje şi echipamente n.c.a.', context: 'CAEN Rev.3 division' }) },
  { code: '29', section: 'C', name: msg({ message: 'Fabricarea autovehiculelor de transport rutier, a remorcilor şi semiremorcilor', context: 'CAEN Rev.3 division' }) },
  { code: '30', section: 'C', name: msg({ message: 'Fabricarea altor mijloace de transport', context: 'CAEN Rev.3 division' }) },
  { code: '31', section: 'C', name: msg({ message: 'Fabricarea de mobilă', context: 'CAEN Rev.3 division' }) },
  { code: '32', section: 'C', name: msg({ message: 'Alte activităţi industriale', context: 'CAEN Rev.3 division' }) },
  { code: '33', section: 'C', name: msg({ message: 'Repararea, întreţinerea şi instalarea maşinilor şi echipamentelor', context: 'CAEN Rev.3 division' }) },
  { code: '35', section: 'D', name: msg({ message: 'Producţia şi furnizarea de energie electrică şi termică, gaze, apă caldă şi aer condiţionat', context: 'CAEN Rev.3 division' }) },
  { code: '36', section: 'E', name: msg({ message: 'Captarea, tratarea şi distribuţia apei', context: 'CAEN Rev.3 division' }) },
  { code: '37', section: 'E', name: msg({ message: 'Colectarea şi epurarea apelor uzate', context: 'CAEN Rev.3 division' }) },
  { code: '38', section: 'E', name: msg({ message: 'Colectarea, tratarea şi eliminarea deşeurilor; activităţi de recuperare a materialelor reciclabile', context: 'CAEN Rev.3 division' }) },
  { code: '39', section: 'E', name: msg({ message: 'Activităţi şi servicii de decontaminare', context: 'CAEN Rev.3 division' }) },
  { code: '41', section: 'F', name: msg({ message: 'Construcţii de clădiri', context: 'CAEN Rev.3 division' }) },
  { code: '42', section: 'F', name: msg({ message: 'Lucrări de geniu civil', context: 'CAEN Rev.3 division' }) },
  { code: '43', section: 'F', name: msg({ message: 'Lucrări speciale de construcţii', context: 'CAEN Rev.3 division' }) },
  { code: '46', section: 'G', name: msg({ message: 'Comerţ cu ridicata', context: 'CAEN Rev.3 division' }) },
  { code: '47', section: 'G', name: msg({ message: 'Comerţ cu amănuntul', context: 'CAEN Rev.3 division' }) },
  { code: '49', section: 'H', name: msg({ message: 'Transporturi terestre şi transporturi prin conducte', context: 'CAEN Rev.3 division' }) },
  { code: '50', section: 'H', name: msg({ message: 'Transporturi pe apă', context: 'CAEN Rev.3 division' }) },
  { code: '51', section: 'H', name: msg({ message: 'Transporturi aeriene', context: 'CAEN Rev.3 division' }) },
  { code: '52', section: 'H', name: msg({ message: 'Depozitare şi activităţi auxiliare pentru transporturi', context: 'CAEN Rev.3 division' }) },
  { code: '53', section: 'H', name: msg({ message: 'Activităţi de poştă şi de curier', context: 'CAEN Rev.3 division' }) },
  { code: '55', section: 'I', name: msg({ message: 'Hoteluri şi alte facilităţi de cazare', context: 'CAEN Rev.3 division' }) },
  { code: '56', section: 'I', name: msg({ message: 'Restaurante şi alte activităţi de servicii de alimentaţie', context: 'CAEN Rev.3 division' }) },
  { code: '58', section: 'J', name: msg({ message: 'Activităţi de editare', context: 'CAEN Rev.3 division' }) },
  { code: '59', section: 'J', name: msg({ message: 'Activităţi de producţie cinematografică, video şi de programe de televiziune; înregistrări audio şi activităţi de editare muzicală', context: 'CAEN Rev.3 division' }) },
  { code: '60', section: 'J', name: msg({ message: 'Activităţi de difuzare şi transmitere de programe, agenții de știri și alte activitoți de distribuție de conținut', context: 'CAEN Rev.3 division' }) },
  { code: '61', section: 'K', name: msg({ message: 'Telecomunicaţii', context: 'CAEN Rev.3 division' }) },
  { code: '62', section: 'K', name: msg({ message: 'Activităţi de programare și activități de consultanță în tehnologia informaţiei', context: 'CAEN Rev.3 division' }) },
  { code: '63', section: 'K', name: msg({ message: 'Activităţi ale portalurilor web, prelucrarea datelor, administrarea paginilor web şi activităţi conexe', context: 'CAEN Rev.3 division' }) },
  { code: '64', section: 'L', name: msg({ message: 'Intermedieri financiare, cu excepţia activităţilor de asigurări şi ale fondurilor de pensii', context: 'CAEN Rev.3 division' }) },
  { code: '65', section: 'L', name: msg({ message: 'Activităţi de asigurări, reasigurări şi ale fondurilor de pensii (cu excepţia celor din sistemul public de asigurări sociale)', context: 'CAEN Rev.3 division' }) },
  { code: '66', section: 'L', name: msg({ message: 'Activităţi auxiliare pentru intermedieri financiare, activităţi de asigurare şi fonduri de pensii', context: 'CAEN Rev.3 division' }) },
  { code: '68', section: 'M', name: msg({ message: 'Tranzacţii imobiliare', context: 'CAEN Rev.3 division' }) },
  { code: '69', section: 'N', name: msg({ message: 'Activităţi juridice şi de contabilitate', context: 'CAEN Rev.3 division' }) },
  { code: '70', section: 'N', name: msg({ message: 'Activităţi ale direcţiilor(centralelor), birourilor administrative centralizate; activităţi de management şi de consultanţă în management', context: 'CAEN Rev.3 division' }) },
  { code: '71', section: 'N', name: msg({ message: 'Activităţi de arhitectură şi inginerie; activităţi de testări şi analiză tehnică', context: 'CAEN Rev.3 division' }) },
  { code: '72', section: 'N', name: msg({ message: 'Cercetare-dezvoltare', context: 'CAEN Rev.3 division' }) },
  { code: '73', section: 'N', name: msg({ message: 'Publicitate, activităţi de studiere a pieţei și relatii publice', context: 'CAEN Rev.3 division' }) },
  { code: '74', section: 'N', name: msg({ message: 'Alte activităţi profesionale, stiinţifice şi tehnice', context: 'CAEN Rev.3 division' }) },
  { code: '75', section: 'N', name: msg({ message: 'Activităţi veterinare', context: 'CAEN Rev.3 division' }) },
  { code: '77', section: 'O', name: msg({ message: 'Activităţi de închiriere şi leasing', context: 'CAEN Rev.3 division' }) },
  { code: '78', section: 'O', name: msg({ message: 'Activităţi de servicii privind forţa de muncă', context: 'CAEN Rev.3 division' }) },
  { code: '79', section: 'O', name: msg({ message: 'Activităţi ale agenţiilor turistice şi a tur-operatorilor; alte servicii de rezervare şi asistenţă turistică', context: 'CAEN Rev.3 division' }) },
  { code: '80', section: 'O', name: msg({ message: 'Activităţi de investigaţii şi protecţie', context: 'CAEN Rev.3 division' }) },
  { code: '81', section: 'O', name: msg({ message: 'Activităţi de peisagistică şi servicii pentru clădiri', context: 'CAEN Rev.3 division' }) },
  { code: '82', section: 'O', name: msg({ message: 'Activităţi de secretariat, servicii suport şi alte activităţi de servicii prestate în principal întreprinderilor', context: 'CAEN Rev.3 division' }) },
  { code: '84', section: 'P', name: msg({ message: 'Administraţie publică şi apărare; asigurări sociale din sistemul public', context: 'CAEN Rev.3 division' }) },
  { code: '85', section: 'Q', name: msg({ message: 'Învăţământ', context: 'CAEN Rev.3 division' }) },
  { code: '86', section: 'R', name: msg({ message: 'Activităţi referitoare la sănătatea umană', context: 'CAEN Rev.3 division' }) },
  { code: '87', section: 'R', name: msg({ message: 'Servicii combinate de îngrijire medicală şi asistenţă socială, cu cazare', context: 'CAEN Rev.3 division' }) },
  { code: '88', section: 'R', name: msg({ message: 'Activităţi de asistenţă socială, fără cazare', context: 'CAEN Rev.3 division' }) },
  { code: '90', section: 'S', name: msg({ message: 'Activităţi de creaţie şi interpretare artistică', context: 'CAEN Rev.3 division' }) },
  { code: '91', section: 'S', name: msg({ message: 'Activităţi ale bibliotecilor, arhivelor, muzeelor şi alte activităţi culturale', context: 'CAEN Rev.3 division' }) },
  { code: '92', section: 'S', name: msg({ message: 'Activităţi de jocuri de noroc şi pariuri', context: 'CAEN Rev.3 division' }) },
  { code: '93', section: 'S', name: msg({ message: 'Activităţi spotive, recreative şi distractive', context: 'CAEN Rev.3 division' }) },
  { code: '94', section: 'T', name: msg({ message: 'Activităţi asociative diverse', context: 'CAEN Rev.3 division' }) },
  { code: '95', section: 'T', name: msg({ message: 'Repararea și întreținerea calculatoarelor, a articolelor personale și de uz gospodăresc, a autovehiculelor și motocicletelor', context: 'CAEN Rev.3 division' }) },
  { code: '96', section: 'T', name: msg({ message: 'Alte activităţi de servicii', context: 'CAEN Rev.3 division' }) },
  { code: '97', section: 'U', name: msg({ message: 'Activităţi ale gospodăriilor private în calitate de angajator de personal casnic', context: 'CAEN Rev.3 division' }) },
  { code: '98', section: 'U', name: msg({ message: 'Activităţi ale gospodăriilor private de producere de bunuri şi servicii destinate consumului propriu', context: 'CAEN Rev.3 division' }) },
  { code: '99', section: 'V', name: msg({ message: 'Activităţi ale organizaţiilor şi organismelor extrateritoriale', context: 'CAEN Rev.3 division' }) },
]
