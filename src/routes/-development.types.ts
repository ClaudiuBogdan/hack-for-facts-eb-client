import type { ComponentType } from 'react'

/**
 * Prop types shared between the `/development/*` route stubs and the harness.
 *
 * These live under `src/routes/` behind the generator's `-` ignore prefix, not in
 * `src/development/`, because that directory is in `.dockerignore` and is absent
 * during image builds. The stubs must type-check without it.
 */

export type CompareLayout = 'side' | 'stack'

export type CompareViewProps = {
  readonly id: string
  readonly v?: string
  readonly layout: CompareLayout
}

export type HarnessModule = {
  readonly IndexView: ComponentType
  readonly CompareView: ComponentType<CompareViewProps>
}
