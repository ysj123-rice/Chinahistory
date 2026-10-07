#!/usr/bin/env node
/**
 * ============================================================
 * CHGIS v6 时间切片府级政区 —— 浏览器渲染资产构建脚本
 * ============================================================
 * 权威原始数据（请勿改动 / 勿接入前端）：
 *   古代地图/v6_time_pref_p_FeaturesToJSO.geojson   约 168MB / 3830 要素
 *   来源：CHGIS V6（Harvard CTP + 复旦大学历史地理研究中心），
 *         府级政区时间切片，BEG_YR ~ END_YR 覆盖前 224 ~ 1911，
 *         含 1246 条更名记录（BEG_CHG_TY / END_CHG_TY）。
 *
 * 本脚本产物（可回溯到上述原始文件）：
 *   public/geojson/chgis-v6-prefs.geojson
 *   - mapshaper 拓扑保持简化（相邻政区共享弧段，简化后不会出现裂缝）
 *   - 坐标精度截到 0.001°（约 100m，全国尺度渲染无损）
 *   - 仅保留时间过滤与弹窗所需 5 个字段：
 *       NAME_CH 名称 / TYPE_CH 类型 / BEG_YR 始年 / END_YR 终年 / SYS_ID 溯源ID
 *   - 前端 GeoJSONLayer 单层常驻，用 BEG_YR <= t AND END_YR >= t 按年过滤
 *
 * 运行（在 daima 根目录，需先 pnpm install）：
 *   node scripts/build-v6-boundaries.mjs                # 默认简化比例 2%
 *   node scripts/build-v6-boundaries.mjs --pct 1        # 更激进（体积更小）
 *   node scripts/build-v6-boundaries.mjs --pct 4        # 更精细
 *
 * 重跑本脚本即可由权威文件重新生成渲染资产；展示精度与原始精度分离。
 * ============================================================
 */

import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

const SOURCE = path.join(ROOT, '古代地图', 'v6_time_pref_p_FeaturesToJSO.geojson')
const OUT_DIR = path.join(ROOT, 'public', 'geojson')
const OUT_FILE = path.join(OUT_DIR, 'chgis-v6-prefs.geojson')

const argvPct = Number(process.argv.find((_, i, a) => a[i - 1] === '--pct'))
const SIMPLIFY_PCT = Number.isFinite(argvPct) && argvPct > 0 ? argvPct : 2
const COORD_PRECISION = 0.001

const mb = (p) => `${(fs.statSync(p).size / 1048576).toFixed(2)} MB`

if (!fs.existsSync(SOURCE)) {
  console.error(`[中断] 找不到权威原始文件：${SOURCE}`)
  process.exit(1)
}
fs.mkdirSync(OUT_DIR, { recursive: true })

console.log('[1/3] 原始文件：', mb(SOURCE), SOURCE)

// mapshaper 通过本地 node_modules 解析（pnpm add -D mapshaper）
const mapshaperBin = path.join(
  ROOT,
  'node_modules',
  'mapshaper',
  'bin',
  'mapshaper',
)
if (!fs.existsSync(mapshaperBin)) {
  console.error('[中断] 未安装 mapshaper，请先执行：pnpm add -D mapshaper')
  process.exit(1)
}

console.log(`[2/3] mapshaper 拓扑简化（保留 ${SIMPLIFY_PCT}% 顶点，精度 ${COORD_PRECISION}°）…`)

// - filter-fields：字段白名单，约 20 个属性列砍到 5 个
// - simplify keep-shapes：Visvalingam 加权有效面积算法，拓扑共享弧段整体简化，
//   且保证小政区不坍缩为零面积
// - precision：坐标去尾数（原始坐标带 12~14 位小数）
const result = spawnSync(
  process.execPath,
  [
    mapshaperBin,
    SOURCE,
    '-filter-fields',
    'NAME_CH,TYPE_CH,BEG_YR,END_YR,SYS_ID',
    '-simplify',
    `${SIMPLIFY_PCT}%`,
    'keep-shapes',
    '-o',
    OUT_FILE,
    'format=geojson',
    `precision=${COORD_PRECISION}`,
  ],
  { stdio: ['ignore', 'inherit', 'inherit'], env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=8192' } },
)
if (result.status !== 0) {
  console.error('[中断] mapshaper 执行失败')
  process.exit(result.status ?? 1)
}

console.log('[3/3] 产物：', mb(OUT_FILE), OUT_FILE)

// ---- 产物校验：要素数 / 年份覆盖 / 字段白名单 ----
const gj = JSON.parse(fs.readFileSync(OUT_FILE, 'utf8'))
const feats = gj.features ?? []
let minBeg = Infinity
let maxEnd = -Infinity
const props = new Set()
let multi = 0
for (const f of feats) {
  const p = f.properties ?? {}
  Object.keys(p).forEach((k) => props.add(k))
  if (Number.isFinite(p.BEG_YR)) minBeg = Math.min(minBeg, p.BEG_YR)
  if (Number.isFinite(p.END_YR)) maxEnd = Math.max(maxEnd, p.END_YR)
  if (f.geometry?.type === 'MultiPolygon') multi += 1
}

console.log('---- 校验 ----')
console.log('要素数：', feats.length, '（原始 3830）')
console.log('MultiPolygon：', multi)
console.log('年份覆盖：', minBeg, '~', maxEnd, '（原始 -224 ~ 1911）')
console.log('字段：', [...props].join(', '))

if (feats.length < 3800) {
  console.warn('[警告] 要素数较原始减少过多，请检查 simplify 参数')
}
if (minBeg > -224 || maxEnd < 1911) {
  console.warn('[警告] 年份覆盖不完整')
}
console.log('完成。')
