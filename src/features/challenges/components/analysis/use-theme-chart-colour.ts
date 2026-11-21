import { useSyncExternalStore } from 'react'

import { hslToHex } from '@/components/charts/components/chart-renderer/utils'

/**
 * A chart token (`--chart-1` …) as the hex colour the theme on `<html>` gives it
 * right now, for SVG paint that cannot take `hsl(var(--chart-1))` because the
 * chart renderer mixes series colours with an alpha. It re-reads when the theme
 * class changes; on the server, and in the hydration pass, it returns `fallback`,
 * so the markup matches.
 */
export function useThemeChartColour(token: `--chart-${number}`, fallback: string): string {
  return useSyncExternalStore(subscribeToThemeChanges, () => readTokenHex(token) ?? fallback, () => fallback)
}

function subscribeToThemeChanges(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'style', 'data-theme'] })
  return () => observer.disconnect()
}

/** The token's `H S% L%` triple, as computed on `<html>`, in hex; null when it is missing or not a triple. */
function readTokenHex(token: string): string | null {
  const value = getComputedStyle(document.documentElement).getPropertyValue(token).trim()
  const match = /^(\d+(?:\.\d+)?)(?:deg)?\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%$/.exec(value)
  if (!match) return null
  const hex = hslToHex(`hsl(${match[1]}, ${match[2]}%, ${match[3]}%)`)
  return hex.startsWith('#') ? hex : null
}
