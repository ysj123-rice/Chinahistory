import type { QueryRecord, QueryTimeRange } from '@prisma/client'

import { prisma } from '../../prisma/client'
import { HOME_TREND_POINTS } from '../../constants/home'
import type { SourceKey } from '../../constants/sourceKeys'

// 时段分布环图配色（最多 4 段，超出循环取色）
const SEGMENT_COLORS = ['#1f88a7', '#2fb2c4', '#5b7aa8', '#8fd3d8']
const FALLBACK_SEGMENT_COUNT = 4

type SummaryRecord = Pick<QueryRecord, 'personId' | 'personName' | 'surname' | 'location' | 'year'>

type Segment = {
  label: string
  startYear: number
  endYear: number
  count: number
}

/** 按真实生卒年份把人物均分到固定数量的时间桶中，返回每桶真实人物数 */
const buildTrendCounts = (years: number[]) => {
  if (years.length === 0) {
    return []
  }
  const minYear = Math.min(...years)
  const maxYear = Math.max(...years)
  const span = Math.max(1, maxYear - minYear + 1)
  const bucketSize = Math.max(1, Math.ceil(span / HOME_TREND_POINTS))
  const buckets = Array.from({ length: HOME_TREND_POINTS }, () => 0)

  years.forEach((year) => {
    const index = Math.min(
      HOME_TREND_POINTS - 1,
      Math.floor((year - minYear) / bucketSize),
    )
    buckets[index] += 1
  })

  return buckets
}

/**
 * 朝代时段分布：优先使用 query_time_ranges 中预置的真实分段；
 * 没有预置分段时，按该朝代人物实际年份范围等分为 4 段。
 */
const buildSegments = (timeRanges: QueryTimeRange[], years: number[]): Segment[] => {
  if (years.length === 0) {
    return []
  }

  if (timeRanges.length > 0) {
    return timeRanges.map((range) => ({
      label: range.label,
      startYear: range.startYear,
      endYear: range.endYear,
      count: years.filter((year) => year >= range.startYear && year <= range.endYear).length,
    }))
  }

  const minYear = Math.min(...years)
  const maxYear = Math.max(...years)
  const span = Math.max(1, maxYear - minYear + 1)
  const bucketSize = Math.ceil(span / FALLBACK_SEGMENT_COUNT)

  return Array.from({ length: FALLBACK_SEGMENT_COUNT }, (_, index) => {
    const startYear = minYear + index * bucketSize
    const endYear = index === FALLBACK_SEGMENT_COUNT - 1 ? maxYear : startYear + bucketSize - 1
    return {
      label: `${startYear}-${endYear}`,
      startYear,
      endYear,
      count: years.filter((year) => year >= startYear && year <= endYear).length,
    }
  })
}

export const buildHomeSummary = async (sourceKey: SourceKey) => {
  const records = (await prisma.queryRecord.findMany({
    where: { sourceKey },
    select: { personId: true, personName: true, surname: true, location: true, year: true },
  })) as SummaryRecord[]

  const timeRanges = (await prisma.queryTimeRange.findMany({
    where: { sourceKey },
    orderBy: { startYear: 'asc' },
  })) as QueryTimeRange[]

  // 以 CBDB personId 去重（同名异人），无 personId 的记录退回按姓名去重
  const uniquePersons = new Set(
    records.map((record) => (record.personId !== null ? `id:${record.personId}` : `name:${record.personName}`)),
  ).size
  const surnameCounts = new Map<string, number>()
  const locationCounts = new Map<string, number>()

  records.forEach((record) => {
    surnameCounts.set(record.surname, (surnameCounts.get(record.surname) ?? 0) + 1)
    locationCounts.set(record.location, (locationCounts.get(record.location) ?? 0) + 1)
  })

  // 总览：真实计数，不做任何放大
  const overviewStats = [
    { label: '收录人物', value: uniquePersons, unit: '人' },
    { label: '姓氏种类', value: surnameCounts.size, unit: '种' },
    { label: '籍贯地点', value: locationCounts.size, unit: '处' },
  ]

  // 高频姓氏 Top7：真实人数
  const surnameRanking = Array.from(surnameCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([label, value]) => ({ label, value }))
    .slice(0, 7)

  // 地域热度 Top5：真实籍贯地人数
  const regionRanking = Array.from(locationCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([label, value]) => ({ label, value }))
    .slice(0, 5)

  const years = records.map((record) => record.year)
  const segments = buildSegments(timeRanges, years)
  const segmentTotal = segments.reduce((sum, segment) => sum + segment.count, 0) || 1

  // 环图：各时段人物占比（末段取余量，保证合计 100%）
  let accumulated = 0
  const eventTypes = segments.map((segment, index) => {
    const isLast = index === segments.length - 1
    const value = isLast ? 100 - accumulated : Math.round((segment.count / segmentTotal) * 100)
    accumulated += value
    return {
      label: segment.label,
      value,
      color: SEGMENT_COLORS[index % SEGMENT_COLORS.length],
    }
  })

  // 折线：每个时间桶的真实人物数（前端按极值归一化绘制）
  const trendSeries = buildTrendCounts(years)
  const trendLabel = '人物数量时段分布'

  const topSurname = surnameRanking[0]
  const topRegion = regionRanking[0]
  const topSegment = segments.length > 0
    ? segments.reduce((best, current) => (current.count > best.count ? current : best), segments[0])
    : undefined

  // 地图底部高亮：全部来自真实统计
  const mapHighlights = [
    { label: '代表姓氏', value: topSurname ? `${topSurname.label}（${topSurname.value}人）` : '—' },
    { label: '主要籍贯', value: topRegion ? `${topRegion.label}（${topRegion.value}人）` : '—' },
    { label: '活跃时段', value: topSegment ? `${topSegment.label}（${topSegment.count}人）` : '—' },
  ]

  const minYear = years.length > 0 ? Math.min(...years) : null
  const maxYear = years.length > 0 ? Math.max(...years) : null

  // 时间跨度卡片：真实起止年份与峰值时段
  const activityLevels = minYear !== null && maxYear !== null
    ? [
        { label: '最早记载', value: `${minYear}年` },
        { label: '最晚记载', value: `${maxYear}年` },
        { label: '峰值时段', value: topSegment ? topSegment.label : '—' },
      ]
    : []

  return {
    overview_stats: overviewStats,
    surname_ranking: surnameRanking,
    event_types: eventTypes,
    region_ranking: regionRanking,
    trend_series: trendSeries,
    trend_label: trendLabel,
    map_highlights: mapHighlights,
    activity_levels: activityLevels,
  }
}
