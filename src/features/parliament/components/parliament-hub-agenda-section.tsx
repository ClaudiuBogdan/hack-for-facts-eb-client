import { Link } from '@tanstack/react-router'
import { Skeleton } from '@/components/ui/skeleton'
import { useParliamentAgendas } from '../hooks/use-parliament-data'
import { parliamentHubLinkClassName } from '../lib/hub-theme'
import { AgendaFeatureCard } from './agenda-list-card'
import { ParliamentHubSection } from './parliament-hub-section'

/**
 * What the Chamber has planned, on the hub.
 *
 * One card, not a list: 1,296 of the 1,297 orders of business are in the past,
 * so the newest one is the only one that answers "what now" — and the archive
 * behind it is a lookup surface, which the section's own link goes to.
 */
export function ParliamentHubAgendaSection() {
  const { data, isLoading } = useParliamentAgendas(1)
  const latest = data?.agendas[0]

  return (
    <ParliamentHubSection
      id="parliament-hub-agenda-heading"
      title="Ordinea de zi"
      description="Ce și-a propus plenul Camerei Deputaților să ia în discuție. Este un plan de lucru, nu o consemnare a ce s-a dezbătut."
      action={
        <Link to="/parlament/agenda" search={{}} className={parliamentHubLinkClassName}>
          Toate ordinile de zi
        </Link>
      }
      bodyClassName="space-y-4 p-5 sm:p-6"
    >
      {isLoading ? (
        <Skeleton className="h-40 w-full rounded-none" />
      ) : latest ? (
        <AgendaFeatureCard agenda={latest} label="Cea mai recentă ședință" />
      ) : (
        <p className="text-sm text-[var(--pnrr-muted)]">
          Nu există ordini de zi disponibile.
        </p>
      )}
    </ParliamentHubSection>
  )
}
