import { sourceRowSelection } from '@/lib/ins/source-series'
import type { NativeInsObservation } from '@/schemas/ins'
import type { NativeLandingProvenance } from './native-landing-types'
export function landingSourceSearch(
  source: NativeLandingProvenance,
  code: string,
  observation?: NativeInsObservation,
) {
  const territory = source.territories.find((t) => t.code === code)
  return {
    teritoriu: `${territory?.level === 'LAU' ? 'siruta' : 'cod'}:${code}`,
    clasificari: source.classificationPins,
    unitate: source.unitCode,
    frecventa: 'ANNUAL' as const,
    ...(observation ? sourceRowSelection(source.descriptor, observation) : {}),
  }
}
