import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { createRequire } from 'node:module'

import { prisma } from '../prisma/client'
import { t2s } from './t2s'

// shapefile 是 CJS 包，用 require 引入最稳妥
const require = createRequire(import.meta.url)
const shapefile = require('shapefile') as {
  read: (shp: string, dbf: string, options?: object) => Promise<{
    features: Array<{
      geometry?: { coordinates: [number, number] }
      properties: Record<string, unknown>
    }>
  }>
}

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SHP_PATH = path.resolve(__dirname, '../../data/import/中华姓氏_Layer.shp')
const DBF_PATH = path.resolve(__dirname, '../../data/import/中华姓氏_Layer.dbf')

const asText = (value: unknown): string => (value === null || value === undefined ? '' : String(value).trim())

/** 导入分姓氏迁徙路线点（111 点 = 49 条路线，来自 Shapefile） */
export const importMigrationRoutes = async () => {
  const collection = await shapefile.read(SHP_PATH, DBF_PATH, { encoding: 'utf-8' })

  // DBF 字段名限长 11 字节，部分字段名被截断为 "mig_id（"/"surname（"，统一去掉尾部括号
  const normalizeKey = (key: string) => key.replace(/[（(]+\s*$/g, '').trim()

  const records = collection.features
    .map((feature) => {
      const rawProps = feature.properties ?? {}
      const p: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(rawProps)) {
        p[normalizeKey(key)] = value
      }
      const coords = feature.geometry?.coordinates
      return {
        routeId: Number(p.mig_id),
        surname: t2s(asText(p.surname)),
        pointType: Number(p.point_type),
        dynasty: t2s(asText(p.mig_dynast)),
        event: t2s(asText(p.mig_event)),
        placeOld: t2s(asText(p.place_old)),
        placeNew: t2s(asText(p.place_new)),
        lng: Number(coords?.[0]),
        lat: Number(coords?.[1]),
        description: t2s(asText(p.mig_desc)) || null,
        sourceRef: t2s(asText(p.source_ref)) || null,
      }
    })
    .filter((item) => Number.isFinite(item.routeId) && Number.isFinite(item.lng) && item.surname)

  await prisma.surnameMigrationPoint.deleteMany()
  await prisma.surnameMigrationPoint.createMany({ data: records })

  return { points: records.length, routes: new Set(records.map((r) => r.routeId)).size }
}
