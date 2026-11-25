import { CompanyBusinessBand } from '@/features/private-companies/components/profile/company-business-band'
import type { PrototypeDefinition } from '@/development/harness/entry'
import { ProtoBusinessBand } from './profile-business.band'
import { PROTOTYPE_MARKER, useProtoModel } from './profile.data'

/**
 * „Cum merge afacerea", one good chart (owner, 25 November 2026). `?cui=` a
 * live company (OMV Petrom by default; 14399840 Dante, with loss years),
 * `?fixture=` a hard case. `azi` is the band as it is.
 */

function Frame({ children }: { readonly children: (model: NonNullable<ReturnType<typeof useProtoModel>['model']>) => React.ReactNode }) {
  const { model, state } = useProtoModel()
  if (!model) return <p className="p-6 text-sm text-muted-foreground">{state}</p>
  return (
    <div data-dev-marker={PROTOTYPE_MARKER} className="relative w-full overflow-x-clip bg-background [font-feature-settings:'ss03']">
      {children(model)}
    </div>
  )
}

export const prototype = {
  title: 'Firmă — cum merge afacerea, un grafic',
  spec: 'docs/design/companies/design.md',
  variants: {
    azi: { title: 'Azi', component: () => <Frame>{(model) => <CompanyBusinessBand model={model} measure="toate" onMeasure={() => undefined} />}</Frame>, note: 'The band as it is: chart and switch beside the balance-sheet table.' },
    grafic: {
      title: 'Un grafic',
      component: () => <Frame>{(model) => <ProtoBusinessBand model={model} />}</Frame>,
      note: 'One chart across the band: money above, people below, each its own scale; empty years collapsed into one hatched column; no table, no switch.',
    },
  },
  compare: ['azi', 'grafic'],
} satisfies PrototypeDefinition
