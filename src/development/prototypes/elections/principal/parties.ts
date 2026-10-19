import { t } from '@lingui/core/macro'

/**
 * How the page names and colours a party. The data serves only the full
 * registered name (`political_actors.canonical_name`); the short names and the
 * colours are Transparenta.eu's, chosen near each party's own so a map reads at
 * a glance — every colour sits beside its name in a legend, never alone.
 * Parties not listed share „Alte partide".
 */

export interface PartyStyle {
  readonly short: string
  /** Tailwind classes: the map fill and stroke, and a swatch background. */
  readonly fill: string
  readonly swatch: string
}

const STYLES: Readonly<Record<string, PartyStyle>> = {
  'partidul-social-democrat': { short: 'PSD', fill: 'fill-[#d7262e] stroke-[#d7262e]', swatch: 'bg-[#d7262e]' },
  'partidul-national-liberal': { short: 'PNL', fill: 'fill-[#f2c11b] stroke-[#f2c11b]', swatch: 'bg-[#f2c11b]' },
  'uniunea-democrata-maghiara-din-romania': { short: 'UDMR', fill: 'fill-[#2f8f46] stroke-[#2f8f46]', swatch: 'bg-[#2f8f46]' },
  'alianta-pentru-unirea-romanilor': { short: 'AUR', fill: 'fill-[#8c6a1c] stroke-[#8c6a1c]', swatch: 'bg-[#8c6a1c]' },
  'alianta-usr-plus': { short: 'USR PLUS', fill: 'fill-[#1e64c8] stroke-[#1e64c8]', swatch: 'bg-[#1e64c8]' },
  'uniunea-salvati-romania': { short: 'USR', fill: 'fill-[#1e64c8] stroke-[#1e64c8]', swatch: 'bg-[#1e64c8]' },
  'alianta-dreapta-unita-usr-pmp-forta-dreptei': { short: 'ADU', fill: 'fill-[#5b9be6] stroke-[#5b9be6]', swatch: 'bg-[#5b9be6]' },
  'partidul-miscarea-populara': { short: 'PMP', fill: 'fill-[#7fc3e8] stroke-[#7fc3e8]', swatch: 'bg-[#7fc3e8]' },
  'partidul-pro-romania': { short: 'PRO România', fill: 'fill-[#7b3fa0] stroke-[#7b3fa0]', swatch: 'bg-[#7b3fa0]' },
  'alianta-electorala-psd-pnl': { short: 'PSD+PNL', fill: 'fill-[#ec8a2f] stroke-[#ec8a2f]', swatch: 'bg-[#ec8a2f]' },
  'forumul-democrat-al-germanilor-din-romania': { short: 'FDGR', fill: 'fill-[#1f7a7a] stroke-[#1f7a7a]', swatch: 'bg-[#1f7a7a]' },
  'forta-dreptei': { short: 'Forța Dreptei', fill: 'fill-[#27408b] stroke-[#27408b]', swatch: 'bg-[#27408b]' },
  'partidul-umanist-social-liberal': { short: 'PUSL', fill: 'fill-[#b5487a] stroke-[#b5487a]', swatch: 'bg-[#b5487a]' },
  'partidul-ecologist-roman': { short: 'PER', fill: 'fill-[#6aa84f] stroke-[#6aa84f]', swatch: 'bg-[#6aa84f]' },
  'partidul-puterii-umaniste-social-liberal': { short: 'PPU-SL', fill: 'fill-[#b5487a] stroke-[#b5487a]', swatch: 'bg-[#b5487a]' },
  'alianta-maghiara-din-transilvania-erdelyi-magyar-szovetseg': { short: 'AMT', fill: 'fill-[#7fb069] stroke-[#7fb069]', swatch: 'bg-[#7fb069]' },
}

export const OTHER_STYLE: PartyStyle = { short: '', fill: 'fill-[#a8a29e] stroke-[#a8a29e]', swatch: 'bg-[#a8a29e]' }
export const INDEPENDENT_STYLE: PartyStyle = { short: '', fill: 'fill-[#57534e] stroke-[#57534e]', swatch: 'bg-[#57534e]' }
export const TIE_STYLE: PartyStyle = { short: '', fill: 'fill-foreground stroke-foreground', swatch: 'bg-foreground' }

export function partyStyle(key: string): PartyStyle {
  if (key === '~independent') return INDEPENDENT_STYLE
  if (key === '~tie') return TIE_STYLE
  return STYLES[key] ?? OTHER_STYLE
}

/** Listed parties have a colour of their own; the rest are drawn as „Alte partide". */
export function hasOwnStyle(key: string): boolean {
  return key === '~independent' || key === '~tie' || key in STYLES
}

/** The short name a reader knows, or the registered name in title case. */
export function partyShort(key: string, names: Readonly<Record<string, string>>): string {
  if (key === '~independent') return t`Independenți`
  if (key === '~unlinked') return t`Fără partid identificat`
  if (key === '~tie') return t`Egalitate`
  if (key === '~other') return t`Alte partide`
  const style = STYLES[key]
  if (style) return style.short
  return titleCase(names[key] ?? key)
}

export function partyName(key: string, names: Readonly<Record<string, string>>): string {
  return names[key] ? titleCase(names[key]) : partyShort(key, names)
}

const SMALL = new Set(['și', 'din', 'pentru', 'al', 'a', 'de', 'în'])

function titleCase(text: string): string {
  return text
    .toLocaleLowerCase('ro')
    .split(' ')
    .map((word, index) => (index > 0 && SMALL.has(word) ? word : word.charAt(0).toLocaleUpperCase('ro') + word.slice(1)))
    .join(' ')
}
