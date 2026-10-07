import { z } from 'zod'

/**
 * One public enterprise as the API serves it (`publicEnterprise(cui)`), for
 * `/public-enterprises/$cui`. Families, value kinds and lane states are read
 * as text: a value the API adds later is shown as written or left out by the
 * page's model, never a failed page. Indicator values stay exact decimal
 * text; `''` and null differ.
 */

export const publicEnterpriseIndicatorSchema = z.object({
  year: z.number().int(),
  sourceSheet: z.string(),
  version: z.string(),
  indicatorKey: z.string(),
  kpiCode: z.string().nullable(),
  indicatorName: z.string(),
  measureUnit: z.string().nullable(),
  /** `number`, `boolean`, `text`, `empty`. */
  valueKind: z.string(),
  rawValue: z.string().nullable(),
  numericValue: z.string().nullable(),
  booleanValue: z.boolean().nullable(),
})
export type PublicEnterpriseIndicator = z.infer<typeof publicEnterpriseIndicatorSchema>

export const publicEnterpriseIndicatorPageSchema = z.object({
  snapshotId: z.string().nullable(),
  pageInfo: z.object({ hasNextPage: z.boolean(), endCursor: z.string().nullable() }),
  edges: z.array(z.object({ node: publicEnterpriseIndicatorSchema })),
})

export const publicEnterpriseObservationSchema = z.object({
  /** `amepip_company_year`, `amepip_form_group`, `s1001`, `json_apt`. */
  sourceFamily: z.string(),
  observedYear: z.number().int().nullable(),
  statusRaw: z.string().nullable(),
  sourceUrl: z.string().nullable(),
})
export type PublicEnterpriseObservation = z.infer<typeof publicEnterpriseObservationSchema>

export const publicEnterpriseEdgeSchema = z.object({
  /** `s1001`, `json_apt`. */
  sourceFamily: z.string(),
  authorityCui: z.string().nullable(),
  /** The source's own words; JSON-APT may carry HTML entities. */
  authorityName: z.string().nullable(),
  /** `central`, `local`, `county`, `unknown`. */
  authorityLevel: z.string(),
  /** The enterprise's status in that list (S1001): „ACTIV", „INACTIV". */
  enterpriseStatusRaw: z.string().nullable(),
})
export type PublicEnterpriseEdge = z.infer<typeof publicEnterpriseEdgeSchema>

export const publicEnterpriseSourceSchema = z.object({
  /** `amepip`, `s1001`, `json_apt`. */
  family: z.string(),
  /** `available`, `partial`, `unavailable`. */
  laneStatus: z.string(),
  observedAt: z.string().nullable(),
  sourceLastModifiedAt: z.string().nullable(),
  sourceUrl: z.string().nullable(),
})
export type PublicEnterpriseSource = z.infer<typeof publicEnterpriseSourceSchema>

export const publicEnterpriseProfileSchema = z.object({
  cui: z.string(),
  isCurrentMember: z.boolean(),
  currentFamilies: z.array(z.string()),
  /** Null when the kernel identity is withheld or absent: the record is still shown. */
  organization: z.object({ name: z.string() }).nullable(),
  registryObservations: z.array(publicEnterpriseObservationSchema),
  authorityEdges: z.array(publicEnterpriseEdgeSchema),
  sources: z.array(publicEnterpriseSourceSchema),
})
export type PublicEnterpriseProfile = z.infer<typeof publicEnterpriseProfileSchema>

/** The authority's own budget record, read beside the edge: its name and kind. */
export const publicEnterpriseAuthorityEntitySchema = z
  .object({
    organization: z.object({ name: z.string() }).nullable(),
    territory: z.object({ kind: z.string().nullable() }).nullable(),
    reference: z.object({ entityType: z.string().nullable() }).nullable(),
    budget: z.object({ presence: z.boolean() }).nullable(),
  })
  .nullable()
export type PublicEnterpriseAuthorityEntity = z.infer<typeof publicEnterpriseAuthorityEntitySchema>

/** The enterprises the lists give one authority. */
export const publicEnterprisePeersSchema = z.object({
  total: z.number().int(),
  items: z.array(z.object({ cui: z.string(), organization: z.object({ name: z.string() }).nullable() })),
})
export type PublicEnterprisePeers = z.infer<typeof publicEnterprisePeersSchema>

export type PublicEnterpriseAuthorityRead = {
  readonly entity: PublicEnterpriseAuthorityEntity
  readonly peers: PublicEnterprisePeers
}

/**
 * The enterprise page's read. `indicators` and `authorities` are null when
 * their read failed: unknown, never empty. `partial` says that some part is
 * unknown, so the render is not cached.
 */
export type PublicEnterpriseRead = {
  readonly cui: string
  /** Null: the CUI is not a public-enterprise anchor. */
  readonly profile: PublicEnterpriseProfile | null
  readonly indicators: readonly PublicEnterpriseIndicator[] | null
  readonly authorities: Readonly<Record<string, PublicEnterpriseAuthorityRead>> | null
  readonly partial: boolean
}
