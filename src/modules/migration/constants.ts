// 宏观迁徙事件：按事件真实起始年份归入的历史时期（仅用于筛选，不改变事件数据）
export type MacroPeriod = {
  key: string
  label: string
  startYear: number
  endYear: number // 不含
}

export const MACRO_PERIODS: MacroPeriod[] = [
  { key: 'preQin', label: '先秦', startYear: -3000, endYear: -221 },
  { key: 'qinHan', label: '秦汉', startYear: -221, endYear: 220 },
  { key: 'weiJin', label: '魏晋南北朝', startYear: 220, endYear: 581 },
  { key: 'suiTang', label: '隋唐五代', startYear: 581, endYear: 960 },
  { key: 'songYuan', label: '宋辽金元', startYear: 960, endYear: 1368 },
  { key: 'ming', label: '明代', startYear: 1368, endYear: 1644 },
  { key: 'qing', label: '清代', startYear: 1644, endYear: 1912 },
  { key: 'modern', label: '近现代', startYear: 1912, endYear: 3000 },
]

// 迁徙原因配色（对应 migration_events.csv 的 cause 字段）
export const MIGRATION_CAUSE_COLORS: Record<string, string> = {
  战乱: '#d95d39',
  政策移民: '#1f88a7',
  少数民族内附: '#8d6e63',
  戍边屯垦: '#2c9b6a',
  开发垦殖: '#5b7aa8',
  经济谋生: '#e0a13c',
  工业建设: '#7e57c2',
}

export const DEFAULT_CAUSE_COLOR = '#8a9ba8'

// 姓氏路线配色（按路线序号循环）
export const ROUTE_PALETTE = [
  '#1f88a7',
  '#d95d39',
  '#2c9b6a',
  '#7e57c2',
  '#e0a13c',
  '#c2185b',
  '#00897b',
  '#5b7aa8',
  '#6d4c41',
  '#558b2f',
  '#f4511e',
  '#3949ab',
]

export const ORIGIN_POINT_COLOR = '#2c9b6a'
export const DEST_POINT_COLOR = '#d95d39'
export const MID_POINT_COLOR = '#5b7aa8'
