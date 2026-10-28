import type { BillCurrentLocation, BillType } from '@/schemas/parliament'

/**
 * Display labels for a bill's type and current stage. Their own module, apart
 * from `bill-profile-data.ts`, which carries the mock bill fixtures: a card that
 * prints a label must not bring the fixtures with it.
 */

export function getBillTypeLabel(billType: BillType): string {
  switch (billType) {
    case 'guvern':
      return 'Proiect al Guvernului'
    case 'parlamentar':
      return 'Inițiativă parlamentară'
    case 'cetateni':
      return 'Inițiativă a cetățenilor'
    case 'ordonanta':
      return 'Ordonanță de urgență'
  }
}

export function getBillLocationLabel(location: BillCurrentLocation): string {
  switch (location) {
    case 'camera':
      return 'Camera Deputaților'
    case 'senat':
      return 'Senat'
    case 'mediere':
      return 'Comisie de mediere'
    case 'presedinte':
      return 'La Președinte'
    case 'promulgat':
      return 'Promulgat'
    case 'respins':
      return 'Respins'
    case 'retras':
      return 'Retras'
    case 'clasat':
      return 'Clasat'
  }
}
