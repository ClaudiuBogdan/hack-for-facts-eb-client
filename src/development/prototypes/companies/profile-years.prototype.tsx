import { CompanyYearsBand } from '@/features/private-companies/components/profile/company-years-band'
import type { PrototypeDefinition } from '@/development/harness/entry'
import { ProtoYearsBand } from './profile-years.band'
import { PROTOTYPE_MARKER, useProtoModel } from './profile.data'

/**
 * The company page's „Bilanțurile, an cu an", with less at first (owner, 25
 * November 2026). `?cui=` a live company (OMV Petrom by default: 18
 * statements, a 2012–2018 gap and seven long-format years), `?fixture=` a
 * hard case. `azi` is the band as it is.
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
  title: 'Firmă — bilanțurile, an cu an, mai puțin',
  spec: 'docs/design/companies/design.md',
  variants: {
    azi: { title: 'Azi', component: () => <Frame>{(model) => <CompanyYearsBand model={model} index="04 / An cu an" />}</Frame>, note: 'The band as it is: every line, every year, the long-format list open.' },
    'mai-putin': {
      title: 'Mai puțin la început',
      component: () => <Frame>{(model) => <ProtoYearsBand model={model} />}</Frame>,
      note: 'The ten key lines and the newest six statements, each a button from the rest; plain captions; no list of the long-format years.',
    },
  },
  compare: ['azi', 'mai-putin'],
} satisfies PrototypeDefinition
