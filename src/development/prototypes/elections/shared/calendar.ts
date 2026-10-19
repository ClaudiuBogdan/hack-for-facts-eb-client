/**
 * Romania's national elections since 1990, by year, kept by hand until the API
 * serves coverage (design note §12.4, ask 12). It exists only so the front
 * door can say which elections are not in the data; every page that uses it
 * says it is Transparenta.eu's calendar, not the API's. Partial and repeat
 * local elections are left out (the data's 1998 Bucharest partial shows as an
 * event of its own). To be checked against AEP's list before promotion.
 */

import type { Family } from './model'

export interface CalendarElection {
  readonly family: Family
  readonly year: number
  /** Several elections of one family in one year (two referendums in 2007). */
  readonly count?: number
  /** An instance that is not an ordinary general election. */
  readonly instance?: 'annulled' | 'rerun'
}

export const ELECTION_CALENDAR: readonly CalendarElection[] = [
  { family: 'parliamentary', year: 1990 },
  { family: 'presidential', year: 1990 },
  { family: 'referendum', year: 1991 },
  { family: 'local', year: 1992 },
  { family: 'parliamentary', year: 1992 },
  { family: 'presidential', year: 1992 },
  { family: 'local', year: 1996 },
  { family: 'parliamentary', year: 1996 },
  { family: 'presidential', year: 1996 },
  { family: 'local', year: 2000 },
  { family: 'parliamentary', year: 2000 },
  { family: 'presidential', year: 2000 },
  { family: 'referendum', year: 2003 },
  { family: 'local', year: 2004 },
  { family: 'parliamentary', year: 2004 },
  { family: 'presidential', year: 2004 },
  { family: 'european', year: 2007 },
  { family: 'referendum', year: 2007, count: 2 },
  { family: 'local', year: 2008 },
  { family: 'parliamentary', year: 2008 },
  { family: 'european', year: 2009 },
  { family: 'presidential', year: 2009 },
  { family: 'referendum', year: 2009 },
  { family: 'local', year: 2012 },
  { family: 'parliamentary', year: 2012 },
  { family: 'referendum', year: 2012 },
  { family: 'european', year: 2014 },
  { family: 'presidential', year: 2014 },
  { family: 'local', year: 2016 },
  { family: 'parliamentary', year: 2016 },
  { family: 'referendum', year: 2018 },
  { family: 'european', year: 2019 },
  { family: 'presidential', year: 2019 },
  { family: 'referendum', year: 2019 },
  { family: 'local', year: 2020 },
  { family: 'parliamentary', year: 2020 },
  { family: 'local', year: 2024 },
  { family: 'european', year: 2024 },
  { family: 'parliamentary', year: 2024 },
  { family: 'presidential', year: 2024, instance: 'annulled' },
  { family: 'presidential', year: 2025, instance: 'rerun' },
]

export const CALENDAR_FIRST_YEAR = 1990
export const CALENDAR_LAST_YEAR = 2025
