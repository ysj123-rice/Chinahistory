/**
 * ============================================================
 * CHGIS 时空地名解析 —— 工程内运行时模块（TypeScript 版）
 * ------------------------------------------------------------
 * 用来替代"朴素字符串互包含"的地名匹配。
 * 原则：地名 + 时间(朝代/年份) -> CHGIS 唯一空间实体(sys_id)
 *
 * 数据来自 scripts/build-gazetteer.mjs 生成的离线库：
 *   src/data/chgis_gazetteer.json
 * ============================================================
 */

import gazetteer from '@/data/chgis_gazetteer.json'

export type ChgisEntity = {
  sysId: string | null
  name: string | null
  transcription: string | null
  featureType: string | null
  parentName: string | null
  begin: number | null
  end: number | null
  lng: number | null
  lat: number | null
  source: string | null
  queryYear: number | null
  /**
   * 所选实体的存续区间是否覆盖查询年份。
   * false = 该地名在所查时代（如西周）的建制 CHGIS 未载，坐标仅为后世同名治所的位置参考，
   * 学术呈现时必须与时代吻合实体区分。
   */
  yearMatched: boolean
  /** 前缀剥离回退命中时，记录实际命中的地名（如 "王城洛邑" -> "洛邑"） */
  matchedName?: string
}

type GazetteerEntry = {
  name: string
  dynasty: string | null
  queryYear: number | null
  candidates: ChgisEntity[]
}

export type ResolveOptions = {
  /** 限定行政等级，如 '府' | '县' */
  featureType?: string
  /** 年份对不上就当作未匹配，不返回近似结果 */
  strict?: boolean
}

export type ChgisPoint = {
  sysId: string | null
  lng: number
  lat: number
  label: string | null
  featureType: string | null
  period: string | null
}

// ---------- 朝代/时代 -> 代表年份（长的/具体的朝代名必须排在前面） ----------
export const DYNASTY_YEAR: Record<string, number> = {
  西周: -1000, 东周: -700, 春秋: -650, 战国: -400,
  秦: -210, 西汉: -150, 东汉: 100, 汉: 100,
  三国: 240, 西晋: 290, 东晋: 350, 晋: 350, 南北朝: 500,
  隋: 610, 唐: 750, 五代: 940, 北宋: 1050, 南宋: 1150, 宋: 1080,
  辽: 1050, 金: 1150, 元: 1300, 明: 1580, 清: 1820, 民国: 1920,
}

/** 系统 sourceKey -> 代表年份（与朝代切分逻辑一致：1127 分南北宋） */
export const SOURCE_KEY_YEAR: Record<string, number> = {
  tang: 750,
  northernSong: 1050,
  southernSong: 1150,
  yuan: 1300,
  ming: 1580,
  qing: 1820,
}

// ---------- 行政等级优先级：消歧时优先取高层级 ----------
const TYPE_RANK: Record<string, number> = {
  省: 6, 行省: 6, 道: 5, 路: 5, 府: 4, 州: 3, 郡: 3, 县: 2, 镇: 1,
}

/** 复合地名修饰前缀（与构建脚本 build-gazetteer.mjs 保持一致） */
const PLACE_PREFIXES = ['王城', '古', '故', '旧']
/** 行政后缀回退（CBDB 籍贯常带"郡/府/州"，CHGIS 或仅存无后缀名） */
const PLACE_SUFFIXES = ['行省', '郡', '府', '州', '县', '路', '道', '省', '军', '监']

const ENTRIES = ((gazetteer as { entries?: Record<string, GazetteerEntry> })?.entries ??
  {}) as Record<string, GazetteerEntry>

/** 把朝代名、sourceKey 或数字年份统一成数字年份 */
export function toYear(input: string | number | null | undefined): number | null {
  if (input == null) return null
  if (typeof input === 'number') return input
  const s = String(input).trim()
  if (/^-?\d+$/.test(s)) return Number(s)
  if (SOURCE_KEY_YEAR[s] != null) return SOURCE_KEY_YEAR[s]
  // 模糊匹配："唐朝" / "唐代" / "西周初" / "唐"
  for (const [k, v] of Object.entries(DYNASTY_YEAR)) {
    if (s.includes(k)) return v
  }
  return null
}

/** 判断某实体在给定年份是否有效 */
function inRange(c: ChgisEntity, year: number | null): boolean {
  if (year == null) return true
  const b = c.begin == null ? -Infinity : c.begin
  const e = c.end == null ? Infinity : c.end
  return year >= b && year <= e
}

function score(c: ChgisEntity, year: number | null): number {
  let s = 0
  if (inRange(c, year)) s += 100
  s += (TYPE_RANK[c.featureType ?? ''] ?? 0) * 5
  if (c.lng != null && c.lat != null) s += 10
  if (c.source === 'CHGIS') s += 3
  return s
}

/**
 * 核心：地名 + 时间 -> 唯一空间实体
 * 查不到返回 null —— 应标记为"未匹配"，不要硬塞一个点。
 * 复合地名（如"王城洛邑"）整体查不到时，自动剥离修饰前缀回退查"洛邑"。
 */
export function resolve(
  name: string | null | undefined,
  time: string | number | null | undefined,
  opts: ResolveOptions = {},
): ChgisEntity | null {
  if (!name) return null
  const cleanName = String(name)
    .replace(/（[^）]*）/g, '')
    .replace(/\([^)]*\)/g, '')
    .trim()
  if (!cleanName) return null

  const year = toYear(time)

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
    const hit = ENTRIES[`${lookupName}@${year ?? '-'}`]
    let candidates = hit?.candidates ?? []
    // 退而求其次：不带年份的通用记录
    if (!candidates.length) candidates = ENTRIES[`${lookupName}@-`]?.candidates ?? []
    // 最后：汇总该地名在所有年份键下的候选（构建时各年份键存的是同名全量候选，按 sysId 去重）
    if (!candidates.length) {
      const prefix = `${lookupName}@`
      const pooled = new Map<string, GazetteerEntry['candidates'][number]>()
      for (const [key, entry] of Object.entries(ENTRIES)) {
        if (key.startsWith(prefix)) {
          for (const c of entry.candidates) {
            const id = c.sysId ?? `${c.name}@${c.lng},${c.lat}`
            if (!pooled.has(id)) pooled.set(id, c)
          }
        }
      }
      candidates = [...pooled.values()]
    }
    if (!candidates.length) continue

    if (opts.featureType) {
      const filtered = candidates.filter((c) => c.featureType === opts.featureType)
      if (filtered.length) candidates = filtered
    }

    const best = [...candidates].sort((a, b) => score(b, year) - score(a, year))[0]
    // strict 模式下，年份完全对不上就当作该候选名未匹配，继续尝试下一个查询名
    if (opts.strict && year != null && !inRange(best, year)) continue

    return {
      ...best,
      yearMatched: year != null && inRange(best, year),
      ...(lookupName !== cleanName ? { matchedName: lookupName } : {}),
    }
  }

  return null
}

/** 同一空间实体判定：只比 sys_id，不比字符串 */
export function sameEntity(a: ChgisEntity | null, b: ChgisEntity | null): boolean {
  if (!a || !b) return false
  return a.sysId != null && a.sysId === b.sysId
}

/** 关键验证：同一个地名字符串在不同时间是否同一实体；true = 落点必须分开 */
export function isDistinctAcrossTime(
  name: string,
  times: Array<string | number>,
): boolean {
  const ys = times.map((t) => resolve(name, t)).filter(Boolean) as ChgisEntity[]
  if (ys.length < 2) return false
  const first = ys[0].sysId
  return ys.some((e) => e.sysId !== first)
}

/** 散点落点用：拿到干净的 {lng, lat, label, sysId} */
export function toPoint(entity: ChgisEntity | null): ChgisPoint | null {
  if (!entity || entity.lng == null || entity.lat == null) return null
  return {
    sysId: entity.sysId,
    lng: entity.lng,
    lat: entity.lat,
    label: entity.name,
    featureType: entity.featureType,
    period: entity.begin != null ? `${entity.begin}~${entity.end}` : null,
  }
}
