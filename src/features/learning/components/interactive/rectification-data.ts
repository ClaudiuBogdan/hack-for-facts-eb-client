/**
 * Shared data and types for budget rectification interactive components.
 *
 * Data sources:
 * - Romanian Ministry of Finance budget documents
 * - Fiscal Council reports and opinions
 * - Official Gazette (Monitorul Oficial) OUG publications
 */

import type { LearningLocale } from '../../types'

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export type RectificationStage = {
  readonly id: string
  readonly label: string
  readonly month: string
  readonly amount: number // in billions RON
  readonly change?: number // delta from previous stage
  readonly changeType?: 'increase' | 'decrease'
}

export type StatusLevel = 'green' | 'yellow' | 'red'

export type YearRectification = {
  readonly year: number
  readonly rectificationCount: number
  readonly deficitPercent: number
  readonly status: StatusLevel
  readonly context: string
  readonly details?: readonly RectificationDetail[]
}

export type RectificationDetail = {
  readonly date: string
  readonly reference: string // e.g., "OUG 113/2024"
  readonly description: string
}

export type RedFlagItem = {
  readonly id: string
  readonly severity: StatusLevel
  readonly title: string
  readonly description: string
  readonly example?: string
  readonly icon: 'alert' | 'bypass' | 'election' | 'target' | 'magnitude' | 'check'
}

// ═══════════════════════════════════════════════════════════════════════════
// Rectification Flow Data (Budget changes through the year)
// ═══════════════════════════════════════════════════════════════════════════

export const FLOW_STAGES_EN: readonly RectificationStage[] = [
  {
    id: 'original',
    label: 'Original Budget',
    month: 'January',
    amount: 100,
  },
  {
    id: 'rect-1',
    label: 'Rectification #1',
    month: 'April',
    amount: 105,
    change: 5,
    changeType: 'increase',
  },
  {
    id: 'rect-2',
    label: 'Rectification #2',
    month: 'August',
    amount: 98,
    change: -7,
    changeType: 'decrease',
  },
]

export const FLOW_STAGES_RO: readonly RectificationStage[] = [
  {
    id: 'original',
    label: 'Buget Inițial',
    month: 'Ianuarie',
    amount: 100,
  },
  {
    id: 'rect-1',
    label: 'Rectificare #1',
    month: 'Aprilie',
    amount: 105,
    change: 5,
    changeType: 'increase',
  },
  {
    id: 'rect-2',
    label: 'Rectificare #2',
    month: 'August',
    amount: 98,
    change: -7,
    changeType: 'decrease',
  },
]

// ═══════════════════════════════════════════════════════════════════════════
// Rectification History Data (2020-2024)
// ═══════════════════════════════════════════════════════════════════════════

export const HISTORY_DATA_EN: readonly YearRectification[] = [
  {
    year: 2024,
    rectificationCount: 1,
    deficitPercent: 9.3,
    status: 'red',
    context: 'Election year',
    details: [
      {
        date: 'October 2024',
        reference: 'OUG 113/2024',
        description: '+47.5B lei expenditures, pension increases 2 months before elections',
      },
    ],
  },
  {
    year: 2023,
    rectificationCount: 0,
    deficitPercent: 6.5,
    status: 'red',
    context: 'Reserve Fund bypass',
    details: [
      {
        date: 'Throughout 2023',
        reference: 'Reserve Fund',
        description: '32B lei distributed via Reserve Fund — first time in 30 years without formal rectification',
      },
    ],
  },
  {
    year: 2022,
    rectificationCount: 2,
    deficitPercent: 6.0,
    status: 'yellow',
    context: 'Energy crisis',
    details: [
      {
        date: 'August 2022',
        reference: 'OUG 130/2022',
        description: 'Energy price compensation measures',
      },
      {
        date: 'November 2022',
        reference: 'OUG 153/2022',
        description: 'Additional social protection measures',
      },
    ],
  },
  {
    year: 2021,
    rectificationCount: 2,
    deficitPercent: 8.4,
    status: 'red',
    context: 'Record magnitude',
    details: [
      {
        date: 'August 2021',
        reference: 'OUG 87/2021',
        description: '+17B lei expenditures — record magnitude change',
      },
    ],
  },
  {
    year: 2020,
    rectificationCount: 3,
    deficitPercent: 9.2,
    status: 'red',
    context: 'COVID crisis',
    details: [
      {
        date: 'April 2020',
        reference: 'OUG 50/2020',
        description: 'Emergency COVID-19 response funding',
      },
      {
        date: 'August 2020',
        reference: 'OUG 135/2020',
        description: 'Healthcare and social support expansion',
      },
    ],
  },
]

export const HISTORY_DATA_RO: readonly YearRectification[] = [
  {
    year: 2024,
    rectificationCount: 1,
    deficitPercent: 9.3,
    status: 'red',
    context: 'An electoral',
    details: [
      {
        date: 'Octombrie 2024',
        reference: 'OUG 113/2024',
        description: '+47,5 mld lei cheltuieli, majorări pensii cu 2 luni înainte de alegeri',
      },
    ],
  },
  {
    year: 2023,
    rectificationCount: 0,
    deficitPercent: 6.5,
    status: 'red',
    context: 'Ocolire prin Fondul de Rezervă',
    details: [
      {
        date: 'Pe parcursul 2023',
        reference: 'Fond de Rezervă',
        description: '32 mld lei distribuite prin Fondul de Rezervă — prima dată în 30 de ani fără rectificare formală',
      },
    ],
  },
  {
    year: 2022,
    rectificationCount: 2,
    deficitPercent: 6.0,
    status: 'yellow',
    context: 'Criza energetică',
    details: [
      {
        date: 'August 2022',
        reference: 'OUG 130/2022',
        description: 'Măsuri de compensare a prețurilor la energie',
      },
      {
        date: 'Noiembrie 2022',
        reference: 'OUG 153/2022',
        description: 'Măsuri suplimentare de protecție socială',
      },
    ],
  },
  {
    year: 2021,
    rectificationCount: 2,
    deficitPercent: 8.4,
    status: 'red',
    context: 'Amplitudine record',
    details: [
      {
        date: 'August 2021',
        reference: 'OUG 87/2021',
        description: '+17 mld lei cheltuieli — modificare de amplitudine record',
      },
    ],
  },
  {
    year: 2020,
    rectificationCount: 3,
    deficitPercent: 9.2,
    status: 'red',
    context: 'Criza COVID',
    details: [
      {
        date: 'Aprilie 2020',
        reference: 'OUG 50/2020',
        description: 'Finanțare de urgență pentru răspunsul COVID-19',
      },
      {
        date: 'August 2020',
        reference: 'OUG 135/2020',
        description: 'Extinderea asistenței medicale și sociale',
      },
    ],
  },
]

// ═══════════════════════════════════════════════════════════════════════════
// Red Flag Cards Data
// ═══════════════════════════════════════════════════════════════════════════

export const RED_FLAGS_EN: readonly RedFlagItem[] = [
  {
    id: 'oug-bypass',
    severity: 'red',
    title: 'OUG bypasses Parliament',
    description: 'Rectifications via Emergency Ordinances (OUG) skip proper legislative debate',
    example: 'Most Romanian rectifications use OUG instead of regular law',
    icon: 'bypass',
  },
  {
    id: 'reserve-fund',
    severity: 'red',
    title: 'Reserve Fund bypass',
    description: 'Using discretionary funds instead of formal rectification avoids transparency',
    example: '2023: 32B lei distributed without formal rectification for first time in 30 years',
    icon: 'alert',
  },
  {
    id: 'election-spending',
    severity: 'red',
    title: 'Pre-election spending spikes',
    description: 'Large increases in social spending right before elections',
    example: '2024: Pension increases approved 2 months before presidential elections',
    icon: 'election',
  },
  {
    id: 'deficit-targets',
    severity: 'red',
    title: 'Deficits above targets',
    description: 'Initial targets systematically underestimate actual spending',
    example: 'Romania exceeds EU 3% limit since 2020, reaching 9.3% in 2024',
    icon: 'target',
  },
  {
    id: 'large-magnitude',
    severity: 'yellow',
    title: 'Large magnitude changes',
    description: 'Very large adjustments suggest poor initial planning',
    example: '2024: +47.5B lei expenditures in single rectification',
    icon: 'magnitude',
  },
  {
    id: 'normal-adjustments',
    severity: 'green',
    title: 'Normal adjustments',
    description: 'Some rectifications are legitimate responses to changing conditions',
    example: 'COVID-19 emergency response, EU/PNRR fund allocation, energy crisis measures',
    icon: 'check',
  },
]

export const RED_FLAGS_RO: readonly RedFlagItem[] = [
  {
    id: 'oug-bypass',
    severity: 'red',
    title: 'OUG ocolește Parlamentul',
    description: 'Rectificările prin Ordonanțe de Urgență (OUG) evită dezbaterea legislativă',
    example: 'Majoritatea rectificărilor din România folosesc OUG în loc de lege obișnuită',
    icon: 'bypass',
  },
  {
    id: 'reserve-fund',
    severity: 'red',
    title: 'Ocolire prin Fondul de Rezervă',
    description: 'Folosirea fondurilor discreționare în loc de rectificare formală evită transparența',
    example: '2023: 32 mld lei distribuite fără rectificare formală — prima dată în 30 de ani',
    icon: 'alert',
  },
  {
    id: 'election-spending',
    severity: 'red',
    title: 'Cheltuieli pre-electorale',
    description: 'Creșteri mari ale cheltuielilor sociale chiar înainte de alegeri',
    example: '2024: Majorări de pensii aprobate cu 2 luni înainte de alegerile prezidențiale',
    icon: 'election',
  },
  {
    id: 'deficit-targets',
    severity: 'red',
    title: 'Deficite peste ținte',
    description: 'Țintele inițiale subestimează sistematic cheltuielile reale',
    example: 'România depășește limita UE de 3% din 2020, ajungând la 9,3% în 2024',
    icon: 'target',
  },
  {
    id: 'large-magnitude',
    severity: 'yellow',
    title: 'Modificări de amplitudine mare',
    description: 'Ajustările foarte mari sugerează o planificare inițială slabă',
    example: '2024: +47,5 mld lei cheltuieli într-o singură rectificare',
    icon: 'magnitude',
  },
  {
    id: 'normal-adjustments',
    severity: 'green',
    title: 'Ajustări normale',
    description: 'Unele rectificări sunt răspunsuri legitime la condiții în schimbare',
    example: 'Răspuns de urgență COVID-19, alocare fonduri UE/PNRR, măsuri criză energetică',
    icon: 'check',
  },
]

// ═══════════════════════════════════════════════════════════════════════════
// Locale Helpers
// ═══════════════════════════════════════════════════════════════════════════

export const FLOW_STAGES_BY_LOCALE: Record<LearningLocale, readonly RectificationStage[]> = {
  en: FLOW_STAGES_EN,
  ro: FLOW_STAGES_RO,
}

export const HISTORY_DATA_BY_LOCALE: Record<LearningLocale, readonly YearRectification[]> = {
  en: HISTORY_DATA_EN,
  ro: HISTORY_DATA_RO,
}

export const RED_FLAGS_BY_LOCALE: Record<LearningLocale, readonly RedFlagItem[]> = {
  en: RED_FLAGS_EN,
  ro: RED_FLAGS_RO,
}

// ═══════════════════════════════════════════════════════════════════════════
// Status Colors
// ═══════════════════════════════════════════════════════════════════════════

export const STATUS_COLORS: Record<StatusLevel, { bg: string; text: string; border: string; dot: string }> = {
  green: {
    bg: 'bg-status-live-bg',
    text: 'text-status-live-fg',
    border: 'border-status-live-fg/30',
    dot: 'bg-status-live-fg',
  },
  yellow: {
    bg: 'bg-status-partial-bg',
    text: 'text-status-partial-fg',
    border: 'border-status-partial-fg/30',
    dot: 'bg-status-partial-fg',
  },
  red: {
    bg: 'bg-status-blocked-bg',
    text: 'text-status-blocked-fg',
    border: 'border-status-blocked-fg/30',
    dot: 'bg-status-blocked-fg',
  },
}
