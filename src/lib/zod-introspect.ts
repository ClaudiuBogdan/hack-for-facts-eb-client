import { z } from 'zod'

export type IntrospectedParam = {
  type: string
  optional?: boolean
  default?: unknown
  enumValues?: readonly string[]
  min?: number
  max?: number
  pattern?: string
  description?: string
}

type ZodDefLike = {
  typeName?: string
  shape?: Record<string, z.ZodTypeAny> | (() => Record<string, z.ZodTypeAny>)
  innerType?: z.ZodTypeAny
  schema?: z.ZodTypeAny
  defaultValue?: () => unknown
  checks?: unknown[]
  values?: unknown
}

export type ZodTypeInternal = { _def: ZodDefLike; description?: string }

function getInternal(schema: z.ZodTypeAny): ZodTypeInternal {
  return schema as unknown as ZodTypeInternal
}

export function describeZodSchema(schema: z.ZodTypeAny): Record<string, IntrospectedParam> {
  const shape = getShape(schema)
  const result: Record<string, IntrospectedParam> = {}
  for (const [key, field] of Object.entries(shape)) {
    result[key] = describeZod(field)
  }
  return result
}

function getShape(schema: z.ZodTypeAny): Record<string, z.ZodTypeAny> {
  const def = getInternal(schema)._def
  if (def?.typeName === 'ZodObject') {
    const rawShape = def.shape
    return typeof rawShape === 'function'
      ? (rawShape as () => Record<string, z.ZodTypeAny>)()
      : (rawShape as Record<string, z.ZodTypeAny>) ?? {}
  }
  return {}
}

function describeZod(schema: z.ZodTypeAny): IntrospectedParam {
  let s = getInternal(schema)
  const meta: IntrospectedParam = { type: 'unknown' }
  if (s._def?.typeName === 'ZodDefault') {
    meta.default = s._def.defaultValue?.()
    s = getInternal(s._def.innerType ?? schema)
  }
  if (s._def?.typeName === 'ZodOptional') {
    meta.optional = true
    s = getInternal(s._def.innerType ?? schema)
  }
  if (s._def?.typeName === 'ZodEffects') {
    s = getInternal(s._def.schema ?? schema)
  }

  const typeName = s._def?.typeName
  if (!typeName) return meta

  if (s.description) meta.description = s.description

  switch (typeName) {
    case 'ZodString': {
      meta.type = 'string'
      const checks = s._def.checks as unknown as Array<{ kind: string; regex?: { source: string } }>
      const pattern = checks?.find((c) => c.kind === 'regex')?.regex?.source
      if (pattern) meta.pattern = pattern
      return meta
    }
    case 'ZodNumber': {
      meta.type = 'number'
      const checks = s._def.checks as unknown as Array<{ kind: string; value?: number }>
      const min = checks?.find((c) => c.kind === 'min')?.value
      const max = checks?.find((c) => c.kind === 'max')?.value
      if (typeof min === 'number') meta.min = min
      if (typeof max === 'number') meta.max = max
      return meta
    }
    case 'ZodEnum': {
      meta.type = 'enum'
      meta.enumValues = s._def.values as unknown as string[]
      return meta
    }
    case 'ZodBoolean': {
      meta.type = 'boolean'
      return meta
    }
    case 'ZodArray': {
      meta.type = 'array'
      return meta
    }
    case 'ZodObject': {
      meta.type = 'object'
      return meta
    }
    default: {
      meta.type = String(typeName)
      return meta
    }
  }
}
