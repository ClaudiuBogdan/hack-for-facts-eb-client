/// <reference types="vite/client" />

declare module '*.mdx' {
  import type { ComponentType } from 'react'
  import type { MDXComponents } from 'mdx/types'

  type MdxContentProps = {
    readonly components?: MDXComponents
  }

  const MDXComponent: ComponentType<MdxContentProps>
  export default MDXComponent
}

declare module 'virtual:challenge-step-section-metadata' {
  import type { ChallengeStepSectionMetadataIndex } from '@/features/challenges/utils/sectioned-step-markdown'

  const challengeStepSectionMetadata: ChallengeStepSectionMetadataIndex
  export default challengeStepSectionMetadata
}
