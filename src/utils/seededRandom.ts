export type SeededRandom = {
  next: () => number
  int: (min: number, max: number) => number
  pick: <T>(items: readonly T[]) => T
  pickMany: <T>(items: readonly T[], count: number, unique?: boolean) => T[]
  shuffle: <T>(items: readonly T[]) => T[]
}

const RANDOM_MODULUS = 0x100000000
const RANDOM_MULTIPLIER = 1664525
const RANDOM_INCREMENT = 1013904223

/**
 * 创建可复现的随机生成器。
 */
export const createSeededRandom = (seed: number): SeededRandom => {
  let state = seed >>> 0

  const next = () => {
    state = (state * RANDOM_MULTIPLIER + RANDOM_INCREMENT) % RANDOM_MODULUS
    return state / RANDOM_MODULUS
  }

  const int = (min: number, max: number) => {
    const low = Math.min(min, max)
    const high = Math.max(min, max)
    return Math.floor(next() * (high - low + 1)) + low
  }

  const pick = <T>(items: readonly T[]): T => {
    if (items.length === 0) {
      throw new Error('随机选择失败：候选列表为空')
    }
    return items[int(0, items.length - 1)] as T
  }

  const shuffle = <T>(items: readonly T[]) => {
    const result = [...items]
    for (let i = result.length - 1; i > 0; i -= 1) {
      const j = int(0, i)
      const temp = result[i] as T
      result[i] = result[j] as T
      result[j] = temp
    }
    return result
  }

  const pickMany = <T>(items: readonly T[], count: number, unique = true) => {
    if (items.length === 0 || count <= 0) {
      return []
    }

    if (!unique) {
      return Array.from({ length: count }, () => pick(items))
    }

    const targetCount = Math.min(count, items.length)
    return shuffle(items).slice(0, targetCount)
  }

  return {
    next,
    int,
    pick,
    pickMany,
    shuffle,
  }
}

/**
 * 通过字符串生成稳定的种子值。
 */
export const hashStringToSeed = (value: string) => {
  let hash = 2166136261
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

/**
 * 在基础种子上叠加盐值，生成新的种子。
 */
export const deriveSeed = (baseSeed: number, salt: string) =>
  (baseSeed ^ hashStringToSeed(salt)) >>> 0
