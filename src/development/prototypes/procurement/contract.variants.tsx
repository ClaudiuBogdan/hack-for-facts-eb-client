import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { ContractBlock } from '@/features/procurement/components/contract/contract-block'
import { ContractContextBand } from '@/features/procurement/components/contract/contract-context'
import { ContractHead } from '@/features/procurement/components/contract/contract-head'
import { ProcurementContractPage } from '@/features/procurement/components/contract/procurement-contract-page'
import { CONTRACT_FIXTURES } from './contract.fixtures'
import { contractContextOfFixture, contractSheetOfFixture } from './contract.model'
import { RecordPicker, useRecordKey } from './contract.parts'

/** Literal marker. `yarn build:validate` fails if this reaches `.output/`. */
const PROTOTYPE_MARKER = 'TRANSPARENTA_PROTOTYPE_MUST_NOT_SHIP'

/**
 * The sheet (`fisa`), the owner's pick, promoted: the page's own components
 * on the record as read on 28 September — the award notice's data included,
 * which the live API does not serve yet (§17.7).
 */
export function ContractFisa() {
  const raw = CONTRACT_FIXTURES[useRecordKey()]!
  const sheet = contractSheetOfFixture(raw)
  const context = contractContextOfFixture(raw, sheet)
  return (
    <div className="bg-background" data-dev-marker={PROTOTYPE_MARKER}>
      <RecordPicker />
      <ContractHead sheet={sheet} />
      <RuledFrame className="py-10 sm:py-14">
        <ContractBlock sheet={sheet} className="max-w-4xl" />
      </RuledFrame>
      <ContractContextBand sheet={sheet} context={{ data: context, isError: false, retry: () => undefined }} />
    </div>
  )
}

/** The promoted page on the same record, reading the dev API as it answers today: what the notice's data adds is what is missing here. */
export function ContractAzi() {
  const raw = CONTRACT_FIXTURES[useRecordKey()]!
  return (
    <div className="bg-background" data-dev-marker={PROTOTYPE_MARKER}>
      <RecordPicker />
      <ProcurementContractPage id={raw.contract.id} />
    </div>
  )
}
