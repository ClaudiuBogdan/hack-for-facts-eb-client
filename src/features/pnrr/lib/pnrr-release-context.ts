import { createContext, useContext } from 'react'
import { getUserLocale } from '@/lib/utils'

/**
 * The API release the dashboard shows, set once by `PnrrDashboard` from the
 * release read. Every dashboard request and query key is pinned to it, so a
 * render never mixes answers from two releases; `null` until it is known.
 */
export const PnrrDashboardReleaseContext = createContext<string | null>(null)

export function usePnrrDashboardReleaseId(): string | null {
  return useContext(PnrrDashboardReleaseContext)
}

/** A source date in the reader's language; "—" when the release has none. */
export function formatPnrrSourceDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(`${value.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(getUserLocale(), {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}
