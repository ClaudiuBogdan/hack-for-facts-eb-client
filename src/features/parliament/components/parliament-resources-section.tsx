import {
  Landmark,
  ScrollText,
  Users,
  UsersRound,
  Vote,
  Wallet,
} from 'lucide-react'
import { ParliamentHubSection } from './parliament-hub-section'
import {
  ParliamentResourceCard,
  ParliamentResourceGrid,
  ParliamentResourceGridItem,
} from './parliament-resource-card'

/** UK Parliament “Other Parliamentary resources” section */
export function ParliamentResourcesSection() {
  return (
    <ParliamentHubSection
      id="parliament-resources-heading"
      title="Resurse parlamentare"
      bodyClassName="p-0"
    >
      <ParliamentResourceGrid>
        <ParliamentResourceGridItem>
          <ParliamentResourceCard
            title="Deputați și senatori"
            description="Găsește parlamentarii aleși, grupurile politice și circumscripțiile electorale."
            icon={Users}
            link={{ to: '/parlament', search: { tab: 'grupuri' } }}
          />
        </ParliamentResourceGridItem>
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
            title="Grupuri parlamentare"
            description="Componența politică a celor două camere și numărul de membri pe grup."
            icon={UsersRound}
            link={{ to: '/parlament', search: { tab: 'grupuri' } }}
          />
        </ParliamentResourceGridItem>
        <ParliamentResourceGridItem>
          <ParliamentResourceCard
            title="Buget instituții"
            description="Cheltuielile bugetare ale Camerei Deputaților, Senatului și instituțiilor conexe."
            icon={Wallet}
            link={{ to: '/buget-national-2026' }}
          />
        </ParliamentResourceGridItem>
        <ParliamentResourceGridItem>
          <ParliamentResourceCard
            title="Camera Deputaților — site oficial"
            description="Informații, agendă și documente publicate de Camera Deputaților."
            icon={ScrollText}
            link={{ to: '/parlament' }}
            external
            href="https://www.cdep.ro"
          />
        </ParliamentResourceGridItem>
        <ParliamentResourceGridItem>
          <ParliamentResourceCard
            title="Senat — site oficial"
            description="Informații, agendă și documente publicate de Senatul României."
            icon={Landmark}
            link={{ to: '/parlament' }}
            external
            href="https://www.senat.ro"
          />
        </ParliamentResourceGridItem>
      </ParliamentResourceGrid>
    </ParliamentHubSection>
  )
}
