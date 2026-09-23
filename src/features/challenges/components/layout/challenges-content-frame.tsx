import type { ReactNode } from 'react'

type ChallengesContentFrameProps = {
  readonly children: ReactNode
  readonly 'data-testid'?: string
}

/**
 * The centred reading column that the challenge, city-hall and entity pages
 * share. A route's pending component renders in place of the page, outside
 * whatever the page wraps itself in, so it uses this frame too: the skeleton
 * then sits exactly where the content will.
 */
export function ChallengesContentFrame({
  children,
  'data-testid': testId,
}: ChallengesContentFrameProps) {
  return (
    <div
      data-testid={testId}
      className="mx-auto flex min-h-full w-full max-w-3xl flex-1 flex-col px-4 py-5 sm:px-6 sm:py-8 lg:px-10 lg:py-10"
    >
      {children}
    </div>
  )
}
