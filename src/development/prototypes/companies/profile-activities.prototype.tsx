import { CompanyActivitiesBand } from '@/features/private-companies/components/profile/company-activities-band'
import { CompanyRegistryScopeProvider } from '@/features/private-companies/components/registry/company-registry-scope-provider'
import type { PrototypeDefinition } from '@/development/harness/entry'
import { DesignActivitiesBand, ProtoActivitiesBand } from './profile-activities.band'
import { PROTOTYPE_MARKER, useProtoModel } from './profile.data'

/**
 * The company page's „Ce face firma", lighter (owner, 25 November 2026). The
 * blocks are moved, not reworded: the selection first, then ANAF's assumed
 * main activity (open, or folded and still mounted), five domains, and the
 * list's notes behind one ⓘ — the cut-list line stays in the open. `?cui=` a
 * live company (OMV Petrom by default; 14399840 Dante), `?fixture=` a hard
 * case. `azi` is the band as it is.
 */

function Frame({ children }: { readonly children: (model: NonNullable<ReturnType<typeof useProtoModel>['model']>) => React.ReactNode }) {
  const { model, state } = useProtoModel()
  if (!model) return <p className="p-6 text-sm text-muted-foreground">{state}</p>
  return (
    <div data-dev-marker={PROTOTYPE_MARKER} className="relative w-full overflow-x-clip bg-background [font-feature-settings:'ss03']">
      <CompanyRegistryScopeProvider>{children(model)}</CompanyRegistryScopeProvider>
    </div>
  )
}

function ActivitiesAzi() {
  return <Frame>{(model) => <CompanyActivitiesBand model={model} index="03 / Activități" />}</Frame>
}

function ActivitiesOrdine() {
  return <Frame>{(model) => <ProtoActivitiesBand model={model} />}</Frame>
}

function ActivitiesPliat() {
  return <Frame>{(model) => <ProtoActivitiesBand model={model} anafFolded />}</Frame>
}

function ActivitiesDesign() {
  return <Frame>{(model) => <DesignActivitiesBand model={model} />}</Frame>
}

function ActivitiesDesignLista() {
  return <Frame>{(model) => <DesignActivitiesBand model={model} strip={false} />}</Frame>
}

export const prototype = {
  title: 'Firmă — ce face firma, mai simplu',
  spec: 'docs/design/companies/design.md',
  variants: {
    azi: { title: 'Azi', component: ActivitiesAzi, note: 'The band as it is: ANAF’s assumed main activity first, the selection, eight domains, three notes.' },
    ordine: {
      title: 'Selecția întâi',
      component: ActivitiesOrdine,
      note: 'The selection first, ANAF’s assumed main activity open after it; five domains; the notes behind one ⓘ; plain text.',
    },
    pliat: {
      title: 'ANAF pliat',
      component: ActivitiesPliat,
      note: 'As „Selecția întâi", with ANAF’s assumed main activity behind a button (still read on load).',
    },
    design: {
      title: 'Design: răspuns și amprentă',
      component: ActivitiesDesign,
      note: 'The answer left (the selection as the lead, ANAF’s presumed activity folded under it); right, the registry’s spread: a sentence, one strip of every domain, the ranked domains with inline bars.',
    },
    'design-lista': {
      title: 'Design: fără bandă',
      component: ActivitiesDesignLista,
      note: 'As „Design", without the strip: the sentence and the ranked domains with inline bars.',
    },
  },
  compare: ['azi', 'design'],
} satisfies PrototypeDefinition
