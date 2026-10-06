import { ApiError } from './errors'

export const requireFields = (payload: Record<string, unknown>, fields: string[]) => {
  const missing = fields.filter((field) => payload[field] === undefined || payload[field] === null)
  if (missing.length > 0) {
    throw new ApiError(`缺少字段: ${missing.join(', ')}`, 400, 'missing_fields')
  }
}

export const parseStringArray = (value: unknown) => {
  if (Array.isArray(value)) {
    return value.filter((item) => typeof item === 'string') as string[]
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  }
  return []
}

export const parseNumber = (value: unknown, field: string) => {
  const parsed = Number(value)
  if (Number.isNaN(parsed)) {
    throw new ApiError(`字段 ${field} 必须为数字`, 400, 'invalid_number')
  }
  return parsed
}

export const parseJsonArray = (value: string | null | undefined) => {
  if (!value) {
    return [] as string[]
  }
  try {
    const parsed = JSON.parse(value) as unknown
    if (Array.isArray(parsed)) {
      return parsed.filter((item) => typeof item === 'string') as string[]
    }
  } catch (error) {
    return [] as string[]
  }
  return [] as string[]
}

export const toJsonString = (value: unknown) => {
  if (Array.isArray(value)) {
    return JSON.stringify(value)
  }
  if (typeof value === 'string') {
    return JSON.stringify([value])
  }
  return JSON.stringify([])
}
