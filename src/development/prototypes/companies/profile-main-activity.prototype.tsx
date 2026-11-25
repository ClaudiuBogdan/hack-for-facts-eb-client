import { CompanyMainActivity } from '@/features/private-companies/components/profile/company-main-activity'
import { CompanyRegistryScopeProvider } from '@/features/private-companies/components/registry/company-registry-scope-provider'
import { buildCompanyProfileModel, type CompanyProfileModel } from '@/features/private-companies/lib/company-profile-model'
import { danteInternationalProfile } from '@/features/private-companies/mocks/fixtures'
import { MAIN_ACTIVITIES } from '@/features/private-companies/mocks/fixtures/main-activity'
import type { PrototypeDefinition } from '@/development/harness/entry'
import { DesignMainActivity } from './profile-main-activity.design'
import { PROTOTYPE_MARKER } from './profile.data'

/**
 * ANAF's presumed main activity, redrawn, in every state the API can serve
 * (the hand-declared fixtures of `mocks/fixtures/main-activity.ts`, never a
 * claim about a company): today's block beside the new one, state by state.
 */

const BASE = buildCompanyProfileModel(danteInternationalProfile)
const STATES = Object.entries(MAIN_ACTIVITIES).map(([name, activity]) => ({
  name,
  model: { ...BASE, assumedMain: { kind: 'assigned', activity } } satisfies CompanyProfileModel,
}))

function States({ designed }: { readonly designed: boolean }) {
  return (
    <div data-dev-marker={PROTOTYPE_MARKER} className="mx-auto max-w-6xl space-y-10 px-4 py-10 [font-feature-settings:'ss03'] sm:px-8">
      <CompanyRegistryScopeProvider>
        {STATES.map(({ name, model }) => (
          <section key={name} className="grid grid-cols-1 gap-3 border-b pb-8 sm:grid-cols-[12rem_minmax(0,32rem)]">
            <h2 className="font-mono text-xs text-muted-foreground">{name}</h2>
            {designed ? (
              <DesignMainActivity model={model} onAnafWithdrawn={() => undefined} onCompanyNotPublic={() => undefined} />
            ) : (
              <CompanyMainActivity model={model} onAnafWithdrawn={() => undefined} onCompanyNotPublic={() => undefined} />
            )}
          </section>
        ))}
      </CompanyRegistryScopeProvider>
    </div>
  )
}

export const prototype = {
  title: 'Firmă — activitatea principală presupusă, în toate stările',
  spec: 'docs/design/companies/design.md',
  variants: {
    azi: { title: 'Azi', component: () => <States designed={false} />, note: 'Today’s block, in each state the fixtures declare.' },
    design: { title: 'Design', component: () => <States designed />, note: 'The redrawn block, in each state.' },
  },
  compare: ['azi', 'design'],
} satisfies PrototypeDefinition
