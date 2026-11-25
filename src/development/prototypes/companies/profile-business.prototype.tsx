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
      title: 'A · Două panouri',
      component: () => <Frame>{(model) => <ProtoBusinessBand model={model} version="panouri" />}</Frame>,
      note: 'Money above (turnover pale, the bottom line solid, losses red), people in a short panel below, each its own scale; empty years one hatched column.',
    },
    trei: {
      title: 'B · Trei panouri',
      component: () => <Frame>{(model) => <ProtoBusinessBand model={model} version="trei" />}</Frame>,
      note: 'Three panels, one scale each: turnover, the bottom line, people. A small result next to a large turnover still reads.',
    },
    bani: {
      title: 'C · Doar bani',
      component: () => <Frame>{(model) => <ProtoBusinessBand model={model} version="bani" />}</Frame>,
      note: 'One panel: turnover and the bottom line. People only in each year’s reading (hover or tap).',
    },
    arie: {
      title: 'D · Arie și bare',
      component: () => <Frame>{(model) => <ProtoBusinessBand model={model} version="arie" />}</Frame>,
      note: 'One panel: turnover as a shaded area, the bottom line as bars from zero. People in each year’s reading.',
    },
    comutator: {
      title: 'E · Cu comutator',
      component: () => <Frame>{(model) => <ProtoBusinessBand model={model} version="comutator" />}</Frame>,
      note: 'One panel at a time — turnover, the bottom line or people — each on its own scale, chosen by a switch.',
    },
  },
  compare: ['grafic', 'trei', 'bani', 'arie', 'comutator'],
} satisfies PrototypeDefinition
