import { fileURLToPath } from 'node:url'
import path from 'node:path'

import { prisma } from '../prisma/client'
import { readCsv, toFloat, toInt } from './csv'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CSV_PATH = path.resolve(__dirname, '../../data/import/migration_events.csv')

/**
 * 解析 CSV 年份字段：
 * - 负数表示公元前（-1042 = 公元前1042年）
 * - 兼容「前N」「公元前N」旧写法 → 负数
 * - 「至今」→ 当前年份
 */
const parseYear = (raw: string | undefined): number => {
  const text = raw?.trim() ?? ''
  if (!text) {
    return 0
  }
  if (text.includes('至今')) {
    return new Date().getFullYear()
  }
  const bcMatch = text.match(/^(?:公元前|前)\s*(\d+)$/)
  if (bcMatch) {
    return -Number(bcMatch[1])
  }
  const value = Number(text)
  return Number.isFinite(value) ? Math.round(value) : 0
}

/** 导入宏观迁徙事件（38 条，含起终点坐标） */
export const importMigrationEvents = async () => {
  const rows = await readCsv(CSV_PATH)

  const records = rows
    .map((row) => ({
      name: row.name?.trim() ?? '',
      era: row.era?.trim() ?? '',
      startYear: parseYear(row.start_year),
      endYear: parseYear(row.end_year),
      cause: row.cause?.trim() ?? '',
      fromRegion: row.from_region?.trim() ?? '',
      fromLng: toFloat(row.from_lng),
      fromLat: toFloat(row.from_lat),
      toRegion: row.to_region?.trim() ?? '',
      toLng: toFloat(row.to_lng),
      toLat: toFloat(row.to_lat),
      scale: row.scale?.trim() ?? '',
      intensity: toInt(row.intensity) ?? 5,
      surnames: row.surnames?.trim() ?? '',
      populationEstimate: row.population_estimate?.trim() || null,
      description: row.description?.trim() || null,
      sourceRef: row.source_ref?.trim() || null,
      confidence: toInt(row.confidence) ?? 3,
    }))
    .filter((item) => item.name)

  await prisma.migrationEvent.deleteMany()
  await prisma.migrationEvent.createMany({ data: records })

  return records.length
}
