import { describe, expect, it } from 'vitest'
import { parsePublishedText, publishedTextExcerpt, publishedTextPlain, stripSourceMarker } from './published-text'

describe('parsePublishedText', () => {
  it('keeps plain text verbatim and normalizes CRLF', () => {
    expect(parsePublishedText('Linia 1\r\nLinia 2')).toEqual([
      { kind: 'text', text: 'Linia 1\nLinia 2' },
    ])
  })

  it('turns an absolute http(s) anchor into a link segment', () => {
    expect(
      parsePublishedText(
        'Vezi\r\n<a href="https://insse.ro/cms/files/raport.pdf" target="_blank"> Raport de metadate si calitate </a>\r\n',
      ),
    ).toEqual([
      { kind: 'text', text: 'Vezi\n' },
      {
        kind: 'link',
        href: 'https://insse.ro/cms/files/raport.pdf',
        label: 'Raport de metadate si calitate',
      },
      { kind: 'text', text: '\n' },
    ])
  })

  it('never emits a link for a non-http target and drops every other tag', () => {
    expect(
      parsePublishedText(
        '<a href="javascript:alert(1)">click</a> <td>celula</td> <b>bold</b>',
      ),
    ).toEqual([{ kind: 'text', text: 'click celula bold' }])
  })

  it('keeps the text of a broken anchor instead of losing it', () => {
    expect(
      parsePublishedText('Sursa: <a href="https://insse.ro/x.pdf\n " target="_blank">'),
    ).toEqual([{ kind: 'text', text: 'Sursa: ' }])
  })
})

describe('stripSourceMarker', () => {
  it('removes the trailing TEMPO link marker only', () => {
    expect(
      stripSourceMarker('Cercetarea statistica privind costul fortei de munca <<6263>>'),
    ).toBe('Cercetarea statistica privind costul fortei de munca')
    expect(stripSourceMarker('Surse administrative')).toBe('Surse administrative')
    expect(stripSourceMarker('A <<1>> si B <<2>>')).toBe('A <<1>> si B')
  })
})

describe('publishedTextPlain and publishedTextExcerpt', () => {
  const definition =
    'Capitolul 7 „Conturile de patrimoniu" <a href="https://eur-lex.europa.eu/x" target="_blank"> https://eur-lex.europa.eu/x </a>\r\nși <td>restul</td> textului.'

  it('reads the words alone: a link is its label, a break a space, a stray tag nothing', () => {
    expect(publishedTextPlain(definition)).toBe(
      'Capitolul 7 „Conturile de patrimoniu" https://eur-lex.europa.eu/x și restul textului.',
    )
  })

  it('cuts an excerpt at a word and marks the cut, and leaves a short text whole', () => {
    const excerpt = publishedTextExcerpt(definition, 40)
    expect(excerpt).toBe('Capitolul 7 „Conturile de patrimoniu"…')
    expect(excerpt.length).toBeLessThanOrEqual(41)
    expect(publishedTextExcerpt('Scurt.', 40)).toBe('Scurt.')
  })

  it('cuts a text with no early word boundary at the length itself', () => {
    expect(publishedTextExcerpt('a'.repeat(50), 20)).toBe(`${'a'.repeat(20)}…`)
  })
})
