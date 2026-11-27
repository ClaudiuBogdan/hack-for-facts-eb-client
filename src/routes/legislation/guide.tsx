import { createFileRoute, redirect } from '@tanstack/react-router'

/**
 * The retired Ghid page (owner, 27 November 2026: "We decide later if we need a guide"); its text stays in git history.
 * Its links forward to the legislation hub for good, with only the address's language kept.
 */
export const Route = createFileRoute('/legislation/guide')({
  beforeLoad: ({ search }) => {
    const { lang } = search as Record<string, unknown>
    throw redirect({ to: '/legislation', search: (typeof lang === 'string' ? { lang } : {}) as never, replace: true, statusCode: 301 })
  },
})
