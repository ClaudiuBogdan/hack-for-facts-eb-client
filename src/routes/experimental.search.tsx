import { createFileRoute } from '@tanstack/react-router'
import { parseEntitySearchParams } from '@/schemas/entity-search'

export const Route = createFileRoute('/experimental/search')({
  validateSearch: parseEntitySearchParams,
  head: () => ({
    meta: [
      { title: 'Căutare entități — Transparenta.eu' },
      {
        name: 'description',
        content:
          'Caută firme, instituții, legi, contracte, licitații și proiecte PNRR într-o singură pagină.',
      },
    ],
  }),
})
