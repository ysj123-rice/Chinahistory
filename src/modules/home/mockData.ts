import type { MapSourceKey } from '@/modules/map/dataSources'
import { MOCK_REGION_NAMES, MOCK_SURNAMES } from '@/modules/mock/constants'
import { getSourceSeed } from '@/modules/mock/sourceSeeds'
import type { EvolutionPeriod } from '@/modules/evolution/constants'
import { buildEvolutionData } from '@/modules/evolution/mockData'
import { QUERY_EVENT_TYPES } from '@/modules/query/constants'
import { buildQueryData } from '@/modules/query/mockData'
import { createSeededRandom, deriveSeed } from '@/utils/seededRandom'

import {
  HOME_ACTIVITY_BANDS,
  HOME_ACTIVITY_LEVEL_LABELS,
  HOME_ACTIVITY_FIRST_MAX,
  HOME_ACTIVITY_FIRST_MIN,
  HOME_ACTIVITY_SECOND_MAX,
  HOME_ACTIVITY_SECOND_MIN,
  HOME_ACTIVITY_THIRD_MIN,
  HOME_HOT_EVENTS,
  HOME_LOCATION_SCALE_MAX,
  HOME_LOCATION_SCALE_MIN,
  HOME_PERCENT_TOTAL,
  HOME_PERSON_SCALE_MAX,
  HOME_PERSON_SCALE_MIN,
  HOME_SEED_SALT,
  HOME_SEED_SALT_LEVEL,
  HOME_SEED_SALT_REGION,
  HOME_SEED_SALT_SURNAME,
  HOME_SEED_SALT_TREND,
  HOME_SURNAME_SCALE_MAX,
  HOME_SURNAME_SCALE_MIN,
  HOME_TREND_LABELS,
  HOME_TREND_MAX,
  HOME_TREND_MIN,
  HOME_TREND_POINT_COUNT,
  HOME_TREND_START_OFFSET,
  HOME_TREND_STEP_MAX,
  HOME_TREND_STEP_MIN,
} from './constants'

export type HomeStatItem = { label: string; value: number; unit: string }
export type HomeRankingItem = { label: string; value: number }
export type HomeHighlightItem = { label: string; value: string }
export type HomeActivityLevel = { label: string; value: string }

export type HomeData = {
  overviewStats: HomeStatItem[]
  surnameRanking: HomeRankingItem[]
  eventTypes: Array<{ label: string; value: number; color: string }>
  regionRanking: HomeRankingItem[]
  trendSeries: number[]
  trendLabel: string
  mapHighlights: HomeHighlightItem[]
  activityLevels: HomeActivityLevel[]
}

const buildTrendSeries = (seed: number) => {
  const random = createSeededRandom(seed)
  const series: number[] = []
  let current = random.int(HOME_TREND_MIN, HOME_TREND_MAX - HOME_TREND_START_OFFSET)
  for (let i = 0; i < HOME_TREND_POINT_COUNT; i += 1) {
    const delta = random.int(HOME_TREND_STEP_MIN, HOME_TREND_STEP_MAX)
    current = Math.min(HOME_TREND_MAX, Math.max(HOME_TREND_MIN, current + delta))
    series.push(current)
  }
  return series
}

const buildActivityLevels = (seed: number): HomeActivityLevel[] => {
  const random = createSeededRandom(seed)
  const first = random.int(HOME_ACTIVITY_FIRST_MIN, HOME_ACTIVITY_FIRST_MAX)
  const second = random.int(HOME_ACTIVITY_SECOND_MIN, HOME_ACTIVITY_SECOND_MAX)
  const third = Math.max(HOME_ACTIVITY_THIRD_MIN, HOME_PERCENT_TOTAL - first - second)
  const values = [first, second, third]
  return HOME_ACTIVITY_LEVEL_LABELS.map((label, index) => ({
    label,
    value: String(values[index] ?? 0),
  }))
}

const buildEventTypeStats = (eventCounts: Map<string, number>) => {
  const total = Array.from(eventCounts.values()).reduce((sum, value) => sum + value, 0) || 1
  const raw = QUERY_EVENT_TYPES.map((type) => {
    const count = eventCounts.get(type.key) ?? 0
    return {
      label: type.label,
      color: type.color,
      ratio: (count / total) * 100,
    }
  })

  let accumulated = 0
  return raw.map((item, index) => {
    const value =
      index === raw.length - 1 ? HOME_PERCENT_TOTAL - accumulated : Math.round(item.ratio)
    accumulated += value
    return { label: item.label, value, color: item.color }
  })
}

const buildSurnameRanking = (surnameCounts: Map<string, number>, seed: number) => {
  const random = createSeededRandom(seed)
  const scale = random.int(8, 14)
  return Array.from(surnameCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([label, value]) => ({ label, value: Math.max(1, value * scale) }))
}

const buildRegionRanking = (locationCounts: Map<string, number>, seed: number) => {
  const random = createSeededRandom(seed)
  const scale = random.int(6, 12)
  const ranked = Array.from(locationCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([label, value]) => ({ label, value: Math.max(1, value * scale) }))

  if (ranked.length >= 5) {
    return ranked.slice(0, 5)
  }

  const fallback = MOCK_REGION_NAMES.filter(
    (name) => !ranked.some((item) => item.label === name),
  ).map((label) => ({ label, value: random.int(120, 380) }))
  return [...ranked, ...fallback].slice(0, 5)
}

export const buildHomeData = (sourceKey: MapSourceKey): HomeData => {
  const baseSeed = getSourceSeed(sourceKey)
  const random = createSeededRandom(deriveSeed(baseSeed, HOME_SEED_SALT))
  const queryData = buildQueryData(sourceKey)
  const evolutionData = buildEvolutionData(sourceKey)

  const surnameCounts = new Map<string, number>(MOCK_SURNAMES.map((surname) => [surname, 0]))
  const eventCounts = new Map(QUERY_EVENT_TYPES.map((type) => [type.key, 0]))
  const locationCounts = new Map<string, number>()

  queryData.records.forEach((record) => {
    surnameCounts.set(record.surname, (surnameCounts.get(record.surname) ?? 0) + 1)
    eventCounts.set(record.eventType, (eventCounts.get(record.eventType) ?? 0) + 1)
    locationCounts.set(record.location, (locationCounts.get(record.location) ?? 0) + 1)
  })

  const uniqueSurnames = surnameCounts.size
  const uniqueLocations = locationCounts.size || MOCK_REGION_NAMES.length
  const personCount = queryData.records.length * random.int(HOME_PERSON_SCALE_MIN, HOME_PERSON_SCALE_MAX)
  const surnameSample = uniqueSurnames * random.int(HOME_SURNAME_SCALE_MIN, HOME_SURNAME_SCALE_MAX)
  const locationNodes = uniqueLocations * random.int(HOME_LOCATION_SCALE_MIN, HOME_LOCATION_SCALE_MAX)

  const overviewStats: HomeStatItem[] = [
    { label: '收录人物', value: personCount, unit: '人' },
    { label: '姓氏样本', value: surnameSample, unit: '种' },
    { label: '地点节点', value: locationNodes, unit: '处' },
  ]

  const surnameRanking = buildSurnameRanking(surnameCounts, deriveSeed(baseSeed, HOME_SEED_SALT_SURNAME))
  const eventTypes = buildEventTypeStats(eventCounts)
  const regionRanking = buildRegionRanking(locationCounts, deriveSeed(baseSeed, HOME_SEED_SALT_REGION))
  const trendSeries = buildTrendSeries(deriveSeed(baseSeed, HOME_SEED_SALT_TREND))
  const trendLabel = HOME_TREND_LABELS[sourceKey] ?? HOME_TREND_LABELS.yuan
  const activityLevels = buildActivityLevels(deriveSeed(baseSeed, HOME_SEED_SALT_LEVEL))
  const periodHighlight = (random.pick(evolutionData.periods) as EvolutionPeriod).range

  const mapHighlights: HomeHighlightItem[] = [
    { label: '主活动带', value: random.pick(HOME_ACTIVITY_BANDS) },
    { label: '热点事件', value: random.pick(HOME_HOT_EVENTS) },
    { label: '活跃时期', value: periodHighlight },
  ]

  return {
    overviewStats,
    surnameRanking,
    eventTypes,
    regionRanking,
    trendSeries,
    trendLabel,
    mapHighlights,
    activityLevels,
  }
}
