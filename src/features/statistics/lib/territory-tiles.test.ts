import { describe, expect, it } from 'vitest'
import { shortIndicatorName } from './territory-tiles'

describe('shortIndicatorName', () => {
  it.each([
    // What it counts, not the axes it is broken down by; the place is the page.
    ['Nascuti vii pe judete si localitati', 'Nascuti vii'],
    ['Numarul mediu al salariatilor pe judete si localitati', 'Numarul mediu al salariatilor'],
    ['Locuinte existente la sfarsitul anului pe forme de proprietate, judete si localitati', 'Locuinte existente la sfarsitul anului'],
    ['Decedati sub 1 an pe  judete si localitati', 'Decedati sub 1 an'],
    ['Emigranti definitivi pe judete si localitati de plecare', 'Emigranti definitivi'],
    [
      'Ponderea somerilor inregistrati la sfarsitul lunii in totalul resurselor de munca, pe sexe, judete si localitati',
      'Ponderea somerilor inregistrati la sfarsitul lunii in totalul resurselor de munca',
    ],
    [
      'Institutii si companii de spectacole sau concerte dupa felul institutiilor si companiilor de spectacole sau concerte,pe judete si localitati',
      'Institutii si companii de spectacole sau concerte dupa felul institutiilor si companiilor de spectacole sau concerte',
    ],
    // What INS adds after the breakdown stays.
    ['Suprafata spatiilor verzi pe judete si localitati (municipii si orase)', 'Suprafata spatiilor verzi (municipii si orase)'],
    [
      'Persoane condamnate/sanctionate definitiv aflate in penitenciare (inclusiv centre de detentie si centre educative), pe judete si localitati (la sfarsitul anului)',
      'Persoane condamnate/sanctionate definitiv aflate in penitenciare (inclusiv centre de detentie si centre educative) (la sfarsitul anului)',
    ],
    // A name that opens in capitals reads in sentence case.
    ['POPULATIA DUPA DOMICILIU la 1 ianuarie pe grupe de varsta si varste, sexe, judete si localitati', 'Populatia dupa domiciliu la 1 ianuarie'],
    ['LEGALLY RESIDENT POPULATION, by age group and ages, sex, counties and localities at January 1st.', 'Legally resident population at January 1st'],
    ['Departures from the residence, counties and localities', 'Departures from the residence'],
    ['Permanent emigrants by counties and localities of departure', 'Permanent emigrants'],
    // A reference date already in the name is not said twice.
    [
      'Share of registered unemployed at the end of the month in the total labor resources, by gender, counties and localities, at the end of the month\n',
      'Share of registered unemployed at the end of the month in the total labor resources',
    ],
  ])('%s', (name, expected) => {
    expect(shortIndicatorName(name)).toBe(expected)
  })

  it('leaves a name with no place breakdown, and an acronym, as they are', () => {
    expect(shortIndicatorName('Cifra de afaceri CAEN Rev.2')).toBe('Cifra de afaceri CAEN Rev.2')
    expect(shortIndicatorName('UAT pe judete si localitati')).toBe('UAT')
  })
})
