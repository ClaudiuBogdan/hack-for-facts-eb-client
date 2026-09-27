import type { LinkOptions } from '@tanstack/react-router'

/** A county's INS series: the layer's matrix, on that county — where the INS hub's county band opens. */
export function insCountyLink(code: string, county: string): LinkOptions {
  return { to: '/ins/seturi/$cod', params: { cod: code }, search: { teritoriu: `cod:${county}`, frecventa: 'ANNUAL' } }
}
