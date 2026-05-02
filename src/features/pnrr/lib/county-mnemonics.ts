// County name → 2-letter mnemonic lookup, generated from judete.json GeoJSON.
// This is the key used by InteractiveMap / createHeatmapStyleFunction for County view.

export const COUNTY_NAME_TO_MNEMONIC: Record<string, string> = {
  'Alba': 'AB',
  'Arad': 'AR',
  'Argeș': 'AG',
  'Bacău': 'BC',
  'Bihor': 'BH',
  'Bistrița-Năsăud': 'BN',
  'Botoșani': 'BT',
  'Brașov': 'BV',
  'Brăila': 'BR',
  'București': 'B',
  'Buzău': 'BZ',
  'Caraș-Severin': 'CS',
  'Cluj': 'CJ',
  'Constanța': 'CT',
  'Covasna': 'CV',
  'Călărași': 'CL',
  'Dolj': 'DJ',
  'Dâmbovița': 'DB',
  'Galați': 'GL',
  'Giurgiu': 'GR',
  'Gorj': 'GJ',
  'Harghita': 'HR',
  'Hunedoara': 'HD',
  'Ialomița': 'IL',
  'Iași': 'IS',
  'Ilfov': 'IF',
  'Maramureș': 'MM',
  'Mehedinți': 'MH',
  'Mureș': 'MS',
  'Neamț': 'NT',
  'Olt': 'OT',
  'Prahova': 'PH',
  'Satu Mare': 'SM',
  'Sibiu': 'SB',
  'Suceava': 'SV',
  'Sălaj': 'SJ',
  'Teleorman': 'TR',
  'Timiș': 'TM',
  'Tulcea': 'TL',
  'Vaslui': 'VS',
  'Vrancea': 'VN',
  'Vâlcea': 'VL',
}

// Reverse lookup: mnemonic → county name
export const MNEMONIC_TO_COUNTY_NAME: Record<string, string> = Object.fromEntries(
  Object.entries(COUNTY_NAME_TO_MNEMONIC).map(([name, code]) => [code, name])
)
