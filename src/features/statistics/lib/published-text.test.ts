import { describe, expect, it } from 'vitest'
import { parsePublishedText, stripSourceMarker } from './published-text'

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
