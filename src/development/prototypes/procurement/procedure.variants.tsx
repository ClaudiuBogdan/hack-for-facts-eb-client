import { useNavigate, useSearch } from '@tanstack/react-router'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { PROCEDURE_FIXTURES } from './procedure.fixtures'
import { ProcedureCompetition } from './procedure.competition'
import { ProcedureHead } from './procedure.head'
import { procedureSheetOf, type PsRead } from './procedure.model'
import { ProcedureBlock } from './procedure.sheet'

/** Literal marker. `yarn build:validate` fails if this reaches `.output/`. */
const PROTOTYPE_MARKER = 'TRANSPARENTA_PROTOTYPE_MUST_NOT_SHIP'

const DEFAULT_RECORD = 'anif'

function useRecordKey(): string {
  const search = useSearch({ strict: false }) as { readonly c?: unknown }
  const key = typeof search.c === 'string' ? search.c : DEFAULT_RECORD
  return PROCEDURE_FIXTURES[key] ? key : DEFAULT_RECORD
}

/** The prototype's own chrome: which record it shows (`&c=`), and a way to pick another. */
function RecordPicker() {
  const key = useRecordKey()
  const navigate = useNavigate()
  return (
    <div className="border-b bg-muted/40">
      <RuledFrame className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3">
        <MonoLabel className="text-muted-foreground">Înregistrarea</MonoLabel>
        <select
          aria-label="Înregistrarea"
          value={key}
          onChange={(event) => void navigate({ to: '.', search: (previous: Record<string, unknown>) => ({ ...previous, c: event.target.value }) })}
          className="h-9 max-w-full rounded-sm border bg-background px-2 text-sm"
        >
          {Object.entries(PROCEDURE_FIXTURES).map(([id, record]) => (
            <option key={id} value={id}>
              {record.label}
            </option>
          ))}
        </select>
      </RuledFrame>
    </div>
  )
}

function useSheet(read: PsRead) {
  return procedureSheetOf(PROCEDURE_FIXTURES[useRecordKey()]!, read)
}

/** The sheet (`fisa`): the contract page's record sheet on the whole procedure, as the award notice tells it. */
export function ProcedureFisa() {
  const sheet = useSheet('target')
  return (
    <div className="bg-background" data-dev-marker={PROTOTYPE_MARKER}>
      <RecordPicker />
      <ProcedureHead sheet={sheet} />
      <RuledFrame className="py-10 sm:py-14">
        <ProcedureBlock sheet={sheet} />
      </RuledFrame>
    </div>
  )
}

/** The competition first (`concurenta`): the offers and the lots before the value and the facts. */
export function ProcedureConcurenta() {
  const sheet = useSheet('target')
  const competes = sheet.kind === 'award' && sheet.lots.length > 0
  return (
    <div className="bg-background" data-dev-marker={PROTOTYPE_MARKER}>
      <RecordPicker />
      <ProcedureHead sheet={sheet} />
      {competes ? (
        <RuledFrame className="border-b py-10 sm:py-14">
          <ProcedureCompetition sheet={sheet} />
        </RuledFrame>
      ) : null}
      <RuledFrame className="py-10 sm:py-14">
        <ProcedureBlock sheet={sheet} withLots={!competes} />
      </RuledFrame>
    </div>
  )
}

/** The sheet on today's API (`azi`): the notice's row and its contract rows, nothing of the award notice's own data. */
export function ProcedureAzi() {
  const sheet = useSheet('today')
  return (
    <div className="bg-background" data-dev-marker={PROTOTYPE_MARKER}>
      <RecordPicker />
      <ProcedureHead sheet={sheet} />
      <RuledFrame className="py-10 sm:py-14">
        <ProcedureBlock sheet={sheet} />
      </RuledFrame>
    </div>
  )
}
