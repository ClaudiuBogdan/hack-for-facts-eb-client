import { createFileRoute, redirect } from '@tanstack/react-router'

/**
 * The March 2026 draft budget page (static figures from the draft law's
 * annex) is retired: the national budget's page, `/national-budget`, reads
 * the laws as published and the bulletins live. Old links land there, with
 * the site's own keys (`lang`); the draft page's own (`section`, `currency`)
 * stay behind.
 */
export const Route = createFileRoute('/buget-national-2026')({
  beforeLoad: ({ search }) => {
    const { section: _section, currency: _currency, ...rest } = search as Record<string, unknown>
    throw redirect({ to: '/national-budget', search: rest as never, replace: true, statusCode: 301 })
  },
})
