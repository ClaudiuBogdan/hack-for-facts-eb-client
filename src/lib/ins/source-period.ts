/** Native period tokens may collide across cadences; a token alone cannot select a winner. */
export function selectInsPeriodObservation<
  T extends { time_period: { iso_period: string } },
>(
  observations: readonly T[],
  period: string | null,
):
  | { status: 'OBSERVATION'; observation: T }
  | { status: 'ABSENT' | 'AMBIGUOUS' } {
  const matches = observations.filter(
    (row) => row.time_period.iso_period === period,
  )
  if (matches.length > 1) return { status: 'AMBIGUOUS' }
  return matches[0]
    ? { status: 'OBSERVATION', observation: matches[0] }
    : { status: 'ABSENT' }
}
