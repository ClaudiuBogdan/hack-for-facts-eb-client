import { Outlet, createFileRoute, notFound } from '@tanstack/react-router'

/**
 * Local-only prototyping surface. See `docs/design/prototyping.md`.
 *
 * `import.meta.env.DEV` is true only for a Vite process that is not building for
 * production, so every production build — the deployed `dev` environment
 * included — answers 404 here. Do not gate this on `VITE_APP_ENVIRONMENT`: the
 * deployed `dev` sets it to `development` while being a production build.
 */
export const Route = createFileRoute('/development')({
  beforeLoad: () => {
    if (!import.meta.env.DEV) throw notFound()
  },
  head: () => ({
    meta: [
      { title: 'Development — local only' },
      { name: 'robots', content: 'noindex, nofollow' },
    ],
  }),
  component: Outlet,
})
