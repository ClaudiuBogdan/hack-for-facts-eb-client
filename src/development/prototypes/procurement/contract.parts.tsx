import { useNavigate, useSearch } from '@tanstack/react-router'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { CONTRACT_FIXTURES } from './contract.fixtures'

/** The prototype's own chrome: which record it shows (`&c=`), and a way to pick another. The page's parts are the feature's (`components/contract/`). */

export const DEFAULT_RECORD = 'turnul-sfatului'

export function useRecordKey(): string {
  const search = useSearch({ strict: false }) as { readonly c?: unknown }
  const key = typeof search.c === 'string' ? search.c : DEFAULT_RECORD
  return CONTRACT_FIXTURES[key] ? key : DEFAULT_RECORD
}

export function RecordPicker() {
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
          {Object.entries(CONTRACT_FIXTURES).map(([id, record]) => (
            <option key={id} value={id}>
              {record.label}
            </option>
          ))}
        </select>
      </RuledFrame>
    </div>
  )
}
