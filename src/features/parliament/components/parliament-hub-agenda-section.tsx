import { Skeleton } from '@/components/ui/skeleton'
import { useParliamentAgendas } from '../hooks/use-parliament-data'
import { AgendaFeatureCard } from './agenda-list-card'

/**
 * What the Chamber has planned, on the hub.
 *
 * One card and no section chrome. The card already carries its own border, its
 * own label and its own link, so wrapping it in a titled panel drew a box inside
 * a box and repeated in a heading what the card says in its first line. "Ordinea
 * de zi" is a resource tile above; this is the one thing that changes week to
 * week.
 */
export function ParliamentHubAgendaSection() {
  const { data, isLoading } = useParliamentAgendas(1)
  const latest = data?.agendas[0]

  if (isLoading) return <Skeleton className="h-40 w-full rounded-none" />
  if (!latest) return null

  return <AgendaFeatureCard agenda={latest} label="Cea mai recentă ședință" />
}
