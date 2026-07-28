import {
  CalendarDays,
  Landmark,
  MessageSquareText,
  ScrollText,
  UsersRound,
  Vote,
} from 'lucide-react'
import { ParliamentHubSection } from './parliament-hub-section'
import {
  ParliamentResourceCard,
  ParliamentResourceGrid,
  ParliamentResourceGridItem,
} from './parliament-resource-card'

/** Top hub navigation — Voturi, Proiecte, Parlamentari only */
export function ParliamentHubResourcesSection() {
  return (
    <ParliamentHubSection
      id="parliament-resources-heading"
      title="Resurse parlamentare"
      bodyClassName="p-0"
    >
      <ParliamentResourceGrid>
        <ParliamentResourceGridItem>
          <ParliamentResourceCard
            title="Voturi în Parlament"
            description="Rezultatele voturilor din Camera Deputaților și Senat, cu detaliu pe grup și membru."
            icon={Vote}
            link={{ to: '/parlament', search: { tab: 'voturi' } }}
          />
        </ParliamentResourceGridItem>
        <ParliamentResourceGridItem>
          <ParliamentResourceCard
            title="Proiecte de lege"
            description="Proiecte legislative în parcurs, cu etape, documente și voturi asociate."
            icon={ScrollText}
            link={{ to: '/parlament', search: { tab: 'proiecte' } }}
          />
        </ParliamentResourceGridItem>
        <ParliamentResourceGridItem>
          <ParliamentResourceCard
            title="Parlamentari"
            description="Componența politică a celor două camere, grupurile parlamentare și membrii aleși."
            icon={UsersRound}
            link={{ to: '/parlament', search: { tab: 'grupuri' } }}
          />
        </ParliamentResourceGridItem>
        <ParliamentResourceGridItem>
          <ParliamentResourceCard
            title="Stenograme"
            description="Intervențiile din plen, transcrise cuvânt cu cuvânt — căutabile pe zile, vorbitori și subiecte."
            icon={MessageSquareText}
            link={{ to: '/parlament/stenograme' }}
          />
        </ParliamentResourceGridItem>
        <ParliamentResourceGridItem>
          <ParliamentResourceCard
            title="Comisii"
            description="Comisiile permanente și speciale ale Camerei Deputaților și Senatului, cu componență și proiecte asociate."
            icon={Landmark}
            link={{ to: '/parlament/comisii' }}
          />
        </ParliamentResourceGridItem>
        <ParliamentResourceGridItem>
          <ParliamentResourceCard
            title="Ordinea de zi"
            description="Ce și-a propus plenul Camerei Deputaților să ia în discuție, ședință cu ședință, din 2001 până azi."
            icon={CalendarDays}
            link={{ to: '/parlament/agenda' }}
          />
        </ParliamentResourceGridItem>
      </ParliamentResourceGrid>
    </ParliamentHubSection>
  )
}
