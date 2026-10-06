export const DATA_FILTER_ALL_KEY = 'all'

export const DATA_TYPE_FILTER_ALL_LABEL = '全部类型'
export const DATA_STATUS_FILTER_ALL_LABEL = '全部状态'
export const DATA_FALLBACK_LABEL = '未知'

export const DATA_RECORD_COUNT = 80
export const DATA_SEED_SALT = 'data'
export const DATA_RECORD_MIN = 800
export const DATA_RECORD_MAX = 18000
export const DATA_QUALITY_MIN = 55
export const DATA_QUALITY_MAX = 98
export const DATA_UPDATE_YEAR_START = 2023
export const DATA_UPDATE_YEAR_END = 2025
export const DATA_UPDATE_MONTH_MAX = 12
export const DATA_UPDATE_DAY_MAX = 28
export const DATA_UPDATE_HOUR_START = 8
export const DATA_UPDATE_HOUR_END = 18
export const DATA_UPDATE_MINUTE_MAX = 59
export const DATA_UPDATE_MONTH_MIN = 1
export const DATA_UPDATE_DAY_MIN = 1
export const DATA_UPDATE_MINUTE_MIN = 0
export const DATA_SIZE_MB_DIVISOR = 8
export const DATA_SIZE_GB_THRESHOLD = 1024
export const DATA_SIZE_MB_MIN = 120
export const DATA_TAG_MIN_COUNT = 2
export const DATA_TAG_MAX_COUNT = 4

export const DATA_NAME_TEMPLATES = [
  '{surname}氏族谱汇编',
  '{surname}氏迁徙档案',
  '{surname}氏碑刻索引',
  '{surname}氏方志条目',
  '{surname}氏人口统计册',
  '{surname}氏官署文书录',
  '{surname}氏商路舆图',
  '{surname}氏军务档案',
]

export const DATA_DESCRIPTION_TEMPLATES = [
  '整理{surname}氏家族在{coverage}的谱牒与迁徙记录。',
  '汇总{coverage}地区{surname}氏相关档案与制度资料。',
  '补齐{surname}氏在{coverage}的地方志与地名信息。',
  '收录{surname}氏在{coverage}的文献线索，便于专题分析。',
]

export const DATA_COVERAGE_POOL = ['华北', '江淮', '江南', '岭南', '河西', '关中', '湖广', '西南']

export const DATA_TAG_POOL = [
  '族谱',
  '户籍',
  '碑刻',
  '方志',
  '迁徙',
  '人口',
  '官署',
  '商贸',
  '水利',
  '军务',
]

export const DATA_VERSION_POOL = ['v1.0', 'v1.2', 'v1.4', 'v1.6', 'v1.8', 'v2.0', 'v2.2', 'v2.4']

export type DataTypeKey = 'genealogy' | 'gazetteer' | 'inscription' | 'chronicle' | 'map' | 'archive'

export type DataStatusKey = 'draft' | 'review' | 'published' | 'archived'

export type DataRecord = {
  id: number
  name: string
  type: DataTypeKey
  source: string
  status: DataStatusKey
  updateTime: string
  description: string
  owner: string
  coverage: string
  records: number
  size: string
  tags: string[]
  qualityScore: number
  version: string
}

export const DATA_TYPE_OPTIONS: Array<{ key: DataTypeKey; label: string }> = [
  { key: 'genealogy', label: '族谱' },
  { key: 'gazetteer', label: '方志' },
  { key: 'inscription', label: '碑刻' },
  { key: 'chronicle', label: '编年' },
  { key: 'map', label: '舆图' },
  { key: 'archive', label: '档案' },
]

export const DATA_STATUS_OPTIONS: Array<{
  key: DataStatusKey
  label: string
  color: string
  background: string
  border: string
}> = [
  {
    key: 'draft',
    label: '草稿',
    color: '#b96d1e',
    background: 'rgba(227, 139, 44, 0.18)',
    border: 'rgba(227, 139, 44, 0.4)',
  },
  {
    key: 'review',
    label: '审核中',
    color: '#1f88a7',
    background: 'rgba(31, 136, 167, 0.16)',
    border: 'rgba(31, 136, 167, 0.4)',
  },
  {
    key: 'published',
    label: '已发布',
    color: '#2c9b6a',
    background: 'rgba(44, 155, 106, 0.18)',
    border: 'rgba(44, 155, 106, 0.4)',
  },
  {
    key: 'archived',
    label: '已归档',
    color: '#5f6f82',
    background: 'rgba(95, 111, 130, 0.16)',
    border: 'rgba(95, 111, 130, 0.35)',
  },
]

export const DATA_STATUS_FALLBACK_STYLE = {
  color: 'var(--text-primary)',
  background: 'var(--surface-2)',
  border: 'var(--panel-border)',
}

export const DATA_QUALITY_LEVELS = [
  { min: 0, max: 60, label: '需补全', color: '#c6483b' },
  { min: 61, max: 80, label: '可用', color: '#e38b2c' },
  { min: 81, max: 100, label: '优良', color: '#2c9b6a' },
]
