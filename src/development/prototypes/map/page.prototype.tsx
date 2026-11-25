import type { PrototypeDefinition } from '@/development/harness/entry'
import { MapPage } from './page.view'

/**
 * The map page (`/map`) rebuilt on the landing's budget map.
 *
 * Owner's decisions (25 November 2026): the landing's figures (execution as
 * reported, no exclusions, opening on the balance) and its red–blue colours;
 * a map picker, the year, totals or per inhabitant, a county view; a map/table
 * switch; no filter dialog, chart tab, local-taxes preset or currency and
 * inflation controls. Layout: the map fills the window under a slim bar, the
 * legend on its corner.
 *
 * - `fullscreen`  the layout above, primării only (the county view is next)
 */
export const prototype = {
  title: 'Map page on the landing map',
  variants: {
    fullscreen: { title: 'Full-screen map, slim bar, legend on the corner', component: MapPage },
  },
} satisfies PrototypeDefinition
