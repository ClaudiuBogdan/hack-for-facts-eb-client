import {
  Landmark,
  ScrollText,
  Users,
  UsersRound,
  Vote,
  Wallet,
} from 'lucide-react'
import {
  PARLIAMENT_CAMERA_GREEN,
  PARLIAMENT_ICON_BG,
  PARLIAMENT_QUICK_LINK_ILLUSTRATION,
  PARLIAMENT_SENAT_RED,
} from '../lib/hub-theme'
import { ParliamentHubSection } from './parliament-hub-section'
import { ParliamentQuickLinkCard } from './parliament-quick-link-card'

/** UK Parliament “Quick links” section — 4×2 illustrated grid */
export function ParliamentQuickLinksSection() {
  return (
    <ParliamentHubSection
      id="parliament-quick-links-heading"
      title="Acces rapid"
      bodyClassName="p-5 sm:p-6"
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ParliamentQuickLinkCard
          title="Camera Deputaților"
          description="Camera aleasă direct care adoptă legi și controlează activitatea Guvernului."
          icon={Landmark}
          illustrationColor={PARLIAMENT_CAMERA_GREEN}
          link={{ to: '/parlament', search: { tab: 'membri', chamber: 'camera' } }}
        />
        <ParliamentQuickLinkCard
          title="Senatul României"
          description="Camera care verifică și completează proiectele de lege adoptate de Camera Deputaților."
          icon={Landmark}
          illustrationColor={PARLIAMENT_SENAT_RED}
          link={{ to: '/parlament', search: { tab: 'membri', chamber: 'senat' } }}
        />
        <ParliamentQuickLinkCard
          title="Deputați și senatori"
          description="Găsește parlamentarii aleși, grupurile politice și circumscripțiile electorale."
          icon={Users}
          illustrationColor={PARLIAMENT_QUICK_LINK_ILLUSTRATION}
          iconColor={PARLIAMENT_ICON_BG}
          link={{ to: '/parlament', search: { tab: 'membri' } }}
        />
        <ParliamentQuickLinkCard
          title="Voturi în Parlament"
          description="Rezultatele voturilor din Camera Deputaților și Senat, cu detaliu pe grup și membru."
          icon={Vote}
          illustrationColor={PARLIAMENT_QUICK_LINK_ILLUSTRATION}
          iconColor={PARLIAMENT_ICON_BG}
          link={{ to: '/parlament', search: { tab: 'voturi' } }}
        />
        <ParliamentQuickLinkCard
          title="Grupuri parlamentare"
          description="Componența politică a celor două camere și numărul de membri pe grup."
          icon={UsersRound}
          illustrationColor={PARLIAMENT_QUICK_LINK_ILLUSTRATION}
          iconColor={PARLIAMENT_ICON_BG}
          link={{ to: '/parlament', search: { tab: 'grupuri' } }}
        />
        <ParliamentQuickLinkCard
          title="Buget instituții"
          description="Cheltuielile bugetare ale Camerei Deputaților, Senatului și instituțiilor conexe."
          icon={Wallet}
          illustrationColor={PARLIAMENT_QUICK_LINK_ILLUSTRATION}
          iconColor={PARLIAMENT_ICON_BG}
          link={{ to: '/buget-national-2026' }}
        />
        <ParliamentQuickLinkCard
          title="Camera Deputaților — site oficial"
          description="Informații, agendă și documente publicate de Camera Deputaților."
          icon={ScrollText}
          illustrationColor={PARLIAMENT_CAMERA_GREEN}
          link={{ to: '/parlament' }}
          external
          href="https://www.cdep.ro"
        />
        <ParliamentQuickLinkCard
          title="Senat — site oficial"
          description="Informații, agendă și documente publicate de Senatul României."
          icon={ScrollText}
          illustrationColor={PARLIAMENT_SENAT_RED}
          link={{ to: '/parlament' }}
          external
          href="https://www.senat.ro"
        />
      </div>
    </ParliamentHubSection>
  )
}
