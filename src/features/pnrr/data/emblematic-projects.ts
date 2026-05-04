

/**
 * Manually curated list of emblematic / high-salience PNRR projects.
 * Used to power the "Proiecte Emblematic" tracker.
 *
 * Matching strategy: we search for projects whose title *contains*
 * one of the keywords (case-insensitive, diacritic-insensitive).
 */

export type EmblematicProjectConfig = {
  readonly id: string
  readonly labelRo: string
  readonly labelEn: string
  readonly keywords: readonly string[]
  readonly componentCodes: readonly string[]
  readonly descriptionRo?: string
}

export const EMBLEMATIC_PROJECTS: readonly EmblematicProjectConfig[] = [
  {
    id: 'anaf-digitalizare',
    labelRo: 'Digitalizare ANAF',
    labelEn: 'ANAF Digitalization',
    keywords: ['cresterea conformarii voluntare'],
    componentCodes: ['C8'],
    descriptionRo: 'Reforma fiscală emblematică a PNRR.',
  },
  {
    id: 'cloud-guvernamental',
    labelRo: 'Cloud Guvernamental',
    labelEn: 'Government Cloud',
    keywords: ['implementarea infrastructurii de cloud guvernamental'],
    componentCodes: ['C7'],
    descriptionRo: 'Pilonul central al transformării digitale.',
  },
  {
    id: 'a7-focsani-bacau',
    labelRo: 'Autostrada A7 — Focșani–Bacău',
    labelEn: 'A7 Motorway — Focșani to Bacău',
    keywords: ['sectiunea focsani - bacau'],
    componentCodes: ['C4'],
    descriptionRo: 'Cea mai mare secțiune A7 din setul PNRR.',
  },
  {
    id: 'cfr-carasebes-timisoara-arad',
    labelRo: 'CFR — Caransebeș–Timișoara–Arad',
    labelEn: 'CFR — Caransebeș to Timișoara to Arad',
    keywords: ['caransebes - timisoara'],
    componentCodes: ['C4'],
    descriptionRo: 'Cel mai valoros proiect PNRR (€1.14B).',
  },
  {
    id: 'fondul-de-fonduri',
    labelRo: 'Fondul de Fonduri (InvestEU)',
    labelEn: 'Fund of Funds (InvestEU)',
    keywords: ['fondul european de investitii privind fondul de fonduri de capital'],
    componentCodes: ['C9'],
    descriptionRo: 'Cel mai mare instrument financiar PNRR pentru mediul privat.',
  },
  {
    id: 'securitate-cibernetica',
    labelRo: 'Securitate Cibernetică Națională',
    labelEn: 'National Cybersecurity',
    keywords: ['asigurarea protectiei cibernetice'],
    componentCodes: ['C7'],
    descriptionRo: 'Proiect național pentru infrastructuri TIC critice.',
  },
  {
    id: 'spital-constanta-mama-copil',
    labelRo: 'Maternitate nouă — Spitalul Countyean Constanța',
    labelEn: 'New Maternity Department — Constanța County Hospital',
    keywords: ['sf. apostol andrei constanta'],
    componentCodes: ['C12'],
    descriptionRo: 'Cel mai mare proiect spitalicesc local din dataset.',
  },
  {
    id: 'renovare-sector4',
    labelRo: 'Valul Renovării — Sector 4',
    labelEn: 'Renovation Wave — Bucharest Sector 4',
    keywords: [
      'comunitati expuse riscului de saracie si excluziune sociala din sectorul 4',
    ],
    componentCodes: ['C5'],
    descriptionRo: 'Cel mai mare proiect de renovare energetică din dataset.',
  },
  {
    id: 'senthicom-nxp',
    labelRo: 'SENTHICOM / NXP Semiconductors',
    labelEn: 'SENTHICOM / NXP Semiconductors',
    keywords: ['senthicom'],
    componentCodes: ['C9'],
    descriptionRo: 'Cel mai mare proiect de microelectronică din dataset.',
  },
  {
    id: 'transelectrica-repowereu',
    labelRo: 'Rețea electrică națională — Transelectrica',
    labelEn: 'National Power Grid — Transelectrica',
    keywords: ['retelei nationale de transport a energiei electrice'],
    componentCodes: ['C16'],
    descriptionRo: 'Cel mai mare proiect REPowerEU din dataset.',
  },
  {
    id: 'cfr-cluj-oradea',
    labelRo: 'CFR — Cluj–Oradea (electrificare)',
    labelEn: 'CFR — Cluj to Oradea Electrification',
    keywords: ['cluj napoca- oradea-episcopia bihor'],
    componentCodes: ['C4'],
    descriptionRo: 'Al doilea cel mai valoros proiect (€1.13B).',
  },
  {
    id: 'banca-dezvoltare',
    labelRo: 'Banca Națională de Dezvoltare',
    labelEn: 'National Development Bank',
    keywords: ['bancii nationale de dezvoltare'],
    componentCodes: ['C8'],
    descriptionRo: 'Instituție financiară nouă finanțată prin PNRR.',
  },
  {
    id: 'platforma-cnas',
    labelRo: 'Platforma CNAS',
    labelEn: 'National Health Insurance Platform',
    keywords: ['platformei informatice din asigurarile de sanatate'],
    componentCodes: ['C7'],
    descriptionRo: 'Refacerea platformei informatice a asigurărilor de sănătate.',
  },
  {
    id: 'centru-cardiovascular-targu-mures',
    labelRo: 'Centru Cardiovascular Târgu Mureș',
    labelEn: 'Târgu Mureș Cardiovascular Center',
    keywords: ['centru chirurgical cardiovascular'],
    componentCodes: ['C12'],
    descriptionRo: 'Centru nou pentru boli cardiovasculare și transplant.',
  },
  {
    id: 'energie-cogenerare-constanta',
    labelRo: 'Cogenerare de înaltă eficiență — Constanța',
    labelEn: 'High-Efficiency Cogeneration — Constanța',
    keywords: ['cogenerare de inalta eficienta in municipiul constanta'],
    componentCodes: ['C6'],
    descriptionRo: 'Cel mai mare proiect energetic din componenta C6.',
  },
  {
    id: 'transport-public-timisoara',
    labelRo: 'Transport public verde — Timișoara',
    labelEn: 'Green Public Transport — Timișoara',
    keywords: ['zona timisoara – runda 2', 'zona timisoara - runda 2'],
    componentCodes: ['C10'],
    descriptionRo: 'Cel mai mare proiect de transport public local din C10.',
  },
  {
    id: 'campus-dual-usv',
    labelRo: 'Campus dual USV',
    labelEn: 'USV Dual Education Campus',
    keywords: ['dual usv'],
    componentCodes: ['C15'],
    descriptionRo: 'Cel mai mare proiect de educație duală din dataset.',
  },
  {
    id: 'a1-lugoj-deva',
    labelRo: 'Autostrada A1 — Margina–Holdea',
    labelEn: 'A1 Motorway — Margina to Holdea',
    keywords: ['margina-holdea'],
    componentCodes: ['C4'],
    descriptionRo: 'Proiect rutier major pentru închiderea unei secțiuni A1.',
  },
  {
    id: 'locomotive-electrice-cfr',
    labelRo: 'Locomotive electrice CFR Călători',
    labelEn: 'Electric Locomotives for CFR Călători',
    keywords: ['modernizarea a 55 de locomotive electrice'],
    componentCodes: ['C4'],
    descriptionRo: 'Modernizarea materialului rulant pentru transport feroviar.',
  },
]

function normalizeSearchText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

export function projectMatchesEmblematicConfig(
  title: string,
  config: EmblematicProjectConfig,
): boolean {
  const normalized = normalizeSearchText(title)

  return config.keywords.some((kw) =>
    normalized.includes(normalizeSearchText(kw))
  )
}

/**
 * Find the emblematic config that matches a project title.
 */
export function matchEmblematicProject(title: string): EmblematicProjectConfig | undefined {
  return EMBLEMATIC_PROJECTS.find((em) =>
    projectMatchesEmblematicConfig(title, em)
  )
}
