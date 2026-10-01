import { describe, expect, it } from 'vitest'
import { isMasked, purposeSegments, purposeText } from './words'

describe('the purpose', () => {
  it('cuts the text where the registry masked it, and joins back to the text', () => {
    const text = 'Ocrotirea <PERSON> din <LOCATION>, cu sprijinul <ORGANIZATION_2>.\nSediul: <FACILITY><PHONE_NUMBER>'
    const segments = purposeSegments(text)
    expect(segments).toEqual([
      { text: 'Ocrotirea ' },
      { mask: 'person', token: '<PERSON>' },
      { text: ' din ' },
      { mask: 'location', token: '<LOCATION>' },
      { text: ', cu sprijinul ' },
      { mask: 'organization', token: '<ORGANIZATION_2>' },
      { text: '.\nSediul: ' },
      { mask: 'facility', token: '<FACILITY>' },
      { mask: 'other', token: '<PHONE_NUMBER>' },
    ])
    expect(segments.map((segment) => ('text' in segment ? segment.text : segment.token)).join('')).toBe(text)
  })

  it('leaves a text without masks whole, and capitals in brackets that are no mask as the registry’s words', () => {
    expect(purposeSegments('Educație civică.')).toEqual([{ text: 'Educație civică.' }])
    expect(purposeSegments('vârsta <18 ani, <b>')).toEqual([{ text: 'vârsta <18 ani, <b>' }])
    expect(purposeSegments('PROIECTUL <<SPERANTA>> AL <ONG>')).toEqual([{ text: 'PROIECTUL <<SPERANTA>> AL <ONG>' }])
    expect(isMasked('PROIECTUL <ONG>')).toBe(false)
    expect(isMasked('drepturilor <PERSON>')).toBe(true)
  })

  it('is read only where available and saying something', () => {
    expect(purposeText({ purpose: { availability: 'available', text: '  Scop.  ' } })).toBe('Scop.')
    expect(purposeText({ purpose: { availability: 'available', text: '   ' } })).toBeNull()
    expect(purposeText({ purpose: { availability: 'not_loaded', text: null } })).toBeNull()
  })
})
