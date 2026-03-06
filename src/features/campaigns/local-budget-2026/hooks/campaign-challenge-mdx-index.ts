import type { ComponentType } from 'react'

type MdxContentProps = {
  readonly components?: Record<string, ComponentType<any>>
}

type MdxModule = {
  readonly default: ComponentType<MdxContentProps>
}

export const campaignChallengeMdxModules = import.meta.glob<MdxModule>(
  '/src/content/campaigns/buget-primarie/challenges/*/index.*.mdx',
  { eager: true },
)
