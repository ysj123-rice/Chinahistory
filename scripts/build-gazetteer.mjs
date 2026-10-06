#!/usr/bin/env node
/**
 * ============================================================
 * CHGIS 地名库构建脚本 —— 把在线 TGAZ 数据"固化"到工程里
 * （基于 chgis_pkg 原版改造：适配本工程真实数据布局与列名）
 * ============================================================
 * 作用：
 *   1. 扫描 server/data/import 与 "last name data" 下的 CSV，抽出地名
 *   2. 逐个去 CHGIS 官方接口查「地名 + 年份 -> 空间实体(sys_id + 坐标)」
 *   3. 结果写进 src/data/chgis_gazetteer.json，成为工程内的离线地名库
 *   4. 查不到的写进 chgis_unmatched.json，方便人工补
 *
 * 运行（在 daima 根目录）：
 *   node scripts/build-gazetteer.mjs
 *   node scripts/build-gazetteer.mjs --force        # 忽略缓存全量重查
 *   node scripts/build-gazetteer.mjs --only 太原,晋阳  # 只查指定地名
 *
 * 无需 npm install，Node 18+ 自带 fetch。
 * ============================================================
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

// 繁简统一：CBDB 原始地名是繁体（洛陽/趙城），运行时查询用简体。
// 以 server/package.json 为基准解析 server/node_modules 里的 opencc-js。
const serverRequire = createRequire(path.join(ROOT, 'server', 'package.json'))
const OpenCC = serverRequire('opencc-js')
const t2sConvert = OpenCC.Converter({ from: 'tw', to: 'cn' })
const t2s = (text) => (text ? t2sConvert(String(text)) : text)
// 本工程真实数据目录（疆域 GeoJSON 是政权面数据，不适合点位地名查询，跳过）
const DATA_DIRS = [
  path.join(ROOT, 'server', 'data', 'import'),
  path.join(ROOT, 'last name data'),
]
const OUT_DIR = path.join(ROOT, 'src', 'data')
const CACHE_FILE = path.join(OUT_DIR, 'chgis_gazetteer.json')
const UNMATCHED_FILE = path.join(OUT_DIR, 'chgis_unmatched.json')

// ---------- 双源：主源挂了自动切复旦镜像 ----------
const BASES = [
  'https://chgis.hudci.org/tgaz/placename',
  'http://tgaz.fudan.edu.cn/tgaz/placename',
]

// ---------- 朝代/时代 -> 代表年份（长的/具体的朝代名必须排在前面） ----------
const DYNASTY_YEAR = {
  西周: -1000, 东周: -700, 春秋: -650, 战国: -400,
  秦: -210, 西汉: -150, 东汉: 100, 汉: 100,
  三国: 240, 西晋: 290, 东晋: 350, 晋: 350, 南北朝: 500,
  隋: 610, 唐: 750, 五代: 940, 北宋: 1050, 南宋: 1150, 宋: 1080,
  辽: 1050, 金: 1150, 元: 1300, 明: 1580, 清: 1820, 民国: 1920,
}

// ---------- 数据列名（适配 CBDB / 迁徙事件 / 姓氏源流三套 CSV） ----------
const NAME_KEYS = ['地名', 'name', 'NAME', 'place', 'placename', 'place_name',
  '地点', '籍贯', '出生地', '所在地', 'poi', 'title', 'label',
  'jiguanName', 'from_region', 'to_region', 'origin_place', 'junwang',
  'placeOld', 'placeNew', 'NAME_CH']
const DYNASTY_KEYS = ['朝代', 'dynasty', 'period', '时代', '时期',
  'dynasty_name', 'era', 'origin_era']
const YEAR_KEYS = ['年份', 'year', 'yr', '时间', '纪年', 'start_year']

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** 朝代/时代文本 -> 代表年份：取文本中出现的第一个已知朝代名 */
function eraToYear(text) {
  if (!text) return null
  for (const [k, v] of Object.entries(DYNASTY_YEAR)) {
    if (String(text).includes(k)) return v
  }
  return null
}

/**
 * 地名单元格清洗：
 * - 现代注记括号"赵城（今山西洪洞）" -> 删括号留古地名
 * - 枚举括号"江南（建康；会稽）" -> 括号内外都作为候选地名
 * - 多值拆分："天水郡；涿郡" -> ["天水郡", "涿郡"]
 * - 复合地名前缀剥离："王城洛邑" -> 额外候选 "洛邑"
 * - 过滤过短/过长/纯数字；剥离后长度仍需 >= 2（避免"新安"->"安"误伤）
 */
const PLACE_PREFIXES = ['王城', '古', '故', '旧']
function stripPrefix(name) {
  for (const p of PLACE_PREFIXES) {
    if (name.startsWith(p) && name.length - p.length >= 2) {
      return name.slice(p.length)
    }
  }
  return null
}

function extractNames(raw) {
  if (raw == null) return []
  let text = String(raw)
  // 先把"今/现"开头的现代注记括号整块删掉
  text = text.replace(/（[（]?\s*[今现][^）)]*[）)]/g, '')
  text = text.replace(/\(\s*[今现][^)]*\)/g, '')
  // 其余枚举括号拆掉括号符号，让分隔符统一处理
  text = text.replace(/[（）()]/g, '；')
  const base = text
    .split(/[；;、，,/|]/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 2 && s.length <= 10 && !/^\d+$/.test(s))
  // 复合地名补充剥离候选（去重）
  const out = new Set(base)
  for (const name of base) {
    const stripped = stripPrefix(name)
    if (stripped) out.add(stripped)
  }
  return [...out]
}

// ============================================================
// 1. 扫描原始数据，抽出 (地名, 朝代/年份)
// ============================================================
function splitCSVLine(line) {
  const out = []
  let cur = ''
  let inQ = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++ } else inQ = !inQ
    } else if (c === ',' && !inQ) { out.push(cur); cur = '' }
    else cur += c
  }
  out.push(cur)
  return out.map((s) => s.trim())
}

function scanDataDirs() {
  const found = new Map() // name -> { dynasty, year, count }

  const consider = (obj) => {
    if (!obj || typeof obj !== 'object') return
    let names = []
    let dynasty = null
    let year = null
    for (const [k, v] of Object.entries(obj)) {
      if (v == null || v === '') continue
      if (NAME_KEYS.includes(k)) names = names.concat(extractNames(v))
      if (DYNASTY_KEYS.includes(k)) dynasty = String(v).trim()
      if (YEAR_KEYS.includes(k)) {
        const n = parseInt(String(v).replace(/[^\d-]/g, ''), 10)
        if (Number.isFinite(n)) year = n
      }
    }
    if (!names.length) return
    const resolvedYear = year ?? eraToYear(t2s(dynasty))
    for (const rawName of names) {
      const name = t2s(rawName)
      if (!name) continue
      const prev = found.get(name) || { dynasty, year: resolvedYear, count: 0 }
      prev.count++
      if (dynasty) prev.dynasty = dynasty
      if (resolvedYear != null) prev.year = resolvedYear
      found.set(name, prev)
    }
  }

  const walk = (dir, depth = 0) => {
    if (depth > 2 || !fs.existsSync(dir)) return
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name)
      if (e.isDirectory()) { walk(p, depth + 1); continue }
      const ext = path.extname(e.name).toLowerCase()
      if (ext !== '.csv' && ext !== '.tsv') continue

      try {
        const sep = ext === '.tsv' ? '\t' : ','
        const text = fs.readFileSync(p, 'utf8')
        const lines = text.split(/\r?\n/).filter(Boolean)
        if (!lines.length) continue
        const head = splitCSVLine(lines[0]).map((h) => h.replace(/^﻿/, ''))
        for (let i = 1; i < lines.length; i++) {
          const cells = sep === '\t' ? lines[i].split('\t') : splitCSVLine(lines[i])
          const obj = {}
          head.forEach((h, j) => { obj[h] = cells[j] })
          consider(obj)
        }
      } catch {
        /* 单个文件坏了不影响整体 */
      }
    }
  }

  for (const dir of DATA_DIRS) walk(dir)
  return [...found.entries()].map(([name, m]) => ({
    name,
    dynasty: m.dynasty || null,
    year: m.year ?? null,
    hits: m.count,
  }))
}

// ============================================================
// 2. 调 TGAZ 接口（带重试 + 双源切换）
// ============================================================
async function queryTGAZ(name, year, retries = 2) {
  const params = new URLSearchParams({ n: name, fmt: 'json' })
  if (year != null) params.set('yr', String(year))

  for (let attempt = 0; attempt <= retries; attempt++) {
    for (const base of BASES) {
      try {
        const ctrl = new AbortController()
        const timer = setTimeout(() => ctrl.abort(), 15000)
        const res = await fetch(`${base}?${params}`, { signal: ctrl.signal })
        clearTimeout(timer)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        return (data.placenames || []).map((p) => normalize(p, year))
      } catch {
        /* 换源 / 重试 */
      }
    }
    if (attempt < retries) await sleep(600 * (attempt + 1))
  }
  return null
}

function normalize(p, queryYear) {
  const years = String(p.years || '')
  const m = years.match(/(-?\d+)?\s*~\s*(-?\d+)?/)
  const xy = String(p['xy coordinates'] || '').split(',').map((s) => parseFloat(s.trim()))
  return {
    sysId: p.sys_id || null,
    name: p.name || null,
    transcription: p.transcription || null,
    featureType: p['feature type'] || null,
    parentName: p['parent name'] || null,
    begin: m && m[1] ? Number(m[1]) : null,
    end: m && m[2] ? Number(m[2]) : null,
    lng: Number.isFinite(xy[0]) ? xy[0] : null,
    lat: Number.isFinite(xy[1]) ? xy[1] : null,
    source: p['data source'] || null,
    queryYear: queryYear ?? null,
  }
}

// ============================================================
// 3. 主流程
// ============================================================
const args = process.argv.slice(2)
const FORCE = args.includes('--force')
const onlyIdx = args.indexOf('--only')
const ONLY = onlyIdx >= 0 ? args[onlyIdx + 1].split(/[,，\s]+/).filter(Boolean) : null

fs.mkdirSync(OUT_DIR, { recursive: true })

let old = { entries: {} }
if (!FORCE && fs.existsSync(CACHE_FILE)) {
  try { old = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8')) } catch {}
}

let todo = ONLY
  ? ONLY.map((n) => ({ name: n, dynasty: null, year: null }))
  : scanDataDirs()

console.log(`[CHGIS] 待查地名 ${todo.length} 个（数据来源: ${ONLY ? '命令行指定' : '自动扫描数据目录'}）`)

const gazetteer = old.entries || {}
const unmatched = []
let ok = 0, skipped = 0, failed = 0

for (const item of todo) {
  const { name, dynasty, year } = item
  const ck = `${name}@${year ?? '-'}`
  if (!FORCE && gazetteer[ck]) { skipped++; continue }

  const list = await queryTGAZ(name, year)
  if (list === null) { failed++; unmatched.push({ ...item, reason: 'network' }); continue }
  if (list.length === 0) {
    failed++
    // 不带年份再试一次，很多地名只在无年份时命中
    const retry = await queryTGAZ(name, null)
    if (retry && retry.length) {
      gazetteer[ck] = { name, dynasty, queryYear: year, candidates: retry }
      ok++
    } else {
      unmatched.push({ ...item, reason: 'not_found' })
    }
    continue
  }

  gazetteer[ck] = { name, dynasty, queryYear: year, candidates: list }
  ok++
  console.log(`  ✓ ${ck} -> ${list.length} 条  (${list[0].sysId} ${list[0].name} ${list[0].begin}~${list[0].end})`)
  await sleep(150) // 温和限速，别把人家接口打挂
}

const out = {
  meta: {
    generatedAt: new Date().toISOString(),
    source: 'CHGIS TGAZ (Harvard & Fudan)',
    endpoint: BASES[0],
    total: Object.keys(gazetteer).length,
    license: 'CHGIS data for academic use; verify before redistribution',
  },
  entries: gazetteer,
}

fs.writeFileSync(CACHE_FILE, JSON.stringify(out, null, 2), 'utf8')
fs.writeFileSync(UNMATCHED_FILE, JSON.stringify(unmatched, null, 2), 'utf8')

console.log(`\n[CHGIS] 完成  新增/更新 ${ok}  复用缓存 ${skipped}  未匹配 ${failed}`)
console.log(`[CHGIS] 地名库 -> ${CACHE_FILE}`)
console.log(`[CHGIS] 未匹配 -> ${UNMATCHED_FILE}`)
