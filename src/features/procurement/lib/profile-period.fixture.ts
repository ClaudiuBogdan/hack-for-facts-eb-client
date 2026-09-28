import { shiftMonth, type ProfilePeriod } from './profile-period'

/** A profile's period in a test: a calendar year — the year in progress when read `through` a month. */
export function yearPeriod(year: number, through: string | null = null): ProfilePeriod {
  return { kind: 'year', year, from: `${year}-01`, through }
}

/** The last twelve months through `through`. */
export function recentPeriod(through: string): ProfilePeriod {
  return { kind: 'recent', year: Number(through.slice(0, 4)), from: shiftMonth(through, -11), through }
}
