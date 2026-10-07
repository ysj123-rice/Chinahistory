/**
 * CHGIS V6 时间切片府级政区边界（由 scripts/build-v6-boundaries.mjs 从
 * 168MB 权威原文件离线简化生成，见脚本头部溯源说明）。
 *
 * 3830 个政区要素各自带 BEG_YR / END_YR 存续区间（前 224 ~ 1911），
 * 地图层单层常驻，按当前年份用 SQL 表达式过滤出"当年实际存在"的政区，
 * 边界因此随时间轴逐年连续演化，无需按朝代切换图层。
 */
export const CHGIS_BOUNDARY_URL = '/geojson/chgis-v6-prefs.geojson'

/** 播放/拖动时边界过滤的节流间隔（毫秒），比人物点过滤略低频 */
export const BOUNDARY_YEAR_THROTTLE_MS = 120

/** ArcGIS 客户端 SQL：年份 t 落在政区存续 [BEG_YR, END_YR] 闭区间内 */
export const buildBoundaryYearExpression = (year: number): string => {
  const y = Math.round(year)
  return `BEG_YR <= ${y} AND END_YR >= ${y}`
}
