import Papa from 'papaparse'
import entityDirectoryCsv from '@/assets/data/pnrr-beneficiary-entity-directory.csv?raw'
import { MNEMONIC_TO_COUNTY_NAME } from './county-mnemonics'
import { UAT_CUI_TO_NATCODE } from './uat-mapping'

const BUCHAREST_MUNICIPALITY_CUI = '4267117'
const BUCHAREST_MUNICIPALITY_NATCODE = '179132'

type PnrrUatLabel = {
  readonly siruta: string
  readonly name: string
  readonly county: string | null
}

let cachedLabels: ReadonlyMap<string, PnrrUatLabel> | null = null

function clean(value: string | undefined): string {
  return value?.trim() ?? ''
}

function getUatNatcodeByCui(cui: string): string | undefined {
  if (cui === BUCHAREST_MUNICIPALITY_CUI) {
    return BUCHAREST_MUNICIPALITY_NATCODE
  }

  return UAT_CUI_TO_NATCODE[cui]
}

function getUatDisplayName(cui: string, directoryLocality: string): string {
  if (cui === BUCHAREST_MUNICIPALITY_CUI) {
    return 'Municipiul București'
  }

  return directoryLocality
}

export function getPnrrUatLabelsBySiruta(): ReadonlyMap<string, PnrrUatLabel> {
  if (cachedLabels) {
    return cachedLabels
  }

  const parsed = Papa.parse<string[]>(entityDirectoryCsv, {
    delimiter: ',',
    skipEmptyLines: 'greedy',
  })
  const labels = new Map<string, PnrrUatLabel>()

  for (const row of parsed.data) {
    const cui = clean(row[0])
    const isUat = clean(row[2])

    if (isUat !== '1') {
      continue
    }

    const siruta = getUatNatcodeByCui(cui)
    const name = getUatDisplayName(cui, clean(row[4]))

    if (!siruta || !name) {
      continue
    }

    const countyCode = clean(row[3])
    labels.set(siruta, {
      siruta,
      name,
      county: (MNEMONIC_TO_COUNTY_NAME[countyCode] ?? countyCode) || null,
    })
  }

  cachedLabels = labels
  return labels
}

export function getPnrrUatLabel(siruta: string): string | null {
  return getPnrrUatLabelsBySiruta().get(siruta)?.name ?? null
}
