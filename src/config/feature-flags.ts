import { notFound } from '@tanstack/react-router'

/**
 * Areas the client switches off because they are not implemented yet (owner,
 * 2026-10-08): public investments and elections. Hardcoded on purpose,
 * not an environment variable: a build either offers an area or it does not.
 * While an area is off, its pages answer 404 and neither the landing page nor
 * the sidebar links it. Turn one on here when it is ready.
 */
export const FEATURE_FLAGS = {
  publicInvestments: false,
  elections: false,
} as const satisfies Readonly<Record<string, boolean>>

export type FeatureFlag = keyof typeof FEATURE_FLAGS

export function isFeatureEnabled(flag: FeatureFlag): boolean {
  return FEATURE_FLAGS[flag]
}

/** For a route's `beforeLoad`: an area that is off answers 404, on the server and in the browser. */
export function assertFeatureEnabled(flag: FeatureFlag): void {
  if (!isFeatureEnabled(flag)) throw notFound()
}
