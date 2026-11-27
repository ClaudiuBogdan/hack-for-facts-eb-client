import { createFileRoute, redirect } from '@tanstack/react-router'

/**
 * The retired Monitorul Oficial page (owner, 27 November 2026): the act pages keep the link to their issue's
 * official PDF, and the publication counts go to the analysis page.
 * Its links forward to the legislation hub for good, with only the address's language kept.
 */
export const Route = createFileRoute('/legislation/gazette')({
  beforeLoad: ({ search }) => {
    const { lang } = search as Record<string, unknown>
    throw redirect({ to: '/legislation', search: (typeof lang === 'string' ? { lang } : {}) as never, replace: true, statusCode: 301 })
  },
})
