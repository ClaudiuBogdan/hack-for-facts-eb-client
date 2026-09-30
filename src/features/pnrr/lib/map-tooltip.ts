import { escapeHtml } from '@/lib/html'

type PnrrMapTooltipOptions = {
  readonly title: string
  readonly value: string
  readonly meta?: string
}

export function buildPnrrMapTooltipHtml({
  title,
  value,
  meta,
}: PnrrMapTooltipOptions): string {
  const metaHtml = meta
    ? `<div class="pnrr-map-tooltip-meta">${escapeHtml(meta)}</div>`
    : ''

  return `
    <div class="pnrr-map-tooltip-card">
      ${metaHtml}
      <div class="pnrr-map-tooltip-title">${escapeHtml(title)}</div>
      <div class="pnrr-map-tooltip-value">${escapeHtml(value)}</div>
    </div>
  `
}
