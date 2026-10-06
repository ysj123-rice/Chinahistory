import {
  HOTSPOT_ZSCORE_BREAKPOINTS,
  type HotspotLevel,
} from '../constants.ts'

export type HotspotScore = {
  value: number
  zScore: number
  level: HotspotLevel
}

const DIVERGING_LEVELS: HotspotLevel[] = [-3, -2, -1, 0, 1, 2, 3]

/**
 * Compute the arithmetic mean for a non-empty value array.
 */
export const calculateMean = (values: readonly number[]): number => {
  if (values.length === 0) {
    return 0
  }

  const total = values.reduce((sum, value) => sum + value, 0)
  return total / values.length
}

/**
 * Compute population standard deviation for a value array.
 */
export const calculateStandardDeviation = (values: readonly number[], mean: number): number => {
  if (values.length === 0) {
    return 0
  }

  const variance =
    values.reduce((sum, value) => {
      const delta = value - mean
      return sum + delta * delta
    }, 0) / values.length

  return Math.sqrt(variance)
}

/**
 * Convert a z-score to one of seven hotspot levels.
 */
export const classifyHotspotLevel = (zScore: number): HotspotLevel => {
  if (!Number.isFinite(zScore)) {
    return 0
  }

  const { weak, medium, strong } = HOTSPOT_ZSCORE_BREAKPOINTS

  if (zScore >= strong) {
    return 3
  }

  if (zScore >= medium) {
    return 2
  }

  if (zScore >= weak) {
    return 1
  }

  if (zScore <= -strong) {
    return -3
  }

  if (zScore <= -medium) {
    return -2
  }

  if (zScore <= -weak) {
    return -1
  }

  return 0
}

/**
 * Build hotspot score results from raw region counts.
 */
export const buildHotspotScores = (values: readonly number[]): HotspotScore[] => {
  if (values.length === 0) {
    return []
  }

  const mean = calculateMean(values)
  const standardDeviation = calculateStandardDeviation(values, mean)

  if (standardDeviation === 0) {
    return values.map((value) => ({ value, zScore: 0, level: 0 }))
  }

  const zScoreResults = values.map((value) => {
    const zScore = (value - mean) / standardDeviation
    return {
      value,
      zScore,
      level: classifyHotspotLevel(zScore),
    }
  })

  const hasNonNeutralLevel = zScoreResults.some((item) => item.level !== 0)
  if (hasNonNeutralLevel) {
    return zScoreResults
  }

  const sortedEntries = values
    .map((value, index) => ({ value, index }))
    .sort((left, right) => left.value - right.value)

  if (sortedEntries.length <= 1) {
    return zScoreResults
  }

  const rankedLevels = new Array<HotspotLevel>(values.length).fill(0)
  let pointer = 0

  while (pointer < sortedEntries.length) {
    const currentValue = sortedEntries[pointer]?.value
    let endPointer = pointer

    while (endPointer + 1 < sortedEntries.length) {
      const nextValue = sortedEntries[endPointer + 1]?.value
      if (nextValue !== currentValue) {
        break
      }
      endPointer += 1
    }

    const rankCenter = (pointer + endPointer) * 0.5
    const percentile = rankCenter / (sortedEntries.length - 1)
    const levelIndex = Math.max(0, Math.min(6, Math.round(percentile * 6)))
    const level = DIVERGING_LEVELS[levelIndex] ?? 0

    for (let index = pointer; index <= endPointer; index += 1) {
      const target = sortedEntries[index]
      if (target) {
        rankedLevels[target.index] = level
      }
    }

    pointer = endPointer + 1
  }

  return zScoreResults.map((item, index) => ({
    ...item,
    level: rankedLevels[index] ?? item.level,
  }))
}
