import { useLingui } from '@lingui/react/macro'
import { procedureLabel } from '../lib/home-model'

/** SEAP's route as a reader says it („Licitație deschisă"); SEAP's own word when the page has none for it. */
export function useProcedureRouteLabel(type: string | null): string | null {
  const { i18n } = useLingui()
  if (!type) return null
  const label = procedureLabel(type)
  return label ? i18n._(label) : type
}
