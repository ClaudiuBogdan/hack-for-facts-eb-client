import { t } from '@lingui/core/macro'

/**
 * An INS dimension's kind in Romanian. The API answers with the enum
 * (`CLASSIFICATION`, `UNIT_OF_MEASURE`); printing that at the reader is the
 * kind of raw-source leak this module exists to prevent. An unrecognised kind
 * renders verbatim rather than as a guess.
 */
export function dimensionTypeLabel(type: string): string {
  switch (type) {
    case 'TEMPORAL':
      return t`timp`
    case 'TERRITORIAL':
      return t`teritoriu`
    case 'CLASSIFICATION':
      return t`clasificare`
    case 'UNIT_OF_MEASURE':
      return t`unitate`
    default:
      return type
  }
}
