import { fileURLToPath } from 'node:url'
import path from 'node:path'

import type { Prisma } from '@prisma/client'

import { prisma } from '../prisma/client'
import { readCsv, toFloat, toInt, type CsvRow } from './csv'
import { t2s } from './t2s'
import { resolveChgis } from '../utils/chgis'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const MAIN_PATH = path.resolve(__dirname, '../../data/import/1_person_main.csv')
const ADDR_PATH = path.resolve(__dirname, '../../data/import/2_person_address.csv')

// 非中原/域外/近现代人物：保留入库但默认不在地图展示
const HIDDEN_SOURCE_KEYS = new Set(['goryeo', 'joseon', 'republic', 'prc'])

/**
 * CBDB 原始朝代名（转简体后）→ 系统 sourceKey
 * 宋代按 1127 年（靖康之变）切分北宋/南宋
 */
const resolveSourceKey = (dynastySimp: string, year: number | null): string => {
  switch (dynastySimp) {
    case '唐':
      return 'tang'
    case '元':
      return 'yuan'
    case '明':
      return 'ming'
    case '清':
      return 'qing'
    case '宋':
      return year !== null && year <= 1127 ? 'northernSong' : 'southernSong'
    case '五代':
      return 'wudai'
    case '南唐':
      return 'nantang'
    case '金':
      return 'jin'
    case '三国魏':
    case '三国吴':
      return 'sanguo'
    case '周':
      return 'zhou'
    case '高丽':
      return 'goryeo'
    case '朝鲜':
      return 'joseon'
    case '中华民国':
      return 'republic'
    case '中华人民共和国':
      return 'prc'
    default:
      return 'other'
  }
}

/** 导入 CBDB 历史人物（人物主表 JOIN 籍贯地址表，简繁统一） */
export const importPersons = async () => {
  const mainRows = await readCsv(MAIN_PATH)
  const addrRows = await readCsv(ADDR_PATH)

  // personId -> 主表记录
  const mainMap = new Map<string, CsvRow>()
  for (const row of mainRows) {
    mainMap.set(String(row.personId).trim(), row)
  }

  // personId -> 籍贯地址（可能多条，取第一条并统计重复）
  const addrMap = new Map<string, CsvRow>()
  let duplicateAddr = 0
  for (const row of addrRows) {
    const key = String(row.personId).trim()
    if (addrMap.has(key)) {
      duplicateAddr += 1
      continue
    }
    addrMap.set(key, row)
  }

  const records: Prisma.QueryRecordCreateManyInput[] = []
  const stats: Record<string, number> = {}
  const skipReasons = { noAddress: 0, noYear: 0, noCoordinate: 0, unknownDynasty: 0 }
  // CHGIS 校验统计
  let chgisMatched = 0
  let chgisYearMatched = 0
  let rescuedByChgis = 0

  for (const [personIdKey, main] of mainMap) {
    const personId = toInt(personIdKey)
    const year = toInt(main.year)
    if (personId === null) {
      continue
    }
    if (year === null) {
      skipReasons.noYear += 1
      continue
    }

    const addr = addrMap.get(personIdKey)
    if (!addr) {
      skipReasons.noAddress += 1
      continue
    }

    const lng = toFloat(addr.lng)
    const lat = toFloat(addr.lat)
    const hasCbdbCoord =
      lng !== null && lat !== null && Number.isFinite(lng) && Number.isFinite(lat)

    const personName = t2s(main.personName)
    const surname = t2s(main.surname)
    const dynastyName = t2s(main.dynasty_name)
    const jiguanName = t2s(addr.jiguanName)
    const sourceKey = resolveSourceKey(dynastyName, year)

    // CHGIS 时空校验：籍贯（简体）+ 生年精确年份 -> 唯一历史空间实体
    const chgis = resolveChgis(jiguanName, year)
    if (chgis) {
      chgisMatched += 1
      if (chgis.yearMatched) {
        chgisYearMatched += 1
      }
    }
    const hasChgisCoord = chgis !== null && chgis.lng !== null && chgis.lat !== null

    // 坐标策略：CBDB 原始坐标优先；CBDB 缺坐标时用 CHGIS 实体坐标救援（明确标注来源）
    if (!hasCbdbCoord && !hasChgisCoord) {
      skipReasons.noCoordinate += 1
      continue
    }
    const coordSource = hasCbdbCoord ? 'cbdb' : 'chgis_rescue'
    if (coordSource === 'chgis_rescue') {
      rescuedByChgis += 1
    }
    const finalLng = hasCbdbCoord ? lng : (chgis?.lng as number)
    const finalLat = hasCbdbCoord ? lat : (chgis?.lat as number)

    if (sourceKey === 'other') {
      skipReasons.unknownDynasty += 1
    }

    records.push({
      sourceKey,
      personName,
      surname,
      eventName: '籍贯',
      eventType: '籍贯',
      location: jiguanName,
      year,
      summary: '',
      keywords: JSON.stringify([dynastyName, jiguanName].filter(Boolean)),
      source: 'CBDB 中国历代人物传记资料库',
      personId,
      jiguanName,
      dynastyName,
      lng: finalLng,
      lat: finalLat,
      chgisSysId: chgis?.sysId ?? null,
      chgisName: chgis?.matchedName ?? chgis?.name ?? null,
      chgisBegin: chgis?.begin ?? null,
      chgisEnd: chgis?.end ?? null,
      chgisYearMatched: chgis ? chgis.yearMatched : null,
      coordSource,
      isReal: true,
      visible: !HIDDEN_SOURCE_KEYS.has(sourceKey),
    })
    stats[sourceKey] = (stats[sourceKey] ?? 0) + 1
  }

  // 用真实数据整体替换 query_records（旧 procedural 假数据随之清除，seed 不会重复灌入）
  await prisma.queryRecord.deleteMany()
  for (let i = 0; i < records.length; i += 200) {
    await prisma.queryRecord.createMany({ data: records.slice(i, i + 200) })
  }

  return {
    imported: records.length,
    bySourceKey: stats,
    hidden: records.filter((r) => r.visible === false).length,
    duplicateAddr,
    skipReasons,
    chgis: { matched: chgisMatched, yearMatched: chgisYearMatched, rescued: rescuedByChgis },
  }
}
