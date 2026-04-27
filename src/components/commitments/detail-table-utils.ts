export type Grouping = 'fn' | 'ec'
export type DetailLevel = 'chapter' | 'detailed'

export type DrillLevel = 'subchapter' | 'paragraph' | 'economic'

export function codeSegmentCount(code: string): number {
  const norm = code.replace(/[^0-9.]/g, '')
  if (!norm) return 0
  return norm.split('.').length
}

export function initialDrillLevel(parentCode: string): DrillLevel {
  const segments = codeSegmentCount(parentCode)
  if (segments >= 3) return 'economic'
  if (segments >= 2) return 'paragraph'
  return 'subchapter'
}
