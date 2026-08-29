import { describe, expect, it } from 'vitest'
import type { TldfBlock } from './types'
import { splitMasthead } from './masthead'

const block = (kind: string, id: string, text = 'x'): TldfBlock => ({
  id,
  kind,
  type: 'bloc',
  span: [0, 10],
  content: [{ text, span: [0, 1] }],
})

const FACTS_98 = {
  den: 'LEGE nr. 98 din 19 mai 2016',
  issuerLabel: 'Parlamentul României',
  issueNumber: 390,
  issueYear: 2016,
} as const

const NONE_SHOWN = {
  den: null,
  issuerLabel: null,
  issueNumber: null,
  issueYear: null,
} as const

const masthead98 = [
  block('titlu_act', 't', 'LEGE nr. 98 din 19 mai 2016'),
  block('subtitlu_act', 's', 'privind achizițiile publice'),
  block('emitent', 'e', 'EMITENT PARLAMENTUL'),
  block('publicare', 'p', 'Publicat în MONITORUL OFICIAL nr. 390 din 23 mai 2016'),
  block('paragraf', 'body-1', 'Parlamentul României adoptă prezenta lege.'),
]

describe('splitMasthead', () => {
  it('drops exactly the lines whose displayed value matches', () => {
    const split = splitMasthead(masthead98, FACTS_98)
    expect(split.blocks.map((b) => b.id)).toEqual(['body-1'])
    expect(split.subject).toBe('privind achizițiile publice')
    expect(split.lifted).toBe(true)
  })

  it('keeps a publicare naming a DIFFERENT issue than the header shows', () => {
    const split = splitMasthead(masthead98, { ...FACTS_98, issueNumber: 512 })
    expect(split.blocks.map((b) => b.id)).toEqual(['p', 'body-1'])
  })

  it('keeps publicare when the header shows no date — a bare number identifies nothing', () => {
    const split = splitMasthead(masthead98, { ...FACTS_98, issueYear: null })
    expect(split.blocks.map((b) => b.id)).toEqual(['p', 'body-1'])
  })

  it('matches separator-bearing MO numbers ("nr. 1.027")', () => {
    const late = [
      block('publicare', 'p', 'Publicat în MONITORUL OFICIAL nr. 1.027 din 27 decembrie 2016'),
      block('articol', 'a1'),
    ]
    expect(
      splitMasthead(late, { ...NONE_SHOWN, issueNumber: 1027, issueYear: 2016 })
        .blocks.map((b) => b.id),
    ).toEqual(['a1'])
  })

  it('keeps an emitent the header issuer does not cover', () => {
    const ministry = [
      block('titlu_act', 't', 'LEGE nr. 98 din 19 mai 2016'),
      block('emitent', 'e', 'EMITENT MINISTERUL FINANȚELOR PUBLICE'),
      block('articol', 'a1'),
    ]
    expect(
      splitMasthead(ministry, FACTS_98).blocks.map((b) => b.id),
    ).toEqual(['e', 'a1'])
  })

  it('keeps a titlu that does not match den', () => {
    const other = [
      block('titlu_act', 't', 'LEGE nr. 99 din 20 mai 2016'),
      block('subtitlu_act', 's', 'privind altceva'),
      block('articol', 'a1'),
    ]
    const split = splitMasthead(other, FACTS_98)
    expect(split.blocks.map((b) => b.id)).toEqual(['t', 's', 'a1'])
    expect(split.subject).toBeNull()
  })

  it('does not re-lift a subject den already contains', () => {
    const split = splitMasthead(masthead98, {
      ...FACTS_98,
      den: 'LEGE nr. 98 din 19 mai 2016 privind achizițiile publice',
    })
    // The block still drops — the fact IS displayed — but nothing is
    // handed back to append.
    expect(split.blocks.map((b) => b.id)).toEqual(['body-1'])
    expect(split.subject).toBeNull()
  })

  it('drops nothing when the header shows none of the facts (?doc= override)', () => {
    const split = splitMasthead(masthead98, NONE_SHOWN)
    expect(split.blocks).toBe(masthead98)
    expect(split.subject).toBeNull()
    expect(split.lifted).toBe(false)
  })

  it('skips over an interstitial paragraph — the Codul fiscal shape', () => {
    const codFiscal = [
      block('titlu_act', 't', 'CODUL FISCAL din 8 septembrie 2015'),
      block('paragraf', 'covering-law', '( Legea nr. 227/2015 )'),
      block('emitent', 'e', 'EMITENT PARLAMENTUL'),
      block('publicare', 'p', 'Publicat în MONITORUL OFICIAL nr. 688 din 10 septembrie 2015'),
      block('paragraf', 'formula', 'Parlamentul României adoptă prezenta lege.'),
      block('titlu', 'titlul-1'),
    ]
    const split = splitMasthead(codFiscal, {
      den: 'CODUL FISCAL din 8 septembrie 2015',
      issuerLabel: 'Parlamentul României',
      issueNumber: 688,
      issueYear: 2015,
    })
    expect(split.blocks.map((b) => b.id)).toEqual([
      'covering-law',
      'formula',
      'titlul-1',
    ])
    expect(split.subject).toBeNull()
  })

  it('stops at structure — a masthead kind past the first heading is content', () => {
    const withQuoted = [
      block('titlu_act', 't', 'LEGE nr. 98 din 19 mai 2016'),
      block('capitol', 'cap-1'),
      block('emitent', 'quoted-emitent', 'EMITENT PARLAMENTUL'),
    ]
    expect(splitMasthead(withQuoted, FACTS_98).blocks.map((b) => b.id)).toEqual([
      'cap-1',
      'quoted-emitent',
    ])
  })

  it('never scans past the cap', () => {
    const deep = [
      ...Array.from({ length: 8 }, (_, i) => block('paragraf', `p${i}`)),
      block('emitent', 'late-emitent', 'EMITENT PARLAMENTUL'),
    ]
    expect(splitMasthead(deep, FACTS_98).blocks).toBe(deep)
  })
})
