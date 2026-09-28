import { t } from '@lingui/core/macro'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { CONTRACT_FIXTURES } from './contract.fixtures'
import { contractContextOf, contractSheetOf } from './contract.model'
import {
  ContractContextBand,
  ContractFacts,
  ContractFirms,
  ContractHead,
  ContractHistory,
  ContractSource,
  ContractValue,
  ContractVersions,
  NoticeOthers,
  RecordPicker,
  useRecordKey,
} from './contract.parts'
import type { ContractSheet } from './contract.types'

/** Literal marker. `yarn build:validate` fails if this reaches `.output/`. */
const PROTOTYPE_MARKER = 'TRANSPARENTA_PROTOTYPE_MUST_NOT_SHIP'

/** The value on its own row — a contract's runs from 400 lei to 6,1 billion — and the facts under it. */
function ValueAndFacts({ sheet }: { readonly sheet: ContractSheet }) {
  return (
    <div className="mt-8 border-y py-7">
      <ContractValue sheet={sheet} />
      <ContractFacts sheet={sheet} className="mt-7 border-t pt-7" />
    </div>
  )
}

/** The record: what was awarded, then its firms, its published values, its history, the notice's other contracts, the source. */
function FisaBlock({ sheet }: { readonly sheet: ContractSheet }) {
  return (
    <section className="max-w-4xl" aria-label={t`Contractul`}>
      <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{t`Ce s-a atribuit`}</h2>
      <ValueAndFacts sheet={sheet} />
      <ContractFirms sheet={sheet} className="mt-12" />
      <ContractVersions sheet={sheet} className="mt-12" />
      <ContractHistory sheet={sheet} className="mt-12" />
      <NoticeOthers sheet={sheet} className="mt-12" />
      <ContractSource sheet={sheet} className="mt-10" />
    </section>
  )
}

/** The sheet (`fisa`): the record picker, the head, the record, the context band. */
export function ContractFisa() {
  const key = useRecordKey()
  const raw = CONTRACT_FIXTURES[key]!
  const sheet = contractSheetOf(raw)
  const context = contractContextOf(raw, sheet)
  return (
    <div className="bg-background" data-dev-marker={PROTOTYPE_MARKER}>
      <RecordPicker />
      <ContractHead sheet={sheet} />
      <RuledFrame className="py-10 sm:py-14">
        <FisaBlock sheet={sheet} />
      </RuledFrame>
      <ContractContextBand sheet={sheet} context={context} />
    </div>
  )
}
