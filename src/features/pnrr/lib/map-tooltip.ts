type PnrrMapTooltipOptions = {
  readonly title: string
  readonly value: string
  readonly meta?: string
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
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
