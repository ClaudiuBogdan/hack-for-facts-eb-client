/**
 * A fiscal code as the API compares codes (API a51e6790, contract f0dbc4fcf):
 * leading zeros drop only while the code as written is all digits and at most
 * a CUI's ten long ('0014399840' is 14399840). An RO prefix, a longer code or
 * any other character is kept as written, and matches no other code
 * ('0000014399840' and 'RO14399840' are not 14399840). The client must not
 * match more loosely or more strictly than the API: either way it could name a
 * party the API treats as another.
 */
const PADDED_CUI = /^\d{1,10}$/u

export function withoutLeadingZeros(code: string): string {
  return PADDED_CUI.test(code) ? code.replace(/^0+(?=\d)/u, '') : code
}
