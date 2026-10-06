/**
 * ============================================================
 * CHGIS 时空地名解析（后端导入期使用）
 * ------------------------------------------------------------
 * 与前端 src/utils/chgis.ts 共用同一份离线地名库：
 *   daima/src/data/chgis_gazetteer.json
 * 由 scripts/build-gazetteer.mjs 生成，请勿手工编辑。
 * 人物导入时以「籍贯 + 生年（精确年份，含公元前负数）」解析唯一空间实体，
 * 并给出 yearMatched（实体存续区间是否覆盖生年）。
 * ============================================================
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const GAZETTEER_FILE = path.resolve(__dirname, '../../../src/data/chgis_gazetteer.json')

export type ChgisEntity = {
  sysId: string | null
  name: string | null
  featureType: string | null
  begin: number | null
  end: number | null
  lng: number | null
  lat: number | null
  yearMatched: boolean
  matchedName?: string
}

type RawCandidate = Omit<ChgisEntity, 'yearMatched' | 'matchedName'>

const TYPE_RANK: Record<string, number> = {
  省: 6, 行省: 6, 道: 5, 路: 5, 府: 4, 州: 3, 郡: 3, 县: 2, 镇: 1,
}

/** 复合地名修饰前缀（与构建脚本保持一致） */
const PLACE_PREFIXES = ['王城', '古', '故', '旧']
/** 行政后缀回退（CBDB 籍贯常带"郡/府/州"，CHGIS 或仅存无后缀名） */
const PLACE_SUFFIXES = ['行省', '郡', '府', '州', '县', '路', '道', '省', '军', '监']

type Gazetteer = {
  entries?: Record<string, { candidates: RawCandidate[] }>
}

let entriesCache: Record<string, { candidates: RawCandidate[] }> | null = null

const loadEntries = (): Record<string, { candidates: RawCandidate[] }> => {
  if (entriesCache) {
    return entriesCache
  }
  const raw = JSON.parse(fs.readFileSync(GAZETTEER_FILE, 'utf8')) as Gazetteer
  entriesCache = raw.entries ?? {}
  return entriesCache
}

const inRange = (c: RawCandidate, year: number | null): boolean => {
  if (year === null) {
    return true
  }
  const b = c.begin === null ? -Infinity : c.begin
  const e = c.end === null ? Infinity : c.end
  return year >= b && year <= e
}

const score = (c: RawCandidate, year: number | null): number => {
  let s = 0
  if (inRange(c, year)) s += 100
  s += (TYPE_RANK[c.featureType ?? ''] ?? 0) * 5
  if (c.lng !== null && c.lat !== null) s += 10
  return s
}

/**
 * 地名 + 年份 -> 唯一 CHGIS 空间实体；查不到返回 null。
 * 复合地名整体未命中时自动剥离修饰前缀回退。
 */
export const resolveChgis = (
  name: string | null | undefined,
  year: number | null,
): ChgisEntity | null => {
  if (!name) {
    return null
  }
  const cleanName = String(name)
    .replace(/（[^）]*）/g, '')
    .replace(/\([^)]*\)/g, '')
    .trim()
  if (!cleanName) {
    return null
  }

  const entries = loadEntries()
  // 候选查询名（去重、保序）：原名 -> 行政后缀剥离 -> 修饰前缀剥离
  const lookupNames = [cleanName]
  for (const suffix of PLACE_SUFFIXES) {
    if (cleanName.endsWith(suffix) && cleanName.length - suffix.length >= 2) {
      lookupNames.push(cleanName.slice(0, cleanName.length - suffix.length))
    }
  }
  for (const prefix of PLACE_PREFIXES) {
    if (cleanName.startsWith(prefix) && cleanName.length - prefix.length >= 2) {
      lookupNames.push(cleanName.slice(prefix.length))
    }
  }

  for (const lookupName of lookupNames) {
    const hit = entries[`${lookupName}@${year ?? '-'}`]
    let candidates = hit?.candidates ?? []
    if (!candidates.length) {
      candidates = entries[`${lookupName}@-`]?.candidates ?? []
    }
    // 最后：汇总该地名在所有年份键下的候选（按 sysId 去重）
    if (!candidates.length) {
      const prefix = `${lookupName}@`
      const pooled = new Map<string, RawCandidate>()
      for (const [key, entry] of Object.entries(entries)) {
        if (key.startsWith(prefix)) {
          for (const c of entry.candidates) {
            const id = c.sysId ?? `${c.name}@${c.lng},${c.lat}`
            if (!pooled.has(id)) pooled.set(id, c)
          }
        }
      }
      candidates = [...pooled.values()]
    }
    if (!candidates.length) {
      continue
    }
    const best = [...candidates].sort((a, b) => score(b, year) - score(a, year))[0]
    return {
      ...best,
      yearMatched: year !== null && inRange(best, year),
      ...(lookupName !== cleanName ? { matchedName: lookupName } : {}),
    }
  }

  return null
}
