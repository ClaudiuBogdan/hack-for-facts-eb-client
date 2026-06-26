import { Trans } from '@lingui/react/macro'
import { Link } from '@tanstack/react-router'
import { DEFAULT_ELECTIONS_LANDING_SEARCH } from '@/schemas/elections'
import {
  ProvenanceProvider,
  RelatedLinksRail,
  SourceProvenanceDrawer,
  type RelatedLinkItem,
} from '@/components/data-trust'

type Props = {
  readonly children: React.ReactNode
  readonly title: React.ReactNode
  readonly subtitle?: React.ReactNode
  readonly railLinks?: readonly RelatedLinkItem[]
}

const defaultRailLinks: readonly RelatedLinkItem[] = [
  {
    label: 'Parlament',
    description: 'Activitatea parlamentara ramane separata de rezultatele alegerilor.',
    to: '/parlament',
    disabled: true,
  },
  {
    label: 'Primarii',
    description: 'Context administrativ si bugetar pentru localitati.',
    to: '/primarie',
  },
  {
    label: 'Statistici',
    description: 'Indicatori teritoriali folositi ca fundal de analiza.',
    to: '/statistici',
    disabled: true,
  },
]

export function ElectionsPageLayout({
  children,
  title,
  subtitle,
  railLinks = defaultRailLinks,
}: Props) {
  return (
    <ProvenanceProvider>
      <main className="min-h-screen bg-background">
        <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_17rem] lg:px-6">
          <div className="min-w-0 space-y-5">
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">
                <Link
                  to="/alegeri"
                  search={DEFAULT_ELECTIONS_LANDING_SEARCH}
                  className="hover:text-foreground"
                >
                  <Trans>Alegeri</Trans>
                </Link>
              </div>
              <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
              {subtitle !== undefined && (
                <p className="max-w-3xl text-sm text-muted-foreground">{subtitle}</p>
              )}
            </div>
            {children}
          </div>
          <RelatedLinksRail links={railLinks} className="lg:pt-20" />
        </div>
      </main>
      <SourceProvenanceDrawer />
    </ProvenanceProvider>
  )
}
