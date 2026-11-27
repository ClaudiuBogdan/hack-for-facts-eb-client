import { z } from 'zod'

/**
 * The search keys every page understands, validated at the root.
 *
 * A value the site doesn't know is dropped, never thrown (`.catch`): the root
 * validates every address, and a throw there fails the whole page before the
 * document renders (ERR-001). `?currency=XYZ` opens the page in the default
 * currency instead.
 *
 * `passthrough` keeps the child routes' own keys; without it TanStack Router
 * strips unknown params on navigation. `inflation_adjusted` is a union plus a
 * transform rather than a preprocess, to keep it optional in the inferred type.
 */
export const globalSearchSchema = z
  .object({
    currency: z.enum(['RON', 'EUR', 'USD']).optional().catch(undefined),
    inflation_adjusted: z
      .union([z.boolean(), z.literal('true'), z.literal('false')])
      .optional()
      .transform((value) => (value === 'true' ? true : value === 'false' ? false : value))
      .catch(undefined),
  })
  .passthrough()
