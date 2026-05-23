/** Parlament header typography — PNRR-weight hero on light surface */
export const parliamentHeaderTitleClassName =
  'max-w-5xl text-balance font-black leading-[0.85] tracking-tight text-[var(--pnrr-fg)]'

export const parliamentHeaderTitleLineClassName = 'block'

export const parliamentHeaderDescriptionClassName =
  'max-w-[40rem] text-[1.125rem] font-normal leading-8 text-[var(--pnrr-fg)]'

export const parliamentHeaderMetaClassName =
  'text-base font-normal leading-6 text-[var(--pnrr-muted)]'

export const parliamentHeaderStatClassName =
  'inline-flex items-center gap-2 rounded-none border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] px-3 py-2 text-base'

export const parliamentHeaderStatValueClassName =
  'font-bold tabular-nums text-[var(--pnrr-fg)]'

export const parliamentHeaderStatLabelClassName =
  'font-normal text-[var(--pnrr-muted)]'

/** PNRR-scale hero title */
export const parliamentHeaderTitleStyle = {
  fontSize: 'clamp(2.5rem, 7vw, 5.5rem)',
} as const

export const parliamentHeaderHeroClassName = 'pt-10 pb-8 sm:pt-14 sm:pb-10'
