const toCamelCase = (value: string) =>
  value.replace(/_([a-z0-9])/g, (_, char: string) => char.toUpperCase())

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

export const toCamelCaseKeys = <T>(input: T): T => {
  if (Array.isArray(input)) {
    return input.map((item) => toCamelCaseKeys(item)) as T
  }

  if (isPlainObject(input)) {
    const entries = Object.entries(input).map(([key, value]) => [
      toCamelCase(key),
      toCamelCaseKeys(value),
    ])
    return Object.fromEntries(entries) as T
  }

  return input
}
