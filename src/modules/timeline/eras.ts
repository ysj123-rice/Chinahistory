import type { MapSourceKey } from '@/modules/map/dataSources'

/**
 * 时空主轴年代模型
 * ------------------------------------------------------------
 * 年份规则：公元后为正整数，公元前为负数（如 -221 = 前 221 年）。
 * 各时代区间首尾相接、互不重叠，滑块在任意整数年份都能唯一定位到一个时代。
 * sourceKey 为该时代已接入的疆域 GeoJSON；null 表示暂无边界数据
 * （边界层淡出，人物点仍可按生年显示）。
 */

export const TIMELINE_MIN_YEAR = -221
export const TIMELINE_MAX_YEAR = 1911

/** 播放速度：每年在滑块上推进的年数（2132 年全程约 27 秒） */
export const PLAY_YEARS_PER_SECOND = 80
/** 播放时"当代人物"高亮窗口（年）：窗口内生年的点最亮，更早的点沉淀为暗色 */
export const PLAY_HIGHLIGHT_WINDOW = 60
/** 拖动时年份过滤（definitionExpression）的节流间隔，毫秒 */
export const YEAR_FILTER_THROTTLE_MS = 200
/** 透明度视觉变量更新的节流间隔，毫秒（比过滤更频繁，保证渐变顺滑） */
export const YEAR_OPACITY_THROTTLE_MS = 60

export type Era = {
  key: string
  label: string
  /** 起始年（含） */
  start: number
  /** 结束年（含） */
  end: number
  /** 对应的地图数据源；无边界数据时为 null */
  sourceKey: MapSourceKey | null
  /** 手动从下拉框进入该时代时定位的代表年份（与边界快照年份对齐） */
  representativeYear: number
  /** 时间轴色带颜色 */
  color: string
}

export const ERAS: Era[] = [
  { key: 'qin', label: '秦', start: -221, end: -207, sourceKey: null, representativeYear: -221, color: '#b07a55' },
  { key: 'westernHan', label: '西汉', start: -206, end: 8, sourceKey: null, representativeYear: -109, color: '#c08a5e' },
  { key: 'easternHan', label: '东汉', start: 9, end: 220, sourceKey: null, representativeYear: 100, color: '#c9936a' },
  { key: 'weiJin', label: '魏晋南北朝', start: 221, end: 580, sourceKey: null, representativeYear: 350, color: '#8d9db6' },
  { key: 'sui', label: '隋', start: 581, end: 617, sourceKey: null, representativeYear: 605, color: '#cbb26a' },
  { key: 'tang', label: '唐', start: 618, end: 906, sourceKey: 'tang', representativeYear: 741, color: '#a44d3f' },
  { key: 'fiveDynasties', label: '五代十国', start: 907, end: 959, sourceKey: null, representativeYear: 940, color: '#b08968' },
  { key: 'northernSong', label: '北宋', start: 960, end: 1126, sourceKey: 'northernSong', representativeYear: 1080, color: '#3f729b' },
  { key: 'southernSong', label: '南宋', start: 1127, end: 1278, sourceKey: 'southernSong', representativeYear: 1200, color: '#4f8a8b' },
  { key: 'yuan', label: '元', start: 1279, end: 1367, sourceKey: 'yuan', representativeYear: 1300, color: '#6f6a8d' },
  { key: 'ming', label: '明', start: 1368, end: 1643, sourceKey: 'ming', representativeYear: 1582, color: '#5a7d5a' },
  { key: 'qing', label: '清', start: 1644, end: 1911, sourceKey: 'qing', representativeYear: 1820, color: '#7a5a7d' },
]

// 用 [start, end+1) 半开区间：播放年份允许小数（如 906.5 仍属唐），
// 年缝（906.x）不会落空；整数语义与 start/end 含端点完全一致
export const getEraAtYear = (year: number): Era => {
  const hit = ERAS.find((era) => year >= era.start && year < era.end + 1)
  return hit ?? ERAS[ERAS.length - 1]
}

export const getEraBySourceKey = (key: MapSourceKey): Era | undefined =>
  ERAS.find((era) => era.sourceKey === key)

// 允许小数年份：播放时 rAF 逐帧增量（约 1.3 年/帧）才能匀速平滑；
// 滑块 step=1 的整数化由 UI 层 Math.round 负责
export const clampYear = (year: number) =>
  Math.min(TIMELINE_MAX_YEAR, Math.max(TIMELINE_MIN_YEAR, year))

/** 年份展示：公元前用"前 221 年"，公元 0 年显示"公元元年" */
export const formatEraYear = (year: number): string => {
  if (year < 0) {
    return `前 ${Math.abs(year)} 年`
  }
  if (year === 0) {
    return '公元元年'
  }
  return `${year} 年`
}
